import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as XLSX from "https://esm.sh/xlsx@0.18.5";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TransactionData {
  description: string;
  date: string;
  amount: number;
  installment: string | null;
  category: string;
}

interface AIResponse {
  transactions: TransactionData[];
}

interface PossibleDuplicate {
  transaction: TransactionData;
  existingMatch: {
    description: string;
    amount: number;
    transaction_date: string;
  };
  similarity: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Supabase credentials not configured");
    }

    // Get auth header for user context
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization header required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Extract the token from the header
    const token = authHeader.replace("Bearer ", "");

    // Create Supabase client with service role for admin operations
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    // Verify the user's JWT token using the admin client
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
    
    if (userError || !userData.user) {
      console.error("Auth error:", userError);
      return new Response(
        JSON.stringify({ error: "User not authenticated" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = userData.user.id;

    const { fileContent, fileType, filename, cardId, houseId, invoiceMonth } = await req.json();

    if (!fileContent || !filename || !cardId || !houseId) {
      throw new Error("Missing required fields: fileContent, filename, cardId, houseId");
    }

    const isPdf = fileType === "pdf";
    const isExcel = fileType === "excel";
    const isCsv = fileType === "csv";

    // Validate invoiceMonth (required, format YYYY-MM)
    if (!invoiceMonth || !/^\d{4}-\d{2}$/.test(invoiceMonth)) {
      throw new Error("invoiceMonth é obrigatório (formato: YYYY-MM)");
    }

    const fileTypeLabel = isPdf ? "PDF" : isExcel ? "Excel" : "CSV";
    console.log(`Processing invoice: ${filename} (type: ${fileTypeLabel}) for card ${cardId}, invoice month: ${invoiceMonth}`);

    // Verify user is owner of the house
    const { data: roleData, error: roleError } = await supabaseAdmin
      .rpc("get_house_role", { _user_id: userId, _house_id: houseId });

    if (roleError || roleData !== "owner") {
      throw new Error("Only house owners can upload invoices");
    }

    // Função simplificada: usa diretamente o mês da fatura informado pelo usuário
    function getBillingMonthFromInvoice(invoiceMonth: string): string {
      const [year, month] = invoiceMonth.split('-').map(Number);
      return `${year}-${String(month).padStart(2, '0')}-01`;
    }

    // Calculate billing month early to save in upload log
    const billingMonth = getBillingMonthFromInvoice(invoiceMonth);

    // Create upload log entry
    const { data: uploadLog, error: uploadError } = await supabaseAdmin
      .from("upload_logs")
      .insert({
        card_id: cardId,
        house_id: houseId,
        user_id: userId,
        filename: filename,
        status: "processing",
        billing_month: billingMonth,
      })
      .select()
      .single();

    if (uploadError) {
      console.error("Error creating upload log:", uploadError);
      throw new Error("Failed to create upload log");
    }

    const uploadId = uploadLog.id;

    // ============================================
    // BUSCAR HISTÓRICO DE CATEGORIAS DO USUÁRIO
    // ============================================
    console.log("Fetching category history for house:", houseId);
    
    const { data: categoryHistory, error: historyError } = await supabaseAdmin
      .from("transactions")
      .select("description, category")
      .eq("house_id", houseId)
      .neq("category", "Não classificado")
      .not("category", "is", null);

    if (historyError) {
      console.error("Error fetching category history:", historyError);
    }

    // Criar mapa de descrição → categoria mais frequente
    const categoryMap = new Map<string, string>();
    
    if (categoryHistory && categoryHistory.length > 0) {
      const categoryCounts = new Map<string, Map<string, number>>();

      categoryHistory.forEach((tx) => {
        const desc = tx.description?.toLowerCase().trim();
        if (!desc || !tx.category) return;
        
        if (!categoryCounts.has(desc)) {
          categoryCounts.set(desc, new Map());
        }
        const descMap = categoryCounts.get(desc)!;
        descMap.set(tx.category, (descMap.get(tx.category) || 0) + 1);
      });

      // Pegar a categoria mais frequente para cada descrição
      categoryCounts.forEach((counts, description) => {
        let maxCategory = "";
        let maxCount = 0;
        counts.forEach((count, category) => {
          if (count > maxCount) {
            maxCount = count;
            maxCategory = category;
          }
        });
        if (maxCategory) {
          categoryMap.set(description, maxCategory);
        }
      });

      console.log(`Built category map with ${categoryMap.size} unique descriptions`);
    }

    // Call Lovable AI (Gemini) to extract transactions
    const prompt = `Você é um assistente financeiro especializado em extrair dados de faturas de cartão de crédito.

IMPORTANTE: Extraia CADA transação INDIVIDUALMENTE. NÃO agrupe transações.
Cada linha de compra deve ser uma transação separada no JSON.

Analise o conteúdo abaixo e extraia TODAS as transações no formato JSON:
{
  "transactions": [
    {
      "description": "Descrição EXATAMENTE como aparece no arquivo",
      "date": "YYYY-MM-DD",
      "amount": 123.45,
      "installment": "1/10 ou null",
      "category": "Alimentação | Transporte | Saúde | Lazer | Compras | Serviços | Educação | Moradia | Outros | Não classificado"
    }
  ]
}

REGRAS IMPORTANTES:
- Extraia CADA compra como uma transação separada
- COPIE A DESCRIÇÃO EXATAMENTE como aparece no arquivo original, sem modificar, interpretar ou "limpar" o texto
  - Se está "IFOOD *IFOOD", use "IFOOD *IFOOD"
  - Se está "PAG*JOSELITO", use "PAG*JOSELITO"
  - Se está "UBER *UBER TRIP", use "UBER *UBER TRIP"
  - Se está "MP *MERCADOLIVRE", use "MP *MERCADOLIVRE"
  - NÃO simplifique para "iFood", "Uber", "Mercado Livre", etc.
- Se houver parcelamento, SEMPRE formate como X/Y (ex: 1/10, 2/12)
- Valores devem ser números positivos (decimal com ponto)
- Datas no formato ISO (YYYY-MM-DD)
- Se a data não estiver clara, use a data mais provável baseada no contexto
- Ignore linhas que não são transações (totais, cabeçalhos, saldos, etc.)`;

    // Construir mensagens baseado no tipo de arquivo
    let userContent;
    let textContent = "";
    
    if (isPdf) {
      userContent = [
        {
          type: "file",
          file: {
            filename: filename,
            file_data: `data:application/pdf;base64,${fileContent}`,
          },
        },
        { type: "text", text: prompt },
      ];
    } else if (isExcel) {
      // Converter Excel para texto usando SheetJS
      try {
        // Decodificar base64 para Uint8Array
        const binaryString = atob(fileContent);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        
        // Ler o arquivo Excel
        const workbook = XLSX.read(bytes, { type: "array" });
        
        // Converter todas as planilhas para texto
        const sheetsContent: string[] = [];
        for (const sheetName of workbook.SheetNames) {
          const sheet = workbook.Sheets[sheetName];
          // Converter para CSV para manter estrutura tabular
          const csvContent = XLSX.utils.sheet_to_csv(sheet, { FS: "\t", RS: "\n" });
          sheetsContent.push(`=== Planilha: ${sheetName} ===\n${csvContent}`);
        }
        textContent = sheetsContent.join("\n\n");
        console.log(`Excel parsed successfully. Content preview: ${textContent.substring(0, 500)}...`);
      } catch (parseError) {
        console.error("Error parsing Excel file:", parseError);
        throw new Error("Não foi possível ler o arquivo Excel. Verifique se o arquivo não está corrompido.");
      }
      
      // Enviar como texto para a IA
      userContent = prompt + `\n\nCONTEÚDO DA FATURA (EXCEL):\n${textContent}`;
    } else {
      // CSV como texto
      userContent = prompt + `\n\nCONTEÚDO DA FATURA:\n${fileContent}`;
    }

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: "You are a financial assistant that extracts transaction data from credit card invoices. Always respond with valid JSON only.",
          },
          { role: "user", content: userContent },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI API error:", aiResponse.status, errorText);
      
      // Update upload log with error status
      await supabaseAdmin
        .from("upload_logs")
        .update({ status: "error" })
        .eq("id", uploadId);

      if (aiResponse.status === 429) {
        throw new Error("Taxa de requisições excedida. Tente novamente em alguns minutos.");
      }
      if (aiResponse.status === 402) {
        throw new Error("Créditos insuficientes. Adicione mais créditos à sua conta.");
      }
      throw new Error("Erro ao processar fatura com IA");
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData.choices?.[0]?.message?.content;

    if (!aiContent) {
      await supabaseAdmin
        .from("upload_logs")
        .update({ status: "error" })
        .eq("id", uploadId);
      throw new Error("Empty response from AI");
    }

    console.log("AI Response:", aiContent);

    // Parse AI response - try to extract JSON from the response
    let parsedTransactions: AIResponse;
    try {
      // Try to find JSON in the response
      const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No JSON found in AI response");
      }
      parsedTransactions = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
      await supabaseAdmin
        .from("upload_logs")
        .update({ status: "error" })
        .eq("id", uploadId);
      throw new Error("Failed to parse AI response");
    }

    const transactions = parsedTransactions.transactions || [];

    if (transactions.length === 0) {
      await supabaseAdmin
        .from("upload_logs")
        .update({ status: "completed", items_count: 0 })
        .eq("id", uploadId);

      return new Response(
        JSON.stringify({ 
          success: true, 
          uploadId, 
          itemsCount: 0,
          message: "Nenhuma transação encontrada no arquivo" 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Buscar transações existentes para evitar duplicatas em TODOS os meses
    // Isso garante que parcelas não sejam duplicadas ao importar faturas de meses diferentes
    const { data: existingTransactions, error: existingError } = await supabaseAdmin
      .from("transactions")
      .select("description, amount, transaction_date")
      .eq("card_id", cardId);

    if (existingError) {
      console.error("Error fetching existing transactions:", existingError);
    }

    const existingList = existingTransactions || [];

    // Função para normalizar descrição para comparação (remove espaços e caracteres especiais)
    function normalizeDescription(desc: string): string {
      return desc
        .toLowerCase()
        .trim()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // Remove acentos
        .replace(/[^a-z0-9]/g, "");       // Remove TUDO exceto letras e números (incluindo espaços)
    }

    // Função para calcular similaridade entre descrições (baseada em caracteres em comum do início)
    function calculateSimilarity(desc1: string, desc2: string): number {
      const norm1 = normalizeDescription(desc1);
      const norm2 = normalizeDescription(desc2);
      
      // Match exato = 100%
      if (norm1 === norm2) return 1.0;
      
      // Se um dos dois é muito curto, não comparar
      if (norm1.length < 5 || norm2.length < 5) return 0;
      
      const shorter = norm1.length <= norm2.length ? norm1 : norm2;
      const longer = norm1.length > norm2.length ? norm1 : norm2;
      
      // Verificar se o menor é prefixo do maior (truncamento completo)
      if (longer.startsWith(shorter)) {
        return 1.0;
      }
      
      // Calcular quantos caracteres coincidem desde o início
      let matchingChars = 0;
      for (let i = 0; i < shorter.length; i++) {
        if (shorter[i] === longer[i]) {
          matchingChars++;
        } else {
          break; // Para no primeiro caractere diferente
        }
      }
      
      // Retornar a proporção de caracteres que coincidem
      return matchingChars / shorter.length;
    }

    // Função para encontrar match de duplicata (retorna detalhes em vez de boolean)
    // LÓGICA: Primeiro valida DATA + VALOR, depois verifica se descrição tem 60%+ de similaridade
    function findDuplicateMatch(
      newTx: TransactionData,
      existingList: Array<{ description: string; amount: number; transaction_date: string }>
    ): { match: { description: string; amount: number; transaction_date: string }; similarity: number } | null {
      for (const existing of existingList) {
        // PRIMEIRO: Verificar data e valor (critérios objetivos e exatos)
        const dateMatch = existing.transaction_date === newTx.date;
        const amountMatch = Number(existing.amount) === Math.abs(newTx.amount);
        
        // Se data OU valor não batem, definitivamente NÃO é duplicata
        if (!dateMatch || !amountMatch) {
          continue;
        }
        
        // SEGUNDO: Data e valor batem - verificar se descrição tem 60%+ de similaridade
        const similarity = calculateSimilarity(existing.description, newTx.description);
        
        if (similarity >= 0.6) {
          return { match: existing, similarity };
        }
      }
      return null;
    }

    // Separar transações em: novas (inserir direto) e possíveis duplicatas (para revisão do usuário)
    const newTransactions: TransactionData[] = [];
    const possibleDuplicates: PossibleDuplicate[] = [];

    for (const tx of transactions) {
      const duplicateMatch = findDuplicateMatch(tx, existingList);
      
      if (duplicateMatch) {
        possibleDuplicates.push({
          transaction: tx,
          existingMatch: duplicateMatch.match,
          similarity: duplicateMatch.similarity,
        });
        console.log(`Possível duplicata (${Math.round(duplicateMatch.similarity * 100)}% similar): "${tx.description}" ≈ "${duplicateMatch.match.description}" (${tx.date}, R$${tx.amount})`);
      } else {
        newTransactions.push(tx);
      }
    }

    const skippedCount = possibleDuplicates.length;

    console.log(`Found ${transactions.length} transactions, ${possibleDuplicates.length} possible duplicates, ${newTransactions.length} are new`);

    // Se não há novas transações mas há possíveis duplicatas, retornar para revisão
    if (newTransactions.length === 0 && possibleDuplicates.length > 0) {
      // Atualizar status para aguardando revisão
      await supabaseAdmin
        .from("upload_logs")
        .update({ status: "pending_review", items_count: 0 })
        .eq("id", uploadId);

      return new Response(
        JSON.stringify({
          success: true,
          uploadId,
          itemsCount: 0,
          possibleDuplicates,
          message: `${possibleDuplicates.length} possíveis duplicatas encontradas. Revise e aprove as que deseja importar.`,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Se não há nenhuma transação
    if (newTransactions.length === 0 && possibleDuplicates.length === 0 && transactions.length > 0) {
      await supabaseAdmin
        .from("upload_logs")
        .update({ status: "completed", items_count: 0 })
        .eq("id", uploadId);

      return new Response(
        JSON.stringify({
          success: true,
          uploadId,
          itemsCount: 0,
          possibleDuplicates: [],
          message: "Nenhuma transação nova encontrada.",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ============================================
    // APLICAR CATEGORIAS DO HISTÓRICO
    // ============================================
    let categorizedFromHistory = 0;
    
    const transactionsToInsert = newTransactions.map((t: TransactionData) => {
      const descLower = t.description?.toLowerCase().trim();
      const historicalCategory = descLower ? categoryMap.get(descLower) : null;
      
      // Prioridade: 1) Histórico do usuário, 2) IA, 3) Não classificado
      let finalCategory = t.category || "Não classificado";
      
      if (historicalCategory) {
        finalCategory = historicalCategory;
        categorizedFromHistory++;
        console.log(`Using historical category for "${t.description}": ${historicalCategory}`);
      }
      
      return {
        house_id: houseId,
        card_id: cardId,
        upload_id: uploadId,
        description: t.description,
        amount: Math.abs(t.amount),
        transaction_date: t.date,
        billing_month: billingMonth,
        installment: t.installment || null,
        category: finalCategory,
        created_by: userId,
      };
    });

    console.log(`Categorized ${categorizedFromHistory} transactions from history`);

    const { error: insertError } = await supabaseAdmin
      .from("transactions")
      .insert(transactionsToInsert);

    if (insertError) {
      console.error("Error inserting transactions:", insertError);
      await supabaseAdmin
        .from("upload_logs")
        .update({ status: "error" })
        .eq("id", uploadId);
      throw new Error("Failed to save transactions");
    }

    // Update upload log with success
    await supabaseAdmin
      .from("upload_logs")
      .update({
        status: "completed",
        items_count: newTransactions.length,
      })
      .eq("id", uploadId);

    console.log(`Successfully processed ${newTransactions.length} transactions, ${possibleDuplicates.length} possible duplicates for review, ${categorizedFromHistory} categorized from history`);

    let message = `${newTransactions.length} transações importadas com sucesso!`;
    
    if (categorizedFromHistory > 0) {
      message += ` ${categorizedFromHistory} categorizadas automaticamente pelo histórico.`;
    }
    
    if (possibleDuplicates.length > 0) {
      message += ` ${possibleDuplicates.length} possíveis duplicatas aguardando sua revisão.`;
    }

    // Se há possíveis duplicatas, atualizar status
    if (possibleDuplicates.length > 0) {
      await supabaseAdmin
        .from("upload_logs")
        .update({ status: "pending_review" })
        .eq("id", uploadId);
    }

    return new Response(
      JSON.stringify({
        success: true,
        uploadId,
        itemsCount: newTransactions.length,
        possibleDuplicates,
        categorizedFromHistory,
        message,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in process-invoice:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error" 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

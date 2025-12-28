import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
      throw new Error("Authorization header required");
    }

    // Create Supabase client with service role for admin operations
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    // Create client with user token to get user info
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || SUPABASE_SERVICE_ROLE_KEY;
    const supabaseClient = createClient(SUPABASE_URL, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !userData.user) {
      console.error("Auth error:", userError);
      throw new Error("User not authenticated");
    }

    const userId = userData.user.id;

    const { fileContent, filename, cardId, houseId } = await req.json();

    if (!fileContent || !filename || !cardId || !houseId) {
      throw new Error("Missing required fields: fileContent, filename, cardId, houseId");
    }

    console.log(`Processing invoice: ${filename} for card ${cardId}`);

    // Verify user is owner of the house
    const { data: roleData, error: roleError } = await supabaseAdmin
      .rpc("get_house_role", { _user_id: userId, _house_id: houseId });

    if (roleError || roleData !== "owner") {
      throw new Error("Only house owners can upload invoices");
    }

    // Create upload log entry
    const { data: uploadLog, error: uploadError } = await supabaseAdmin
      .from("upload_logs")
      .insert({
        card_id: cardId,
        house_id: houseId,
        user_id: userId,
        filename: filename,
        status: "processing",
      })
      .select()
      .single();

    if (uploadError) {
      console.error("Error creating upload log:", uploadError);
      throw new Error("Failed to create upload log");
    }

    const uploadId = uploadLog.id;

    // Call Lovable AI (Gemini) to extract transactions
    const prompt = `Você é um assistente financeiro especializado em extrair dados de faturas de cartão de crédito.

Analise o conteúdo abaixo e extraia TODAS as transações no formato JSON:
{
  "transactions": [
    {
      "description": "Nome da compra",
      "date": "YYYY-MM-DD",
      "amount": 123.45,
      "installment": "1/10 ou null",
      "category": "Alimentação | Transporte | Saúde | Lazer | Compras | Serviços | Educação | Moradia | Outros | Não classificado"
    }
  ]
}

REGRAS IMPORTANTES:
- Se houver parcelamento, SEMPRE formate como X/Y (ex: 1/10, 2/12)
- Se não conseguir classificar a categoria, use "Não classificado"
- Valores devem ser números positivos (decimal com ponto)
- Datas no formato ISO (YYYY-MM-DD)
- Se a data não estiver clara, use a data mais provável baseada no contexto
- Ignore linhas que não são transações (totais, cabeçalhos, etc.)

CONTEÚDO DA FATURA:
${fileContent}`;

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
          { role: "user", content: prompt },
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

    // Insert transactions
    const transactionsToInsert = transactions.map((t: TransactionData) => ({
      house_id: houseId,
      card_id: cardId,
      upload_id: uploadId,
      description: t.description,
      amount: Math.abs(t.amount),
      transaction_date: t.date,
      installment: t.installment || null,
      category: t.category || "Não classificado",
      created_by: userId,
    }));

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
        items_count: transactions.length 
      })
      .eq("id", uploadId);

    console.log(`Successfully processed ${transactions.length} transactions`);

    return new Response(
      JSON.stringify({
        success: true,
        uploadId,
        itemsCount: transactions.length,
        message: `${transactions.length} transações importadas com sucesso!`,
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

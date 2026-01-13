import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ApprovedTransaction {
  description: string;
  date: string;
  amount: number;
  installment: string | null;
  category: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

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

    const { uploadId, cardId, houseId, approvedTransactions, invoiceMonth } = await req.json();

    if (!uploadId || !cardId || !houseId || !approvedTransactions || !invoiceMonth) {
      throw new Error("Missing required fields: uploadId, cardId, houseId, approvedTransactions, invoiceMonth");
    }

    // Verify user is owner of the house
    const { data: roleData, error: roleError } = await supabaseAdmin
      .rpc("get_house_role", { _user_id: userId, _house_id: houseId });

    if (roleError || roleData !== "owner") {
      throw new Error("Only house owners can approve duplicates");
    }

    // Calculate billing month
    const [year, month] = invoiceMonth.split('-').map(Number);
    const billingMonth = `${year}-${String(month).padStart(2, '0')}-01`;

    // Fetch category history for this house
    const { data: categoryHistory } = await supabaseAdmin
      .from("transactions")
      .select("description, category")
      .eq("house_id", houseId)
      .neq("category", "Não classificado")
      .not("category", "is", null);

    // Build category map
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
    }

    // Prepare transactions to insert
    const transactionsToInsert = (approvedTransactions as ApprovedTransaction[]).map((t) => {
      const descLower = t.description?.toLowerCase().trim();
      const historicalCategory = descLower ? categoryMap.get(descLower) : null;
      
      // Priority: 1) User history, 2) AI, 3) Unclassified
      const finalCategory = historicalCategory || t.category || "Não classificado";
      
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

    if (transactionsToInsert.length === 0) {
      // Update upload log status to completed
      await supabaseAdmin
        .from("upload_logs")
        .update({ status: "completed" })
        .eq("id", uploadId);

      return new Response(
        JSON.stringify({
          success: true,
          itemsCount: 0,
          message: "Nenhuma transação aprovada.",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Insert approved transactions
    const { error: insertError } = await supabaseAdmin
      .from("transactions")
      .insert(transactionsToInsert);

    if (insertError) {
      console.error("Error inserting approved transactions:", insertError);
      throw new Error("Failed to save approved transactions");
    }

    // Update upload log with total count and completed status
    const { data: uploadLog } = await supabaseAdmin
      .from("upload_logs")
      .select("items_count")
      .eq("id", uploadId)
      .single();

    const previousCount = uploadLog?.items_count || 0;
    const newTotal = previousCount + transactionsToInsert.length;

    await supabaseAdmin
      .from("upload_logs")
      .update({
        status: "completed",
        items_count: newTotal,
      })
      .eq("id", uploadId);

    console.log(`Approved and inserted ${transactionsToInsert.length} transactions from duplicates review`);

    return new Response(
      JSON.stringify({
        success: true,
        itemsCount: transactionsToInsert.length,
        message: `${transactionsToInsert.length} transações aprovadas e importadas com sucesso!`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in approve-duplicates:", error);
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

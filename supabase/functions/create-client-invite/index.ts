import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Não autorizado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Client with user token to verify identity
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get current user
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Usuário não autenticado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Admin client for operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Check if user is a planner
    const { data: plannerProfile, error: profileError } = await supabaseAdmin
      .from("planner_profiles")
      .select("id, planner_role, client_invite_limit, is_active")
      .eq("id", user.id)
      .single();

    if (profileError || !plannerProfile) {
      return new Response(
        JSON.stringify({ error: "Apenas planejadores podem criar convites" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!plannerProfile.is_active) {
      return new Response(
        JSON.stringify({ error: "Sua conta de planejador está inativa" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get current invite stats
    const { data: stats } = await supabaseAdmin.rpc("get_planner_invite_stats", {
      planner_uuid: user.id,
    });

    const usedInvites = stats?.used ?? 0;
    const activeInvites = stats?.active ?? 0;
    const inviteLimit = plannerProfile.client_invite_limit ?? 5;

    // Check if limit is reached (used + active >= limit)
    // Limit of 0 means unlimited
    if (inviteLimit > 0 && (usedInvites + activeInvites) >= inviteLimit) {
      return new Response(
        JSON.stringify({ 
          error: "Você atingiu o limite de convites",
          used: usedInvites,
          active: activeInvites,
          limit: inviteLimit,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse optional expires_in_days from request body
    let expiresInDays = 30;
    try {
      const body = await req.json();
      if (body?.expires_in_days && typeof body.expires_in_days === "number") {
        expiresInDays = Math.min(Math.max(body.expires_in_days, 1), 365);
      }
    } catch {
      // No body or invalid JSON - use default
    }

    // Create the invite
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    const { data: newInvite, error: insertError } = await supabaseAdmin
      .from("planner_invites")
      .insert({
        planner_id: user.id,
        expires_at: expiresAt.toISOString(),
      })
      .select("id, invite_code, expires_at, created_at")
      .single();

    if (insertError) {
      console.error("Error creating invite:", insertError);
      return new Response(
        JSON.stringify({ error: "Erro ao criar convite" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        invite: newInvite,
        remaining: inviteLimit > 0 ? inviteLimit - usedInvites - activeInvites - 1 : null,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Erro interno do servidor" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

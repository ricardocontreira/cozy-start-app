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

    // Create Supabase client with user's token
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

    // Check if user is planner_admin using planner_profiles table
    const { data: plannerProfile, error: profileError } = await supabaseUser
      .from("planner_profiles")
      .select("planner_role")
      .eq("id", user.id)
      .single();

    if (profileError || plannerProfile?.planner_role !== "planner_admin") {
      return new Response(
        JSON.stringify({ error: "Apenas administradores de planejamento podem criar planejadores" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const { fullName, email, password, clientInviteLimit } = await req.json();

    if (!fullName || !email || !password) {
      return new Response(
        JSON.stringify({ error: "Nome, email e senha são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create admin client to create user
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Try to create the new planner user
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        profile_role: "planner",
        parent_planner_id: user.id,
      },
    });

    const createdUser = newUser.user;
    if (createError || !createdUser) {
      console.error("Error creating user:", createError);

      // Email already exists in the authentication system (cannot create a 2nd account with same email)
      if ((createError as any)?.code === "email_exists" || createError?.message?.includes("already been registered")) {
        return new Response(
          JSON.stringify({
            error: "Este e-mail já está cadastrado. Para criar um planejador separado, use outro e-mail.",
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ error: "Erro ao criar planejador: " + (createError?.message ?? "erro desconhecido") }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = createdUser.id;

    // Update client_invite_limit if provided
    if (clientInviteLimit !== undefined && clientInviteLimit !== null) {
      const { error: updateError } = await supabaseAdmin
        .from("planner_profiles")
        .update({ client_invite_limit: clientInviteLimit })
        .eq("id", userId);

      if (updateError) {
        console.error("Error updating client_invite_limit:", updateError);
        // Don't fail the request, just log the error
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Planejador criado com sucesso",
        userId,
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

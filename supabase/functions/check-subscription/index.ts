import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

// Safely convert Unix timestamp to ISO string
const safeTimestampToISO = (timestamp: unknown): string | null => {
  try {
    if (timestamp === null || timestamp === undefined) return null;
    const ts = Number(timestamp);
    if (isNaN(ts) || ts <= 0) return null;
    const date = new Date(ts * 1000);
    if (isNaN(date.getTime())) return null;
    return date.toISOString();
  } catch {
    return null;
  }
};

// Helper function to check owner's subscription status
async function checkOwnerSubscription(
  supabaseClient: any,
  stripe: Stripe,
  ownerId: string
): Promise<{
  hasAccess: boolean;
  ownerSubscriptionStatus: 'active' | 'trial' | 'expired' | 'sponsored';
  ownerTrialEndsAt: string | null;
}> {
  // Get owner's profile
  const { data: ownerProfile } = await supabaseClient
    .from("user_profiles")
    .select("trial_ends_at, bypass_subscription, invited_by_planner_id")
    .eq("id", ownerId)
    .single();

  // Check bypass
  if (ownerProfile?.bypass_subscription) {
    return { hasAccess: true, ownerSubscriptionStatus: 'active', ownerTrialEndsAt: null };
  }

  // Check planner sponsorship
  if (ownerProfile?.invited_by_planner_id) {
    const { data: plannerProfile } = await supabaseClient
      .from("planner_profiles")
      .select("is_active")
      .eq("id", ownerProfile.invited_by_planner_id)
      .single();

    if (plannerProfile?.is_active) {
      return { hasAccess: true, ownerSubscriptionStatus: 'sponsored', ownerTrialEndsAt: null };
    }
  }

  // Check trial
  const ownerTrialEndsAt = ownerProfile?.trial_ends_at ?? null;
  const ownerIsInTrial = ownerTrialEndsAt ? new Date(ownerTrialEndsAt) > new Date() : false;

  if (ownerIsInTrial) {
    return { hasAccess: true, ownerSubscriptionStatus: 'trial', ownerTrialEndsAt };
  }

  // Get owner's email to check Stripe
  const { data: ownerUser } = await supabaseClient.auth.admin.getUserById(ownerId);
  
  if (!ownerUser?.user?.email) {
    return { hasAccess: false, ownerSubscriptionStatus: 'expired', ownerTrialEndsAt };
  }

  // Check Stripe subscription
  const customers = await stripe.customers.list({ email: ownerUser.user.email, limit: 1 });

  if (customers.data.length === 0) {
    return { hasAccess: false, ownerSubscriptionStatus: 'expired', ownerTrialEndsAt };
  }

  const subscriptions = await stripe.subscriptions.list({
    customer: customers.data[0].id,
    status: "active",
    limit: 1,
  });

  if (subscriptions.data.length > 0) {
    return { hasAccess: true, ownerSubscriptionStatus: 'active', ownerTrialEndsAt: null };
  }

  return { hasAccess: false, ownerSubscriptionStatus: 'expired', ownerTrialEndsAt };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    
    // Handle missing or expired sessions gracefully (not as an error)
    if (userError || !userData.user?.email) {
      logStep("No valid session, returning unsubscribed state");
      return new Response(JSON.stringify({ 
        subscribed: false,
        trial_ends_at: null,
        is_in_trial: false,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }
    
    const user = userData.user;
    
    logStep("User authenticated", { userId: user.id, email: user.email });

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    // Check if user is a house member (not owner)
    const { data: houseMembership } = await supabaseClient
      .from("house_members")
      .select("house_id, role")
      .eq("user_id", user.id)
      .single();

    // If user is a member (viewer role), check owner's subscription
    if (houseMembership && houseMembership.role === "viewer") {
      // Get house details separately
      const { data: house } = await supabaseClient
        .from("houses")
        .select("id, name, owner_id")
        .eq("id", houseMembership.house_id)
        .single();
      
      if (house) {
        logStep("User is house member, checking owner subscription", { 
          userId: user.id, 
          houseId: house.id, 
          ownerId: house.owner_id 
        });

        const ownerStatus = await checkOwnerSubscription(supabaseClient, stripe, house.owner_id);
        
        logStep("Owner subscription status", ownerStatus);

        return new Response(JSON.stringify({
          subscribed: ownerStatus.hasAccess,
          is_house_member: true,
          owner_has_access: ownerStatus.hasAccess,
          owner_subscription_status: ownerStatus.ownerSubscriptionStatus,
          owner_trial_ends_at: ownerStatus.ownerTrialEndsAt,
          house_name: house.name,
          trial_ends_at: null,
          is_in_trial: false,
          planner_sponsored: false,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }
    }

    // Rest of the logic for owners and non-members
    // Fetch trial_ends_at, bypass_subscription and invited_by_planner_id from user_profiles
    const { data: profile } = await supabaseClient
      .from("user_profiles")
      .select("trial_ends_at, bypass_subscription, invited_by_planner_id")
      .eq("id", user.id)
      .single();

    const bypassSubscription = profile?.bypass_subscription ?? false;
    const invitedByPlannerId = profile?.invited_by_planner_id ?? null;
    const trialEndsAt = profile?.trial_ends_at ?? null;
    const isInTrial = trialEndsAt ? new Date(trialEndsAt) > new Date() : false;
    
    // Se tem bypass, retornar como subscribed imediatamente
    if (bypassSubscription) {
      logStep("Bypass subscription enabled for user", { userId: user.id });
      return new Response(JSON.stringify({ 
        subscribed: true,
        bypass_active: true,
        subscription_end: null,
        cancel_at_period_end: false,
        trial_ends_at: null,
        is_in_trial: false,
        planner_sponsored: false,
        is_house_member: false,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Se foi convidado por um planejador, tem acesso gratuito
    if (invitedByPlannerId) {
      // Verificar se o planejador ainda está ativo
      const { data: plannerProfile } = await supabaseClient
        .from("planner_profiles")
        .select("id, full_name, is_active")
        .eq("id", invitedByPlannerId)
        .single();

      if (plannerProfile?.is_active) {
        logStep("User sponsored by planner", { userId: user.id, plannerId: invitedByPlannerId });
        return new Response(JSON.stringify({ 
          subscribed: true,
          planner_sponsored: true,
          sponsoring_planner_id: invitedByPlannerId,
          sponsoring_planner_name: plannerProfile.full_name,
          subscription_end: null,
          cancel_at_period_end: false,
          trial_ends_at: null,
          is_in_trial: false,
          is_house_member: false,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      } else {
        logStep("Planner sponsorship inactive", { userId: user.id, plannerId: invitedByPlannerId });
      }
    }
    
    logStep("Trial status", { trialEndsAt, isInTrial });

    const customers = await stripe.customers.list({ email: user.email, limit: 1 });

    if (customers.data.length === 0) {
      logStep("No customer found, checking trial status");
      
      await supabaseClient
        .from("user_profiles")
        .update({ subscription_status: "inactive" })
        .eq("id", user.id);

      return new Response(JSON.stringify({ 
        subscribed: false,
        trial_ends_at: trialEndsAt,
        is_in_trial: isInTrial,
        is_house_member: false,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    logStep("Found Stripe customer", { customerId });

    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });

    const hasActiveSub = subscriptions.data.length > 0;
    let subscriptionEnd: string | null = null;
    let subscriptionId: string | null = null;
    let cancelAtPeriodEnd = false;

    if (hasActiveSub) {
      const subscription = subscriptions.data[0];
      subscriptionId = subscription.id;
      subscriptionEnd = safeTimestampToISO(subscription.current_period_end);
      cancelAtPeriodEnd = subscription.cancel_at_period_end ?? false;
      
      logStep("Active subscription found", { 
        subscriptionId, 
        endDate: subscriptionEnd,
        cancelAtPeriodEnd 
      });

      const status = cancelAtPeriodEnd ? "cancelling" : "active";
      await supabaseClient
        .from("user_profiles")
        .update({
          subscription_status: status,
          stripe_customer_id: customerId,
          subscription_id: subscriptionId,
        })
        .eq("id", user.id);
    } else {
      logStep("No active subscription found");
      
      await supabaseClient
        .from("user_profiles")
        .update({ subscription_status: "inactive" })
        .eq("id", user.id);
    }

    return new Response(JSON.stringify({
      subscribed: hasActiveSub,
      subscription_end: subscriptionEnd,
      cancel_at_period_end: cancelAtPeriodEnd,
      trial_ends_at: trialEndsAt,
      is_in_trial: isInTrial,
      is_house_member: false,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

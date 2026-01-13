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

    // Fetch trial_ends_at from profile
    const { data: profile } = await supabaseClient
      .from("profiles")
      .select("trial_ends_at")
      .eq("id", user.id)
      .single();

    const trialEndsAt = profile?.trial_ends_at ?? null;
    const isInTrial = trialEndsAt ? new Date(trialEndsAt) > new Date() : false;
    
    logStep("Trial status", { trialEndsAt, isInTrial });

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });

    if (customers.data.length === 0) {
      logStep("No customer found, checking trial status");
      
      await supabaseClient
        .from("profiles")
        .update({ subscription_status: "inactive" })
        .eq("id", user.id);

      return new Response(JSON.stringify({ 
        subscribed: false,
        trial_ends_at: trialEndsAt,
        is_in_trial: isInTrial,
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
        .from("profiles")
        .update({
          subscription_status: status,
          stripe_customer_id: customerId,
          subscription_id: subscriptionId,
        })
        .eq("id", user.id);
    } else {
      logStep("No active subscription found");
      
      await supabaseClient
        .from("profiles")
        .update({ subscription_status: "inactive" })
        .eq("id", user.id);
    }

    return new Response(JSON.stringify({
      subscribed: hasActiveSub,
      subscription_end: subscriptionEnd,
      cancel_at_period_end: cancelAtPeriodEnd,
      trial_ends_at: trialEndsAt,
      is_in_trial: isInTrial,
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

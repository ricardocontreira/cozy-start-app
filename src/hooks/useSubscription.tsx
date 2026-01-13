import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useToast } from "@/components/ui/use-toast";

interface SubscriptionState {
  isSubscribed: boolean;
  loading: boolean;
  subscriptionEnd: string | null;
  cancelAtPeriodEnd: boolean;
  cancelling: boolean;
  trialEndsAt: string | null;
  isInTrial: boolean;
  hasAccess: boolean; // subscribed OR in trial
}

export function useSubscription() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [state, setState] = useState<SubscriptionState>({
    isSubscribed: false,
    loading: true,
    subscriptionEnd: null,
    cancelAtPeriodEnd: false,
    cancelling: false,
    trialEndsAt: null,
    isInTrial: false,
    hasAccess: false,
  });

  const checkSubscription = useCallback(async () => {
    if (!user) {
      setState({ 
        isSubscribed: false, 
        loading: false, 
        subscriptionEnd: null,
        cancelAtPeriodEnd: false,
        cancelling: false,
        trialEndsAt: null,
        isInTrial: false,
        hasAccess: false,
      });
      return;
    }

    try {
      setState(prev => ({ ...prev, loading: true }));
      
      const { data, error } = await supabase.functions.invoke("check-subscription");

      if (error) {
        console.error("Error checking subscription:", error);
        setState(prev => ({ ...prev, loading: false }));
        return;
      }

      const isSubscribed = data?.subscribed ?? false;
      const isInTrial = data?.is_in_trial ?? false;
      const hasAccess = isSubscribed || isInTrial;

      setState(prev => ({
        ...prev,
        isSubscribed,
        loading: false,
        subscriptionEnd: data?.subscription_end ?? null,
        cancelAtPeriodEnd: data?.cancel_at_period_end ?? false,
        trialEndsAt: data?.trial_ends_at ?? null,
        isInTrial,
        hasAccess,
      }));
    } catch (error) {
      console.error("Error checking subscription:", error);
      setState(prev => ({ ...prev, loading: false }));
    }
  }, [user]);

  const cancelSubscription = useCallback(async () => {
    if (!user) {
      toast({
        title: "Erro",
        description: "Você precisa estar logado para cancelar.",
        variant: "destructive",
      });
      return { success: false };
    }

    try {
      setState(prev => ({ ...prev, cancelling: true }));
      
      const { data, error } = await supabase.functions.invoke("cancel-subscription");

      if (error) {
        throw error;
      }

      toast({
        title: "Assinatura cancelada",
        description: "Você ainda terá acesso até o fim do período pago.",
      });

      // Refresh subscription status
      await checkSubscription();
      
      return { success: true };
    } catch (error) {
      console.error("Error cancelling subscription:", error);
      toast({
        title: "Erro",
        description: "Não foi possível cancelar a assinatura. Tente novamente.",
        variant: "destructive",
      });
      return { success: false };
    } finally {
      setState(prev => ({ ...prev, cancelling: false }));
    }
  }, [user, toast, checkSubscription]);

  const startCheckout = useCallback(async () => {
    if (!user) {
      toast({
        title: "Erro",
        description: "Você precisa estar logado para assinar.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke("create-checkout-session");

      if (error) {
        throw error;
      }

      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (error) {
      console.error("Error creating checkout:", error);
      toast({
        title: "Erro",
        description: "Não foi possível iniciar o checkout. Tente novamente.",
        variant: "destructive",
      });
    }
  }, [user, toast]);

  useEffect(() => {
    checkSubscription();
  }, [checkSubscription]);

  // Refresh subscription status periodically (every 60 seconds)
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(checkSubscription, 60000);
    return () => clearInterval(interval);
  }, [user, checkSubscription]);

  // Helper to calculate days remaining in trial
  const getTrialDaysRemaining = useCallback(() => {
    if (!state.trialEndsAt) return 0;
    const now = new Date();
    const trialEnd = new Date(state.trialEndsAt);
    const diffTime = trialEnd.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  }, [state.trialEndsAt]);

  return {
    ...state,
    checkSubscription,
    startCheckout,
    cancelSubscription,
    getTrialDaysRemaining,
  };
}

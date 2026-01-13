import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useToast } from "@/components/ui/use-toast";

interface SubscriptionState {
  isSubscribed: boolean;
  loading: boolean;
  subscriptionEnd: string | null;
}

export function useSubscription() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [state, setState] = useState<SubscriptionState>({
    isSubscribed: false,
    loading: true,
    subscriptionEnd: null,
  });

  const checkSubscription = useCallback(async () => {
    if (!user) {
      setState({ isSubscribed: false, loading: false, subscriptionEnd: null });
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

      setState({
        isSubscribed: data?.subscribed ?? false,
        loading: false,
        subscriptionEnd: data?.subscription_end ?? null,
      });
    } catch (error) {
      console.error("Error checking subscription:", error);
      setState(prev => ({ ...prev, loading: false }));
    }
  }, [user]);

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

  return {
    ...state,
    checkSubscription,
    startCheckout,
  };
}

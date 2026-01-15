import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

export interface PlannerClient {
  id: string;
  full_name: string | null;
  phone: string | null;
  created_at: string | null;
}

export function usePlannerClients() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [clients, setClients] = useState<PlannerClient[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchClients = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("user_profiles")
        .select("id, full_name, phone, created_at")
        .eq("invited_by_planner_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setClients(data || []);
    } catch (error) {
      console.error("Error fetching clients:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchClients();
    }
  }, [user, fetchClients]);

  const unlinkClient = async (clientId: string): Promise<boolean> => {
    if (!user) return false;

    try {
      // We need to use a service role or RPC for this since RLS won't allow direct update
      // For now, we'll inform the user this needs admin action
      toast({
        title: "Ação não disponível",
        description: "Contate o suporte para desvincular um cliente.",
        variant: "destructive",
      });
      return false;
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível desvincular o cliente.",
        variant: "destructive",
      });
      return false;
    }
  };

  return {
    clients,
    loading,
    unlinkClient,
    refreshClients: fetchClients,
  };
}

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

export interface PlannerInvite {
  id: string;
  invite_code: string;
  used_by: string | null;
  used_at: string | null;
  expires_at: string | null;
  created_at: string;
}

export interface InviteStats {
  used: number;
  active: number;
  limit: number;
}

export function usePlannerInvites() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [invites, setInvites] = useState<PlannerInvite[]>([]);
  const [stats, setStats] = useState<InviteStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const fetchInvites = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Fetch invites
      const { data: invitesData, error: invitesError } = await supabase
        .from("planner_invites")
        .select("*")
        .eq("planner_id", user.id)
        .order("created_at", { ascending: false });

      if (invitesError) throw invitesError;

      setInvites(invitesData || []);

      // Fetch stats
      const { data: statsData, error: statsError } = await supabase.rpc(
        "get_planner_invite_stats",
        { planner_uuid: user.id }
      );

      if (!statsError && statsData && typeof statsData === "object") {
        const typedStats = statsData as unknown as InviteStats;
        if (typeof typedStats.used === "number" && typeof typedStats.active === "number") {
          setStats(typedStats);
        }
      }
    } catch (error) {
      console.error("Error fetching invites:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchInvites();
    }
  }, [user, fetchInvites]);

  const createInvite = async (expiresInDays = 30): Promise<PlannerInvite | null> => {
    if (!user) return null;

    try {
      setCreating(true);

      const { data, error } = await supabase.functions.invoke("create-client-invite", {
        body: { expires_in_days: expiresInDays },
      });

      if (error) throw error;

      if (data?.error) {
        toast({
          title: "Erro ao criar convite",
          description: data.error,
          variant: "destructive",
        });
        return null;
      }

      toast({
        title: "Convite criado!",
        description: `Código: ${data.invite.invite_code}`,
      });

      await fetchInvites();
      return data.invite;
    } catch (error: any) {
      toast({
        title: "Erro ao criar convite",
        description: error.message || "Tente novamente.",
        variant: "destructive",
      });
      return null;
    } finally {
      setCreating(false);
    }
  };

  const deleteInvite = async (inviteId: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from("planner_invites")
        .delete()
        .eq("id", inviteId)
        .eq("planner_id", user.id)
        .is("used_by", null);

      if (error) throw error;

      toast({
        title: "Convite excluído",
        description: "O convite foi removido.",
      });

      await fetchInvites();
      return true;
    } catch (error) {
      toast({
        title: "Erro ao excluir",
        description: "Não foi possível excluir o convite.",
        variant: "destructive",
      });
      return false;
    }
  };

  const copyInviteCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({
      title: "Código copiado!",
      description: code,
    });
  };

  // Filter invites by status
  const activeInvites = invites.filter(
    (inv) => !inv.used_by && (!inv.expires_at || new Date(inv.expires_at) > new Date())
  );

  const usedInvites = invites.filter((inv) => inv.used_by);

  const expiredInvites = invites.filter(
    (inv) => !inv.used_by && inv.expires_at && new Date(inv.expires_at) <= new Date()
  );

  return {
    invites,
    activeInvites,
    usedInvites,
    expiredInvites,
    stats,
    loading,
    creating,
    createInvite,
    deleteInvite,
    copyInviteCode,
    refreshInvites: fetchInvites,
  };
}

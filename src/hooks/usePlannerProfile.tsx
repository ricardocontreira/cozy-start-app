import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

export type ProfileRole = "user" | "planner_admin" | "planner";

export interface PlannerProfile {
  id: string;
  full_name: string | null;
  profile_role: ProfileRole;
  cnpj: string | null;
  razao_social: string | null;
  parent_planner_id: string | null;
  planner_onboarding_complete: boolean | null;
}

export function usePlannerProfile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState<PlannerProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchProfile();
    } else {
      setProfile(null);
      setLoading(false);
    }
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, profile_role, cnpj, razao_social, parent_planner_id, planner_onboarding_complete")
        .eq("id", user.id)
        .single();

      if (error) throw error;

      setProfile(data as PlannerProfile);
    } catch (error) {
      console.error("Error fetching planner profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const updatePlannerOnboarding = async (data: { cnpj?: string; razao_social: string }) => {
    if (!user) return { error: new Error("Not authenticated") };

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          cnpj: data.cnpj || null,
          razao_social: data.razao_social,
          planner_onboarding_complete: true,
        })
        .eq("id", user.id);

      if (error) throw error;

      await fetchProfile();
      
      toast({
        title: "Dados salvos!",
        description: "Seu cadastro profissional foi concluído.",
      });

      return { error: null };
    } catch (error) {
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar os dados. Tente novamente.",
        variant: "destructive",
      });
      return { error: error as Error };
    }
  };

  const isPlannerAdmin = profile?.profile_role === "planner_admin";
  const isPlanner = profile?.profile_role === "planner" || profile?.profile_role === "planner_admin";
  const needsOnboarding = isPlannerAdmin && !profile?.planner_onboarding_complete;

  return {
    profile,
    loading,
    isPlannerAdmin,
    isPlanner,
    needsOnboarding,
    updatePlannerOnboarding,
    refreshProfile: fetchProfile,
  };
}

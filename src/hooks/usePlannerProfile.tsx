import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

export type PlannerRole = "planner_admin" | "planner";

export interface PlannerProfile {
  id: string;
  full_name: string | null;
  cnpj: string | null;
  razao_social: string | null;
  planner_role: PlannerRole;
  parent_planner_id: string | null;
  onboarding_complete: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function usePlannerProfile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState<PlannerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPlannerUser, setIsPlannerUser] = useState(false);

  useEffect(() => {
    if (user) {
      fetchProfile();
    } else {
      setProfile(null);
      setIsPlannerUser(false);
      setLoading(false);
    }
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("planner_profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          // No profile found - user is not a planner
          setProfile(null);
          setIsPlannerUser(false);
        } else {
          throw error;
        }
      } else {
        setProfile(data as PlannerProfile);
        setIsPlannerUser(true);
      }
    } catch (error) {
      console.error("Error fetching planner profile:", error);
      setProfile(null);
      setIsPlannerUser(false);
    } finally {
      setLoading(false);
    }
  };

  const updatePlannerOnboarding = async (data: { cnpj?: string; razao_social: string }) => {
    if (!user) return { error: new Error("Not authenticated") };

    try {
      const { error } = await supabase
        .from("planner_profiles")
        .update({
          cnpj: data.cnpj || null,
          razao_social: data.razao_social,
          onboarding_complete: true,
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

  const updateProfile = async (data: Partial<PlannerProfile>) => {
    if (!user) return { error: new Error("Not authenticated") };

    try {
      const { error } = await supabase
        .from("planner_profiles")
        .update(data)
        .eq("id", user.id);

      if (error) throw error;

      await fetchProfile();
      
      toast({
        title: "Perfil atualizado!",
        description: "Suas informações foram salvas.",
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

  const isPlannerAdmin = profile?.planner_role === "planner_admin";
  const isPlanner = profile?.planner_role === "planner" || profile?.planner_role === "planner_admin";
  const needsOnboarding = isPlannerAdmin && !profile?.onboarding_complete;

  return {
    profile,
    loading,
    isPlannerUser,
    isPlannerAdmin,
    isPlanner,
    needsOnboarding,
    updatePlannerOnboarding,
    updateProfile,
    refreshProfile: fetchProfile,
  };
}

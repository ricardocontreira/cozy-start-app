import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

export interface TeamMember {
  id: string;
  full_name: string | null;
  planner_role: "planner_admin" | "planner";
  cnpj: string | null;
  razao_social: string | null;
  parent_planner_id: string | null;
  onboarding_complete: boolean;
  is_active: boolean;
}

export function usePlannerTeam() {
  const { user, session } = useAuth();
  const { toast } = useToast();
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchTeamMembers();
    }
  }, [user]);

  const fetchTeamMembers = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("planner_profiles")
        .select("id, full_name, planner_role, cnpj, razao_social, parent_planner_id, onboarding_complete, is_active")
        .eq("parent_planner_id", user.id);

      if (error) throw error;

      setTeamMembers(data as TeamMember[]);
    } catch (error) {
      console.error("Error fetching team members:", error);
    } finally {
      setLoading(false);
    }
  };

  const createPlannerAssistant = async (
    fullName: string,
    email: string,
    password: string
  ): Promise<boolean> => {
    if (!user || !session) {
      toast({
        title: "Erro",
        description: "Você precisa estar autenticado.",
        variant: "destructive",
      });
      return false;
    }

    try {
      const response = await supabase.functions.invoke("create-planner", {
        body: {
          fullName,
          email,
          password,
        },
      });

      if (response.error) {
        throw response.error;
      }

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      toast({
        title: "Planejador criado!",
        description: `${fullName} foi adicionado à sua equipe.`,
      });

      await fetchTeamMembers();
      return true;
    } catch (error: any) {
      toast({
        title: "Erro ao criar planejador",
        description: error.message || "Não foi possível criar o planejador. Tente novamente.",
        variant: "destructive",
      });
      return false;
    }
  };

  const removePlannerAssistant = async (plannerId: string): Promise<boolean> => {
    if (!user) return false;

    try {
      // Remove the parent_planner_id link
      const { error } = await supabase
        .from("planner_profiles")
        .update({ parent_planner_id: null })
        .eq("id", plannerId)
        .eq("parent_planner_id", user.id);

      if (error) throw error;

      toast({
        title: "Planejador removido",
        description: "O planejador foi removido da sua equipe.",
      });

      await fetchTeamMembers();
      return true;
    } catch (error) {
      toast({
        title: "Erro ao remover",
        description: "Não foi possível remover o planejador. Tente novamente.",
        variant: "destructive",
      });
      return false;
    }
  };

  const togglePlannerStatus = async (plannerId: string, isActive: boolean): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from("planner_profiles")
        .update({ is_active: isActive })
        .eq("id", plannerId)
        .eq("parent_planner_id", user.id);

      if (error) throw error;

      toast({
        title: isActive ? "Planejador ativado" : "Planejador inativado",
        description: isActive
          ? "O planejador pode acessar o sistema novamente."
          : "O planejador não poderá mais acessar o sistema.",
      });

      await fetchTeamMembers();
      return true;
    } catch (error) {
      toast({
        title: "Erro ao alterar status",
        description: "Não foi possível alterar o status. Tente novamente.",
        variant: "destructive",
      });
      return false;
    }
  };

  return {
    teamMembers,
    loading,
    createPlannerAssistant,
    removePlannerAssistant,
    togglePlannerStatus,
    refreshTeam: fetchTeamMembers,
  };
}

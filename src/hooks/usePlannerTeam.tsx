import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { PlannerProfile } from "./usePlannerProfile";

export function usePlannerTeam() {
  const { user, session } = useAuth();
  const { toast } = useToast();
  const [teamMembers, setTeamMembers] = useState<PlannerProfile[]>([]);
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
        .from("profiles")
        .select("id, full_name, profile_role, cnpj, razao_social, parent_planner_id, planner_onboarding_complete")
        .eq("parent_planner_id", user.id);

      if (error) throw error;

      setTeamMembers(data as PlannerProfile[]);
    } catch (error) {
      console.error("Error fetching team members:", error);
    } finally {
      setLoading(false);
    }
  };

  const createPlannerAssistant = async (data: {
    fullName: string;
    email: string;
    password: string;
  }) => {
    if (!user || !session) {
      return { error: new Error("Not authenticated") };
    }

    try {
      const response = await supabase.functions.invoke("create-planner", {
        body: {
          fullName: data.fullName,
          email: data.email,
          password: data.password,
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
        description: `${data.fullName} foi adicionado à sua equipe.`,
      });

      await fetchTeamMembers();
      return { error: null };
    } catch (error: any) {
      toast({
        title: "Erro ao criar planejador",
        description: error.message || "Não foi possível criar o planejador. Tente novamente.",
        variant: "destructive",
      });
      return { error: error as Error };
    }
  };

  const removePlannerAssistant = async (plannerId: string) => {
    if (!user) return { error: new Error("Not authenticated") };

    try {
      // Remove the parent_planner_id link (we don't delete the user)
      const { error } = await supabase
        .from("profiles")
        .update({ parent_planner_id: null, profile_role: "user" })
        .eq("id", plannerId)
        .eq("parent_planner_id", user.id);

      if (error) throw error;

      toast({
        title: "Planejador removido",
        description: "O planejador foi removido da sua equipe.",
      });

      await fetchTeamMembers();
      return { error: null };
    } catch (error) {
      toast({
        title: "Erro ao remover",
        description: "Não foi possível remover o planejador. Tente novamente.",
        variant: "destructive",
      });
      return { error: error as Error };
    }
  };

  return {
    teamMembers,
    loading,
    createPlannerAssistant,
    removePlannerAssistant,
    refreshTeam: fetchTeamMembers,
  };
}

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useToast } from "./use-toast";

export interface House {
  id: string;
  name: string;
  invite_code: string;
  owner_id: string;
  created_at: string;
}

export interface HouseMember {
  id: string;
  house_id: string;
  user_id: string;
  role: "owner" | "viewer";
  joined_at: string;
}

export function useHouse() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [houses, setHouses] = useState<House[]>([]);
  const [currentHouse, setCurrentHouse] = useState<House | null>(null);
  const [memberRole, setMemberRole] = useState<"owner" | "viewer" | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchHouses = async () => {
    if (!user) return;
    
    try {
      const { data: memberData, error: memberError } = await supabase
        .from("house_members")
        .select("house_id, role")
        .eq("user_id", user.id);

      if (memberError) throw memberError;

      if (memberData && memberData.length > 0) {
        const houseIds = memberData.map((m) => m.house_id);
        
        const { data: housesData, error: housesError } = await supabase
          .from("houses")
          .select("*")
          .in("id", houseIds);

        if (housesError) throw housesError;

        setHouses(housesData || []);
        
        // Set first house as current if none selected
        if (housesData && housesData.length > 0 && !currentHouse) {
          setCurrentHouse(housesData[0]);
          const role = memberData.find((m) => m.house_id === housesData[0].id)?.role;
          setMemberRole(role as "owner" | "viewer" || null);
        }
      } else {
        setHouses([]);
        setCurrentHouse(null);
        setMemberRole(null);
      }
    } catch (error) {
      console.error("Error fetching houses:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHouses();
  }, [user]);

  const createHouse = async (name: string) => {
    if (!user) return { error: new Error("Usuário não autenticado") };

    try {
      const { data, error } = await supabase.rpc("create_house_with_owner", {
        house_name: name,
      });

      if (error) throw error;

      toast({
        title: "Casa criada!",
        description: `A casa "${name}" foi criada com sucesso.`,
      });

      await fetchHouses();
      return { error: null, houseId: data };
    } catch (error: any) {
      toast({
        title: "Erro ao criar casa",
        description: error.message,
        variant: "destructive",
      });
      return { error };
    }
  };

  const joinHouse = async (code: string) => {
    if (!user) return { error: new Error("Usuário não autenticado") };

    try {
      const { data, error } = await supabase.rpc("join_house_by_code", {
        code: code.toUpperCase(),
      });

      if (error) throw error;

      toast({
        title: "Bem-vindo!",
        description: "Você entrou na Casa com sucesso.",
      });

      await fetchHouses();
      return { error: null, houseId: data };
    } catch (error: any) {
      toast({
        title: "Erro ao entrar na casa",
        description: error.message,
        variant: "destructive",
      });
      return { error };
    }
  };

  const selectHouse = async (houseId: string) => {
    const house = houses.find((h) => h.id === houseId);
    if (house) {
      setCurrentHouse(house);
      
      const { data } = await supabase
        .from("house_members")
        .select("role")
        .eq("house_id", houseId)
        .eq("user_id", user?.id)
        .maybeSingle();
      
      setMemberRole(data?.role as "owner" | "viewer" || null);
    }
  };

  return {
    houses,
    currentHouse,
    memberRole,
    loading,
    createHouse,
    joinHouse,
    selectHouse,
    refreshHouses: fetchHouses,
  };
}

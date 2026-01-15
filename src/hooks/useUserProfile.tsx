import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

export interface UserProfile {
  id: string;
  full_name: string | null;
  phone: string | null;
  birth_date: string | null;
  avatar_url: string | null;
  trial_ends_at: string | null;
  subscription_status: string | null;
  subscription_id: string | null;
  stripe_customer_id: string | null;
  bypass_subscription: boolean;
  created_at: string;
  updated_at: string;
}

export function useUserProfile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isNormalUser, setIsNormalUser] = useState(false);

  useEffect(() => {
    if (user) {
      fetchProfile();
    } else {
      setProfile(null);
      setIsNormalUser(false);
      setLoading(false);
    }
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          // No profile found - user is not a normal user
          setProfile(null);
          setIsNormalUser(false);
        } else {
          throw error;
        }
      } else {
        setProfile(data as UserProfile);
        setIsNormalUser(true);
      }
    } catch (error) {
      console.error("Error fetching user profile:", error);
      setProfile(null);
      setIsNormalUser(false);
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (data: Partial<UserProfile>) => {
    if (!user) return { error: new Error("Not authenticated") };

    try {
      const { error } = await supabase
        .from("user_profiles")
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

  const hasActiveSubscription = profile ? (
    profile.bypass_subscription ||
    profile.subscription_status === "active" ||
    profile.subscription_status === "cancelling" ||
    (profile.trial_ends_at && new Date(profile.trial_ends_at) > new Date())
  ) : false;

  return {
    profile,
    loading,
    isNormalUser,
    hasActiveSubscription,
    updateProfile,
    refreshProfile: fetchProfile,
  };
}

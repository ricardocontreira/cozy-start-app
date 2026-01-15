import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import type { ActiveRole } from "@/contexts/ActiveRoleContext";

interface UserCapabilities {
  canAccessPlannerAdmin: boolean;
  canAccessPlanner: boolean;
  canAccessUser: boolean;
  hasMultipleRoles: boolean;
  availableRoles: ActiveRole[];
  loading: boolean;
  isNormalUser: boolean;
  isPlannerUser: boolean;
}

export function useProfileRoles(): UserCapabilities {
  const { user, loading: authLoading } = useAuth();
  const [capabilities, setCapabilities] = useState<UserCapabilities>({
    canAccessPlannerAdmin: false,
    canAccessPlanner: false,
    canAccessUser: false,
    hasMultipleRoles: false,
    availableRoles: [],
    loading: true,
    isNormalUser: false,
    isPlannerUser: false,
  });

  useEffect(() => {
    const fetchCapabilities = async () => {
      if (!user) {
        setCapabilities({
          canAccessPlannerAdmin: false,
          canAccessPlanner: false,
          canAccessUser: false,
          hasMultipleRoles: false,
          availableRoles: [],
          loading: false,
          isNormalUser: false,
          isPlannerUser: false,
        });
        return;
      }

      try {
        // Check user_profiles table
        const { data: userProfile } = await supabase
          .from("user_profiles")
          .select("id")
          .eq("id", user.id)
          .single();

        // Check planner_profiles table
        const { data: plannerProfile } = await supabase
          .from("planner_profiles")
          .select("planner_role")
          .eq("id", user.id)
          .single();

        const isNormalUser = !!userProfile;
        const isPlannerUser = !!plannerProfile;

        // Check house membership for normal users
        let hasHouse = false;
        if (isNormalUser) {
          const { count: houseCount } = await supabase
            .from("house_members")
            .select("*", { count: "exact", head: true })
            .eq("user_id", user.id);
          hasHouse = (houseCount || 0) > 0;
        }

        const canAccessPlannerAdmin = plannerProfile?.planner_role === "planner_admin";
        const canAccessPlanner = isPlannerUser;
        const canAccessUser = isNormalUser && hasHouse;

        // Build available roles list
        const availableRoles: ActiveRole[] = [];
        if (canAccessPlannerAdmin) {
          availableRoles.push("planner_admin");
        } else if (plannerProfile?.planner_role === "planner") {
          availableRoles.push("planner");
        }
        if (canAccessUser) {
          availableRoles.push("user");
        }

        // Has multiple roles if both planner and user with house
        const hasMultipleRoles = isPlannerUser && isNormalUser && hasHouse;

        setCapabilities({
          canAccessPlannerAdmin,
          canAccessPlanner,
          canAccessUser,
          hasMultipleRoles,
          availableRoles,
          loading: false,
          isNormalUser,
          isPlannerUser,
        });
      } catch (error) {
        console.error("Error fetching profile roles:", error);
        setCapabilities({
          canAccessPlannerAdmin: false,
          canAccessPlanner: false,
          canAccessUser: false,
          hasMultipleRoles: false,
          availableRoles: [],
          loading: false,
          isNormalUser: false,
          isPlannerUser: false,
        });
      }
    };

    if (!authLoading) {
      fetchCapabilities();
    }
  }, [user, authLoading]);

  return capabilities;
}

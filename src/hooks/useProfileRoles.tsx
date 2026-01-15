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
        });
        return;
      }

      try {
        // Fetch profile role
        const { data: profile } = await supabase
          .from("profiles")
          .select("profile_role")
          .eq("id", user.id)
          .single();

        // Fetch house membership count
        const { count: houseCount } = await supabase
          .from("house_members")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id);

        const profileRole = profile?.profile_role || "user";
        const hasHouse = (houseCount || 0) > 0;

        const canAccessPlannerAdmin = profileRole === "planner_admin";
        const canAccessPlanner = profileRole === "planner" || profileRole === "planner_admin";
        const canAccessUser = hasHouse;

        // Build available roles list
        const availableRoles: ActiveRole[] = [];
        if (canAccessPlannerAdmin) {
          availableRoles.push("planner_admin");
        } else if (profileRole === "planner") {
          availableRoles.push("planner");
        }
        if (canAccessUser) {
          availableRoles.push("user");
        }

        // Has multiple roles if both planner type and user
        const isPlannerType = ["planner_admin", "planner"].includes(profileRole);
        const hasMultipleRoles = isPlannerType && hasHouse;

        setCapabilities({
          canAccessPlannerAdmin,
          canAccessPlanner,
          canAccessUser,
          hasMultipleRoles,
          availableRoles,
          loading: false,
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
        });
      }
    };

    if (!authLoading) {
      fetchCapabilities();
    }
  }, [user, authLoading]);

  return capabilities;
}

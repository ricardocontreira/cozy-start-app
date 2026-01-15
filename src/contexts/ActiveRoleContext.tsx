import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type ActiveRole = "planner_admin" | "planner" | "user" | null;

interface ActiveRoleContextType {
  activeRole: ActiveRole;
  setActiveRole: (role: ActiveRole) => void;
  clearActiveRole: () => void;
}

const STORAGE_KEY = "finlar_active_role";

const ActiveRoleContext = createContext<ActiveRoleContextType | undefined>(undefined);

export function ActiveRoleProvider({ children }: { children: ReactNode }) {
  const [activeRole, setActiveRoleState] = useState<ActiveRole>(() => {
    // Initialize from localStorage
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && ["planner_admin", "planner", "user"].includes(stored)) {
        return stored as ActiveRole;
      }
    }
    return null;
  });

  const setActiveRole = (role: ActiveRole) => {
    setActiveRoleState(role);
    if (role) {
      localStorage.setItem(STORAGE_KEY, role);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  const clearActiveRole = () => {
    setActiveRoleState(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  return (
    <ActiveRoleContext.Provider value={{ activeRole, setActiveRole, clearActiveRole }}>
      {children}
    </ActiveRoleContext.Provider>
  );
}

export function useActiveRole() {
  const context = useContext(ActiveRoleContext);
  if (context === undefined) {
    throw new Error("useActiveRole must be used within an ActiveRoleProvider");
  }
  return context;
}

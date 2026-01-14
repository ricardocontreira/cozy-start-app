import { createContext, useContext, useEffect, useMemo, useState } from "react";

export type AppTheme = "light" | "dark" | "system";

interface AppThemeContextValue {
  theme: AppTheme;
  resolvedTheme: "light" | "dark";
  setTheme: (theme: AppTheme) => void;
}

const AppThemeContext = createContext<AppThemeContextValue | undefined>(undefined);

function getSystemTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function applyThemeClass(resolved: "light" | "dark") {
  const root = document.documentElement;
  root.classList.toggle("dark", resolved === "dark");
}

export function AppThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<AppTheme>(() => {
    if (typeof window === "undefined") return "system";
    return (localStorage.getItem("theme") as AppTheme) || "system";
  });

  const resolvedTheme = useMemo(() => {
    return theme === "system" ? getSystemTheme() : theme;
  }, [theme]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    applyThemeClass(resolvedTheme);

    const media = window.matchMedia?.("(prefers-color-scheme: dark)");
    if (!media) return;

    const onChange = () => {
      if (theme === "system") applyThemeClass(getSystemTheme());
    };

    media.addEventListener?.("change", onChange);
    return () => media.removeEventListener?.("change", onChange);
  }, [theme, resolvedTheme]);

  const setTheme = (next: AppTheme) => {
    setThemeState(next);
    if (typeof window !== "undefined") {
      localStorage.setItem("theme", next);
    }
  };

  const value = useMemo(
    () => ({ theme, resolvedTheme, setTheme }),
    [theme, resolvedTheme],
  );

  return <AppThemeContext.Provider value={value}>{children}</AppThemeContext.Provider>;
}

export function useAppTheme() {
  const ctx = useContext(AppThemeContext);
  if (!ctx) throw new Error("useAppTheme must be used within AppThemeProvider");
  return ctx;
}

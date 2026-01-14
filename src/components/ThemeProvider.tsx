import { AppThemeProvider } from "@/hooks/useAppTheme";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return <AppThemeProvider>{children}</AppThemeProvider>;
}

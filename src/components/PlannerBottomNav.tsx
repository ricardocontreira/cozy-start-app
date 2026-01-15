import { useNavigate } from "react-router-dom";
import { LayoutDashboard, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PlannerBottomNavProps {
  activeRoute?: "home" | "settings";
}

export function PlannerBottomNav({ activeRoute }: PlannerBottomNavProps) {
  const navigate = useNavigate();

  const navItems = [
    { key: "home", icon: LayoutDashboard, label: "Início", path: "/planner" },
    { key: "settings", icon: Settings, label: "Config", path: "/planner/settings" },
  ] as const;

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border">
      <div className="flex items-center justify-around py-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeRoute === item.key;

          return (
            <Button
              key={item.key}
              variant="ghost"
              size="sm"
              className={`flex-col h-auto py-2 gap-1 ${isActive ? "text-primary" : ""}`}
              onClick={() => navigate(item.path)}
            >
              <Icon className="w-5 h-5" />
              <span className="text-xs">{item.label}</span>
            </Button>
          );
        })}
      </div>
    </nav>
  );
}

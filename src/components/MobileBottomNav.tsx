import { useNavigate } from "react-router-dom";
import { LayoutDashboard, CreditCard, Wallet, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MobileBottomNavProps {
  activeRoute?: "dashboard" | "cards" | "transactions" | "settings";
}

export function MobileBottomNav({ activeRoute }: MobileBottomNavProps) {
  const navigate = useNavigate();

  const navItems = [
    { key: "dashboard", icon: LayoutDashboard, label: "Início", path: "/dashboard" },
    { key: "cards", icon: CreditCard, label: "Cartões", path: "/cards" },
    { key: "transactions", icon: Wallet, label: "Transações", path: "/dashboard" },
    { key: "settings", icon: Settings, label: "Config", path: "/settings" },
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

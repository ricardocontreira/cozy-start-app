// Centralized transaction categories configuration
export interface Category {
  value: string;
  label: string;
  icon: string;
  color: {
    bg: string;
    text: string;
    chart: string;
  };
}

export const CATEGORIES: Category[] = [
  {
    value: "Alimentação",
    label: "Alimentação",
    icon: "🍔",
    color: {
      bg: "bg-orange-100 dark:bg-orange-900/30",
      text: "text-orange-700 dark:text-orange-400",
      chart: "hsl(24, 95%, 53%)",
    },
  },
  {
    value: "Transporte",
    label: "Transporte",
    icon: "🚗",
    color: {
      bg: "bg-blue-100 dark:bg-blue-900/30",
      text: "text-blue-700 dark:text-blue-400",
      chart: "hsl(217, 91%, 60%)",
    },
  },
  {
    value: "Compras",
    label: "Compras",
    icon: "🛒",
    color: {
      bg: "bg-purple-100 dark:bg-purple-900/30",
      text: "text-purple-700 dark:text-purple-400",
      chart: "hsl(271, 81%, 56%)",
    },
  },
  {
    value: "Saúde",
    label: "Saúde",
    icon: "💊",
    color: {
      bg: "bg-red-100 dark:bg-red-900/30",
      text: "text-red-700 dark:text-red-400",
      chart: "hsl(0, 84%, 60%)",
    },
  },
  {
    value: "Lazer",
    label: "Lazer",
    icon: "🎮",
    color: {
      bg: "bg-emerald-100 dark:bg-emerald-900/30",
      text: "text-emerald-700 dark:text-emerald-400",
      chart: "hsl(160, 84%, 39%)",
    },
  },
  {
    value: "Educação",
    label: "Educação",
    icon: "📚",
    color: {
      bg: "bg-cyan-100 dark:bg-cyan-900/30",
      text: "text-cyan-700 dark:text-cyan-400",
      chart: "hsl(199, 89%, 48%)",
    },
  },
  {
    value: "Moradia",
    label: "Moradia",
    icon: "🏠",
    color: {
      bg: "bg-amber-100 dark:bg-amber-900/30",
      text: "text-amber-700 dark:text-amber-400",
      chart: "hsl(38, 92%, 50%)",
    },
  },
  {
    value: "Serviços",
    label: "Serviços",
    icon: "⚙️",
    color: {
      bg: "bg-gray-100 dark:bg-gray-800",
      text: "text-gray-700 dark:text-gray-400",
      chart: "hsl(142, 76%, 36%)",
    },
  },
  {
    value: "Assinaturas",
    label: "Assinaturas",
    icon: "📺",
    color: {
      bg: "bg-indigo-100 dark:bg-indigo-900/30",
      text: "text-indigo-700 dark:text-indigo-400",
      chart: "hsl(234, 89%, 74%)",
    },
  },
  {
    value: "Não classificado",
    label: "Não classificado",
    icon: "❓",
    color: {
      bg: "bg-muted",
      text: "text-muted-foreground",
      chart: "hsl(215, 16%, 47%)",
    },
  },
];

export function getCategoryByValue(value: string | null): Category {
  const cat = CATEGORIES.find((c) => c.value === value);
  return cat || CATEGORIES[CATEGORIES.length - 1]; // Return "Não classificado" as default
}

export function getCategoryStyle(category: string | null) {
  const cat = getCategoryByValue(category);
  return {
    bg: cat.color.bg,
    text: cat.color.text,
    icon: cat.icon,
  };
}

export function getCategoryChartColors(): Record<string, string> {
  return CATEGORIES.reduce((acc, cat) => {
    acc[cat.value] = cat.color.chart;
    return acc;
  }, {} as Record<string, string>);
}

// Income categories
export const INCOME_CATEGORIES: Category[] = [
  {
    value: "Salário",
    label: "Salário",
    icon: "💰",
    color: {
      bg: "bg-green-100 dark:bg-green-900/30",
      text: "text-green-700 dark:text-green-400",
      chart: "hsl(142, 76%, 36%)",
    },
  },
  {
    value: "Freelance",
    label: "Freelance",
    icon: "💼",
    color: {
      bg: "bg-blue-100 dark:bg-blue-900/30",
      text: "text-blue-700 dark:text-blue-400",
      chart: "hsl(217, 91%, 60%)",
    },
  },
  {
    value: "Investimentos",
    label: "Investimentos",
    icon: "📈",
    color: {
      bg: "bg-emerald-100 dark:bg-emerald-900/30",
      text: "text-emerald-700 dark:text-emerald-400",
      chart: "hsl(160, 84%, 39%)",
    },
  },
  {
    value: "Aluguel Recebido",
    label: "Aluguel Recebido",
    icon: "🏠",
    color: {
      bg: "bg-amber-100 dark:bg-amber-900/30",
      text: "text-amber-700 dark:text-amber-400",
      chart: "hsl(38, 92%, 50%)",
    },
  },
  {
    value: "Vendas",
    label: "Vendas",
    icon: "🛍️",
    color: {
      bg: "bg-purple-100 dark:bg-purple-900/30",
      text: "text-purple-700 dark:text-purple-400",
      chart: "hsl(271, 81%, 56%)",
    },
  },
  {
    value: "Bonificações",
    label: "Bonificações",
    icon: "🎁",
    color: {
      bg: "bg-pink-100 dark:bg-pink-900/30",
      text: "text-pink-700 dark:text-pink-400",
      chart: "hsl(330, 81%, 60%)",
    },
  },
  {
    value: "Outros",
    label: "Outros",
    icon: "💵",
    color: {
      bg: "bg-gray-100 dark:bg-gray-800",
      text: "text-gray-700 dark:text-gray-400",
      chart: "hsl(215, 16%, 47%)",
    },
  },
];

export function getIncomeCategoryByValue(value: string | null): Category {
  const cat = INCOME_CATEGORIES.find((c) => c.value === value);
  return cat || INCOME_CATEGORIES[INCOME_CATEGORIES.length - 1];
}

export function getIncomeCategoryStyle(category: string | null) {
  const cat = getIncomeCategoryByValue(category);
  return {
    bg: cat.color.bg,
    text: cat.color.text,
    icon: cat.icon,
  };
}

// Category info with Lucide icons for use in components
import {
  Utensils,
  Car,
  ShoppingCart,
  Heart,
  Gamepad2,
  GraduationCap,
  Home,
  Wrench,
  Tv,
  HelpCircle,
  type LucideIcon,
} from "lucide-react";

export interface CategoryInfo {
  label: string;
  icon: LucideIcon;
  color: string;
}

const CATEGORY_ICONS: Record<string, { icon: LucideIcon; color: string }> = {
  "Alimentação": { icon: Utensils, color: "hsl(24, 95%, 53%)" },
  "Transporte": { icon: Car, color: "hsl(217, 91%, 60%)" },
  "Compras": { icon: ShoppingCart, color: "hsl(271, 81%, 56%)" },
  "Saúde": { icon: Heart, color: "hsl(0, 84%, 60%)" },
  "Lazer": { icon: Gamepad2, color: "hsl(160, 84%, 39%)" },
  "Educação": { icon: GraduationCap, color: "hsl(199, 89%, 48%)" },
  "Moradia": { icon: Home, color: "hsl(38, 92%, 50%)" },
  "Serviços": { icon: Wrench, color: "hsl(142, 76%, 36%)" },
  "Assinaturas": { icon: Tv, color: "hsl(234, 89%, 74%)" },
  "Não classificado": { icon: HelpCircle, color: "hsl(215, 16%, 47%)" },
};

export function getCategoryInfo(category: string | null): CategoryInfo {
  const cat = getCategoryByValue(category);
  const iconInfo = CATEGORY_ICONS[cat.value] || CATEGORY_ICONS["Não classificado"];
  
  return {
    label: cat.label,
    icon: iconInfo.icon,
    color: iconInfo.color,
  };
}

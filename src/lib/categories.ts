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

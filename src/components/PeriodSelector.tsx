import { format, addMonths, subMonths, isSameMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PeriodSelectorProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
}

export function PeriodSelector({ selectedDate, onDateChange }: PeriodSelectorProps) {
  const isCurrentMonth = isSameMonth(selectedDate, new Date());

  const handlePrevMonth = () => {
    onDateChange(subMonths(selectedDate, 1));
  };

  const handleNextMonth = () => {
    onDateChange(addMonths(selectedDate, 1));
  };

  const handleCurrentMonth = () => {
    onDateChange(new Date());
  };

  return (
    <div className="flex items-center justify-center gap-2 flex-wrap">
      <Button 
        variant="outline" 
        size="icon" 
        onClick={handlePrevMonth}
        className="h-9 w-9"
      >
        <ChevronLeft className="h-4 w-4" />
        <span className="sr-only">Mês anterior</span>
      </Button>

      <div className="flex items-center gap-2 min-w-[180px] justify-center px-3 py-2 rounded-md bg-muted/50">
        <CalendarDays className="h-4 w-4 text-muted-foreground" />
        <span className="font-medium capitalize text-foreground">
          {format(selectedDate, "MMMM yyyy", { locale: ptBR })}
        </span>
      </div>

      <Button 
        variant="outline" 
        size="icon" 
        onClick={handleNextMonth}
        className="h-9 w-9"
      >
        <ChevronRight className="h-4 w-4" />
        <span className="sr-only">Próximo mês</span>
      </Button>

      <Button
        variant="ghost"
        size="sm"
        onClick={handleCurrentMonth}
        disabled={isCurrentMonth}
        className="ml-2"
      >
        Hoje
      </Button>
    </div>
  );
}

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { FinancialGoal, GoalFormData } from "@/hooks/useFinancialGoals";

const formSchema = z.object({
  title: z.string().min(1, "Título é obrigatório"),
  initial_capital: z.coerce.number().min(0, "Capital inicial deve ser positivo"),
  target_amount: z.coerce.number().min(1, "Valor da meta é obrigatório"),
  annual_interest_rate: z.coerce.number().min(0, "Taxa deve ser maior ou igual a 0").max(100, "Taxa deve ser menor que 100"),
  deadline: z.date({
    required_error: "Prazo é obrigatório",
  }),
});

interface EditGoalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goal: FinancialGoal;
  onSubmit: (goalId: string, data: Partial<GoalFormData>) => Promise<boolean>;
}

export function EditGoalDialog({ open, onOpenChange, goal, onSubmit }: EditGoalDialogProps) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: goal.title,
      initial_capital: goal.initial_capital,
      target_amount: goal.target_amount,
      annual_interest_rate: goal.annual_interest_rate,
      deadline: new Date(goal.deadline),
    },
  });

  // Reset form when goal changes
  useEffect(() => {
    if (open) {
      form.reset({
        title: goal.title,
        initial_capital: goal.initial_capital,
        target_amount: goal.target_amount,
        annual_interest_rate: goal.annual_interest_rate,
        deadline: new Date(goal.deadline),
      });
    }
  }, [goal, open, form]);

  const handleSubmit = async (values: z.infer<typeof formSchema>) => {
    const success = await onSubmit(goal.id, values);
    if (success) {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Editar Meta</DialogTitle>
          <DialogDescription>
            Atualize os dados da sua meta financeira.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título da Meta</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Reserva de emergência" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="initial_capital"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Capital Inicial (R$)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="target_amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Valor da Meta (R$)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="10000.00"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="annual_interest_rate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Taxa de Juros Anual (%)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.1"
                      placeholder="12"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="deadline"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Prazo</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "dd 'de' MMMM 'de' yyyy", {
                              locale: ptBR,
                            })
                          ) : (
                            <span>Selecione uma data</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) => date < new Date()}
                        initialFocus
                        locale={ptBR}
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit">Salvar</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

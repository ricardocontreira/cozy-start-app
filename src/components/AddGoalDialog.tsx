import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { addMonths } from "date-fns";
import { Target } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { GoalFormData } from "@/hooks/useFinancialGoals";

const formSchema = z.object({
  title: z.string().min(2, "O título deve ter pelo menos 2 caracteres"),
  initial_capital: z.coerce.number().min(0, "O capital inicial deve ser maior ou igual a 0"),
  target_amount: z.coerce.number().positive("O valor da meta deve ser maior que 0"),
  annual_interest_rate: z.coerce.number().min(0, "A taxa deve ser maior ou igual a 0").max(100, "A taxa deve ser menor ou igual a 100"),
  months: z.coerce.number().int("Deve ser um número inteiro").min(1, "O prazo deve ser de pelo menos 1 mês").max(360, "O prazo máximo é de 360 meses"),
}).refine((data) => data.target_amount > data.initial_capital, {
  message: "O valor da meta deve ser maior que o capital inicial",
  path: ["target_amount"],
});

type FormData = z.infer<typeof formSchema>;

interface AddGoalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: GoalFormData) => Promise<boolean>;
}

export function AddGoalDialog({ open, onOpenChange, onSubmit }: AddGoalDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      initial_capital: 0,
      target_amount: 0,
      annual_interest_rate: 12,
      months: 12,
    },
  });

  const handleSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    
    // Convert months to deadline date
    const deadline = addMonths(new Date(), data.months);
    
    const goalData: GoalFormData = {
      title: data.title,
      initial_capital: data.initial_capital,
      target_amount: data.target_amount,
      annual_interest_rate: data.annual_interest_rate,
      deadline,
    };
    
    const success = await onSubmit(goalData);
    setIsSubmitting(false);
    
    if (success) {
      form.reset();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Nova Meta Financeira
          </DialogTitle>
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
                    <Input placeholder="Ex: Viagem para Europa" {...field} />
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
                      placeholder="0,00" 
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
                      placeholder="10.000,00" 
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
                  <p className="text-xs text-muted-foreground">
                    Taxa esperada de rendimento anual para cálculo do aporte
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="months"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Prazo (meses)</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      min="1"
                      max="360"
                      placeholder="12" 
                      {...field} 
                    />
                  </FormControl>
                  <p className="text-xs text-muted-foreground">
                    Em quantos meses você quer atingir essa meta?
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-3 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                className="flex-1"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button 
                type="submit" 
                className="flex-1 bg-primary hover:bg-primary/90"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Criando..." : "Criar Meta"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

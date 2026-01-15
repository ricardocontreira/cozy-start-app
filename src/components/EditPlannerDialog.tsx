import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TeamMember } from "@/hooks/usePlannerTeam";

const editPlannerSchema = z.object({
  fullName: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
});

type EditPlannerFormData = z.infer<typeof editPlannerSchema>;

interface EditPlannerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planner: TeamMember;
  onSuccess?: () => void;
}

export function EditPlannerDialog({ open, onOpenChange, planner, onSuccess }: EditPlannerDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<EditPlannerFormData>({
    resolver: zodResolver(editPlannerSchema),
    defaultValues: {
      fullName: planner.full_name || "",
    },
  });

  useEffect(() => {
    if (open && planner) {
      form.reset({
        fullName: planner.full_name || "",
      });
    }
  }, [open, planner, form]);

  const handleSubmit = async (data: EditPlannerFormData) => {
    setIsSubmitting(true);
    
    try {
      const { error } = await supabase
        .from("planner_profiles")
        .update({ full_name: data.fullName.trim() })
        .eq("id", planner.id);

      if (error) throw error;

      toast({
        title: "Planejador atualizado!",
        description: "Os dados foram salvos com sucesso.",
      });

      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      toast({
        title: "Erro ao atualizar",
        description: "Não foi possível atualizar os dados.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Planejador</DialogTitle>
          <DialogDescription>
            Atualize os dados do planejador.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">Nome Completo</Label>
            <Input
              id="fullName"
              {...form.register("fullName")}
              placeholder="Nome do planejador"
            />
            {form.formState.errors.fullName && (
              <p className="text-sm text-destructive">
                {form.formState.errors.fullName.message}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                "Salvar"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

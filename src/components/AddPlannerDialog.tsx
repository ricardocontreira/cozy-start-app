import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { usePlannerTeam } from "@/hooks/usePlannerTeam";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const createPlannerSchema = z.object({
  fullName: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
  clientInviteLimit: z.coerce.number().min(0, "Limite deve ser maior ou igual a 0").max(100, "Limite máximo é 100"),
});

type CreatePlannerFormData = z.infer<typeof createPlannerSchema>;

interface AddPlannerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function AddPlannerDialog({ open, onOpenChange, onSuccess }: AddPlannerDialogProps) {
  const { createPlannerAssistant } = usePlannerTeam();
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<CreatePlannerFormData>({
    resolver: zodResolver(createPlannerSchema),
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
      clientInviteLimit: 5,
    },
  });

  const handleSubmit = async (data: CreatePlannerFormData) => {
    setIsSubmitting(true);
    const success = await createPlannerAssistant(data.fullName, data.email, data.password, data.clientInviteLimit);
    setIsSubmitting(false);

    if (success) {
      form.reset();
      onOpenChange(false);
      onSuccess?.();
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      form.reset();
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Adicionar Planejador</DialogTitle>
          <DialogDescription>
            Crie uma conta para um novo planejador assistente da sua equipe.
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

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              {...form.register("email")}
              placeholder="email@exemplo.com"
            />
            {form.formState.errors.email && (
              <p className="text-sm text-destructive">
                {form.formState.errors.email.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Senha Inicial</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                {...form.register("password")}
                placeholder="Mínimo 6 caracteres"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full px-3"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
            {form.formState.errors.password && (
              <p className="text-sm text-destructive">
                {form.formState.errors.password.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="clientInviteLimit">Limite de Convites</Label>
            <Input
              id="clientInviteLimit"
              type="number"
              min={0}
              max={100}
              {...form.register("clientInviteLimit")}
            />
            <p className="text-sm text-muted-foreground">
              Quantos convites este planejador poderá gerar para clientes
            </p>
            {form.formState.errors.clientInviteLimit && (
              <p className="text-sm text-destructive">
                {form.formState.errors.clientInviteLimit.message}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Criando...
                </>
              ) : (
                "Criar Planejador"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

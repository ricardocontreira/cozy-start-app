import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Users, UserPlus, Loader2, Trash2, Eye, EyeOff, Pencil, Mail } from "lucide-react";

import { useAuth } from "@/hooks/useAuth";
import { usePlannerProfile } from "@/hooks/usePlannerProfile";
import { usePlannerTeam, InviteStats } from "@/hooks/usePlannerTeam";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { EditInviteLimitDialog } from "@/components/EditInviteLimitDialog";

const createPlannerSchema = z.object({
  fullName: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  email: z.string().email("E-mail inválido"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
  clientInviteLimit: z.coerce.number().min(0, "Limite deve ser maior ou igual a 0").max(100, "Limite máximo é 100"),
});

type CreatePlannerFormData = z.infer<typeof createPlannerSchema>;

export default function PlannerTeam() {
  const { user, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading, isPlannerAdmin, needsOnboarding } = usePlannerProfile();
  const { 
    teamMembers, 
    memberStats, 
    loading: teamLoading, 
    createPlannerAssistant, 
    removePlannerAssistant,
    updateInviteLimit 
  } = usePlannerTeam();
  const navigate = useNavigate();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [editLimitDialog, setEditLimitDialog] = useState<{
    open: boolean;
    plannerId: string;
    plannerName: string;
    currentLimit: number;
  }>({
    open: false,
    plannerId: "",
    plannerName: "",
    currentLimit: 5,
  });

  const form = useForm<CreatePlannerFormData>({
    resolver: zodResolver(createPlannerSchema),
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
      clientInviteLimit: 5,
    },
  });

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth?context=planner");
      return;
    }

    if (!profileLoading && profile) {
      if (!isPlannerAdmin) {
        navigate("/dashboard");
        return;
      }

      if (needsOnboarding) {
        navigate("/planner-onboarding");
        return;
      }
    }
  }, [user, authLoading, profile, profileLoading, isPlannerAdmin, needsOnboarding, navigate]);

  const handleCreatePlanner = async (formData: CreatePlannerFormData) => {
    setSubmitting(true);
    const success = await createPlannerAssistant(
      formData.fullName,
      formData.email,
      formData.password,
      formData.clientInviteLimit
    );
    setSubmitting(false);

    if (success) {
      setDialogOpen(false);
      form.reset();
    }
  };

  const handleRemovePlanner = async (plannerId: string) => {
    await removePlannerAssistant(plannerId);
  };

  const handleEditLimit = (plannerId: string, plannerName: string, currentLimit: number) => {
    setEditLimitDialog({
      open: true,
      plannerId,
      plannerName,
      currentLimit,
    });
  };

  const handleSaveLimit = async (newLimit: number) => {
    return await updateInviteLimit(editLimitDialog.plannerId, newLimit);
  };

  const getStatsDisplay = (stats: InviteStats | undefined, limit: number) => {
    if (!stats) return null;
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
        <Mail className="w-3.5 h-3.5" />
        <span>
          Convites: {stats.used}/{limit} usados
          {stats.active > 0 && <span className="text-primary"> [{stats.active} ativos]</span>}
        </span>
      </div>
    );
  };

  if (authLoading || profileLoading) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-6">
        <div className="max-w-2xl mx-auto space-y-6">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-sm border-b border-border">
        <div className="max-w-2xl mx-auto px-4 py-3 md:px-6 md:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <h1 className="text-xl font-semibold text-foreground">Minha Equipe</h1>
            </div>
            
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Adicionar
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Adicionar Planejador</DialogTitle>
                  <DialogDescription>
                    Crie uma conta para um planejador assistente da sua equipe
                  </DialogDescription>
                </DialogHeader>
                
                <form onSubmit={form.handleSubmit(handleCreatePlanner)} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Nome completo</Label>
                    <Input
                      id="fullName"
                      placeholder="Nome do planejador"
                      {...form.register("fullName")}
                    />
                    {form.formState.errors.fullName && (
                      <p className="text-sm text-destructive">
                        {form.formState.errors.fullName.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">E-mail</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="email@exemplo.com"
                      {...form.register("email")}
                    />
                    {form.formState.errors.email && (
                      <p className="text-sm text-destructive">
                        {form.formState.errors.email.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Senha</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        {...form.register("password")}
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {form.formState.errors.password && (
                      <p className="text-sm text-destructive">
                        {form.formState.errors.password.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="clientInviteLimit">Limite de convites</Label>
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
                    <Button type="submit" disabled={submitting}>
                      {submitting ? (
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
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-2xl mx-auto px-4 py-6 md:px-6 md:py-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Planejadores Assistentes
            </CardTitle>
            <CardDescription>
              Gerencie os planejadores da sua equipe e seus limites de convites
            </CardDescription>
          </CardHeader>
          <CardContent>
            {teamLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            ) : teamMembers.length === 0 ? (
              <div className="text-center py-8">
                <Users className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
                <p className="text-muted-foreground">
                  Você ainda não tem planejadores na sua equipe
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Clique em "Adicionar" para criar um novo planejador
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {teamMembers.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-start justify-between p-4 rounded-lg border border-border bg-card"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-foreground">
                        {member.full_name || "Sem nome"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Planejador Assistente
                      </p>
                      {getStatsDisplay(memberStats[member.id], member.client_invite_limit)}
                    </div>

                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEditLimit(
                          member.id,
                          member.full_name || "Planejador",
                          member.client_invite_limit
                        )}
                        title="Editar limite de convites"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remover planejador?</AlertDialogTitle>
                            <AlertDialogDescription>
                              {member.full_name} será removido da sua equipe. Esta ação não pode ser desfeita.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleRemovePlanner(member.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Remover
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Edit Limit Dialog */}
      <EditInviteLimitDialog
        open={editLimitDialog.open}
        onOpenChange={(open) => setEditLimitDialog((prev) => ({ ...prev, open }))}
        plannerName={editLimitDialog.plannerName}
        currentLimit={editLimitDialog.currentLimit}
        onSave={handleSaveLimit}
      />

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav activeRoute="settings" />
    </div>
  );
}

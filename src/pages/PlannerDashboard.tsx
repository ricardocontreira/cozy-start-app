import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Users, Plus, Pencil, Trash2, LogOut, UserX, UserCheck, Building2, RefreshCw } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { usePlannerProfile } from "@/hooks/usePlannerProfile";
import { usePlannerTeam, TeamMember } from "@/hooks/usePlannerTeam";
import { useActiveRole } from "@/contexts/ActiveRoleContext";
import { useProfileRoles } from "@/hooks/useProfileRoles";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { PlannerBottomNav } from "@/components/PlannerBottomNav";
import { AddPlannerDialog } from "@/components/AddPlannerDialog";
import { EditPlannerDialog } from "@/components/EditPlannerDialog";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export default function PlannerDashboard() {
  const navigate = useNavigate();
  const { user, signOut, loading: authLoading } = useAuth();
  const { profile, isPlannerAdmin, isPlanner, needsOnboarding, loading: profileLoading } = usePlannerProfile();
  const { teamMembers, loading: teamLoading, removePlannerAssistant, togglePlannerStatus, refreshTeam } = usePlannerTeam();
  const { activeRole, clearActiveRole } = useActiveRole();
  const { hasMultipleRoles, loading: rolesLoading } = useProfileRoles();

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedPlanner, setSelectedPlanner] = useState<TeamMember | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [plannerToDelete, setPlannerToDelete] = useState<TeamMember | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isTogglingStatus, setIsTogglingStatus] = useState<string | null>(null);

  const isLoading = authLoading || profileLoading;

  // Redirect non-authenticated users
  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/planner/auth");
    }
  }, [user, authLoading, navigate]);

  // Redirect if activeRole is 'user'
  useEffect(() => {
    if (!rolesLoading && activeRole === "user") {
      navigate("/dashboard");
    }
  }, [activeRole, rolesLoading, navigate]);

  // Redirect non-planners to dashboard
  useEffect(() => {
    if (!profileLoading && profile && !isPlanner) {
      navigate("/dashboard");
    }
  }, [profile, profileLoading, isPlanner, navigate]);

  // Redirect to onboarding if needed
  useEffect(() => {
    if (!profileLoading && needsOnboarding) {
      navigate("/planner-onboarding");
    }
  }, [needsOnboarding, profileLoading, navigate]);

  const handleSignOut = async () => {
    clearActiveRole();
    await signOut();
    navigate("/planner/auth");
  };

  const handleSwitchProfile = () => {
    clearActiveRole();
    navigate("/profile-selection");
  };

  const handleEditPlanner = (planner: TeamMember) => {
    setSelectedPlanner(planner);
    setEditDialogOpen(true);
  };

  const handleDeleteClick = (planner: TeamMember) => {
    setPlannerToDelete(planner);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!plannerToDelete) return;
    
    setIsDeleting(true);
    const success = await removePlannerAssistant(plannerToDelete.id);
    setIsDeleting(false);
    setDeleteDialogOpen(false);
    setPlannerToDelete(null);
  };

  const handleToggleStatus = async (planner: TeamMember) => {
    setIsTogglingStatus(planner.id);
    await togglePlannerStatus(planner.id, !planner.is_active);
    setIsTogglingStatus(null);
  };

  const getInitials = (name: string | null) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const activeTeamMembers = teamMembers.filter((m) => m.is_active);
  const inactiveTeamMembers = teamMembers.filter((m) => !m.is_active);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-2xl mx-auto space-y-6">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-4">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-sm border-b border-border">
        <div className="max-w-2xl mx-auto px-4 py-3 md:px-6 md:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Building2 className="w-6 h-6 text-primary" />
              <div>
                <h1 className="text-lg font-semibold text-foreground">
                  {profile?.razao_social || "Painel do Planejador"}
                </h1>
                <p className="text-xs text-muted-foreground">
                  {isPlannerAdmin ? "Administrador" : "Planejador"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <ThemeToggle />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-primary/10 text-primary text-sm">
                        {getInitials(profile?.full_name)}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {hasMultipleRoles && (
                    <>
                      <DropdownMenuItem onClick={handleSwitchProfile}>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Trocar Perfil
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                    </>
                  )}
                  <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="w-4 h-4 mr-2" />
                    Sair
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-4 py-6 md:px-6 space-y-6">
        {/* Stats Card - Only for Planner Admin */}
        {isPlannerAdmin && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="w-5 h-5 text-primary" />
                Minha Equipe
              </CardTitle>
              <CardDescription>
                {activeTeamMembers.length} planejador(es) ativo(s)
                {inactiveTeamMembers.length > 0 && ` • ${inactiveTeamMembers.length} inativo(s)`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => setAddDialogOpen(true)} className="w-full">
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Planejador
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Team Members List - Only for Planner Admin */}
        {isPlannerAdmin && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Planejadores Cadastrados</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {teamLoading ? (
                <>
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </>
              ) : teamMembers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Nenhum planejador na equipe ainda.</p>
                  <p className="text-sm">Adicione seu primeiro planejador assistente!</p>
                </div>
              ) : (
                teamMembers.map((planner) => (
                  <div
                    key={planner.id}
                    className={`flex items-center justify-between p-3 rounded-lg border ${
                      planner.is_active ? "bg-card" : "bg-muted/50 opacity-75"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className={`text-sm ${planner.is_active ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                          {getInitials(planner.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{planner.full_name || "Sem nome"}</p>
                        <div className="flex items-center gap-2">
                          <Badge variant={planner.is_active ? "default" : "secondary"} className="text-xs">
                            {planner.is_active ? "Ativo" : "Inativo"}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleToggleStatus(planner)}
                        disabled={isTogglingStatus === planner.id}
                        title={planner.is_active ? "Inativar" : "Ativar"}
                      >
                        {planner.is_active ? (
                          <UserX className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <UserCheck className="w-4 h-4 text-primary" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEditPlanner(planner)}
                        title="Editar"
                      >
                        <Pencil className="w-4 h-4 text-muted-foreground" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteClick(planner)}
                        title="Excluir"
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        )}

        {/* Planner Assistant View */}
        {!isPlannerAdmin && isPlanner && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                Bem-vindo, {profile?.full_name}
              </CardTitle>
              <CardDescription>
                Você está conectado como planejador assistente.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Em breve você terá acesso à gestão de clientes e suas finanças.
              </p>
            </CardContent>
          </Card>
        )}
      </main>

      {/* Add Planner Dialog */}
      <AddPlannerDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onSuccess={refreshTeam}
      />

      {/* Edit Planner Dialog */}
      {selectedPlanner && (
        <EditPlannerDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          planner={selectedPlanner}
          onSuccess={refreshTeam}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Planejador</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover <strong>{plannerToDelete?.full_name}</strong> da sua equipe?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeleting ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Mobile Navigation */}
      <PlannerBottomNav activeRoute="home" />
    </div>
  );
}

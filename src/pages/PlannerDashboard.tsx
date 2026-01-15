import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  Users, Plus, Pencil, Trash2, LogOut, UserX, UserCheck, Building2, RefreshCw, Settings, Mail,
  Copy, Link as LinkIcon, Clock, Check, AlertCircle, Loader2
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { usePlannerProfile } from "@/hooks/usePlannerProfile";
import { usePlannerTeam, TeamMember, InviteStats } from "@/hooks/usePlannerTeam";
import { usePlannerInvites, PlannerInvite } from "@/hooks/usePlannerInvites";
import { usePlannerClients } from "@/hooks/usePlannerClients";
import { useActiveRole } from "@/contexts/ActiveRoleContext";
import { useProfileRoles } from "@/hooks/useProfileRoles";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { PlannerBottomNav } from "@/components/PlannerBottomNav";
import { AddPlannerDialog } from "@/components/AddPlannerDialog";
import { EditPlannerDialog } from "@/components/EditPlannerDialog";
import { EditInviteLimitDialog } from "@/components/EditInviteLimitDialog";
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export default function PlannerDashboard() {
  const navigate = useNavigate();
  const { user, signOut, loading: authLoading } = useAuth();
  const { profile, isPlannerAdmin, isPlanner, needsOnboarding, loading: profileLoading } = usePlannerProfile();
  const { teamMembers, memberStats, loading: teamLoading, removePlannerAssistant, togglePlannerStatus, updateInviteLimit, refreshTeam } = usePlannerTeam();
  const { 
    activeInvites, 
    usedInvites, 
    expiredInvites, 
    stats: inviteStats, 
    loading: invitesLoading, 
    creating: creatingInvite, 
    createInvite, 
    deleteInvite, 
    copyInviteCode 
  } = usePlannerInvites();
  const { clients, loading: clientsLoading } = usePlannerClients();
  const { activeRole, clearActiveRole } = useActiveRole();
  const { hasMultipleRoles, loading: rolesLoading } = useProfileRoles();

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedPlanner, setSelectedPlanner] = useState<TeamMember | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [plannerToDelete, setPlannerToDelete] = useState<TeamMember | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isTogglingStatus, setIsTogglingStatus] = useState<string | null>(null);
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
  const [newInviteDialogOpen, setNewInviteDialogOpen] = useState(false);
  const [newInvite, setNewInvite] = useState<PlannerInvite | null>(null);
  const [showUsedInvites, setShowUsedInvites] = useState(false);
  const [showExpiredInvites, setShowExpiredInvites] = useState(false);

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
    await removePlannerAssistant(plannerToDelete.id);
    setIsDeleting(false);
    setDeleteDialogOpen(false);
    setPlannerToDelete(null);
  };

  const handleToggleStatus = async (planner: TeamMember) => {
    setIsTogglingStatus(planner.id);
    await togglePlannerStatus(planner.id, !planner.is_active);
    setIsTogglingStatus(null);
  };

  const handleEditLimit = (planner: TeamMember) => {
    setEditLimitDialog({
      open: true,
      plannerId: planner.id,
      plannerName: planner.full_name || "Planejador",
      currentLimit: planner.client_invite_limit,
    });
  };

  const handleSaveLimit = async (newLimit: number) => {
    return await updateInviteLimit(editLimitDialog.plannerId, newLimit);
  };

  const handleCreateInvite = async () => {
    const invite = await createInvite();
    if (invite) {
      setNewInvite(invite);
      setNewInviteDialogOpen(true);
    }
  };

  const handleCopyAndClose = () => {
    if (newInvite) {
      copyInviteCode(newInvite.invite_code);
    }
    setNewInviteDialogOpen(false);
    setNewInvite(null);
  };

  const getTeamStatsDisplay = (stats: InviteStats | undefined, limit: number) => {
    if (!stats) return null;
    return (
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
        <Mail className="w-3 h-3" />
        <span>
          {stats.used}/{limit} usados
          {stats.active > 0 && <span className="text-primary"> • {stats.active} ativos</span>}
        </span>
      </div>
    );
  };

  const getInviteLimit = () => {
    if (!inviteStats) return { used: 0, total: 5, percent: 0 };
    const used = inviteStats.used + inviteStats.active;
    const total = inviteStats.limit || 5;
    const percent = total > 0 ? Math.min((used / total) * 100, 100) : 0;
    return { used, total, percent };
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

  const limitInfo = getInviteLimit();
  const activeTeamMembers = teamMembers.filter((m) => m.is_active);
  const inactiveTeamMembers = teamMembers.filter((m) => !m.is_active);
  const canCreateInvite = !inviteStats?.limit || inviteStats.limit === 0 || (inviteStats.used + inviteStats.active) < inviteStats.limit;

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
                  <DropdownMenuItem onClick={() => navigate("/planner/settings")}>
                    <Settings className="w-4 h-4 mr-2" />
                    Configurações
                  </DropdownMenuItem>
                  {hasMultipleRoles && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleSwitchProfile}>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Trocar Perfil
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator />
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
        {/* ========== SEÇÃO: MEUS CLIENTES E CONVITES ========== */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <LinkIcon className="w-5 h-5 text-primary" />
                  Meus Clientes
                </CardTitle>
                <CardDescription>
                  {clients.length} cliente(s) vinculado(s)
                </CardDescription>
              </div>
              <Button 
                size="sm" 
                onClick={handleCreateInvite} 
                disabled={creatingInvite || !canCreateInvite}
              >
                {creatingInvite ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4 mr-2" />
                )}
                Novo Convite
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Limite de convites */}
            <div className="p-3 rounded-lg bg-muted/50">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted-foreground">Limite de convites</span>
                <span className="font-medium">
                  {limitInfo.used} / {inviteStats?.limit === 0 ? "∞" : limitInfo.total}
                </span>
              </div>
              {inviteStats?.limit !== 0 && (
                <Progress value={limitInfo.percent} className="h-1.5" />
              )}
            </div>

            {/* Convites ativos */}
            {activeInvites.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-primary" />
                  Convites Ativos ({activeInvites.length})
                </p>
                <div className="space-y-2">
                  {activeInvites.map((invite) => (
                    <InviteCard 
                      key={invite.id} 
                      invite={invite} 
                      onCopy={copyInviteCode} 
                      onDelete={deleteInvite}
                      status="active"
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Convites usados (colapsável) */}
            {usedInvites.length > 0 && (
              <Collapsible open={showUsedInvites} onOpenChange={setShowUsedInvites}>
                <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground w-full">
                  <Check className="w-3.5 h-3.5 text-green-600" />
                  Convites Usados ({usedInvites.length})
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-2 mt-2">
                  {usedInvites.map((invite) => (
                    <InviteCard 
                      key={invite.id} 
                      invite={invite} 
                      onCopy={copyInviteCode} 
                      onDelete={deleteInvite}
                      status="used"
                    />
                  ))}
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* Convites expirados (colapsável) */}
            {expiredInvites.length > 0 && (
              <Collapsible open={showExpiredInvites} onOpenChange={setShowExpiredInvites}>
                <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground w-full">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Convites Expirados ({expiredInvites.length})
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-2 mt-2">
                  {expiredInvites.map((invite) => (
                    <InviteCard 
                      key={invite.id} 
                      invite={invite} 
                      onCopy={copyInviteCode} 
                      onDelete={deleteInvite}
                      status="expired"
                    />
                  ))}
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* Lista de clientes */}
            {clients.length > 0 && (
              <div className="space-y-2 pt-2 border-t">
                <p className="text-sm font-medium flex items-center gap-2">
                  <Users className="w-3.5 h-3.5" />
                  Clientes Vinculados
                </p>
                <div className="space-y-2">
                  {clients.map((client) => (
                    <div
                      key={client.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-border bg-background"
                    >
                      <div>
                        <p className="font-medium text-sm">{client.full_name || "Sem nome"}</p>
                        {client.created_at && (
                          <p className="text-xs text-muted-foreground">
                            Desde {format(new Date(client.created_at), "dd/MM/yyyy", { locale: ptBR })}
                          </p>
                        )}
                      </div>
                      <Badge variant="secondary" className="text-xs">Ativo</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeInvites.length === 0 && usedInvites.length === 0 && clients.length === 0 && (
              <div className="text-center py-4 text-muted-foreground">
                <p className="text-sm">Nenhum convite ou cliente ainda</p>
                <p className="text-xs">Crie um convite para começar</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ========== SEÇÃO: EQUIPE (Apenas Admin) ========== */}
        {isPlannerAdmin && (
          <>
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Users className="w-5 h-5 text-primary" />
                      Minha Equipe
                    </CardTitle>
                    <CardDescription>
                      {activeTeamMembers.length} planejador(es) ativo(s)
                      {inactiveTeamMembers.length > 0 && ` • ${inactiveTeamMembers.length} inativo(s)`}
                    </CardDescription>
                  </div>
                  <Button size="sm" onClick={() => setAddDialogOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {teamLoading ? (
                  <>
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                  </>
                ) : teamMembers.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground">
                    <Users className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Nenhum planejador na equipe</p>
                    <p className="text-xs">Adicione seu primeiro planejador assistente</p>
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
                          {getTeamStatsDisplay(memberStats[planner.id], planner.client_invite_limit)}
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
                          onClick={() => handleEditLimit(planner)}
                          title="Editar limite de convites"
                        >
                          <Mail className="w-4 h-4 text-muted-foreground" />
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
          </>
        )}

        {/* Planner Assistant View (não admin) */}
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
          </Card>
        )}
      </main>

      {/* New invite dialog */}
      <Dialog open={newInviteDialogOpen} onOpenChange={setNewInviteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Convite Criado!</DialogTitle>
            <DialogDescription>
              Compartilhe este código com seu cliente para que ele possa se cadastrar
            </DialogDescription>
          </DialogHeader>
          
          {newInvite && (
            <div className="py-4">
              <div className="bg-muted rounded-lg p-4 text-center">
                <p className="text-2xl font-mono font-bold tracking-wider text-foreground">
                  {newInvite.invite_code}
                </p>
                {newInvite.expires_at && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Válido até {format(new Date(newInvite.expires_at), "dd/MM/yyyy", { locale: ptBR })}
                  </p>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setNewInviteDialogOpen(false)}>
              Fechar
            </Button>
            <Button onClick={handleCopyAndClose}>
              <Copy className="w-4 h-4 mr-2" />
              Copiar Código
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

      {/* Edit Invite Limit Dialog */}
      <EditInviteLimitDialog
        open={editLimitDialog.open}
        onOpenChange={(open) => setEditLimitDialog((prev) => ({ ...prev, open }))}
        plannerName={editLimitDialog.plannerName}
        currentLimit={editLimitDialog.currentLimit}
        onSave={handleSaveLimit}
      />

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

// Invite card component
function InviteCard({ 
  invite, 
  onCopy, 
  onDelete, 
  status 
}: { 
  invite: PlannerInvite; 
  onCopy: (code: string) => void; 
  onDelete: (id: string) => void;
  status: "active" | "used" | "expired";
}) {
  return (
    <div className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-background">
      <div className="flex items-center gap-2">
        <div className="font-mono text-sm font-medium">{invite.invite_code}</div>
        {status === "used" && invite.used_at && (
          <Badge variant="outline" className="text-xs">
            {format(new Date(invite.used_at), "dd/MM/yy", { locale: ptBR })}
          </Badge>
        )}
        {status === "active" && invite.expires_at && (
          <Badge variant="outline" className="text-xs">
            Exp: {format(new Date(invite.expires_at), "dd/MM/yy", { locale: ptBR })}
          </Badge>
        )}
        {status === "expired" && (
          <Badge variant="secondary" className="text-xs">Expirado</Badge>
        )}
      </div>
      
      <div className="flex items-center gap-1">
        {status === "active" && (
          <>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-7 w-7"
              onClick={() => onCopy(invite.invite_code)}
            >
              <Copy className="w-3.5 h-3.5" />
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive">
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Excluir convite?</AlertDialogTitle>
                  <AlertDialogDescription>
                    O código {invite.invite_code} não poderá mais ser usado.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => onDelete(invite.id)}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Excluir
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        )}
      </div>
    </div>
  );
}

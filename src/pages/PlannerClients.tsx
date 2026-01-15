import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  ArrowLeft, 
  Users, 
  Plus, 
  Copy, 
  Trash2, 
  Loader2, 
  Link as LinkIcon,
  Clock,
  Check,
  AlertCircle
} from "lucide-react";

import { useAuth } from "@/hooks/useAuth";
import { usePlannerProfile } from "@/hooks/usePlannerProfile";
import { usePlannerInvites, PlannerInvite } from "@/hooks/usePlannerInvites";
import { usePlannerClients } from "@/hooks/usePlannerClients";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { PlannerBottomNav } from "@/components/PlannerBottomNav";

export default function PlannerClients() {
  const { user, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading, isPlannerUser, needsOnboarding } = usePlannerProfile();
  const { 
    activeInvites, 
    usedInvites, 
    expiredInvites, 
    stats, 
    loading: invitesLoading, 
    creating, 
    createInvite, 
    deleteInvite, 
    copyInviteCode 
  } = usePlannerInvites();
  const { clients, loading: clientsLoading } = usePlannerClients();
  const navigate = useNavigate();

  const [newInviteDialogOpen, setNewInviteDialogOpen] = useState(false);
  const [newInvite, setNewInvite] = useState<PlannerInvite | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth?context=planner");
      return;
    }

    if (!profileLoading && profile) {
      if (!isPlannerUser) {
        navigate("/dashboard");
        return;
      }

      if (needsOnboarding) {
        navigate("/planner-onboarding");
        return;
      }
    }
  }, [user, authLoading, profile, profileLoading, isPlannerUser, needsOnboarding, navigate]);

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

  const getInviteLimit = () => {
    if (!stats) return { used: 0, total: 5, percent: 0 };
    const used = stats.used + stats.active;
    const total = stats.limit || 5;
    const percent = total > 0 ? Math.min((used / total) * 100, 100) : 0;
    return { used, total, percent };
  };

  const limitInfo = getInviteLimit();

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
              <Button variant="ghost" size="icon" onClick={() => navigate("/planner")}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <h1 className="text-xl font-semibold text-foreground">Meus Clientes</h1>
            </div>
            
            <Button 
              size="sm" 
              onClick={handleCreateInvite} 
              disabled={creating || (stats?.limit && stats.limit > 0 && (stats.used + stats.active) >= stats.limit)}
            >
              {creating ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Plus className="w-4 h-4 mr-2" />
              )}
              Novo Convite
            </Button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-2xl mx-auto px-4 py-6 md:px-6 md:py-8 space-y-6">
        {/* Limite de convites */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <LinkIcon className="w-4 h-4" />
              Limite de Convites
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Utilizados</span>
                <span className="font-medium">
                  {limitInfo.used} / {stats?.limit === 0 ? "∞" : limitInfo.total}
                </span>
              </div>
              {stats?.limit !== 0 && (
                <Progress value={limitInfo.percent} className="h-2" />
              )}
              {stats?.limit === 0 && (
                <p className="text-xs text-muted-foreground">Convites ilimitados</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="invites">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="invites">
              Convites ({activeInvites.length + usedInvites.length + expiredInvites.length})
            </TabsTrigger>
            <TabsTrigger value="clients">
              Clientes ({clients.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="invites" className="mt-4 space-y-4">
            {/* Convites ativos */}
            {activeInvites.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Clock className="w-4 h-4 text-primary" />
                    Convites Ativos
                  </CardTitle>
                  <CardDescription>Aguardando uso</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {activeInvites.map((invite) => (
                    <InviteCard 
                      key={invite.id} 
                      invite={invite} 
                      onCopy={copyInviteCode} 
                      onDelete={deleteInvite}
                      status="active"
                    />
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Convites usados */}
            {usedInvites.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-600" />
                    Convites Usados
                  </CardTitle>
                  <CardDescription>Clientes cadastrados</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {usedInvites.map((invite) => (
                    <InviteCard 
                      key={invite.id} 
                      invite={invite} 
                      onCopy={copyInviteCode} 
                      onDelete={deleteInvite}
                      status="used"
                    />
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Convites expirados */}
            {expiredInvites.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-muted-foreground" />
                    Convites Expirados
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {expiredInvites.map((invite) => (
                    <InviteCard 
                      key={invite.id} 
                      invite={invite} 
                      onCopy={copyInviteCode} 
                      onDelete={deleteInvite}
                      status="expired"
                    />
                  ))}
                </CardContent>
              </Card>
            )}

            {activeInvites.length === 0 && usedInvites.length === 0 && expiredInvites.length === 0 && (
              <Card>
                <CardContent className="py-12 text-center">
                  <LinkIcon className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
                  <p className="text-muted-foreground">Nenhum convite criado ainda</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Crie um convite para convidar seus clientes
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="clients" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Clientes Vinculados
                </CardTitle>
                <CardDescription>
                  Clientes que usaram seus códigos de convite
                </CardDescription>
              </CardHeader>
              <CardContent>
                {clientsLoading ? (
                  <div className="space-y-3">
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                  </div>
                ) : clients.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
                    <p className="text-muted-foreground">
                      Nenhum cliente cadastrado ainda
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Seus clientes aparecerão aqui quando usarem seu código de convite
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {clients.map((client) => (
                      <div
                        key={client.id}
                        className="flex items-center justify-between p-4 rounded-lg border border-border bg-card"
                      >
                        <div>
                          <p className="font-medium text-foreground">
                            {client.full_name || "Sem nome"}
                          </p>
                          {client.phone && (
                            <p className="text-sm text-muted-foreground">{client.phone}</p>
                          )}
                          {client.created_at && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Cliente desde {format(new Date(client.created_at), "dd/MM/yyyy", { locale: ptBR })}
                            </p>
                          )}
                        </div>
                        <Badge variant="secondary">Ativo</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
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

      {/* Mobile Bottom Navigation */}
      <PlannerBottomNav activeRoute="clients" />
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
    <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-background">
      <div className="flex items-center gap-3">
        <div className="font-mono text-sm font-medium">{invite.invite_code}</div>
        {status === "used" && invite.used_at && (
          <Badge variant="outline" className="text-xs">
            Usado em {format(new Date(invite.used_at), "dd/MM/yy", { locale: ptBR })}
          </Badge>
        )}
        {status === "active" && invite.expires_at && (
          <Badge variant="outline" className="text-xs">
            Expira em {format(new Date(invite.expires_at), "dd/MM/yy", { locale: ptBR })}
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
              className="h-8 w-8"
              onClick={() => onCopy(invite.invite_code)}
            >
              <Copy className="w-4 h-4" />
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                  <Trash2 className="w-4 h-4" />
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

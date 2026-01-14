import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Copy, Check, RefreshCw, Save, Home, Mail, Users } from "lucide-react";

import { useAuth } from "@/hooks/useAuth";
import { useHouse } from "@/hooks/useHouse";
import { usePlannerProfile } from "@/hooks/usePlannerProfile";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { HouseMembersList } from "@/components/HouseMembersList";
import { LeaveHouseDialog } from "@/components/LeaveHouseDialog";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { SubscriptionCard } from "@/components/SubscriptionCard";

export default function Settings() {
  const { user, loading: authLoading } = useAuth();
  const { 
    currentHouse, 
    memberRole, 
    loading: houseLoading,
    updateHouseName,
    regenerateInviteCode,
    leaveHouse,
    refreshHouses
  } = useHouse();
  const { isPlannerAdmin, loading: plannerLoading } = usePlannerProfile();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [houseName, setHouseName] = useState("");
  const [copied, setCopied] = useState(false);
  const [emailCopied, setEmailCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);

  const supportEmail = "suportefinlar@gmail.com";

  const isOwner = memberRole === "owner";

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  // Redirect planners to their own settings
  useEffect(() => {
    if (!plannerLoading && isPlannerAdmin) {
      navigate("/planner/settings");
    }
  }, [isPlannerAdmin, plannerLoading, navigate]);

  useEffect(() => {
    if (currentHouse) {
      setHouseName(currentHouse.name);
    }
  }, [currentHouse]);

  const copyInviteCode = () => {
    if (currentHouse?.invite_code) {
      navigator.clipboard.writeText(currentHouse.invite_code);
      setCopied(true);
      toast({
        title: "Código copiado!",
        description: "Compartilhe com quem você deseja convidar.",
      });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const copySupportEmail = () => {
    navigator.clipboard.writeText(supportEmail);
    setEmailCopied(true);
    toast({
      title: "Email copiado!",
      description: "O email de suporte foi copiado para a área de transferência.",
    });
    setTimeout(() => setEmailCopied(false), 2000);
  };

  const openSupportEmail = () => {
    window.location.href = `mailto:${supportEmail}?subject=Suporte FinLar`;
  };

  const handleSave = async () => {
    if (!houseName.trim() || houseName === currentHouse?.name) return;
    
    setSaving(true);
    const { error } = await updateHouseName(houseName.trim());
    setSaving(false);
    
    if (!error) {
      toast({
        title: "Casa atualizada!",
        description: "O nome da casa foi alterado com sucesso.",
      });
    }
  };

  const handleRegenerateCode = async () => {
    setRegenerating(true);
    const { error } = await regenerateInviteCode();
    setRegenerating(false);
    
    if (!error) {
      toast({
        title: "Código regenerado!",
        description: "Um novo código de convite foi gerado.",
      });
    }
  };

  const handleLeaveHouse = async () => {
    const { error } = await leaveHouse();
    if (!error) {
      setShowLeaveDialog(false);
      toast({
        title: "Você saiu da casa",
        description: "Você não faz mais parte desta casa.",
      });
      await refreshHouses();
      navigate("/dashboard");
    }
  };

  if (authLoading || houseLoading || plannerLoading) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-6">
        <div className="max-w-2xl mx-auto space-y-6">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (!currentHouse) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Nenhuma casa selecionada.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-sm border-b border-border">
        <div className="max-w-2xl mx-auto px-4 py-3 md:px-6 md:py-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-xl font-semibold text-foreground">Configurações</h1>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-2xl mx-auto px-4 py-6 md:px-6 md:py-8">
        <Tabs defaultValue="general" className="space-y-6">
          <TabsList className={`grid w-full ${isPlannerAdmin ? 'grid-cols-4' : 'grid-cols-3'}`}>
            <TabsTrigger value="general">Geral</TabsTrigger>
            <TabsTrigger value="members">Membros</TabsTrigger>
            {isPlannerAdmin && (
              <TabsTrigger value="team">Equipe</TabsTrigger>
            )}
            <TabsTrigger value="support">Suporte</TabsTrigger>
          </TabsList>

          {/* General Tab */}
          <TabsContent value="general" className="space-y-6">
            {/* Subscription Card - only for house owners */}
            {isOwner && <SubscriptionCard />}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Home className="w-5 h-5" />
                  Informações da Casa
                </CardTitle>
                <CardDescription>
                  {isOwner 
                    ? "Edite as informações da sua casa" 
                    : "Visualize as informações da casa"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="house-name">Nome da Casa</Label>
                  <Input
                    id="house-name"
                    value={houseName}
                    onChange={(e) => setHouseName(e.target.value)}
                    disabled={!isOwner}
                    placeholder="Nome da casa"
                  />
                </div>
                
                {isOwner && (
                  <Button 
                    onClick={handleSave} 
                    disabled={saving || houseName === currentHouse.name || !houseName.trim()}
                    className="w-full"
                  >
                    {saving ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Salvar Alterações
                      </>
                    )}
                  </Button>
                )}
              </CardContent>
            </Card>

            {isOwner && (
              <Card>
                <CardHeader>
                  <CardTitle>Código de Convite</CardTitle>
                  <CardDescription>
                    Compartilhe este código para convidar pessoas para sua casa
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 p-3 bg-muted rounded-lg font-mono text-lg tracking-widest text-center">
                      {currentHouse.invite_code}
                    </div>
                    <Button variant="outline" size="icon" onClick={copyInviteCode}>
                      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>
                  
                  <Button 
                    variant="outline" 
                    onClick={handleRegenerateCode}
                    disabled={regenerating}
                    className="w-full"
                  >
                    {regenerating ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Gerando...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Gerar Novo Código
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            )}

            {!isOwner && (
              <Card className="border-destructive/50">
                <CardHeader>
                  <CardTitle className="text-destructive">Sair da Casa</CardTitle>
                  <CardDescription>
                    Você deixará de ter acesso às informações desta casa
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button 
                    variant="destructive" 
                    onClick={() => setShowLeaveDialog(true)}
                    className="w-full"
                  >
                    Sair desta Casa
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Members Tab */}
          <TabsContent value="members">
            <HouseMembersList 
              houseId={currentHouse.id} 
              isOwner={isOwner}
              currentUserId={user?.id || ""}
            />
          </TabsContent>

          {/* Team Tab - Only for Planner Admins */}
          {isPlannerAdmin && (
            <TabsContent value="team" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Minha Equipe de Planejadores
                  </CardTitle>
                  <CardDescription>
                    Gerencie os planejadores assistentes da sua equipe
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button onClick={() => navigate("/planner/team")} className="w-full">
                    <Users className="w-4 h-4 mr-2" />
                    Gerenciar Equipe
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* Support Tab */}
          <TabsContent value="support" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="w-5 h-5" />
                  Precisa de Ajuda?
                </CardTitle>
                <CardDescription>
                  Entre em contato com nossa equipe de suporte
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Se você tiver dúvidas, sugestões ou encontrar algum problema, 
                  nossa equipe está pronta para ajudar.
                </p>
                
                <div className="flex items-center gap-2">
                  <div className="flex-1 p-3 bg-muted rounded-lg text-center font-medium">
                    {supportEmail}
                  </div>
                  <Button variant="outline" size="icon" onClick={copySupportEmail}>
                    {emailCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
                
                <Button className="w-full" onClick={openSupportEmail}>
                  <Mail className="w-4 h-4 mr-2" />
                  Enviar Email
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Leave House Dialog */}
      <LeaveHouseDialog
        open={showLeaveDialog}
        onOpenChange={setShowLeaveDialog}
        onConfirm={handleLeaveHouse}
        houseName={currentHouse.name}
      />

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav activeRoute="settings" />
    </div>
  );
}

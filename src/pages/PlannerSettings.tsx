import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Save, Building2, LogOut, Mail, Copy, Check, RefreshCw } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { usePlannerProfile } from "@/hooks/usePlannerProfile";
import { useActiveRole } from "@/contexts/ActiveRoleContext";
import { useProfileRoles } from "@/hooks/useProfileRoles";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { PlannerBottomNav } from "@/components/PlannerBottomNav";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ChangePasswordCard } from "@/components/ChangePasswordCard";

export default function PlannerSettings() {
  const navigate = useNavigate();
  const { user, signOut, loading: authLoading } = useAuth();
  const { profile, isPlannerAdmin, isPlanner, loading: profileLoading, refreshProfile } = usePlannerProfile();
  const { activeRole, clearActiveRole } = useActiveRole();
  const { hasMultipleRoles } = useProfileRoles();
  const { toast } = useToast();

  const [razaoSocial, setRazaoSocial] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [saving, setSaving] = useState(false);
  const [emailCopied, setEmailCopied] = useState(false);

  const supportEmail = "suportefinlar@gmail.com";
  const isLoading = authLoading || profileLoading;

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/planner/auth");
    }
  }, [user, authLoading, navigate]);

  // Redirect to user settings if active role is user
  useEffect(() => {
    if (activeRole === "user") {
      navigate("/settings");
    }
  }, [activeRole, navigate]);

  useEffect(() => {
    if (!profileLoading && profile && !isPlanner) {
      navigate("/dashboard");
    }
  }, [profile, profileLoading, isPlanner, navigate]);

  useEffect(() => {
    if (profile) {
      setRazaoSocial(profile.razao_social || "");
      setCnpj(profile.cnpj || "");
    }
  }, [profile]);

  const handleSignOut = async () => {
    clearActiveRole();
    await signOut();
    navigate("/planner/auth");
  };

  const handleSwitchProfile = () => {
    clearActiveRole();
    navigate("/profile-selection");
  };

  const handleSave = async () => {
    if (!user || !razaoSocial.trim()) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("planner_profiles")
        .update({
          razao_social: razaoSocial.trim(),
          cnpj: cnpj.trim() || null,
        })
        .eq("id", user.id);

      if (error) throw error;

      await refreshProfile();
      toast({
        title: "Dados salvos!",
        description: "Suas informações foram atualizadas.",
      });
    } catch (error) {
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar os dados.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const copySupportEmail = () => {
    navigator.clipboard.writeText(supportEmail);
    setEmailCopied(true);
    toast({
      title: "Email copiado!",
      description: "O email de suporte foi copiado.",
    });
    setTimeout(() => setEmailCopied(false), 2000);
  };

  const openSupportEmail = () => {
    window.location.href = `mailto:${supportEmail}?subject=Suporte FinLar - Planejador`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-2xl mx-auto space-y-6">
          <Skeleton className="h-10 w-32" />
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
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/planner")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-xl font-semibold text-foreground">Configurações</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-4 py-6 md:px-6 space-y-6">
        {/* Business Info - Only for Planner Admin */}
        {isPlannerAdmin && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                Dados Profissionais
              </CardTitle>
              <CardDescription>
                Informações da sua empresa
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="razao-social">Razão Social / Nome</Label>
                <Input
                  id="razao-social"
                  value={razaoSocial}
                  onChange={(e) => setRazaoSocial(e.target.value)}
                  placeholder="Nome ou razão social"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cnpj">CNPJ (opcional)</Label>
                <Input
                  id="cnpj"
                  value={cnpj}
                  onChange={(e) => setCnpj(e.target.value)}
                  placeholder="00.000.000/0000-00"
                />
              </div>

              <Button
                onClick={handleSave}
                disabled={saving || !razaoSocial.trim()}
                className="w-full"
              >
                {saving ? "Salvando..." : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Salvar Alterações
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Support */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5" />
              Suporte
            </CardTitle>
            <CardDescription>
              Entre em contato com nossa equipe
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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

        {/* Change Password */}
        <ChangePasswordCard />

        {/* Switch Profile - Only for users with multiple roles */}
        {hasMultipleRoles && (
          <Card>
            <CardHeader>
              <CardTitle>Trocar Perfil</CardTitle>
              <CardDescription>
                Você tem acesso a múltiplos perfis
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                variant="outline" 
                onClick={handleSwitchProfile}
                className="w-full"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Trocar Perfil
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Logout */}
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="text-destructive">Sair da Conta</CardTitle>
            <CardDescription>
              Encerrar sua sessão atual
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="destructive" onClick={handleSignOut} className="w-full">
              <LogOut className="w-4 h-4 mr-2" />
              Sair
            </Button>
          </CardContent>
        </Card>
      </main>

      {/* Mobile Navigation */}
      <PlannerBottomNav activeRoute="settings" />
    </div>
  );
}

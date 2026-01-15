import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Eye, EyeOff, Briefcase, AlertCircle } from "lucide-react";

import { useAuth } from "@/hooks/useAuth";
import { useActiveRole } from "@/contexts/ActiveRoleContext";
import { supabase } from "@/integrations/supabase/client";
import { FinLarLogo } from "@/components/FinLarLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useToast } from "@/hooks/use-toast";

const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function PlannerAuth() {
  const navigate = useNavigate();
  const { user, signIn, signOut, loading } = useAuth();
  const { clearActiveRole, setActiveRole } = useActiveRole();
  const { toast } = useToast();
  
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [accessError, setAccessError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  // Redirect if already logged in as planner
  useEffect(() => {
    const checkExistingSession = async () => {
      if (!loading && user) {
        // Check if current user is a planner
        const { data: profile } = await supabase
          .from("profiles")
          .select("profile_role, planner_onboarding_complete")
          .eq("id", user.id)
          .single();

        if (profile && ["planner_admin", "planner"].includes(profile.profile_role)) {
          // Check if has multiple roles
          const { count: houseCount } = await supabase
            .from("house_members")
            .select("*", { count: "exact", head: true })
            .eq("user_id", user.id);

          if ((houseCount || 0) > 0) {
            // Has multiple roles - go to selection
            navigate("/profile-selection");
          } else {
            // Only planner role
            setActiveRole(profile.profile_role as "planner_admin" | "planner");
            if (profile.profile_role === "planner_admin" && !profile.planner_onboarding_complete) {
              navigate("/planner-onboarding");
            } else {
              navigate("/planner");
            }
          }
        }
      }
    };

    checkExistingSession();
  }, [user, loading, navigate, setActiveRole]);

  const handleLogin = async (data: LoginFormData) => {
    setIsLoading(true);
    setAccessError(null);
    
    // Clear any previous role selection
    clearActiveRole();
    
    const { error } = await signIn(data.email, data.password);
    
    if (error) {
      setIsLoading(false);
      toast({
        title: "Erro no login",
        description: error.message || "Email ou senha incorretos",
        variant: "destructive",
      });
      return;
    }

    // Get the current session
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.user) {
      setIsLoading(false);
      toast({
        title: "Erro",
        description: "Não foi possível obter a sessão",
        variant: "destructive",
      });
      return;
    }

    // Verify if user is a planner
    const { data: profile } = await supabase
      .from("profiles")
      .select("profile_role, planner_onboarding_complete")
      .eq("id", session.user.id)
      .single();

    if (!profile || !["planner_admin", "planner"].includes(profile.profile_role)) {
      // Not a planner - show error and sign out
      setAccessError("Esta conta não possui permissões de planejador. Use o login de usuários comuns.");
      await signOut();
      setIsLoading(false);
      return;
    }

    // Check if has house membership (multiple roles)
    const { count: houseCount } = await supabase
      .from("house_members")
      .select("*", { count: "exact", head: true })
      .eq("user_id", session.user.id);

    setIsLoading(false);

    if ((houseCount || 0) > 0) {
      // Has multiple roles - go to selection
      navigate("/profile-selection");
    } else {
      // Only planner role
      setActiveRole(profile.profile_role as "planner_admin" | "planner");
      
      if (profile.profile_role === "planner_admin" && !profile.planner_onboarding_complete) {
        navigate("/planner-onboarding");
      } else {
        navigate("/planner");
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between p-4">
        <FinLarLogo size="md" />
        <ThemeToggle />
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-4 pb-8">
        <Card className="w-full max-w-md border-border/50 shadow-lg">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Briefcase className="w-8 h-8 text-primary" />
            </div>
            <div>
              <Badge variant="secondary" className="mb-3">
                Portal Profissional
              </Badge>
              <CardTitle className="text-2xl">Área do Planejador</CardTitle>
              <CardDescription className="mt-2">
                Acesso exclusivo para profissionais de planejamento financeiro
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent>
            {accessError && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{accessError}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit(handleLogin)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  {...register("email")}
                  disabled={isLoading}
                />
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    {...register("password")}
                    disabled={isLoading}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                {errors.password && (
                  <p className="text-sm text-destructive">{errors.password.message}</p>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Entrando..." : "Entrar"}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                Não é um planejador?{" "}
                <Button
                  variant="link"
                  className="px-0 text-primary"
                  onClick={() => navigate("/auth")}
                >
                  Acesse como usuário
                </Button>
              </p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

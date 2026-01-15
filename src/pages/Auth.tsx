import { useState, useEffect } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { FinLarLogo } from "@/components/FinLarLogo";

import { useAuth } from "@/hooks/useAuth";
import { useActiveRole } from "@/contexts/ActiveRoleContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ThemeToggle } from "@/components/ThemeToggle";

const loginSchema = z.object({
  email: z.string().email("E-mail inválido"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
});

const signupSchema = z.object({
  fullName: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  email: z.string().email("E-mail inválido"),
  phone: z.string().min(10, "Telefone deve ter pelo menos 10 dígitos").max(15, "Telefone inválido").regex(/^[0-9]+$/, "Apenas números"),
  birthDate: z.string().min(1, "Data de nascimento é obrigatória"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
  confirmPassword: z.string(),
  inviteCode: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Senhas não conferem",
  path: ["confirmPassword"],
});

type LoginFormData = z.infer<typeof loginSchema>;
type SignupFormData = z.infer<typeof signupSchema>;

export default function Auth() {
  const [searchParams] = useSearchParams();
  const mode = searchParams.get("mode");
  
  const [isLogin, setIsLogin] = useState(mode !== "signup");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [inviteValidation, setInviteValidation] = useState<{
    valid: boolean;
    plannerName?: string;
    plannerId?: string;
    checking: boolean;
  }>({ valid: false, checking: false });
  const { signIn, signUp, user, loading: authLoading } = useAuth();
  const { clearActiveRole, setActiveRole } = useActiveRole();
  const navigate = useNavigate();
  const { toast } = useToast();

  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const signupForm = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: { fullName: "", email: "", phone: "", birthDate: "", password: "", confirmPassword: "", inviteCode: "" },
  });

  const inviteCodeValue = signupForm.watch("inviteCode");

  // Validate invite code with debounce
  useEffect(() => {
    const validateInviteCode = async (code: string) => {
      if (!code || code.length < 8) {
        setInviteValidation({ valid: false, checking: false });
        return;
      }

      setInviteValidation(prev => ({ ...prev, checking: true }));

      try {
        const { data, error } = await supabase.rpc("validate_invite_code", { code });
        
        if (error) throw error;

        const result = data as unknown as { valid: boolean; planner_name?: string; planner_id?: string };
        
        if (result?.valid) {
          setInviteValidation({
            valid: true,
            plannerName: result.planner_name,
            plannerId: result.planner_id,
            checking: false,
          });
        } else {
          setInviteValidation({ valid: false, checking: false });
        }
      } catch (error) {
        console.error("Error validating invite code:", error);
        setInviteValidation({ valid: false, checking: false });
      }
    };

    const timer = setTimeout(() => {
      if (inviteCodeValue) {
        validateInviteCode(inviteCodeValue);
      } else {
        setInviteValidation({ valid: false, checking: false });
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [inviteCodeValue]);

  // Redirect if already logged in as normal user
  useEffect(() => {
    const checkExistingSession = async () => {
      if (!authLoading && user) {
        // Check if user exists in user_profiles table
        const { data: userProfile } = await supabase
          .from("user_profiles")
          .select("id")
          .eq("id", user.id)
          .single();

        if (userProfile) {
          // User is a normal user - check house membership
          const { count: houseCount } = await supabase
            .from("house_members")
            .select("*", { count: "exact", head: true })
            .eq("user_id", user.id);

          setActiveRole("user");
          if ((houseCount || 0) > 0) {
            navigate("/dashboard");
          } else {
            navigate("/house-setup");
          }
        }
        // If no user profile, user might be a planner trying to access user area
        // Don't redirect - let them login or signup
      }
    };

    checkExistingSession();
  }, [user, authLoading, navigate, setActiveRole]);

  const handlePostAuth = async (userId: string) => {
    // Clear any previous role
    clearActiveRole();

    // Check if user exists in user_profiles
    const { data: userProfile } = await supabase
      .from("user_profiles")
      .select("id")
      .eq("id", userId)
      .single();

    if (!userProfile) {
      // User doesn't exist in user_profiles - this means:
      // 1. They're a planner trying to login as user (error)
      // 2. Something went wrong with signup
      toast({
        title: "Conta não encontrada",
        description: "Esta conta não é uma conta de usuário. Se você é um planejador, acesse pela área de planejadores.",
        variant: "destructive",
      });
      await supabase.auth.signOut();
      return;
    }

    // Check house membership
    const { count: houseCount } = await supabase
      .from("house_members")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId);

    setActiveRole("user");

    if ((houseCount || 0) > 0) {
      navigate("/dashboard");
    } else {
      navigate("/house-setup");
    }
  };

  const handleLogin = async (data: LoginFormData) => {
    setLoading(true);
    const { error } = await signIn(data.email, data.password);
    
    if (error) {
      setLoading(false);
      const errorMessage = error.message.includes("Invalid login credentials")
        ? "E-mail ou senha incorretos"
        : error.message;
      toast({
        title: "Erro ao entrar",
        description: errorMessage,
        variant: "destructive",
      });
      return;
    }

    // Get current session
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session?.user) {
      await handlePostAuth(session.user.id);
    }
    
    setLoading(false);
  };

  const handleSignup = async (data: SignupFormData) => {
    setLoading(true);
    // Always signup as "user" in this route
    const { error } = await signUp(data.email, data.password, data.fullName, data.phone, data.birthDate, "user");
    
    if (error) {
      setLoading(false);
      const errorMessage = error.message.includes("already registered")
        ? "Este e-mail já está cadastrado"
        : error.message;
      toast({
        title: "Erro ao cadastrar",
        description: errorMessage,
        variant: "destructive",
      });
      return;
    }

    // Get current session
    const { data: { session } } = await supabase.auth.getSession();
    
    // If we have a valid invite code, use it to link the user to the planner
    if (session?.user && inviteValidation.valid && data.inviteCode) {
      try {
        await supabase.rpc("use_planner_invite", {
          code: data.inviteCode,
          client_user_id: session.user.id,
        });
        toast({
          title: "Conta criada!",
          description: `Bem-vindo! Você está vinculado ao planejador ${inviteValidation.plannerName}.`,
        });
      } catch {
        toast({ title: "Conta criada!", description: "Bem-vindo ao FinLar!" });
      }
    } else {
      toast({ title: "Conta criada!", description: "Bem-vindo ao FinLar!" });
    }

    if (session?.user) {
      await handlePostAuth(session.user.id);
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="flex items-center justify-between p-4 md:p-6">
        <Link to="/" className="flex items-center gap-2">
          <FinLarLogo size="lg" />
        </Link>
        <ThemeToggle />
      </header>

      {/* Main content */}
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md animate-fade-in">
          <Card className="border-border/50 shadow-lg">
            <CardHeader className="text-center pb-4">
              <CardTitle className="text-2xl font-bold text-foreground">
                {isLogin ? "Bem-vindo de volta!" : "Criar sua conta"}
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                {isLogin ? "Entre para gerenciar suas finanças" : "Comece a controlar seu dinheiro hoje"}
              </CardDescription>
            </CardHeader>

            <CardContent>
              {isLogin ? (
                <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">E-mail</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="seu@email.com"
                      {...loginForm.register("email")}
                      className="h-11"
                    />
                    {loginForm.formState.errors.email && (
                      <p className="text-sm text-destructive">
                        {loginForm.formState.errors.email.message}
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
                        {...loginForm.register("password")}
                        className="h-11 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                    {loginForm.formState.errors.password && (
                      <p className="text-sm text-destructive">
                        {loginForm.formState.errors.password.message}
                      </p>
                    )}
                  </div>

                  <Button type="submit" className="w-full h-11" disabled={loading}>
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Entrando...
                      </>
                    ) : (
                      "Entrar"
                    )}
                  </Button>
                </form>
              ) : (
                <form onSubmit={signupForm.handleSubmit(handleSignup)} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Nome completo</Label>
                    <Input
                      id="fullName"
                      type="text"
                      placeholder="Seu nome"
                      {...signupForm.register("fullName")}
                      className="h-11"
                    />
                    {signupForm.formState.errors.fullName && (
                      <p className="text-sm text-destructive">
                        {signupForm.formState.errors.fullName.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-email">E-mail</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="seu@email.com"
                      {...signupForm.register("email")}
                      className="h-11"
                    />
                    {signupForm.formState.errors.email && (
                      <p className="text-sm text-destructive">
                        {signupForm.formState.errors.email.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Telefone</Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="11999999999"
                      {...signupForm.register("phone")}
                      className="h-11"
                    />
                    {signupForm.formState.errors.phone && (
                      <p className="text-sm text-destructive">
                        {signupForm.formState.errors.phone.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="birthDate">Data de nascimento</Label>
                    <Input
                      id="birthDate"
                      type="date"
                      {...signupForm.register("birthDate")}
                      className="h-11"
                    />
                    {signupForm.formState.errors.birthDate && (
                      <p className="text-sm text-destructive">
                        {signupForm.formState.errors.birthDate.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Senha</Label>
                    <div className="relative">
                      <Input
                        id="signup-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        {...signupForm.register("password")}
                        className="h-11 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                    {signupForm.formState.errors.password && (
                      <p className="text-sm text-destructive">
                        {signupForm.formState.errors.password.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirmar senha</Label>
                    <Input
                      id="confirmPassword"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      {...signupForm.register("confirmPassword")}
                      className="h-11"
                    />
                    {signupForm.formState.errors.confirmPassword && (
                      <p className="text-sm text-destructive">
                        {signupForm.formState.errors.confirmPassword.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="inviteCode">Código de convite (opcional)</Label>
                    <Input
                      id="inviteCode"
                      type="text"
                      placeholder="ABC123XY"
                      {...signupForm.register("inviteCode")}
                      className="h-11 uppercase"
                      maxLength={8}
                    />
                    {inviteValidation.checking && (
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Loader2 className="w-3 h-3 animate-spin" /> Validando...
                      </p>
                    )}
                    {inviteValidation.valid && inviteValidation.plannerName && (
                      <p className="text-sm text-primary">
                        ✓ Convite do planejador: {inviteValidation.plannerName}
                      </p>
                    )}
                    {inviteCodeValue && inviteCodeValue.length >= 8 && !inviteValidation.valid && !inviteValidation.checking && (
                      <p className="text-sm text-destructive">Código inválido ou expirado</p>
                    )}
                  </div>

                  <Button type="submit" className="w-full h-11" disabled={loading}>
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Criando conta...
                      </>
                    ) : (
                      "Criar conta"
                    )}
                  </Button>
                </form>
              )}

              <div className="mt-6 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setIsLogin(!isLogin);
                    loginForm.reset();
                    signupForm.reset();
                  }}
                  className="text-sm text-primary hover:underline"
                >
                  {isLogin ? "Não tem conta? Cadastre-se" : "Já tem conta? Entre"}
                </button>
              </div>
            </CardContent>
          </Card>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Seu dinheiro, do jeito certo.
          </p>
        </div>
      </main>
    </div>
  );
}

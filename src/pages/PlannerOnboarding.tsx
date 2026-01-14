import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Building2, FileText } from "lucide-react";

import { useAuth } from "@/hooks/useAuth";
import { usePlannerProfile } from "@/hooks/usePlannerProfile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FinLarLogo } from "@/components/FinLarLogo";

const onboardingSchema = z.object({
  razaoSocial: z.string().min(2, "Razão social deve ter pelo menos 2 caracteres"),
  cnpj: z.string().optional(),
});

type OnboardingFormData = z.infer<typeof onboardingSchema>;

export default function PlannerOnboarding() {
  const { user, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading, isPlannerAdmin, needsOnboarding, updatePlannerOnboarding } = usePlannerProfile();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<OnboardingFormData>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      razaoSocial: "",
      cnpj: "",
    },
  });

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth?context=planner");
      return;
    }

    if (!profileLoading && profile) {
      // If not a planner admin, redirect to dashboard
      if (!isPlannerAdmin) {
        navigate("/dashboard");
        return;
      }

      // If already completed onboarding, redirect to dashboard
      if (!needsOnboarding) {
        navigate("/dashboard");
        return;
      }
    }
  }, [user, authLoading, profile, profileLoading, isPlannerAdmin, needsOnboarding, navigate]);

  const handleSubmit = async (data: OnboardingFormData) => {
    setSubmitting(true);
    const { error } = await updatePlannerOnboarding({
      razao_social: data.razaoSocial,
      cnpj: data.cnpj || undefined,
    });
    setSubmitting(false);

    if (!error) {
      navigate("/dashboard");
    }
  };

  if (authLoading || profileLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-center p-6">
        <FinLarLogo size="lg" />
      </header>

      {/* Main content */}
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md animate-fade-in">
          <Card className="border-border/50 shadow-lg">
            <CardHeader className="text-center pb-4">
              <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Building2 className="w-8 h-8 text-primary" />
              </div>
              <CardTitle className="text-2xl font-bold text-foreground">
                Dados Profissionais
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                Complete seu cadastro como Planejador Financeiro
              </CardDescription>
            </CardHeader>

            <CardContent>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="razaoSocial">
                    Razão Social / Nome Profissional *
                  </Label>
                  <Input
                    id="razaoSocial"
                    placeholder="Sua empresa ou nome profissional"
                    {...form.register("razaoSocial")}
                    className="h-11"
                  />
                  {form.formState.errors.razaoSocial && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.razaoSocial.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cnpj" className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    CNPJ (opcional)
                  </Label>
                  <Input
                    id="cnpj"
                    placeholder="00.000.000/0000-00"
                    {...form.register("cnpj")}
                    className="h-11"
                  />
                  <p className="text-xs text-muted-foreground">
                    Informe seu CNPJ se você é pessoa jurídica
                  </p>
                </div>

                <Button
                  type="submit"
                  className="w-full h-11 mt-6"
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    "Concluir Cadastro"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

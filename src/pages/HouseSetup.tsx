import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Users, Loader2, ArrowRight } from "lucide-react";
import { FinLarLogo } from "@/components/FinLarLogo";

import { useHouse } from "@/hooks/useHouse";
import { useSubscription } from "@/hooks/useSubscription";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ThemeToggle } from "@/components/ThemeToggle";
import { OnboardingDialog } from "@/components/OnboardingDialog";
import { SubscriptionDialog } from "@/components/SubscriptionDialog";
import { useToast } from "@/components/ui/use-toast";

const createHouseSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
});

const joinHouseSchema = z.object({
  code: z.string().length(8, "Código deve ter 8 caracteres"),
});

type CreateHouseData = z.infer<typeof createHouseSchema>;
type JoinHouseData = z.infer<typeof joinHouseSchema>;

export default function HouseSetup() {
  const [loading, setLoading] = useState(false);
  const [showSubscriptionDialog, setShowSubscriptionDialog] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("create");
  
  const { createHouse, joinHouse } = useHouse();
  const { 
    isSubscribed, 
    isInTrial, 
    hasAccess,
    loading: subscriptionLoading, 
    startCheckout, 
    checkSubscription,
    getTrialDaysRemaining,
  } = useSubscription();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();

  const createForm = useForm<CreateHouseData>({
    resolver: zodResolver(createHouseSchema),
    defaultValues: { name: "" },
  });

  const joinForm = useForm<JoinHouseData>({
    resolver: zodResolver(joinHouseSchema),
    defaultValues: { code: "" },
  });

  // Handle success/cancelled redirects from Stripe
  useEffect(() => {
    const success = searchParams.get("success");
    const cancelled = searchParams.get("cancelled");

    if (success === "true") {
      toast({
        title: "Assinatura ativada!",
        description: "Bem-vindo ao FinLar Pro! Agora você pode criar sua Casa.",
      });
      // Clear the URL params
      setSearchParams({});
      // Refresh subscription status
      checkSubscription();
      // Set active tab to create
      setActiveTab("create");
    }

    if (cancelled === "true") {
      toast({
        title: "Checkout cancelado",
        description: "O checkout foi cancelado. Você pode tentar novamente.",
        variant: "destructive",
      });
      setSearchParams({});
    }
  }, [searchParams, setSearchParams, toast, checkSubscription]);

  const handleCreateClick = () => {
    if (subscriptionLoading) return;
    
    // Allow if subscribed OR in trial
    if (!hasAccess) {
      setShowSubscriptionDialog(true);
      return;
    }
    
    // If has access, submit the form
    createForm.handleSubmit(handleCreate)();
  };

  const handleCreate = async (data: CreateHouseData) => {
    setLoading(true);
    const { error } = await createHouse(data.name);
    setLoading(false);

    if (!error) {
      navigate("/dashboard");
    }
  };

  const handleJoin = async (data: JoinHouseData) => {
    setLoading(true);
    const { error } = await joinHouse(data.code);
    setLoading(false);

    if (!error) {
      navigate("/dashboard");
    }
  };

  const handleSubscribe = async () => {
    setCheckoutLoading(true);
    await startCheckout();
    setCheckoutLoading(false);
  };

  const trialDaysRemaining = getTrialDaysRemaining();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Onboarding Dialog */}
      <OnboardingDialog />
      
      {/* Subscription Dialog */}
      <SubscriptionDialog
        open={showSubscriptionDialog}
        onOpenChange={setShowSubscriptionDialog}
        onSubscribe={handleSubscribe}
        loading={checkoutLoading}
        isInTrial={isInTrial}
        trialDaysRemaining={trialDaysRemaining}
      />

      <header className="flex items-center justify-between p-4 md:p-6">
        <div className="flex items-center gap-2">
          <FinLarLogo size="lg" />
        </div>
        <ThemeToggle />
      </header>

      {/* Main content */}
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md animate-fade-in">
          <div className="text-center mb-8">
            <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
              Configure sua Casa
            </h1>
            <p className="text-muted-foreground">
              Crie uma nova Casa ou entre em uma existente usando um código de convite.
            </p>
            
            {/* Trial info */}
            {isInTrial && !isSubscribed && (
              <div className="mt-4 inline-flex items-center gap-2 bg-success/10 text-success px-4 py-2 rounded-full text-sm font-medium">
                🎉 Você tem {trialDaysRemaining} dias de teste grátis
              </div>
            )}
          </div>

          <Card className="border-border/50 shadow-lg">
            <CardContent className="pt-6">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="create" className="gap-2">
                    <Plus className="w-4 h-4" />
                    Criar Casa
                  </TabsTrigger>
                  <TabsTrigger value="join" className="gap-2">
                    <Users className="w-4 h-4" />
                    Entrar em Casa
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="create">
                  <form onSubmit={(e) => { e.preventDefault(); handleCreateClick(); }} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="house-name">Nome da Casa</Label>
                      <Input
                        id="house-name"
                        type="text"
                        placeholder="Ex: Família Silva"
                        {...createForm.register("name")}
                        className="h-11"
                      />
                      {createForm.formState.errors.name && (
                        <p className="text-sm text-destructive">
                          {createForm.formState.errors.name.message}
                        </p>
                      )}
                    </div>

                    <div className="p-4 rounded-lg bg-accent/50 border border-accent">
                      <p className="text-sm text-accent-foreground">
                        <strong>Dica:</strong> Ao criar uma Casa, você se torna o proprietário e pode 
                        convidar outros membros usando um código exclusivo.
                      </p>
                    </div>

                    <Button 
                      type="submit" 
                      className="w-full h-11 gap-2" 
                      disabled={loading || subscriptionLoading}
                    >
                      {loading || subscriptionLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          {subscriptionLoading ? "Verificando..." : "Criando..."}
                        </>
                      ) : (
                        <>
                          Criar Casa
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="join">
                  <form onSubmit={joinForm.handleSubmit(handleJoin)} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="invite-code">Código de convite</Label>
                      <Input
                        id="invite-code"
                        type="text"
                        placeholder="Ex: ABC12345"
                        {...joinForm.register("code")}
                        className="h-11 uppercase tracking-widest text-center font-mono"
                        maxLength={8}
                        onChange={(e) => {
                          const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
                          joinForm.setValue("code", value);
                        }}
                      />
                      {joinForm.formState.errors.code && (
                        <p className="text-sm text-destructive">
                          {joinForm.formState.errors.code.message}
                        </p>
                      )}
                    </div>

                    <div className="p-4 rounded-lg bg-accent/50 border border-accent">
                      <p className="text-sm text-accent-foreground">
                        <strong>Nota:</strong> Você entrará como visualizador. O proprietário da Casa 
                        pode alterar suas permissões posteriormente.
                      </p>
                    </div>

                    <Button type="submit" className="w-full h-11 gap-2" disabled={loading}>
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Entrando...
                        </>
                      ) : (
                        <>
                          Entrar na Casa
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

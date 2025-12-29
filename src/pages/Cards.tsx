import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CreditCard, Plus, ArrowLeft, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { useAuth } from "@/hooks/useAuth";
import { useHouse } from "@/hooks/useHouse";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const cardSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  brand: z.enum(["visa", "mastercard", "elo"]),
  last_digits: z.string().length(4, "Deve ter exatamente 4 dígitos").regex(/^\d+$/, "Apenas números"),
  color: z.string(),
  closing_day: z.number().min(1).max(28),
  due_day: z.number().min(1).max(28),
});

type CardFormData = z.infer<typeof cardSchema>;

interface CreditCardData {
  id: string;
  name: string;
  brand: "visa" | "mastercard" | "elo";
  last_digits: string;
  color: string;
  closing_day: number;
  due_day: number;
}

// Days options for select
const daysOptions = Array.from({ length: 28 }, (_, i) => i + 1);

const brandIcons: Record<string, string> = {
  visa: "💳",
  mastercard: "🔴",
  elo: "💛",
};

const cardColors = [
  "#059669",
  "#1A1F71",
  "#EB001B",
  "#000000",
  "#6366F1",
  "#8B5CF6",
  "#EC4899",
  "#F97316",
];

export default function Cards() {
  const { user, loading: authLoading } = useAuth();
  const { currentHouse, memberRole, loading: houseLoading } = useHouse();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [cards, setCards] = useState<CreditCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<CardFormData>({
    resolver: zodResolver(cardSchema),
    defaultValues: {
      name: "",
      brand: "visa",
      last_digits: "",
      color: cardColors[0],
      closing_day: 20,
      due_day: 10,
    },
  });

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (currentHouse) {
      fetchCards();
    }
  }, [currentHouse]);

  const fetchCards = async () => {
    if (!currentHouse) return;

    try {
      const { data, error } = await supabase
        .from("credit_cards")
        .select("*")
        .eq("house_id", currentHouse.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setCards(data || []);
    } catch (error) {
      console.error("Error fetching cards:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (data: CardFormData) => {
    if (!currentHouse || !user) return;

    setSubmitting(true);

    try {
      const { error } = await supabase.from("credit_cards").insert({
        house_id: currentHouse.id,
        name: data.name,
        brand: data.brand,
        last_digits: data.last_digits,
        color: data.color,
        closing_day: data.closing_day,
        due_day: data.due_day,
        created_by: user.id,
      });

      if (error) throw error;

      toast({
        title: "Cartão adicionado!",
        description: `${data.name} foi cadastrado com sucesso.`,
      });

      setDialogOpen(false);
      form.reset();
      fetchCards();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const openNewCardDialog = () => {
    form.reset({
      name: "",
      brand: "visa",
      last_digits: "",
      color: cardColors[0],
      closing_day: 20,
      due_day: 10,
    });
    setDialogOpen(true);
  };

  if (authLoading || houseLoading) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <Skeleton className="h-16 w-full" />
          <div className="grid gap-4 md:grid-cols-2">
            <Skeleton className="h-48" />
            <Skeleton className="h-48" />
          </div>
        </div>
      </div>
    );
  }

  const isOwner = memberRole === "owner";

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-sm border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-3 md:px-6 md:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/dashboard")}
                className="rounded-full"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="font-semibold text-foreground">Cartões de Crédito</h1>
                <p className="text-xs text-muted-foreground">{currentHouse?.name}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <ThemeToggle />
              {isOwner && (
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="gap-2" onClick={openNewCardDialog}>
                      <Plus className="w-4 h-4" />
                      <span className="hidden sm:inline">Adicionar</span>
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Novo Cartão</DialogTitle>
                      <DialogDescription>
                        Adicione um novo cartão de crédito à sua Casa.
                      </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="card-name">Apelido do cartão</Label>
                        <Input
                          id="card-name"
                          placeholder="Ex: Cartão Principal"
                          {...form.register("name")}
                        />
                        {form.formState.errors.name && (
                          <p className="text-sm text-destructive">
                            {form.formState.errors.name.message}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="card-brand">Bandeira</Label>
                        <Select
                          value={form.watch("brand")}
                          onValueChange={(value) => form.setValue("brand", value as "visa" | "mastercard" | "elo")}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="visa">
                              <span className="flex items-center gap-2">
                                {brandIcons.visa} Visa
                              </span>
                            </SelectItem>
                            <SelectItem value="mastercard">
                              <span className="flex items-center gap-2">
                                {brandIcons.mastercard} Mastercard
                              </span>
                            </SelectItem>
                            <SelectItem value="elo">
                              <span className="flex items-center gap-2">
                                {brandIcons.elo} Elo
                              </span>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="last-digits">Últimos 4 dígitos</Label>
                        <Input
                          id="last-digits"
                          placeholder="0000"
                          maxLength={4}
                          {...form.register("last_digits")}
                          className="font-mono tracking-widest"
                        />
                        {form.formState.errors.last_digits && (
                          <p className="text-sm text-destructive">
                            {form.formState.errors.last_digits.message}
                          </p>
                        )}
                      </div>

                      {/* Closing and Due Day */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="closing-day">Dia de fechamento</Label>
                          <Select
                            value={form.watch("closing_day")?.toString()}
                            onValueChange={(value) => form.setValue("closing_day", parseInt(value))}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Dia" />
                            </SelectTrigger>
                            <SelectContent>
                              {daysOptions.map((day) => (
                                <SelectItem key={day} value={day.toString()}>
                                  Dia {day}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="due-day">Dia de vencimento</Label>
                          <Select
                            value={form.watch("due_day")?.toString()}
                            onValueChange={(value) => form.setValue("due_day", parseInt(value))}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Dia" />
                            </SelectTrigger>
                            <SelectContent>
                              {daysOptions.map((day) => (
                                <SelectItem key={day} value={day.toString()}>
                                  Dia {day}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Cor do cartão</Label>
                        <div className="flex flex-wrap gap-2">
                          {cardColors.map((color) => (
                            <button
                              key={color}
                              type="button"
                              onClick={() => form.setValue("color", color)}
                              className={`w-8 h-8 rounded-full border-2 transition-all ${
                                form.watch("color") === color
                                  ? "border-foreground scale-110"
                                  : "border-transparent"
                              }`}
                              style={{ backgroundColor: color }}
                            />
                          ))}
                        </div>
                      </div>

                      <DialogFooter>
                        <Button type="submit" disabled={submitting} className="w-full sm:w-auto">
                          {submitting ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Salvando...
                            </>
                          ) : (
                            "Adicionar cartão"
                          )}
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-4xl mx-auto px-4 py-6 md:px-6 md:py-8">
        {loading ? (
          <div className="grid gap-4 md:grid-cols-2">
            <Skeleton className="h-48" />
            <Skeleton className="h-48" />
          </div>
        ) : cards.length === 0 ? (
          <div className="text-center py-16">
            <CreditCard className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h2 className="text-xl font-semibold text-foreground mb-2">
              Nenhum cartão cadastrado
            </h2>
            <p className="text-muted-foreground mb-6">
              {isOwner
                ? "Comece adicionando seu primeiro cartão de crédito."
                : "O proprietário da Casa ainda não adicionou cartões."}
            </p>
            {isOwner && (
              <Button onClick={openNewCardDialog} className="gap-2">
                <Plus className="w-4 h-4" />
                Adicionar primeiro cartão
              </Button>
            )}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {cards.map((card) => (
              <Card
                key={card.id}
                className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow border-0"
                onClick={() => navigate(`/cards/${card.id}`)}
              >
                <div
                  className="relative p-6 text-white"
                  style={{ backgroundColor: card.color }}
                >
                  {/* Card chip */}
                  <div className="w-12 h-8 rounded bg-yellow-400/80 mb-6" />

                  {/* Card number */}
                  <div className="font-mono text-lg tracking-widest mb-4 opacity-90">
                    •••• •••• •••• {card.last_digits}
                  </div>

                  {/* Card name & brand */}
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-xs opacity-70 uppercase tracking-wide">Nome</p>
                      <p className="font-medium">{card.name}</p>
                    </div>
                    <div className="text-2xl">{brandIcons[card.brand]}</div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

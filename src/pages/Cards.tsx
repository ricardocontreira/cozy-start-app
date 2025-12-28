import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Home, CreditCard, Plus, Pencil, Trash2, ArrowLeft, Loader2, ChevronDown, ChevronUp, FileSpreadsheet } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { useAuth } from "@/hooks/useAuth";
import { useHouse } from "@/hooks/useHouse";
import { useInvoiceUpload } from "@/hooks/useInvoiceUpload";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { InvoiceUploader } from "@/components/InvoiceUploader";
import { UploadHistory } from "@/components/UploadHistory";
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

const cardSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  brand: z.enum(["visa", "mastercard", "elo"]),
  last_digits: z.string().length(4, "Deve ter exatamente 4 dígitos").regex(/^\d+$/, "Apenas números"),
  color: z.string(),
});

type CardFormData = z.infer<typeof cardSchema>;

interface CreditCardData {
  id: string;
  name: string;
  brand: "visa" | "mastercard" | "elo";
  last_digits: string;
  color: string;
  icon: string;
}

const brandIcons: Record<string, string> = {
  visa: "💳",
  mastercard: "🔴",
  elo: "💛",
};

const brandColors: Record<string, string> = {
  visa: "#1A1F71",
  mastercard: "#EB001B",
  elo: "#FFCB05",
};

const cardColors = [
  "#059669", // Primary green
  "#1A1F71", // Visa blue
  "#EB001B", // Mastercard red
  "#000000", // Black
  "#6366F1", // Indigo
  "#8B5CF6", // Purple
  "#EC4899", // Pink
  "#F97316", // Orange
];

export default function Cards() {
  const { user, loading: authLoading } = useAuth();
  const { currentHouse, memberRole, loading: houseLoading } = useHouse();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [cards, setCards] = useState<CreditCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<CreditCardData | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);

  const form = useForm<CardFormData>({
    resolver: zodResolver(cardSchema),
    defaultValues: {
      name: "",
      brand: "visa",
      last_digits: "",
      color: cardColors[0],
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
      if (editingCard) {
        const { error } = await supabase
          .from("credit_cards")
          .update({
            name: data.name,
            brand: data.brand,
            last_digits: data.last_digits,
            color: data.color,
          })
          .eq("id", editingCard.id);

        if (error) throw error;
        
        toast({
          title: "Cartão atualizado!",
          description: "As alterações foram salvas.",
        });
      } else {
        const { error } = await supabase.from("credit_cards").insert({
          house_id: currentHouse.id,
          name: data.name,
          brand: data.brand,
          last_digits: data.last_digits,
          color: data.color,
          created_by: user.id,
        });

        if (error) throw error;
        
        toast({
          title: "Cartão adicionado!",
          description: `${data.name} foi cadastrado com sucesso.`,
        });
      }

      setDialogOpen(false);
      setEditingCard(null);
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

  const handleEdit = (card: CreditCardData) => {
    setEditingCard(card);
    form.reset({
      name: card.name,
      brand: card.brand,
      last_digits: card.last_digits,
      color: card.color,
    });
    setDialogOpen(true);
  };

  const handleDelete = async (cardId: string) => {
    try {
      const { error } = await supabase
        .from("credit_cards")
        .delete()
        .eq("id", cardId);

      if (error) throw error;
      
      toast({
        title: "Cartão removido",
        description: "O cartão foi excluído com sucesso.",
      });
      
      fetchCards();
    } catch (error: any) {
      toast({
        title: "Erro ao excluir",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const openNewCardDialog = () => {
    setEditingCard(null);
    form.reset({
      name: "",
      brand: "visa",
      last_digits: "",
      color: cardColors[0],
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
                      <DialogTitle>
                        {editingCard ? "Editar Cartão" : "Novo Cartão"}
                      </DialogTitle>
                      <DialogDescription>
                        {editingCard 
                          ? "Atualize as informações do cartão." 
                          : "Adicione um novo cartão de crédito à sua Casa."}
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
                          ) : editingCard ? (
                            "Salvar alterações"
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
          <div className="space-y-4">
            {cards.map((card) => (
              <CardWithInvoice
                key={card.id}
                card={card}
                isOwner={isOwner}
                isExpanded={expandedCardId === card.id}
                onToggle={() => setExpandedCardId(expandedCardId === card.id ? null : card.id)}
                onEdit={handleEdit}
                onDelete={handleDelete}
                houseId={currentHouse?.id || ""}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

// Separate component for card with invoice management
interface CardWithInvoiceProps {
  card: CreditCardData;
  isOwner: boolean;
  isExpanded: boolean;
  onToggle: () => void;
  onEdit: (card: CreditCardData) => void;
  onDelete: (cardId: string) => void;
  houseId: string;
}

function CardWithInvoice({
  card,
  isOwner,
  isExpanded,
  onToggle,
  onEdit,
  onDelete,
  houseId,
}: CardWithInvoiceProps) {
  const {
    uploadHistory,
    isUploading,
    isLoading: historyLoading,
    uploadInvoice,
    undoUpload,
  } = useInvoiceUpload({ cardId: card.id, houseId });

  return (
    <Collapsible open={isExpanded} onOpenChange={onToggle}>
      <Card className="overflow-hidden border shadow-lg">
        {/* Credit Card Visual */}
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

          {/* Actions */}
          {isOwner && (
            <div className="absolute top-4 right-4 flex gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-white/80 hover:text-white hover:bg-white/20"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(card);
                }}
              >
                <Pencil className="w-4 h-4" />
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-white/80 hover:text-white hover:bg-white/20"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Excluir cartão?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta ação não pode ser desfeita. O cartão "{card.name}" será
                      permanentemente removido.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => onDelete(card.id)}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Excluir
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}

          {/* Expand toggle */}
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="absolute bottom-3 right-3 text-white/70 hover:text-white hover:bg-white/20 gap-1"
            >
              <FileSpreadsheet className="h-4 w-4" />
              <span className="text-xs">Faturas</span>
              {isExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </CollapsibleTrigger>
        </div>

        {/* Collapsible Invoice Management */}
        <CollapsibleContent>
          <CardContent className="p-6 space-y-6 bg-card border-t">
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                📄 Importe sua fatura com facilidade
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Você no controle das suas finanças. Arraste um arquivo CSV ou Excel com suas transações.
              </p>
              {isOwner ? (
                <InvoiceUploader
                  onUpload={uploadInvoice}
                  isUploading={isUploading}
                />
              ) : (
                <div className="text-center py-6 text-muted-foreground border-2 border-dashed rounded-lg">
                  <FileSpreadsheet className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Apenas o proprietário pode importar faturas</p>
                </div>
              )}
            </div>

            <UploadHistory
              history={uploadHistory}
              isLoading={historyLoading}
              onUndo={undoUpload}
              isOwner={isOwner}
            />
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

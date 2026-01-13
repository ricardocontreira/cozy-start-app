import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Pencil, Trash2, Loader2, FileSpreadsheet } from "lucide-react";
import { MobileBottomNav } from "@/components/MobileBottomNav";
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
import { ThemeToggle } from "@/components/ThemeToggle";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { InvoiceUploader } from "@/components/InvoiceUploader";
import { UploadHistory } from "@/components/UploadHistory";
import { InvoicesList } from "@/components/InvoicesList";
import { DuplicateReviewDialog } from "@/components/DuplicateReviewDialog";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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

export default function CardDetails() {
  const { cardId } = useParams<{ cardId: string }>();
  const { user, loading: authLoading } = useAuth();
  const { currentHouse, memberRole, loading: houseLoading } = useHouse();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [card, setCard] = useState<CreditCardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const {
    uploadHistory,
    isUploading,
    isLoading: historyLoading,
    uploadInvoice,
    undoUpload,
    refreshHistory,
    hasMoreHistory,
    loadMoreHistory,
    isLoadingMore,
    pendingDuplicates,
    hasPendingDuplicates,
    approveDuplicates,
    discardDuplicates,
    isApprovingDuplicates,
  } = useInvoiceUpload({ 
    cardId: cardId || "", 
    houseId: currentHouse?.id || "" 
  });

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
    if (currentHouse && cardId) {
      fetchCard();
    }
  }, [currentHouse, cardId]);

  const fetchCard = async () => {
    if (!currentHouse || !cardId) return;

    try {
      const { data, error } = await supabase
        .from("credit_cards")
        .select("*")
        .eq("id", cardId)
        .eq("house_id", currentHouse.id)
        .single();

      if (error) throw error;
      setCard(data);
      form.reset({
        name: data.name,
        brand: data.brand,
        last_digits: data.last_digits,
        color: data.color,
        closing_day: data.closing_day || 20,
        due_day: data.due_day || 10,
      });
    } catch (error) {
      console.error("Error fetching card:", error);
      toast({
        title: "Erro",
        description: "Cartão não encontrado.",
        variant: "destructive",
      });
      navigate("/cards");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (data: CardFormData) => {
    if (!currentHouse || !cardId) return;

    setSubmitting(true);

    try {
      const { error } = await supabase
        .from("credit_cards")
        .update({
          name: data.name,
          brand: data.brand,
          last_digits: data.last_digits,
          color: data.color,
          closing_day: data.closing_day,
          due_day: data.due_day,
        })
        .eq("id", cardId);

      if (error) throw error;

      toast({
        title: "Cartão atualizado!",
        description: "As alterações foram salvas.",
      });

      setDialogOpen(false);
      fetchCard();
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

  const handleDelete = async () => {
    if (!cardId) return;

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

      navigate("/cards");
    } catch (error: any) {
      toast({
        title: "Erro ao excluir",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (authLoading || houseLoading || loading) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (!card) {
    return null;
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
                onClick={() => navigate("/cards")}
                className="rounded-full"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="font-semibold text-foreground">{card.name}</h1>
                <p className="text-xs text-muted-foreground">
                  •••• {card.last_digits} • {brandIcons[card.brand]}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <ThemeToggle />
              {isOwner && (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDialogOpen(true)}
                    className="rounded-full"
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-full text-destructive hover:text-destructive"
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
                          onClick={handleDelete}
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
        </div>
      </header>

      {/* Card Visual */}
      <div className="max-w-4xl mx-auto px-4 py-6 md:px-6">
        <div
          className="relative p-6 rounded-xl text-white shadow-lg"
          style={{ backgroundColor: card.color }}
        >
          <div className="w-12 h-8 rounded bg-yellow-400/80 mb-6" />
          <div className="font-mono text-lg tracking-widest mb-4 opacity-90">
            •••• •••• •••• {card.last_digits}
          </div>
          <div className="flex items-end justify-between">
            <div>
              <p className="text-xs opacity-70 uppercase tracking-wide">Nome</p>
              <p className="font-medium">{card.name}</p>
            </div>
            <div className="text-2xl">{brandIcons[card.brand]}</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-4xl mx-auto px-4 md:px-6">
        <Tabs defaultValue="invoices" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="invoices">Faturas</TabsTrigger>
            <TabsTrigger value="import">Importar Fatura</TabsTrigger>
          </TabsList>

          <TabsContent value="invoices" className="space-y-6 mt-6">
            <InvoicesList cardId={cardId!} houseId={currentHouse?.id || ""} />
          </TabsContent>

          <TabsContent value="import" className="space-y-6 mt-6">
            <div className="bg-card rounded-lg border p-6">
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
              houseId={currentHouse?.id || ""}
              onRefresh={refreshHistory}
              hasMore={hasMoreHistory}
              onLoadMore={loadMoreHistory}
              isLoadingMore={isLoadingMore}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Cartão</DialogTitle>
            <DialogDescription>
              Atualize as informações do cartão.
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
                <Label htmlFor="edit-closing-day">Dia de fechamento</Label>
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
                <Label htmlFor="edit-due-day">Dia de vencimento</Label>
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
                  "Salvar alterações"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Duplicate Review Dialog */}
      <DuplicateReviewDialog
        open={hasPendingDuplicates}
        onOpenChange={(open) => {
          if (!open) {
            discardDuplicates();
          }
        }}
        duplicates={pendingDuplicates}
        onApprove={approveDuplicates}
        onDiscardAll={discardDuplicates}
        isLoading={isApprovingDuplicates}
      />

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav activeRoute="cards" />
    </div>
  );
}

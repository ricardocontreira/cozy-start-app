import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Clock, FileSpreadsheet, Undo2, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { Skeleton } from "@/components/ui/skeleton";
import { UploadLog } from "@/hooks/useInvoiceUpload";

interface UploadHistoryProps {
  history: UploadLog[];
  isLoading: boolean;
  onUndo: (uploadId: string) => Promise<boolean>;
  isOwner: boolean;
}

export function UploadHistory({ history, isLoading, onUndo, isOwner }: UploadHistoryProps) {
  const [undoingId, setUndoingId] = useState<string | null>(null);

  const handleUndo = async (uploadId: string) => {
    setUndoingId(uploadId);
    await onUndo(uploadId);
    setUndoingId(null);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <Badge variant="outline" className="text-green-600 border-green-300 bg-green-50 dark:bg-green-950/20">
            <CheckCircle className="h-3 w-3 mr-1" />
            Concluído
          </Badge>
        );
      case "processing":
        return (
          <Badge variant="outline" className="text-primary border-primary/30 bg-primary/5">
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            Processando
          </Badge>
        );
      case "undone":
        return (
          <Badge variant="outline" className="text-muted-foreground border-muted bg-muted/50">
            <Undo2 className="h-3 w-3 mr-1" />
            Desfeito
          </Badge>
        );
      case "error":
        return (
          <Badge variant="outline" className="text-destructive border-destructive/30 bg-destructive/5">
            <AlertCircle className="h-3 w-3 mr-1" />
            Erro
          </Badge>
        );
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Atividades Recentes
        </h4>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Atividades Recentes
        </h4>
        <div className="text-center py-6 text-muted-foreground">
          <FileSpreadsheet className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Nenhum upload realizado ainda</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
        <Clock className="h-4 w-4" />
        Atividades Recentes
      </h4>
      <div className="space-y-2">
        {history.map((log) => (
          <div
            key={log.id}
            className="flex items-center justify-between p-3 rounded-lg border bg-card"
          >
            <div className="flex items-start gap-3 min-w-0 flex-1">
              <FileSpreadsheet className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{log.filename}</p>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1">
                  {log.billing_month && (
                    <span className="text-xs font-medium text-primary">
                      {format(new Date(log.billing_month + "T00:00:00"), "MMM/yyyy", { locale: ptBR })}
                    </span>
                  )}
                  {log.profiles?.full_name && (
                    <span className="text-xs text-muted-foreground">
                      por {log.profiles.full_name}
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground">
                    • {format(new Date(log.created_at), "dd MMM 'às' HH:mm", { locale: ptBR })}
                  </span>
                  {log.items_count > 0 && (
                    <span className="text-xs text-muted-foreground">
                      • {log.items_count} {log.items_count === 1 ? "item" : "itens"}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 ml-2">
              {getStatusBadge(log.status)}
              {isOwner && log.status === "completed" && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground hover:text-destructive"
                      disabled={undoingId === log.id}
                    >
                      {undoingId === log.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Undo2 className="h-4 w-4" />
                      )}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Desfazer Upload</AlertDialogTitle>
                      <AlertDialogDescription>
                        Isso irá remover todas as {log.items_count} transações importadas neste upload.
                        Esta ação não pode ser desfeita.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleUndo(log.id)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Desfazer
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

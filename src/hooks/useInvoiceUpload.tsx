import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "./use-toast";

export interface UploadLog {
  id: string;
  card_id: string;
  house_id: string;
  user_id: string;
  filename: string;
  items_count: number;
  status: "processing" | "completed" | "undone" | "error";
  created_at: string;
  profile?: {
    full_name: string | null;
  };
}

interface UseInvoiceUploadOptions {
  cardId: string;
  houseId: string;
}

export function useInvoiceUpload({ cardId, houseId }: UseInvoiceUploadOptions) {
  const { toast } = useToast();
  const [uploadHistory, setUploadHistory] = useState<UploadLog[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUploadHistory = useCallback(async () => {
    if (!cardId || !houseId) return;

    try {
      const { data, error } = await supabase
        .from("upload_logs")
        .select("*")
        .eq("card_id", cardId)
        .eq("house_id", houseId)
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      setUploadHistory((data || []) as UploadLog[]);
    } catch (error) {
      console.error("Error fetching upload history:", error);
    } finally {
      setIsLoading(false);
    }
  }, [cardId, houseId]);

  useEffect(() => {
    fetchUploadHistory();
  }, [fetchUploadHistory]);

  const parseFileContent = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        resolve(content);
      };
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsText(file);
    });
  };

  const uploadInvoice = async (file: File, invoiceMonth: string): Promise<boolean> => {
    if (!cardId || !houseId) {
      toast({
        title: "Erro",
        description: "Cartão ou casa não selecionados",
        variant: "destructive",
      });
      return false;
    }

    // Validate invoiceMonth format (YYYY-MM)
    if (!invoiceMonth || !/^\d{4}-\d{2}$/.test(invoiceMonth)) {
      toast({
        title: "Erro",
        description: "Mês da fatura inválido",
        variant: "destructive",
      });
      return false;
    }

    setIsUploading(true);

    try {
      const fileContent = await parseFileContent(file);

      const { data, error } = await supabase.functions.invoke("process-invoice", {
        body: {
          fileContent,
          filename: file.name,
          cardId,
          houseId,
          invoiceMonth,
        },
      });

      if (error) {
        throw error;
      }

      if (data.error) {
        throw new Error(data.error);
      }

      toast({
        title: "Sucesso!",
        description: data.message || `${data.itemsCount} transações importadas.`,
      });

      await fetchUploadHistory();
      return true;
    } catch (error: any) {
      console.error("Upload error:", error);
      toast({
        title: "Erro ao processar fatura",
        description: error.message || "Tente novamente mais tarde",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsUploading(false);
    }
  };

  const undoUpload = async (uploadId: string): Promise<boolean> => {
    try {
      // Delete all transactions associated with this upload
      const { error: deleteError } = await supabase
        .from("transactions")
        .delete()
        .eq("upload_id", uploadId);

      if (deleteError) throw deleteError;

      // Update upload log status to undone
      const { error: updateError } = await supabase
        .from("upload_logs")
        .update({ status: "undone" })
        .eq("id", uploadId);

      if (updateError) throw updateError;

      toast({
        title: "Upload desfeito",
        description: "As transações foram removidas com sucesso.",
      });

      await fetchUploadHistory();
      return true;
    } catch (error: any) {
      console.error("Undo error:", error);
      toast({
        title: "Erro ao desfazer upload",
        description: error.message || "Tente novamente mais tarde",
        variant: "destructive",
      });
      return false;
    }
  };

  return {
    uploadHistory,
    isUploading,
    isLoading,
    uploadInvoice,
    undoUpload,
    refreshHistory: fetchUploadHistory,
  };
}

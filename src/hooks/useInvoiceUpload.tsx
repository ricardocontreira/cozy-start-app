import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "./use-toast";
import type { PossibleDuplicate } from "@/components/DuplicateReviewDialog";

export interface UploadLog {
  id: string;
  card_id: string;
  house_id: string;
  user_id: string;
  filename: string;
  items_count: number;
  status: "processing" | "completed" | "undone" | "error" | "pending_review";
  created_at: string;
  billing_month: string | null;
  profiles: {
    full_name: string | null;
  } | null;
}

interface UseInvoiceUploadOptions {
  cardId: string;
  houseId: string;
}

interface UploadResult {
  success: boolean;
  uploadId?: string;
  itemsCount?: number;
  possibleDuplicates?: PossibleDuplicate[];
  invoiceMonth?: string;
}

const PAGE_SIZE = 15;

export function useInvoiceUpload({ cardId, houseId }: UseInvoiceUploadOptions) {
  const { toast } = useToast();
  const [uploadHistory, setUploadHistory] = useState<UploadLog[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isApprovingDuplicates, setIsApprovingDuplicates] = useState(false);
  const [hasMoreHistory, setHasMoreHistory] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  
  // State for duplicate review
  const [pendingDuplicates, setPendingDuplicates] = useState<PossibleDuplicate[]>([]);
  const [pendingUploadId, setPendingUploadId] = useState<string | null>(null);
  const [pendingInvoiceMonth, setPendingInvoiceMonth] = useState<string | null>(null);

  const fetchUploadHistory = useCallback(async (loadMore = false) => {
    if (!cardId || !houseId) return;

    if (loadMore) {
      setIsLoadingMore(true);
    }

    try {
      const currentLength = loadMore ? uploadHistory.length : 0;
      const from = currentLength;
      const to = from + PAGE_SIZE - 1;

      const { data, error, count } = await supabase
        .from("upload_logs")
        .select("*", { count: "exact" })
        .eq("card_id", cardId)
        .eq("house_id", houseId)
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) throw error;
      
      // Fetch profile names for each upload
      const userIds = [...new Set((data || []).map(log => log.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", userIds);
      
      const profilesMap = new Map(profiles?.map(p => [p.id, p.full_name]) || []);
      
      const logsWithProfiles = (data || []).map(log => ({
        ...log,
        billing_month: log.billing_month,
        profiles: {
          full_name: profilesMap.get(log.user_id) || null
        }
      })) as UploadLog[];
      
      if (loadMore) {
        setUploadHistory(prev => [...prev, ...logsWithProfiles]);
      } else {
        setUploadHistory(logsWithProfiles);
      }

      // Check if there are more items to load
      const totalLoaded = currentLength + logsWithProfiles.length;
      setHasMoreHistory((count || 0) > totalLoaded);
    } catch (error) {
      console.error("Error fetching upload history:", error);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [cardId, houseId, uploadHistory.length]);

  const loadMoreHistory = useCallback(() => {
    fetchUploadHistory(true);
  }, [fetchUploadHistory]);

  useEffect(() => {
    fetchUploadHistory();
  }, [cardId, houseId]);

  const parseFileContent = async (file: File): Promise<{ content: string; fileType: "pdf" | "excel" | "csv" }> => {
    const fileName = file.name.toLowerCase();
    const isPdf = file.type === "application/pdf" || fileName.endsWith(".pdf");
    const isExcel = file.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" 
      || file.type === "application/vnd.ms-excel"
      || fileName.endsWith(".xlsx") 
      || fileName.endsWith(".xls");
    const isCsv = file.type === "text/csv" || fileName.endsWith(".csv");
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (isPdf) {
          const dataUrl = e.target?.result as string;
          const base64 = dataUrl.split(",")[1];
          resolve({ content: base64, fileType: "pdf" });
        } else if (isExcel) {
          const dataUrl = e.target?.result as string;
          const base64 = dataUrl.split(",")[1];
          resolve({ content: base64, fileType: "excel" });
        } else {
          // CSV como texto
          resolve({ content: e.target?.result as string, fileType: "csv" });
        }
      };
      reader.onerror = () => reject(new Error("Failed to read file"));
      
      if (isPdf || isExcel) {
        reader.readAsDataURL(file);
      } else {
        reader.readAsText(file);
      }
    });
  };

  const uploadInvoice = async (file: File, invoiceMonth: string): Promise<UploadResult> => {
    if (!cardId || !houseId) {
      toast({
        title: "Erro",
        description: "Cartão ou casa não selecionados",
        variant: "destructive",
      });
      return { success: false };
    }

    // Validate invoiceMonth format (YYYY-MM)
    if (!invoiceMonth || !/^\d{4}-\d{2}$/.test(invoiceMonth)) {
      toast({
        title: "Erro",
        description: "Mês da fatura inválido",
        variant: "destructive",
      });
      return { success: false };
    }

    setIsUploading(true);

    try {
      const { content, fileType } = await parseFileContent(file);

      const { data, error } = await supabase.functions.invoke("process-invoice", {
        body: {
          fileContent: content,
          fileType,
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

      // Check if there are possible duplicates to review
      if (data.possibleDuplicates && data.possibleDuplicates.length > 0) {
        setPendingDuplicates(data.possibleDuplicates);
        setPendingUploadId(data.uploadId);
        setPendingInvoiceMonth(invoiceMonth);
        
        // Show message about duplicates
        if (data.itemsCount > 0) {
          toast({
            title: "Transações importadas",
            description: `${data.itemsCount} transações importadas. ${data.possibleDuplicates.length} possíveis duplicatas aguardando revisão.`,
          });
        }
        
        return {
          success: true,
          uploadId: data.uploadId,
          itemsCount: data.itemsCount,
          possibleDuplicates: data.possibleDuplicates,
          invoiceMonth,
        };
      }

      toast({
        title: "Sucesso!",
        description: data.message || `${data.itemsCount} transações importadas.`,
      });

      await fetchUploadHistory();
      return {
        success: true,
        uploadId: data.uploadId,
        itemsCount: data.itemsCount,
        possibleDuplicates: [],
      };
    } catch (error: any) {
      console.error("Upload error:", error);
      toast({
        title: "Erro ao processar fatura",
        description: error.message || "Tente novamente mais tarde",
        variant: "destructive",
      });
      return { success: false };
    } finally {
      setIsUploading(false);
    }
  };

  const approveDuplicates = async (approvedTransactions: PossibleDuplicate["transaction"][]): Promise<boolean> => {
    if (!pendingUploadId || !pendingInvoiceMonth) {
      toast({
        title: "Erro",
        description: "Dados de upload pendente não encontrados",
        variant: "destructive",
      });
      return false;
    }

    setIsApprovingDuplicates(true);

    try {
      const { data, error } = await supabase.functions.invoke("approve-duplicates", {
        body: {
          uploadId: pendingUploadId,
          cardId,
          houseId,
          approvedTransactions,
          invoiceMonth: pendingInvoiceMonth,
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
        description: data.message || `${data.itemsCount} transações aprovadas.`,
      });

      // Clear pending state
      setPendingDuplicates([]);
      setPendingUploadId(null);
      setPendingInvoiceMonth(null);

      await fetchUploadHistory();
      return true;
    } catch (error: any) {
      console.error("Approve duplicates error:", error);
      toast({
        title: "Erro ao aprovar transações",
        description: error.message || "Tente novamente mais tarde",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsApprovingDuplicates(false);
    }
  };

  const discardDuplicates = async () => {
    if (!pendingUploadId) return;

    try {
      // Just update the upload log status to completed
      await supabase
        .from("upload_logs")
        .update({ status: "completed" })
        .eq("id", pendingUploadId);

      toast({
        title: "Duplicatas descartadas",
        description: "As transações duplicadas foram ignoradas.",
      });

      // Clear pending state
      setPendingDuplicates([]);
      setPendingUploadId(null);
      setPendingInvoiceMonth(null);

      await fetchUploadHistory();
    } catch (error) {
      console.error("Error discarding duplicates:", error);
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
    refreshHistory: () => fetchUploadHistory(false),
    // Pagination
    hasMoreHistory,
    loadMoreHistory,
    isLoadingMore,
    // Duplicate review
    pendingDuplicates,
    hasPendingDuplicates: pendingDuplicates.length > 0,
    approveDuplicates,
    discardDuplicates,
    isApprovingDuplicates,
  };
}

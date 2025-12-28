import { useState, useCallback } from "react";
import { Upload, FileSpreadsheet, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface InvoiceUploaderProps {
  onUpload: (file: File) => Promise<boolean>;
  isUploading: boolean;
  disabled?: boolean;
}

type UploadState = "idle" | "dragging" | "uploading" | "success" | "error";

export function InvoiceUploader({ onUpload, isUploading, disabled }: InvoiceUploaderProps) {
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [dragCounter, setDragCounter] = useState(0);

  const acceptedTypes = [
    "text/csv",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ];

  const acceptedExtensions = [".csv", ".xls", ".xlsx"];

  const isValidFile = (file: File): boolean => {
    const extension = "." + file.name.split(".").pop()?.toLowerCase();
    return acceptedTypes.includes(file.type) || acceptedExtensions.includes(extension);
  };

  const handleFile = useCallback(async (file: File) => {
    if (!isValidFile(file)) {
      setUploadState("error");
      setTimeout(() => setUploadState("idle"), 3000);
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setUploadState("error");
      setTimeout(() => setUploadState("idle"), 3000);
      return;
    }

    setUploadState("uploading");
    const success = await onUpload(file);
    setUploadState(success ? "success" : "error");
    setTimeout(() => setUploadState("idle"), 3000);
  }, [onUpload]);

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragCounter((prev) => prev + 1);
    setUploadState("dragging");
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragCounter((prev) => {
      const newCount = prev - 1;
      if (newCount === 0) {
        setUploadState("idle");
      }
      return newCount;
    });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragCounter(0);
    setUploadState("idle");

    if (disabled || isUploading) return;

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
    e.target.value = "";
  };

  const getStateStyles = () => {
    switch (uploadState) {
      case "dragging":
        return "border-primary bg-primary/5 scale-[1.02]";
      case "uploading":
        return "border-primary/50 bg-primary/5";
      case "success":
        return "border-green-500 bg-green-50 dark:bg-green-950/20";
      case "error":
        return "border-destructive bg-destructive/5";
      default:
        return "border-border hover:border-primary/50 hover:bg-muted/50";
    }
  };

  const getIcon = () => {
    switch (uploadState) {
      case "uploading":
        return <Loader2 className="h-10 w-10 text-primary animate-spin" />;
      case "success":
        return <CheckCircle className="h-10 w-10 text-green-500" />;
      case "error":
        return <AlertCircle className="h-10 w-10 text-destructive" />;
      default:
        return uploadState === "dragging" ? (
          <FileSpreadsheet className="h-10 w-10 text-primary" />
        ) : (
          <Upload className="h-10 w-10 text-muted-foreground" />
        );
    }
  };

  const getMessage = () => {
    switch (uploadState) {
      case "dragging":
        return "Solte o arquivo aqui";
      case "uploading":
        return "Processando sua fatura com IA...";
      case "success":
        return "Fatura processada com sucesso!";
      case "error":
        return "Erro ao processar. Tente novamente.";
      default:
        return "Arraste sua fatura ou clique para selecionar";
    }
  };

  return (
    <div className="w-full">
      <label
        className={cn(
          "flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-lg cursor-pointer transition-all duration-200",
          getStateStyles(),
          (disabled || isUploading) && "opacity-50 cursor-not-allowed"
        )}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="flex flex-col items-center justify-center pt-5 pb-6 px-4 text-center">
          {getIcon()}
          <p className="mt-3 text-sm font-medium text-foreground">
            {getMessage()}
          </p>
          {uploadState === "idle" && (
            <p className="mt-1 text-xs text-muted-foreground">
              CSV ou Excel (máx. 5MB)
            </p>
          )}
        </div>
        <input
          type="file"
          className="hidden"
          accept=".csv,.xls,.xlsx"
          onChange={handleInputChange}
          disabled={disabled || isUploading}
        />
      </label>
    </div>
  );
}

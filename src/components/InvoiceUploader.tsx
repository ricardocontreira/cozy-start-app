import { useState, useCallback, useMemo } from "react";
import { Upload, FileSpreadsheet, Loader2, CheckCircle, AlertCircle, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { getNowInBrasilia } from "@/lib/dateUtils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface InvoiceUploaderProps {
  onUpload: (file: File, invoiceMonth: string) => Promise<boolean>;
  isUploading: boolean;
  disabled?: boolean;
}

type UploadState = "idle" | "dragging" | "uploading" | "success" | "error";

const MONTHS = [
  { value: "01", label: "Janeiro" },
  { value: "02", label: "Fevereiro" },
  { value: "03", label: "Março" },
  { value: "04", label: "Abril" },
  { value: "05", label: "Maio" },
  { value: "06", label: "Junho" },
  { value: "07", label: "Julho" },
  { value: "08", label: "Agosto" },
  { value: "09", label: "Setembro" },
  { value: "10", label: "Outubro" },
  { value: "11", label: "Novembro" },
  { value: "12", label: "Dezembro" },
];

export function InvoiceUploader({ onUpload, isUploading, disabled }: InvoiceUploaderProps) {
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [dragCounter, setDragCounter] = useState(0);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [showMonthDialog, setShowMonthDialog] = useState(false);
  
  // Use Brasilia timezone
  const now = getNowInBrasilia();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  
  const [selectedMonth, setSelectedMonth] = useState(String(currentMonth).padStart(2, "0"));
  const [selectedYear, setSelectedYear] = useState(String(currentYear));

  // Only current year and next year (no past years)
  const years = [currentYear, currentYear + 1].map(String);
  
  // Filter available months based on selected year
  const availableMonths = useMemo(() => {
    if (parseInt(selectedYear) === currentYear) {
      // If current year, only show months >= current month
      return MONTHS.filter(m => parseInt(m.value) >= currentMonth);
    }
    // If future year, all months are available
    return MONTHS;
  }, [selectedYear, currentYear, currentMonth]);

  // Handle year change and reset month if needed
  const handleYearChange = (year: string) => {
    setSelectedYear(year);
    // If switching to current year and selected month is in the past, reset to current month
    if (parseInt(year) === currentYear && parseInt(selectedMonth) < currentMonth) {
      setSelectedMonth(String(currentMonth).padStart(2, "0"));
    }
  };

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

  const handleFileSelection = useCallback((file: File) => {
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

    // Store file and open month selection dialog
    setPendingFile(file);
    setShowMonthDialog(true);
  }, []);

  const handleConfirmUpload = async () => {
    if (!pendingFile) return;

    setShowMonthDialog(false);
    setUploadState("uploading");
    
    const invoiceMonth = `${selectedYear}-${selectedMonth}`;
    const success = await onUpload(pendingFile, invoiceMonth);
    
    setUploadState(success ? "success" : "error");
    setPendingFile(null);
    setTimeout(() => setUploadState("idle"), 3000);
  };

  const handleCancelUpload = () => {
    setShowMonthDialog(false);
    setPendingFile(null);
  };

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
      handleFileSelection(files[0]);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelection(files[0]);
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
    <>
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

      <Dialog open={showMonthDialog} onOpenChange={setShowMonthDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Para qual mês é esta fatura?
            </DialogTitle>
            <DialogDescription>
              Selecione o mês e ano da fatura para que as parcelas sejam corretamente classificadas.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="month">Mês</Label>
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger id="month">
                    <SelectValue placeholder="Mês" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableMonths.map((month) => (
                      <SelectItem key={month.value} value={month.value}>
                        {month.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="year">Ano</Label>
                <Select value={selectedYear} onValueChange={handleYearChange}>
                  <SelectTrigger id="year">
                    <SelectValue placeholder="Ano" />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((year) => (
                      <SelectItem key={year} value={year}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {pendingFile && (
              <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                <FileSpreadsheet className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground truncate">
                  {pendingFile.name}
                </span>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={handleCancelUpload}>
              Cancelar
            </Button>
            <Button onClick={handleConfirmUpload}>
              Importar Fatura
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

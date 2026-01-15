import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface EditInviteLimitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plannerName: string;
  currentLimit: number;
  onSave: (newLimit: number) => Promise<boolean>;
}

export function EditInviteLimitDialog({
  open,
  onOpenChange,
  plannerName,
  currentLimit,
  onSave,
}: EditInviteLimitDialogProps) {
  const [limit, setLimit] = useState(currentLimit);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    const success = await onSave(limit);
    setSaving(false);
    if (success) {
      onOpenChange(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      setLimit(currentLimit);
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar Limite de Convites</DialogTitle>
          <DialogDescription>
            Defina quantos convites {plannerName} pode gerar para clientes
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="limit">Limite de convites</Label>
            <Input
              id="limit"
              type="number"
              min={0}
              max={100}
              value={limit}
              onChange={(e) => setLimit(parseInt(e.target.value) || 0)}
            />
            <p className="text-sm text-muted-foreground">
              Número máximo de convites que este planejador pode criar
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              "Salvar"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

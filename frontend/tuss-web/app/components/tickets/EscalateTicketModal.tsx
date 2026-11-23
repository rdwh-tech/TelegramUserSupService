// app/components/tickets/EscalateTicketModal.tsx
import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  TextField,
  Stack,
  Alert,
} from "@mui/material";
import { M3Icon } from "~/components/ui/M3Icon";
import { M3Button } from "~/components/ui/M3Button";

export interface EscalateTicketModalProps {
  open: boolean;
  ticketNumber: number;
  isLoading?: boolean;
  onConfirm: (reason: string) => Promise<void>;
  onClose: () => void;
}

export const EscalateTicketModal: React.FC<EscalateTicketModalProps> = ({
  open,
  ticketNumber,
  isLoading = false,
  onConfirm,
  onClose,
}) => {
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    setError(null);
    try {
      await onConfirm(reason.trim());
      setReason("");
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || "Не удалось эскалировать обращение.");
    }
  };

  return (
    <Dialog
      open={open}
      onClose={isLoading ? undefined : onClose}
      maxWidth="sm"
      fullWidth
      slotProps={{
        paper: {
          sx: { borderRadius: 2, p: 1 },
        },
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
          <M3Icon name="call_made" size={24} />
          <Typography variant="h6" sx={{ fontWeight: 800 }}>
            Передать обращение старшему оператору?
          </Typography>
        </Stack>
      </DialogTitle>

      <DialogContent sx={{ pt: 1 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
          Обращение <strong>#{ticketNumber}</strong> будет снято с вашего обслуживания и
          перемещено в очередь второй линии поддержки (L2). Ограничение «в одни руки» снимется,
          и вы сможете взять новое обращение.
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2, borderRadius: 1.5 }}>
            {error}
          </Alert>
        )}

        <TextField
          label="Причина эскалации (комментарий для L2)"
          placeholder="Опишите суть проблемы, требующей экспертной проверки..."
          fullWidth
          multiline
          minRows={3}
          maxRows={6}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          disabled={isLoading}
          slotProps={{
            htmlInput: {
              "data-testid": "escalate-reason-input",
            },
          }}
        />
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <M3Button variant="outlined" onClick={onClose} disabled={isLoading}>
          Отмена
        </M3Button>
        <M3Button
          variant="contained"
          color="secondary"
          loading={isLoading}
          onClick={handleConfirm}
          data-testid="confirm-escalate-button"
        >
          Эскалировать на L2
        </M3Button>
      </DialogActions>
    </Dialog>
  );
};

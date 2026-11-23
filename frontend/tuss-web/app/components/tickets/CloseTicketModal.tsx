// app/components/tickets/CloseTicketModal.tsx
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
  Box,
} from "@mui/material";
import { M3Icon } from "~/components/ui/M3Icon";
import { M3Button } from "~/components/ui/M3Button";

export interface CloseTicketModalProps {
  open: boolean;
  ticketNumber: number;
  isLoading?: boolean;
  onConfirm: (resolutionNotes: string) => Promise<void>;
  onClose: () => void;
}

export const CloseTicketModal: React.FC<CloseTicketModalProps> = ({
  open,
  ticketNumber,
  isLoading = false,
  onConfirm,
  onClose,
}) => {
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    setError(null);
    try {
      await onConfirm(resolutionNotes.trim());
      setResolutionNotes("");
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || "Не удалось закрыть обращение.");
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
          sx: { borderRadius: 4, p: 1 },
        },
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
          <M3Icon name="task_alt" size={24} />
          <Typography variant="h6" sx={{ fontWeight: 800 }}>
            Завершить обслуживание по тикету #{ticketNumber}?
          </Typography>
        </Stack>
      </DialogTitle>

      <DialogContent sx={{ pt: 1 }}>
        {/* Предупреждение о CSAT */}
        <Box
          sx={{
            mb: 2.5,
            p: 1.75,
            borderRadius: 3,
            bgcolor: "#F1F8F3",
            border: "1px solid #D1E7DD",
            color: "#0F5132",
          }}
        >
          <Stack direction="row" spacing={1} sx={{ alignItems: "flex-start" }}>
            <M3Icon name="star" size={20} />
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              Клиенту в Telegram-бот автоматически поступит интерактивный опрос оценки качества
              обслуживания (CSAT 1–5).
            </Typography>
          </Stack>
        </Box>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Таймер решения (TTR) остановится, и с вашего аккаунта снимется ограничение «в одни
          руки».
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2, borderRadius: 2.5 }}>
            {error}
          </Alert>
        )}

        <TextField
          label="Итог решения проблемы (опционально)"
          placeholder="Кратко укажите, как был решен вопрос клиента..."
          fullWidth
          multiline
          minRows={2}
          maxRows={5}
          value={resolutionNotes}
          onChange={(e) => setResolutionNotes(e.target.value)}
          disabled={isLoading}
          slotProps={{
            htmlInput: {
              "data-testid": "resolution-notes-input",
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
          color="primary"
          loading={isLoading}
          onClick={handleConfirm}
          data-testid="confirm-close-button"
        >
          Завершить и отправить CSAT
        </M3Button>
      </DialogActions>
    </Dialog>
  );
};

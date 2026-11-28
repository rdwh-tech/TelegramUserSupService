// app/components/staff/ExcludeStaffModal.tsx
import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Stack,
  Box,
  Alert,
} from "@mui/material";
import { M3Button } from "~/components/ui/M3Button";
import { M3Icon } from "~/components/ui/M3Icon";
import { companyApi } from "~/api/company";
import type { StaffMember } from "~/types/company";

interface ExcludeStaffModalProps {
  open: boolean;
  member: StaffMember | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const ExcludeStaffModal: React.FC<ExcludeStaffModalProps> = ({
  open,
  member,
  onClose,
  onSuccess,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!member) return null;

  const handleClose = () => {
    if (isSubmitting) return;
    setErrorMessage(null);
    onClose();
  };

  const handleExclude = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await companyApi.excludeStaffMember(member.id);
      handleClose();
      onSuccess();
    } catch (err: any) {
      setErrorMessage(
        err?.response?.data?.message || "Не удалось исключить сотрудника. Попробуйте снова."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="xs"
      fullWidth
      data-testid="exclude-staff-modal"
      slotProps={{
        paper: {
          sx: {
            borderRadius: 2,
            p: 1,
          },
        },
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: 1,
              bgcolor: "error.main",
              color: "error.contrastText",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <M3Icon name="person_remove" size={20} />
          </Box>
          <div>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
              Исключить из компании?
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Отвязка сотрудника от аккаунта компании
            </Typography>
          </div>
        </Stack>
      </DialogTitle>

      <DialogContent sx={{ pt: 1.5 }}>
        {errorMessage && (
          <Alert severity="error" sx={{ mb: 2, borderRadius: 1.5, fontSize: "0.825rem" }}>
            {errorMessage}
          </Alert>
        )}

        <Typography variant="body2" color="text.secondary" sx={{ mb: 2, fontSize: "0.875rem" }}>
          Сотрудник <strong>{member.fullName}</strong> (<code>@{member.login}</code>) потеряет доступ
          к обращениям компании.
        </Typography>

        <Box
          sx={{
            p: 1.75,
            borderRadius: 1.5,
            bgcolor: (theme) =>
              theme.palette.mode === "dark" ? "rgba(186, 26, 26, 0.12)" : "rgba(186, 26, 26, 0.06)",
            border: "1px solid",
            borderColor: "error.main",
          }}
        >
          <Stack direction="row" spacing={1.25} sx={{ alignItems: "flex-start" }}>
            <Box sx={{ color: "error.main", mt: 0.25 }}>
              <M3Icon name="info" size={18} />
            </Box>
            <Typography variant="caption" color="error.main" sx={{ fontWeight: 600, lineHeight: 1.4 }}>
              Все незакрытые тикеты сотрудника автоматически вернутся в общую очередь со статусом «Новый», а активные сессии будут аннулированы.
            </Typography>
          </Stack>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5, pt: 1.5 }}>
        <M3Button variant="text" onClick={handleClose} disabled={isSubmitting}>
          Отмена
        </M3Button>
        <M3Button
          variant="contained"
          color="error"
          onClick={handleExclude}
          disabled={isSubmitting}
          data-testid="confirm-exclude-btn"
        >
          {isSubmitting ? "Исключение..." : "Исключить"}
        </M3Button>
      </DialogActions>
    </Dialog>
  );
};
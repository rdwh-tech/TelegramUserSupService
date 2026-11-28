// app/components/staff/InviteStaffModal.tsx
import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  Alert,
  Box,
} from "@mui/material";
import { M3Button } from "~/components/ui/M3Button";
import { M3Icon } from "~/components/ui/M3Icon";
import { companyApi } from "~/api/company";

interface InviteStaffModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const InviteStaffModal: React.FC<InviteStaffModalProps> = ({
  open,
  onClose,
  onSuccess,
}) => {
  const [code, setCode] = useState("");
  const [role, setRole] = useState<"operator_l1" | "operator_l2">("operator_l1");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleClose = () => {
    if (isSubmitting) return;
    setCode("");
    setRole("operator_l1");
    setErrorMessage(null);
    onClose();
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Оставляем только буквы и цифры, до 6 символов, верхний регистр
    const val = e.target.value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 6);
    setCode(val);
    if (errorMessage) setErrorMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || code.length < 6) {
      setErrorMessage("Код подключения должен состоять из 6 символов");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await companyApi.inviteOperator({
        code,
        role,
      });
      handleClose();
      onSuccess();
    } catch (err: any) {
      const serverMsg = err?.response?.data?.message || "Введенный код недействителен";
      setErrorMessage(serverMsg);
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
      data-testid="invite-staff-modal"
      slotProps={{
        paper: {
          sx: {
            borderRadius: 2,
            p: 1,
          },
        },
      }}
    >
      <form onSubmit={handleSubmit}>
        <DialogTitle sx={{ pb: 1 }}>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: 1,
                bgcolor: "primary.main",
                color: "primary.contrastText",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <M3Icon name="person_add" size={20} />
            </Box>
            <div>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                Пригласить оператора
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Подключение сотрудника к компании
              </Typography>
            </div>
          </Stack>
        </DialogTitle>

        <DialogContent sx={{ pt: 1.5 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5, fontSize: "0.85rem" }}>
            Введите 6-значный персональный код подключения, отображаемый на экране непривязанного оператора.
          </Typography>

          {errorMessage && (
            <Alert
              severity="error"
              data-testid="invite-error-alert"
              sx={{ mb: 2.5, borderRadius: 1.5, fontSize: "0.825rem" }}
            >
              {errorMessage}
            </Alert>
          )}

          <Stack spacing={2.5}>
            {/* Поле кода */}
            <TextField
              label="Код подключения"
              placeholder="KUQ3W1"
              value={code}
              onChange={handleCodeChange}
              fullWidth
              autoFocus
              disabled={isSubmitting}
              slotProps={{
                htmlInput: {
                  "data-testid": "invite-code-input",
                  style: {
                    letterSpacing: "4px",
                    fontFamily: "monospace",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    fontSize: "1.1rem",
                    textAlign: "center",
                  },
                },
              }}
              helperText="6 символов (буквы и цифры)"
            />

            {/* Выбор роли */}
            <FormControl fullWidth size="small">
              <InputLabel id="invite-role-label">Назначаемая роль</InputLabel>
              <Select
                labelId="invite-role-label"
                id="invite-role-select"
                value={role}
                label="Назначаемая роль"
                onChange={(e) => setRole(e.target.value as "operator_l1" | "operator_l2")}
                disabled={isSubmitting}
                data-testid="invite-role-select"
              >
                <MenuItem value="operator_l1" data-testid="role-option-l1">
                  Оператор первой линии (L1)
                </MenuItem>
                <MenuItem value="operator_l2" data-testid="role-option-l2">
                  Старший оператор (L2)
                </MenuItem>
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2.5, pt: 1.5 }}>
          <M3Button variant="text" onClick={handleClose} disabled={isSubmitting}>
            Отмена
          </M3Button>
          <M3Button
            type="submit"
            variant="contained"
            disabled={isSubmitting || code.length < 6}
            data-testid="submit-invite-btn"
          >
            {isSubmitting ? "Отправка..." : "Отправить приглашение"}
          </M3Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};
// app/routes/onboarding.create-company.tsx
import React, { useState } from "react";
import { useNavigate } from "react-router";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Stack,
  TextField,
  Alert,
} from "@mui/material";
import { RoleGuard } from "~/components/auth/RoleGuard";
import { useAuth } from "~/context/AuthContext";
import { authApi } from "~/api/auth";
import { M3Icon } from "~/components/ui/M3Icon";
import { M3Button } from "~/components/ui/M3Button";

export function meta() {
  return [
    { title: "Создание компании — TUSS" },
    { name: "description", content: "Регистрация компании и настройка службы поддержки" },
  ];
}

export default function OnboardingCreateCompanyRoute() {
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [created, setCreated] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError(null);

    try {
      await authApi.createCompany({ name: name.trim() });
      await refreshUser();
      setCreated(true);
      setTimeout(() => {
        navigate("/admin/analytics", { replace: true });
      }, 1500);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Не удалось создать компанию. Попробуйте еще раз.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <RoleGuard requireCompany={false} allowedRoles={["admin"]}>
      <Box sx={{ maxWidth: 580, mx: "auto", py: { xs: 2, sm: 6 } }}>
        <Card
          sx={{
            p: { xs: 3, sm: 4 },
            borderRadius: 4,
            border: "1px solid",
            borderColor: "divider",
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.04)",
          }}
        >
          <Box
            sx={{
              width: 56,
              height: 56,
              borderRadius: "16px",
              backgroundColor: "rgba(0, 90, 193, 0.08)",
              color: "primary.main",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              mx: "auto",
              mb: 2.5,
            }}
          >
            <M3Icon name="domain_add" size={28} />
          </Box>

          <Typography variant="h5" sx={{ fontWeight: 700, mb: 1, textAlign: "center" }}>
            Создание компании
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mb: 4, textAlign: "center", maxWidth: 440, mx: "auto" }}
          >
            Вы зарегистрированы как администратор. Создайте профиль компании для подключения Telegram-бота и добавления операторов.
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
              {error}
            </Alert>
          )}

          {created ? (
            <Alert severity="success" sx={{ mb: 3, borderRadius: 2 }}>
              Компания «{name}» успешно создана! Перенаправление в панель управления...
            </Alert>
          ) : (
            <Box component="form" onSubmit={handleSubmit}>
              <Stack spacing={3}>
                <TextField
                  label="Название компании или проекта"
                  placeholder="Например: ТехноСервис или FastDelivery"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  fullWidth
                  required
                  autoFocus
                />

                <TextField
                  label="Часовой пояс"
                  defaultValue="UTC+3 (Москва)"
                  fullWidth
                  disabled
                  helperText="Часовой пояс используется для расчета SLA и графика работы поддержки"
                />

                <M3Button
                  type="submit"
                  variant="contained"
                  size="large"
                  isLoading={loading}
                  disabled={!name.trim()}
                  startIcon={<M3Icon name="add_business" size={20} />}
                  sx={{ py: 1.4 }}
                >
                  Создать компанию и продолжить
                </M3Button>
              </Stack>
            </Box>
          )}
        </Card>
      </Box>
    </RoleGuard>
  );
}

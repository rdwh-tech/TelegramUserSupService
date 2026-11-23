// app/routes/onboarding.invite-code.tsx
import React, { useState } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Stack,
  Tooltip,
  IconButton,
  Chip,
  Divider,
} from "@mui/material";
import { RoleGuard } from "~/components/auth/RoleGuard";
import { useAuth } from "~/context/AuthContext";
import { M3Icon } from "~/components/ui/M3Icon";
import { M3Button } from "~/components/ui/M3Button";

export function meta() {
  return [
    { title: "Подключение к компании — TUSS" },
    { name: "description", content: "Персональный код подключения оператора к компании" },
  ];
}

export default function OnboardingInviteCodeRoute() {
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);

  // Генерируем читаемый 6-значный код на основе id или демо
  const displayCode = user?.id ? user.id.slice(-6).toUpperCase() : "784291";

  const handleCopy = () => {
    navigator.clipboard.writeText(displayCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <RoleGuard requireCompany={false} allowedRoles={["unassigned_operator", "operator_l1", "operator_l2", "admin"]}>
      <Box sx={{ maxWidth: 640, mx: "auto", py: { xs: 2, sm: 6 } }}>
        <Card
          sx={{
            p: { xs: 3, sm: 4 },
            borderRadius: 4,
            border: "1px solid",
            borderColor: "divider",
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.04)",
            textAlign: "center",
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
            <M3Icon name="key" size={28} />
          </Box>

          <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
            Код подключения оператора
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 4, maxWidth: 440, mx: "auto" }}>
            Передайте ваш персональный код администратору компании. После ввода кода вы получите приглашение в службу поддержки.
          </Typography>

          {/* Плашка с крупным кодом и кнопкой копирования */}
          <Box
            sx={{
              display: "inline-flex",
              alignItems: "center",
              gap: 2,
              px: 3.5,
              py: 2,
              borderRadius: 3,
              backgroundColor: "background.default",
              border: "1.5px dashed",
              borderColor: "primary.main",
              mb: 3,
            }}
          >
            <Typography
              variant="h4"
              sx={{
                fontWeight: 800,
                letterSpacing: "0.25em",
                fontFamily: "monospace",
                color: "primary.main",
              }}
            >
              {displayCode}
            </Typography>

            <Tooltip title={copied ? "Скопировано!" : "Скопировать код"} open={copied || undefined}>
              <IconButton onClick={handleCopy} color="primary" sx={{ p: 1 }}>
                <M3Icon name={copied ? "check" : "content_copy"} size={22} />
              </IconButton>
            </Tooltip>
          </Box>

          <Box sx={{ mb: 4 }}>
            <M3Button
              variant="contained"
              startIcon={<M3Icon name={copied ? "check" : "content_copy"} size={18} />}
              onClick={handleCopy}
            >
              {copied ? "Скопировано в буфер" : "Скопировать код"}
            </M3Button>
          </Box>

          <Divider sx={{ my: 3 }} />

          {/* Список входящих приглашений */}
          <Box sx={{ textAlign: "left" }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5 }}>
              Входящие приглашения
            </Typography>
            <Card
              variant="outlined"
              sx={{
                p: 2,
                borderRadius: 2.5,
                bgcolor: "background.paper",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
                <Box
                  sx={{
                    width: 36,
                    height: 36,
                    borderRadius: 2,
                    bgcolor: "rgba(46, 125, 50, 0.1)",
                    color: "success.main",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <M3Icon name="mail" size={20} />
                </Box>
                <div>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    ООО «ТехноСервис»
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Роль: Оператор первой линии (L1)
                  </Typography>
                </div>
              </Stack>
              <Chip label="Ожидает подтверждения" size="small" color="info" variant="outlined" />
            </Card>
          </Box>
        </Card>
      </Box>
    </RoleGuard>
  );
}

// app/routes/onboarding.invite-code.tsx
import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router";
import {
  Box,
  Typography,
  Card,
  Stack,
  Tooltip,
  IconButton,
  Divider,
  Alert,
  CircularProgress,
} from "@mui/material";
import { RoleGuard } from "~/components/auth/RoleGuard";
import { useAuth } from "~/context/AuthContext";
import { authApi } from "~/api/auth";
import { M3Icon } from "~/components/ui/M3Icon";
import { M3Button } from "~/components/ui/M3Button";
import type { CompanyInvitation } from "~/types/user";

export function meta() {
  return [
    { title: "Подключение к компании — TUSS" },
    { name: "description", content: "Персональный код подключения оператора к компании" },
  ];
}

export default function OnboardingInviteCodeRoute() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);

  // Состояние 6-значного кода и входящих приглашений
  const [code, setCode] = useState<string>(
    user?.id ? user.id.replace(/[^a-zA-Z0-9]/g, "").slice(-6).toUpperCase() : "KUQ3W1"
  );
  const [invitations, setInvitations] = useState<CompanyInvitation[]>([]);
  const [isLoadingInvitations, setIsLoadingInvitations] = useState(true);
  const [isAccepting, setIsAccepting] = useState<string | null>(null);
  const [isRejecting, setIsRejecting] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      try {
        const [codeData, invData] = await Promise.allSettled([
          authApi.getInviteCode(),
          authApi.getPendingInvitations(),
        ]);

        if (isMounted) {
          if (codeData.status === "fulfilled" && codeData.value?.code) {
            setCode(codeData.value.code);
          }
          if (invData.status === "fulfilled") {
            setInvitations(invData.value || []);
          }
        }
      } catch (err) {
        console.error("Ошибка загрузки данных онбординга:", err);
      } finally {
        if (isMounted) {
          setIsLoadingInvitations(false);
        }
      }
    };

    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleAccept = async (invitationId: string) => {
    setIsAccepting(invitationId);
    try {
      const updatedUser = await authApi.acceptInvitation(invitationId);
      await refreshUser();
      if (updatedUser.role === "operator_l2") {
        navigate("/queue/escalated", { replace: true });
      } else {
        navigate("/queue/new", { replace: true });
      }
    } catch (err) {
      console.error("Ошибка при принятии приглашения:", err);
    } finally {
      setIsAccepting(null);
    }
  };

  const handleReject = async (invitationId: string) => {
    setIsRejecting(invitationId);
    try {
      await authApi.rejectInvitation(invitationId);
      setInvitations((prev) => prev.filter((i) => i.id !== invitationId));
    } catch (err) {
      console.error("Ошибка при отклонении приглашения:", err);
    } finally {
      setIsRejecting(null);
    }
  };

  return (
    <RoleGuard requireCompany={false} allowedRoles={["unassigned_operator", "operator_l1", "operator_l2", "admin"]}>
      <Box sx={{ maxWidth: 640, mx: "auto", py: { xs: 2, sm: 5 } }}>
        {user?.companyId && (
          <Alert severity="info" sx={{ mb: 3, borderRadius: 3 }}>
            Вы уже прикреплены к компании (ID: {user.companyId}).{" "}
            <Link to="/queue/new" style={{ fontWeight: 600, color: "inherit" }}>
              Перейти в очередь обращений
            </Link>
          </Alert>
        )}

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
              {code}
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

            {isLoadingInvitations ? (
              <Box sx={{ py: 3, display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
                <CircularProgress size={24} color="primary" />
                <Typography variant="caption" color="text.secondary">
                  Проверка входящих приглашений...
                </Typography>
              </Box>
            ) : invitations.length === 0 ? (
              <Card
                variant="outlined"
                sx={{
                  p: 3,
                  textAlign: "center",
                  borderRadius: 2.5,
                  bgcolor: "background.paper",
                  borderStyle: "dashed",
                  borderColor: "divider",
                }}
              >
                <Box sx={{ color: "text.secondary", mb: 1 }}>
                  <M3Icon name="mark_email_read" size={32} />
                </Box>
                <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                  Нет входящих приглашений
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ maxWidth: 380, mx: "auto", display: "block" }}>
                  Передайте ваш код администратору компании. Как только вас пригласят в штат, запрос на подтверждение появится здесь.
                </Typography>
              </Card>
            ) : (
              <Stack spacing={1.5}>
                {invitations.map((inv) => (
                  <Card
                    key={inv.id}
                    variant="outlined"
                    sx={{
                      p: 2,
                      borderRadius: 2.5,
                      bgcolor: "background.paper",
                    }}
                  >
                    <Stack
                      direction={{ xs: "column", sm: "row" }}
                      spacing={2}
                      sx={{ justifyContent: "space-between", alignItems: { xs: "flex-start", sm: "center" } }}
                    >
                      <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
                        <Box
                          sx={{
                            width: 38,
                            height: 38,
                            borderRadius: 2,
                            bgcolor: "rgba(0, 90, 193, 0.08)",
                            color: "primary.main",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <M3Icon name="business" size={20} />
                        </Box>
                        <div>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {inv.companyName}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Назначение: {inv.roleToAssign === "operator_l2" ? "Старший оператор (L2)" : "Оператор первой линии (L1)"}
                          </Typography>
                        </div>
                      </Stack>

                      <Stack direction="row" spacing={1} sx={{ alignSelf: { xs: "flex-end", sm: "center" } }}>
                        <M3Button
                          variant="outlined"
                          color="inherit"
                          size="small"
                          isLoading={isRejecting === inv.id}
                          onClick={() => handleReject(inv.id)}
                        >
                          Отклонить
                        </M3Button>
                        <M3Button
                          variant="contained"
                          color="primary"
                          size="small"
                          isLoading={isAccepting === inv.id}
                          onClick={() => handleAccept(inv.id)}
                        >
                          Принять
                        </M3Button>
                      </Stack>
                    </Stack>
                  </Card>
                ))}
              </Stack>
            )}
          </Box>
        </Card>
      </Box>
    </RoleGuard>
  );
}

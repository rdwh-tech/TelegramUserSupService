// app/routes/tickets.active.tsx
import React, { useState, useEffect } from "react";
import { Link } from "react-router";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Stack,
  Chip,
  Skeleton,
  Avatar,
  Divider,
  Paper,
} from "@mui/material";
import { RoleGuard } from "~/components/auth/RoleGuard";
import { useAuth } from "~/context/AuthContext";
import { ticketsApi } from "~/api/tickets";
import { M3Icon } from "~/components/ui/M3Icon";
import { M3Button } from "~/components/ui/M3Button";
import { SLAIndicator } from "~/components/tickets/SLAIndicator";
import type { Ticket } from "~/types/ticket";

export function meta() {
  return [
    { title: "Мой активный тикет — TUSS" },
    { name: "description", content: "Рабочее место оператора с текущим активным тикетом" },
  ];
}

export default function TicketsActiveRoute() {
  const { user } = useAuth();
  const queuePath = user?.role === "operator_l2" ? "/queue/escalated" : "/queue/new";

  const [activeTicket, setActiveTicket] = useState<Ticket | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    ticketsApi
      .getMyActiveTicket()
      .then((ticket) => {
        if (isMounted) {
          setActiveTicket(ticket);
        }
      })
      .catch((err) => {
        console.error("Ошибка при получении активного тикета:", err);
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <RoleGuard allowedRoles={["operator_l1", "operator_l2", "admin"]}>
      <Box sx={{ maxWidth: 1000, mx: "auto" }}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          sx={{
            justifyContent: "space-between",
            alignItems: { xs: "flex-start", sm: "center" },
            mb: 3,
            gap: 1.5,
          }}
        >
          <div>
            <Typography variant="h5" sx={{ fontWeight: 800 }}>
              Мой активный тикет
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Правило «В одни руки»: оператор обрабатывает не более одного тикета единовременно
            </Typography>
          </div>
          <Chip label="В одни руки" color="info" variant="outlined" sx={{ fontWeight: 600 }} />
        </Stack>

        {isLoading ? (
          <Card sx={{ p: 4, borderRadius: 2 }}>
            <Skeleton variant="text" width="40%" height={32} sx={{ mb: 2 }} />
            <Skeleton variant="rectangular" height={160} sx={{ borderRadius: 1.5 }} />
          </Card>
        ) : activeTicket ? (
          <Card
            sx={{
              borderRadius: 2,
              border: "1px solid",
              borderColor: "divider",
              bgcolor: "background.paper",
              overflow: "hidden",
              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.06)",
            }}
          >
            <Box
              sx={{
                p: 3,
                bgcolor: (theme) => (theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.03)" : "#F8F9FE"),
                borderBottom: "1px solid",
                borderColor: "divider",
              }}
            >
              <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center" }}>
                <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
                  <Avatar sx={{ bgcolor: "primary.main", color: "#fff", fontWeight: 700 }}>
                    {activeTicket.client.fullName?.[0] || "U"}
                  </Avatar>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 800, color: "text.primary" }}>
                      Тикет #{activeTicket.ticketNumber} — {activeTicket.client.fullName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {activeTicket.client.username
                        ? `@${activeTicket.client.username}`
                        : `ID: ${activeTicket.client.telegramUserId}`}
                    </Typography>
                  </Box>
                </Stack>

                <SLAIndicator sla={activeTicket.sla} />
              </Stack>
            </Box>

            <CardContent sx={{ p: 3 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "text.secondary", mb: 1 }}>
                Первое сообщение клиента:
              </Typography>
              <Paper
                elevation={0}
                sx={{
                  p: 2,
                  borderRadius: 1.5,
                  bgcolor: (theme) => (theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.05)" : "#F1F4FB"),
                  border: "1px solid",
                  borderColor: "divider",
                  mb: 3,
                }}
              >
                <Typography variant="body1">
                  {activeTicket.firstMessagePreview || "Текст обращения отсутствует"}
                </Typography>
              </Paper>

              <Stack direction="row" spacing={2} sx={{ justifyContent: "flex-end" }}>
                <M3Button
                  variant="outlined"
                  component={Link}
                  to={queuePath}
                  startIcon={<M3Icon name="arrow_back" size={18} />}
                >
                  К очереди
                </M3Button>
                <M3Button
                  variant="contained"
                  component={Link}
                  to={`/tickets/${activeTicket.id}`}
                  startIcon={<M3Icon name="chat" size={18} />}
                >
                  Перейти в диалог
                </M3Button>
              </Stack>
            </CardContent>
          </Card>
        ) : (
          <Card
            sx={{
              p: 4,
              textAlign: "center",
              borderRadius: 2,
              border: "1px solid",
              borderColor: "divider",
              bgcolor: "background.paper",
            }}
          >
            <CardContent>
              <Box
                sx={{
                  width: 64,
                  height: 64,
                  borderRadius: "50%",
                  bgcolor: (theme) =>
                    theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.08)" : "#F1F4FB",
                  color: "text.secondary",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  mx: "auto",
                  mb: 2,
                }}
              >
                <M3Icon name="headset_mic" size={32} />
              </Box>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                Нет активного обращения в работе
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 460, mx: "auto", mb: 3 }}>
                Возьмите новый тикет из доступной очереди обращений для начала диалога с клиентом.
              </Typography>
              <M3Button
                variant="contained"
                component={Link}
                to={queuePath}
                startIcon={<M3Icon name="format_list_bulleted" size={18} />}
              >
                Перейти к очереди
              </M3Button>
            </CardContent>
          </Card>
        )}
      </Box>
    </RoleGuard>
  );
}

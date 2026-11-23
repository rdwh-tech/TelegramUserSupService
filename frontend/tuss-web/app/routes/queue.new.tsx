// app/routes/queue.new.tsx
import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router";
import {
  Box,
  Typography,
  Stack,
  Chip,
  IconButton,
  Tooltip,
  Alert,
  Snackbar,
} from "@mui/material";
import { RoleGuard } from "~/components/auth/RoleGuard";
import { useAuth } from "~/context/AuthContext";
import { ticketsApi } from "~/api/tickets";
import { M3Icon } from "~/components/ui/M3Icon";
import { ActiveTicketBanner } from "~/components/tickets/ActiveTicketBanner";
import { TicketQueueTable } from "~/components/tickets/TicketQueueTable";
import type { Ticket } from "~/types/ticket";

export function meta() {
  return [
    { title: "Новые обращения — Очередь L1" },
    { name: "description", content: "Очередь входящих тикетов первой линии поддержки" },
  ];
}

export default function QueueNewRoute() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [activeTicket, setActiveTicket] = useState<Ticket | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [takingTicketId, setTakingTicketId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const isAdmin = user?.role === "admin";

  const loadQueueData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [queueData, myActive] = await Promise.allSettled([
        ticketsApi.getNewTicketsQueue(),
        isAdmin ? Promise.resolve(null) : ticketsApi.getMyActiveTicket(),
      ]);

      if (queueData.status === "fulfilled") {
        setTickets(queueData.value || []);
      }

      if (myActive.status === "fulfilled") {
        setActiveTicket(myActive.value);
      }
    } catch (err) {
      console.error("Ошибка при загрузке очереди L1:", err);
      setErrorMessage("Не удалось загрузить очередь обращений. Попробуйте обновить страницу.");
    } finally {
      setIsLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    loadQueueData();
  }, [loadQueueData]);

  const handleTakeTicket = async (ticketId: string) => {
    if (activeTicket) {
      setErrorMessage(
        `У вас уже есть активный тикет #${activeTicket.ticketNumber}. Завершите его перед взятием следующего.`
      );
      return;
    }

    setTakingTicketId(ticketId);
    setErrorMessage(null);

    try {
      const assigned = await ticketsApi.assignTicket(ticketId);
      setSuccessMessage(`Обращение #${assigned.ticketNumber} успешно взято в работу`);
      // Мгновенный переход к активному диалогу
      navigate("/tickets/active");
    } catch (err: any) {
      const status = err?.response?.status;
      const data = err?.response?.data;
      const msg = data?.message || err?.message || "";

      if (status === 409 || data?.code === "TICKET_ALREADY_TAKEN") {
        // Коллизия: другой оператор забрал тикет
        setErrorMessage(
          msg || "Обращение уже взято в работу другим оператором. Список очереди обновлен."
        );
        // Немедленно убираем обращение из локального списка
        setTickets((prev) => prev.filter((t) => t.id !== ticketId));
      } else {
        setErrorMessage(msg || "Произошла ошибка при взятии тикета в работу. Попробуйте еще раз.");
      }
    } finally {
      setTakingTicketId(null);
    }
  };

  return (
    <RoleGuard allowedRoles={["operator_l1", "admin"]}>
      <Box sx={{ maxWidth: 1200, mx: "auto" }}>
        {/* Заголовок очереди и мета-информация */}
        <Stack
          direction={{ xs: "column", sm: "row" }}
          sx={{
            justifyContent: "space-between",
            alignItems: { xs: "flex-start", sm: "center" },
            mb: 3,
            gap: 2,
          }}
        >
          <div>
            <Typography variant="h5" sx={{ fontWeight: 800, color: "text.primary" }}>
              Новые обращения
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Общая очередь входящих тикетов первой линии поддержки (L1)
            </Typography>
          </div>

          <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
            {isAdmin ? (
              <Chip
                label="Режим аудита (Администратор)"
                size="small"
                variant="outlined"
                color="info"
                icon={<M3Icon name="visibility" size={16} />}
              />
            ) : (
              <Chip
                label={`${tickets.length} ${tickets.length === 1 ? "обращение" : "обращений"}`}
                size="small"
                color="primary"
                sx={{ fontWeight: 700 }}
              />
            )}

            <Tooltip title="Обновить список обращений" arrow>
              <span>
                <IconButton
                  onClick={loadQueueData}
                  disabled={isLoading}
                  size="small"
                  sx={{
                    bgcolor: "background.paper",
                    border: "1px solid",
                    borderColor: "divider",
                    p: 1,
                  }}
                >
                  <M3Icon name="refresh" size={20} />
                </IconButton>
              </span>
            </Tooltip>
          </Stack>
        </Stack>

        {/* Уведомление о коллизии или ошибке */}
        {errorMessage && (
          <Alert
            severity="warning"
            onClose={() => setErrorMessage(null)}
            sx={{ mb: 3, borderRadius: 3 }}
            icon={<M3Icon name="warning" size={20} />}
          >
            {errorMessage}
          </Alert>
        )}

        {/* Информационный тост при успешном взятии */}
        <Snackbar
          open={Boolean(successMessage)}
          autoHideDuration={4000}
          onClose={() => setSuccessMessage(null)}
          anchorOrigin={{ vertical: "top", horizontal: "right" }}
        >
          <Alert
            severity="success"
            onClose={() => setSuccessMessage(null)}
            sx={{ borderRadius: 3 }}
          >
            {successMessage}
          </Alert>
        </Snackbar>

        {/* Баннер правила "В одни руки", если у оператора уже есть тикет */}
        {activeTicket && !isAdmin && <ActiveTicketBanner activeTicket={activeTicket} />}

        {/* Таблица очереди тикетов */}
        <TicketQueueTable
          tickets={tickets}
          isLoading={isLoading}
          level="l1"
          hasActiveTicket={Boolean(activeTicket)}
          isAdminAudit={isAdmin}
          takingTicketId={takingTicketId}
          onTakeTicket={handleTakeTicket}
          emptyTitle="Новых обращений нет. Отличная работа!"
          emptySubtitle="Все входящие сообщения от пользователей Telegram обработаны первой линией поддержки."
          emptyIcon="inbox"
        />
      </Box>
    </RoleGuard>
  );
}

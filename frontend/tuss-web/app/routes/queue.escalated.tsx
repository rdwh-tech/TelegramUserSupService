// app/routes/queue.escalated.tsx
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
    { title: "Очередь эскалаций — Очередь L2" },
    { name: "description", content: "Очередь эскалированных тикетов старшей линии поддержки" },
  ];
}

export default function QueueEscalatedRoute() {
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
        ticketsApi.getEscalatedTicketsQueue(),
        isAdmin ? Promise.resolve(null) : ticketsApi.getMyActiveTicket(),
      ]);

      if (queueData.status === "fulfilled") {
        setTickets(queueData.value || []);
      }

      if (myActive.status === "fulfilled") {
        setActiveTicket(myActive.value);
      }
    } catch (err) {
      console.error("Ошибка при загрузке очереди L2:", err);
      setErrorMessage("Не удалось загрузить очередь эскалаций. Попробуйте обновить страницу.");
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
      setSuccessMessage(`Эскалированное обращение #${assigned.ticketNumber} взято в работу`);
      navigate("/tickets/active");
    } catch (err: any) {
      const status = err?.response?.status;
      const data = err?.response?.data;
      const msg = data?.message || err?.message || "";

      if (status === 409 || data?.code === "TICKET_ALREADY_TAKEN") {
        setErrorMessage(
          msg || "Обращение уже взято в работу другим оператором L2. Список очереди обновлен."
        );
        setTickets((prev) => prev.filter((t) => t.id !== ticketId));
      } else {
        setErrorMessage(msg || "Произошла ошибка при взятии тикета в работу. Попробуйте еще раз.");
      }
    } finally {
      setTakingTicketId(null);
    }
  };

  return (
    <RoleGuard allowedRoles={["operator_l2", "admin"]}>
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
              Очередь эскалаций (L2)
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Тикеты повышенной сложности, переданные с первой линии или по нарушению регламента SLA
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
                color="secondary"
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
            sx={{ mb: 3, borderRadius: 1.5 }}
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
            sx={{ borderRadius: 1.5 }}
          >
            {successMessage}
          </Alert>
        </Snackbar>

        {/* Баннер правила "В одни руки" */}
        {activeTicket && !isAdmin && <ActiveTicketBanner activeTicket={activeTicket} />}

        {/* Таблица очереди тикетов */}
        <TicketQueueTable
          tickets={tickets}
          isLoading={isLoading}
          level="l2"
          hasActiveTicket={Boolean(activeTicket)}
          isAdminAudit={isAdmin}
          takingTicketId={takingTicketId}
          onTakeTicket={handleTakeTicket}
          emptyTitle="Нет эскалированных обращений. Все тикеты решены!"
          emptySubtitle="Сложные вопросы клиентов закрыты или успешно разрешены сотрудниками старшей линии."
          emptyIcon="done_all"
        />
      </Box>
    </RoleGuard>
  );
}

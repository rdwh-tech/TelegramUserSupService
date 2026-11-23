// app/routes/tickets.$id.tsx
import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router";
import {
  Box,
  Typography,
  Paper,
  Stack,
  Chip,
  IconButton,
  CircularProgress,
  Alert,
  Tooltip,
} from "@mui/material";
import { RoleGuard } from "~/components/auth/RoleGuard";
import { useAuth } from "~/context/AuthContext";
import { ticketsApi } from "~/api/tickets";
import { M3Icon } from "~/components/ui/M3Icon";
import { M3Button } from "~/components/ui/M3Button";
import { TicketSidebar } from "~/components/tickets/TicketSidebar";
import { MessageList } from "~/components/chat/MessageList";
import { MessageComposer } from "~/components/chat/MessageComposer";
import { ImageLightbox } from "~/components/chat/ImageLightbox";
import type { ExtendedMessage } from "~/components/chat/MessageItem";
import type { Ticket } from "~/types/ticket";
import type { TicketMessage } from "~/types/message";

export function meta() {
  return [
    { title: "Рабочее место тикета — TUSS" },
    { name: "description", content: "Двухпанельный интерфейс активного тикета службы поддержки" },
  ];
}

export default function TicketDetailsRoute() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<ExtendedMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lightboxState, setLightboxState] = useState<{
    open: boolean;
    url: string | null;
    fileName?: string;
  }>({ open: false, url: null });

  // Обработка кнопки назад в зависимости от роли
  const backQueuePath =
    user?.role === "operator_l2"
      ? "/queue/escalated"
      : user?.role === "operator_l1"
      ? "/queue/new"
      : "/tickets/archive";

  const isReadOnly = Boolean(
    user?.role === "admin" ||
      ticket?.status === "closed" ||
      (ticket && ticket.assignedOperatorId !== user?.id)
  );

  useEffect(() => {
    if (!id) return;
    let isMounted = true;
    setIsLoading(true);

    Promise.allSettled([ticketsApi.getTicketById(id), ticketsApi.getMessages(id)])
      .then(([ticketRes, messagesRes]) => {
        if (!isMounted) return;

        if (ticketRes.status === "fulfilled") {
          setTicket(ticketRes.value);
        } else {
          setErrorMessage("Обращение не найдено или доступ ограничен.");
        }

        if (messagesRes.status === "fulfilled") {
          setMessages(messagesRes.value || []);
        }
      })
      .catch((err) => {
        console.error("Ошибка загрузки карточки тикета:", err);
        if (isMounted) {
          setErrorMessage("Не удалось загрузить данные обращения.");
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [id]);

  const handleSendMessage = async (text: string, files: File[]) => {
    if (!id) return;
    setIsSending(true);

    const tempId = `temp-${Date.now()}`;
    const optimisticMsg: ExtendedMessage = {
      id: tempId,
      ticketId: id,
      senderType: "operator",
      senderName: user?.fullName || "Служба поддержки",
      text,
      isDelivered: false,
      deliveryStatus: "sending",
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, optimisticMsg]);

    try {
      const savedMessage = await ticketsApi.sendMessage({
        ticketId: id,
        text,
        attachments: files.length > 0 ? files : undefined,
      });

      setMessages((prev) =>
        prev.map((m) =>
          m.id === tempId ? { ...savedMessage, deliveryStatus: "delivered" } : m
        )
      );
    } catch (err: any) {
      console.error("Ошибка при отправке сообщения в Telegram:", err);
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? { ...m, deliveryStatus: "failed" } : m))
      );
      throw err;
    } finally {
      setIsSending(false);
    }
  };

  const handleRetryMessage = async (failedMessageId: string) => {
    if (!id) return;
    const targetMsg = messages.find((m) => m.id === failedMessageId);
    if (!targetMsg) return;

    setMessages((prev) =>
      prev.map((m) => (m.id === failedMessageId ? { ...m, deliveryStatus: "sending" } : m))
    );

    try {
      const saved = await ticketsApi.sendMessage({
        ticketId: id,
        text: targetMsg.text,
      });
      setMessages((prev) =>
        prev.map((m) =>
          m.id === failedMessageId ? { ...saved, deliveryStatus: "delivered" } : m
        )
      );
    } catch (err) {
      setMessages((prev) =>
        prev.map((m) => (m.id === failedMessageId ? { ...m, deliveryStatus: "failed" } : m))
      );
    }
  };

  const handleImageClick = (imageUrl: string, fileName?: string) => {
    setLightboxState({ open: true, url: imageUrl, fileName });
  };

  return (
    <RoleGuard allowedRoles={["operator_l1", "operator_l2", "admin"]}>
      <Box
        data-testid="ticket-workspace"
        sx={{
          maxWidth: 1440,
          mx: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 2,
        }}
      >
        {/* Верхняя навигационная панель тикета */}
        <Stack
          direction="row"
          sx={{
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 1.5,
          }}
        >
          <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
            <Tooltip title="Вернуться к очереди" arrow>
              <IconButton
                component={Link}
                to={backQueuePath}
                size="small"
                sx={{
                  bgcolor: "background.paper",
                  border: "1px solid",
                  borderColor: "divider",
                }}
              >
                <M3Icon name="arrow_back" size={20} />
              </IconButton>
            </Tooltip>

            {ticket && (
              <div>
                <Typography variant="h6" sx={{ fontWeight: 800, color: "text.primary", lineHeight: 1.2 }}>
                  Обращение #{ticket.ticketNumber}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Клиент: <strong>{ticket.client.fullName}</strong>
                  {ticket.client.username && ` (@${ticket.client.username})`}
                </Typography>
              </div>
            )}
          </Stack>

          {isReadOnly && (
            <Chip
              label="Режим только для чтения"
              size="small"
              variant="outlined"
              color="info"
              icon={<M3Icon name="visibility" size={16} />}
            />
          )}
        </Stack>

        {errorMessage && (
          <Alert severity="error" sx={{ borderRadius: 3 }}>
            {errorMessage}
          </Alert>
        )}

        {isLoading ? (
          <Paper
            elevation={0}
            data-testid="ticket-loading-state"
            sx={{
              p: 8,
              textAlign: "center",
              borderRadius: 4,
              border: "1px solid rgba(196, 198, 208, 0.4)",
            }}
          >
            <CircularProgress size={40} thickness={4} />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              Загрузка карточки диалога...
            </Typography>
          </Paper>
        ) : ticket ? (
          /* Двухколоночный интерфейс (SRS Таблица 9, Таблица 10) */
          <Box
            sx={{
              display: "flex",
              flexDirection: { xs: "column", md: "row" },
              gap: 2.5,
              alignItems: "stretch",
            }}
          >
            {/* Левая/Центральная зона: Чат диалога */}
            <Paper
              elevation={0}
              data-testid="chat-container-panel"
              sx={{
                flex: 1,
                minWidth: 0,
                borderRadius: 4,
                border: "1px solid rgba(196, 198, 208, 0.4)",
                bgcolor: "#FFFFFF",
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
                minHeight: { xs: 500, md: 680 },
              }}
            >
              {/* Шапка чата с клиентом */}
              <Box
                sx={{
                  px: 3,
                  py: 2,
                  bgcolor: "#F8F9FE",
                  borderBottom: "1px solid rgba(196, 198, 208, 0.4)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
                  <M3Icon name="chat" size={22} />
                  <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                    Диалог с клиентом Telegram
                  </Typography>
                </Stack>
                <Typography variant="caption" color="text.secondary">
                  {messages.length} {messages.length === 1 ? "сообщение" : "сообщений"}
                </Typography>
              </Box>

              {/* Область переписки (лента сообщений) */}
              <MessageList
                messages={messages}
                onRetry={handleRetryMessage}
                onImageClick={handleImageClick}
              />

              {/* Форма набора сообщения и вложений */}
              <MessageComposer
                onSendMessage={handleSendMessage}
                disabled={isReadOnly}
                isSending={isSending}
              />
            </Paper>

            {/* Правая зона: Информационный сайдбар тикета */}
            <TicketSidebar
              ticket={ticket}
              userRole={user?.role}
              isReadOnly={isReadOnly}
              onOpenEscalateModal={() => {}}
              onOpenCloseModal={() => {}}
            />
          </Box>
        ) : null}

        {/* Модальное окно просмотра изображений в полном размере */}
        <ImageLightbox
          open={lightboxState.open}
          imageUrl={lightboxState.url}
          fileName={lightboxState.fileName}
          onClose={() => setLightboxState({ open: false, url: null })}
        />
      </Box>
    </RoleGuard>
  );
}

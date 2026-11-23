// app/components/tickets/TicketSidebar.tsx
import React from "react";
import {
  Box,
  Paper,
  Typography,
  Stack,
  Chip,
  Avatar,
  Divider,
  Link as MuiLink,
} from "@mui/material";
import { M3Icon } from "~/components/ui/M3Icon";
import { M3Button } from "~/components/ui/M3Button";
import { SLAIndicator } from "~/components/tickets/SLAIndicator";
import type { Ticket, TicketStatus } from "~/types/ticket";

export interface TicketSidebarProps {
  ticket: Ticket;
  userRole?: string;
  isReadOnly?: boolean;
  onOpenEscalateModal?: () => void;
  onOpenCloseModal?: () => void;
}

const statusDisplayConfig: Record<
  TicketStatus,
  { label: string; color: "primary" | "warning" | "success" | "default"; icon: string }
> = {
  new: { label: "Новый", color: "primary", icon: "inbox" },
  in_progress: { label: "В работе", color: "primary", icon: "play_circle" },
  waiting_client: { label: "Ожидает клиента", color: "warning", icon: "hourglass_empty" },
  closed: { label: "Закрыт", color: "success", icon: "check_circle" },
};

export const TicketSidebar: React.FC<TicketSidebarProps> = ({
  ticket,
  userRole,
  isReadOnly = false,
  onOpenEscalateModal,
  onOpenCloseModal,
}) => {
  const statusCfg = statusDisplayConfig[ticket.status] || statusDisplayConfig.new;
  const isClosed = ticket.status === "closed";
  const canEscalate = !isReadOnly && !isClosed && userRole === "operator_l1";
  const canClose = !isReadOnly && !isClosed;

  const clientInitials = ticket.client.fullName
    ? ticket.client.fullName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "TG";

  return (
    <Paper
      elevation={0}
      data-testid="ticket-sidebar"
      sx={{
        width: { xs: "100%", md: 340 },
        flexShrink: 0,
        borderRadius: 4,
        border: "1px solid rgba(196, 198, 208, 0.4)",
        bgcolor: "#FFFFFF",
        p: 2.5,
        display: "flex",
        flexDirection: "column",
        gap: 2.5,
        height: "fit-content",
      }}
    >
      {/* 1. Заголовок и статус обращения */}
      <Box>
        <Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary", textTransform: "uppercase" }}>
          Информация об обращении
        </Typography>
        <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", mt: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 800, color: "primary.main" }}>
            #{ticket.ticketNumber}
          </Typography>
          <Chip
            label={statusCfg.label}
            color={statusCfg.color}
            size="small"
            icon={<M3Icon name={statusCfg.icon} size={16} />}
            sx={{ fontWeight: 700 }}
          />
        </Stack>
      </Box>

      <Divider />

      {/* 2. Карточка клиента в Telegram */}
      <Box data-testid="client-profile-card">
        <Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary", textTransform: "uppercase" }}>
          Клиент Telegram
        </Typography>

        <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", mt: 1.5 }}>
          <Avatar
            sx={{
              width: 44,
              height: 44,
              bgcolor: "primary.light",
              color: "primary.main",
              fontWeight: 800,
              fontSize: "1rem",
            }}
          >
            {clientInitials}
          </Avatar>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "text.primary" }} noWrap>
              {ticket.client.fullName}
            </Typography>
            {ticket.client.username ? (
              <MuiLink
                href={`https://t.me/${ticket.client.username}`}
                target="_blank"
                rel="noreferrer"
                sx={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 0.5,
                  fontSize: "0.8125rem",
                  color: "primary.main",
                  fontWeight: 600,
                  textDecoration: "none",
                  "&:hover": { textDecoration: "underline" },
                }}
              >
                <span>@{ticket.client.username}</span>
                <M3Icon name="open_in_new" size={14} />
              </MuiLink>
            ) : (
              <Typography variant="caption" color="text.secondary">
                Юзернейм отсутствует
              </Typography>
            )}
          </Box>
        </Stack>

        <Stack spacing={0.75} sx={{ mt: 2, bgcolor: "#F8F9FE", p: 1.5, borderRadius: 2.5 }}>
          <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center" }}>
            <Typography variant="caption" color="text.secondary">
              ID пользователя:
            </Typography>
            <Typography variant="caption" sx={{ fontWeight: 700 }}>
              {ticket.client.telegramUserId}
            </Typography>
          </Stack>
          <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center" }}>
            <Typography variant="caption" color="text.secondary">
              Чат ID:
            </Typography>
            <Typography variant="caption" sx={{ fontWeight: 700 }}>
              {ticket.client.telegramChatId}
            </Typography>
          </Stack>
        </Stack>
      </Box>

      <Divider />

      {/* 3. Мониторинг регламента SLA */}
      <Box data-testid="sla-monitor-section">
        <Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary", textTransform: "uppercase" }}>
          Контроль регламента SLA
        </Typography>

        <Stack spacing={1.5} sx={{ mt: 1.5 }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Typography variant="body2" sx={{ fontWeight: 600, color: "text.secondary" }}>
              Первый ответ (FRT):
            </Typography>
            <SLAIndicator sla={ticket.sla?.frt} label="FRT" />
          </Box>

          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Typography variant="body2" sx={{ fontWeight: 600, color: "text.secondary" }}>
              Решение (TTR):
            </Typography>
            <SLAIndicator sla={ticket.sla?.ttr} label="TTR" />
          </Box>
        </Stack>
      </Box>

      {/* 4. Блок эскалации на L2 (если передано) */}
      {(ticket.escalationLevel === "l2" || ticket.escalationReason) && (
        <>
          <Divider />
          <Box
            data-testid="escalation-info-box"
            sx={{
              p: 1.75,
              borderRadius: 3,
              bgcolor: "#FFF8F2",
              border: "1px solid #FFE4D6",
            }}
          >
            <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 0.75, color: "#9E3C00" }}>
              <M3Icon name="call_made" size={18} />
              <Typography variant="caption" sx={{ fontWeight: 800, textTransform: "uppercase" }}>
                Эскалировано на L2
              </Typography>
            </Stack>

            <Typography variant="body2" sx={{ fontWeight: 600, color: "#612100", mb: 0.5 }}>
              {ticket.escalationReason || "Причина эскалации не указана"}
            </Typography>

            {ticket.escalatedByUserName && (
              <Typography variant="caption" color="text.secondary">
                Передал: <strong>{ticket.escalatedByUserName}</strong>
              </Typography>
            )}
          </Box>
        </>
      )}

      {/* 5. Блок целевых действий */}
      <Box sx={{ mt: "auto", pt: 1 }}>
        {isClosed ? (
          <Paper
            elevation={0}
            sx={{
              p: 1.5,
              borderRadius: 3,
              bgcolor: "#F1F8F3",
              border: "1px solid #D1E7DD",
              textAlign: "center",
            }}
          >
            <Typography variant="caption" sx={{ fontWeight: 700, color: "#0F5132", display: "block" }}>
              Тикет завершен
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Клиенту отправлен автоматический запрос оценки CSAT в бот Telegram.
            </Typography>
          </Paper>
        ) : isReadOnly ? (
          <Paper
            elevation={0}
            sx={{
              p: 1.5,
              borderRadius: 3,
              bgcolor: "#F8F9FE",
              border: "1px solid rgba(196, 198, 208, 0.4)",
              textAlign: "center",
            }}
          >
            <Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary" }}>
              Режим просмотра (Аудит)
            </Typography>
          </Paper>
        ) : (
          <Stack spacing={1.5}>
            {canEscalate && (
              <M3Button
                variant="outlined"
                color="secondary"
                fullWidth
                startIcon={<M3Icon name="call_made" size={18} />}
                onClick={onOpenEscalateModal}
              >
                Эскалировать на L2
              </M3Button>
            )}

            {canClose && (
              <M3Button
                variant="contained"
                color="primary"
                fullWidth
                startIcon={<M3Icon name="check_circle" size={18} />}
                onClick={onOpenCloseModal}
              >
                Закрыть тикет
              </M3Button>
            )}
          </Stack>
        )}
      </Box>
    </Paper>
  );
};

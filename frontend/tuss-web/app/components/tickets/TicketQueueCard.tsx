import React from "react";
import { Link } from "react-router";
import {
  Avatar,
  Box,
  Card,
  Chip,
  IconButton,
  Link as MuiLink,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import { M3Icon } from "~/components/ui/M3Icon";
import { M3Button } from "~/components/ui/M3Button";
import { SLAIndicator } from "~/components/tickets/SLAIndicator";
import type { Ticket, TicketLineLevel } from "~/types/ticket";

export interface TicketQueueCardProps {
  ticket: Ticket;
  level: TicketLineLevel;
  hasActiveTicket: boolean;
  isAdminAudit: boolean;
  isTaking: boolean;
  onTakeTicket: (ticketId: string) => Promise<void>;
}

export function formatTicketTime(isoString?: string): string {
  if (!isoString) return "";
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return "";
    const now = Date.now();
    const diffSec = Math.max(0, Math.floor((now - date.getTime()) / 1000));
    if (diffSec < 60) return "только что";
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin} мин. назад`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours} ч. назад`;
    return date.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
  } catch {
    return "";
  }
}

const pillStyle = (colorType: "teal" | "amber" | "blue" | "purple" | "grey") => ({
  display: "inline-flex",
  alignItems: "center",
  gap: 0.5,
  px: 1,
  py: 0.35,
  borderRadius: 9999,
  fontSize: "0.725rem",
  fontWeight: 600,
  lineHeight: 1.2,
  border: "1px solid",
  ...(colorType === "teal" && {
    bgcolor: (theme: any) =>
      theme.palette.mode === "dark" ? "rgba(20, 184, 166, 0.14)" : "#E6F7F5",
    borderColor: (theme: any) =>
      theme.palette.mode === "dark" ? "rgba(20, 184, 166, 0.35)" : "#A3E7DC",
    color: (theme: any) =>
      theme.palette.mode === "dark" ? "#2dd4bf" : "#0D7A6F",
  }),
  ...(colorType === "amber" && {
    bgcolor: (theme: any) =>
      theme.palette.mode === "dark" ? "rgba(249, 115, 22, 0.14)" : "#FFF4E6",
    borderColor: (theme: any) =>
      theme.palette.mode === "dark" ? "rgba(249, 115, 22, 0.35)" : "#FFD6A5",
    color: (theme: any) =>
      theme.palette.mode === "dark" ? "#fb923c" : "#B25E00",
  }),
  ...(colorType === "blue" && {
    bgcolor: (theme: any) =>
      theme.palette.mode === "dark" ? "rgba(56, 189, 248, 0.14)" : "#EDF5FD",
    borderColor: (theme: any) =>
      theme.palette.mode === "dark" ? "rgba(56, 189, 248, 0.35)" : "#BDE0FE",
    color: (theme: any) =>
      theme.palette.mode === "dark" ? "#38bdf8" : "#0066CC",
  }),
  ...(colorType === "purple" && {
    bgcolor: (theme: any) =>
      theme.palette.mode === "dark" ? "rgba(168, 85, 247, 0.14)" : "#F3E8FF",
    borderColor: (theme: any) =>
      theme.palette.mode === "dark" ? "rgba(168, 85, 247, 0.35)" : "#D8B4FE",
    color: (theme: any) =>
      theme.palette.mode === "dark" ? "#c084fc" : "#7E22CE",
  }),
  ...(colorType === "grey" && {
    bgcolor: (theme: any) =>
      theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.05)" : "#F3F4F6",
    borderColor: (theme: any) =>
      theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.12)" : "#E5E7EB",
    color: "text.secondary",
  }),
});

export const TicketQueueCard: React.FC<TicketQueueCardProps> = ({
  ticket,
  level,
  hasActiveTicket,
  isAdminAudit,
  isTaking,
  onTakeTicket,
}) => {
  const clientInitials = ticket.client.fullName
    ? ticket.client.fullName
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "TG";

  const isL2 = level === "l2" || ticket.escalationLevel === "l2";
  const timeAgo = formatTicketTime(ticket.createdAt);

  return (
    <Card
      data-testid={`ticket-card-${ticket.id}`}
      sx={{
        p: 2,
        borderRadius: 2.5,
        border: "1px solid",
        borderColor: "divider",
        bgcolor: "background.paper",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        height: "100%",
        boxShadow: (theme) =>
          theme.palette.mode === "dark"
            ? "0 2px 8px rgba(0, 0, 0, 0.25)"
            : "0 1px 4px rgba(0, 0, 0, 0.05)",
        transition: "transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease",
        "&:hover": {
          transform: "translateY(-2px)",
          boxShadow: (theme) =>
            theme.palette.mode === "dark"
              ? "0 8px 24px rgba(0, 0, 0, 0.45)"
              : "0 8px 24px rgba(0, 45, 110, 0.08)",
          borderColor: "primary.main",
        },
      }}
    >
      <Box>
        {/* 1. Верхняя строка: Иконка статуса/чека + Номер тикета + Клиент + Внешняя ссылка */}
        <Stack
          direction="row"
          sx={{
            justifyContent: "space-between",
            alignItems: "flex-start",
            mb: 1.25,
          }}
        >
          <Stack direction="row" spacing={1} sx={{ alignItems: "center", minWidth: 0, flex: 1 }}>
            <Box
              sx={{
                color: isL2 ? "warning.main" : "primary.main",
                display: "inline-flex",
                alignItems: "center",
                flexShrink: 0,
              }}
            >
              <M3Icon name={isL2 ? "priority_high" : "task_alt"} size={18} />
            </Box>

            <Typography
              variant="subtitle2"
              sx={{
                fontWeight: 700,
                color: "text.primary",
                fontSize: "0.9rem",
                display: "flex",
                alignItems: "center",
                gap: 0.75,
                minWidth: 0,
              }}
              noWrap
            >
              <Box
                component="span"
                sx={{
                  color: "primary.main",
                  fontWeight: 800,
                  flexShrink: 0,
                }}
              >
                #{ticket.ticketNumber}
              </Box>
              <Box component="span" sx={{ color: "text.disabled", fontWeight: 400, flexShrink: 0 }}>
                •
              </Box>
              <Box
                component="span"
                sx={{
                  color: "text.primary",
                  fontWeight: 700,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {ticket.client.fullName}
              </Box>
            </Typography>
          </Stack>

          {/* Иконка перехода в Telegram профиль */}
          {ticket.client.username && (
            <Tooltip title={`Профиль @${ticket.client.username} в Telegram`} arrow>
              <IconButton
                component="a"
                href={`https://t.me/${ticket.client.username}`}
                target="_blank"
                rel="noreferrer"
                size="small"
                sx={{
                  p: 0.5,
                  ml: 0.5,
                  color: "text.secondary",
                  flexShrink: 0,
                  "&:hover": { color: "primary.main" },
                }}
              >
                <M3Icon name="open_in_new" size={15} />
              </IconButton>
            </Tooltip>
          )}
        </Stack>

        {/* 2. Ряд Agile-бейджей (Pills): Очередь, Канал, SLA, Время */}
        <Stack
          direction="row"
          spacing={0.75}
          sx={{
            flexWrap: "wrap",
            rowGap: 0.75,
            alignItems: "center",
            mb: 1.5,
          }}
        >
          {/* Бейдж очереди */}
          <Box sx={pillStyle(isL2 ? "amber" : "teal")}>
            <M3Icon name={isL2 ? "call_made" : "terminal"} size={13} />
            <span>{isL2 ? "L2 Эскалация" : "L1 Очередь"}</span>
          </Box>

          {/* Бейдж источника */}
          <Box sx={pillStyle("blue")}>
            <M3Icon name="send" size={12} />
            <span>Telegram</span>
          </Box>

          {/* SLA Индикатор */}
          <SLAIndicator sla={ticket.sla} />

          {/* Время создания */}
          {timeAgo && (
            <Box sx={pillStyle("grey")}>
              <M3Icon name="schedule" size={13} />
              <span>{timeAgo}</span>
            </Box>
          )}
        </Stack>

        {/* 3. Превью первого сообщения клиента */}
        <Box
          sx={{
            p: 1.5,
            borderRadius: 1.5,
            bgcolor: (theme) =>
              theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.03)" : "#F8F9FE",
            border: "1px solid",
            borderColor: "divider",
            mb: 1.5,
          }}
        >
          <Typography
            variant="body2"
            sx={{
              display: "-webkit-box",
              WebkitLineClamp: 3,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
              color: "text.primary",
              fontSize: "0.85rem",
              lineHeight: 1.45,
            }}
          >
            {ticket.firstMessagePreview || "Текст обращения отсутствует"}
          </Typography>
        </Box>

        {/* 4. Блок эскалации для L2 (если передано) */}
        {isL2 && ticket.escalationReason && (
          <Box
            sx={{
              p: 1.25,
              borderRadius: 1.5,
              bgcolor: (theme) =>
                theme.palette.mode === "dark" ? "rgba(255, 186, 40, 0.1)" : "#FFF8F2",
              border: "1px solid",
              borderColor: (theme) =>
                theme.palette.mode === "dark" ? "rgba(255, 186, 40, 0.25)" : "#FFE4D6",
              mb: 1.5,
            }}
          >
            <Stack direction="row" spacing={0.75} sx={{ alignItems: "center", mb: 0.25, color: "#9E3C00" }}>
              <M3Icon name="call_made" size={14} />
              <Typography variant="caption" sx={{ fontWeight: 800, textTransform: "uppercase", fontSize: "0.7rem" }}>
                Причина эскалации
              </Typography>
            </Stack>
            <Typography variant="body2" sx={{ fontWeight: 600, fontSize: "0.825rem", color: "text.primary" }}>
              {ticket.escalationReason}
            </Typography>
            {ticket.escalatedByUserName && (
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.725rem", mt: 0.25, display: "block" }}>
                От: {ticket.escalatedByUserName}
              </Typography>
            )}
          </Box>
        )}
      </Box>

      {/* 5. Нижняя панель: Клиент (аватар + handle) и Кнопка действия */}
      <Stack
        direction="row"
        sx={{
          justifyContent: "space-between",
          alignItems: "center",
          pt: 1.5,
          mt: "auto",
          borderTop: "1px solid",
          borderColor: "divider",
          gap: 1,
        }}
      >
        <Stack direction="row" spacing={1} sx={{ alignItems: "center", minWidth: 0, flex: 1 }}>
          <Avatar
            sx={{
              width: 32,
              height: 32,
              bgcolor: "primary.light",
              color: "primary.main",
              fontWeight: 700,
              fontSize: "0.8rem",
              flexShrink: 0,
            }}
          >
            {clientInitials}
          </Avatar>
          <Box sx={{ minWidth: 0 }}>
            {ticket.client.username ? (
              <MuiLink
                href={`https://t.me/${ticket.client.username}`}
                target="_blank"
                rel="noreferrer"
                sx={{
                  fontSize: "0.775rem",
                  color: "text.secondary",
                  fontWeight: 600,
                  textDecoration: "none",
                  display: "block",
                  "&:hover": { color: "primary.main", textDecoration: "underline" },
                }}
                noWrap
              >
                @{ticket.client.username}
              </MuiLink>
            ) : (
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.75rem", display: "block" }} noWrap>
                ID: {ticket.client.telegramUserId}
              </Typography>
            )}
          </Box>
        </Stack>

        {isAdminAudit ? (
          <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexShrink: 0 }}>
            <Chip
              label="Только аудит"
              size="small"
              variant="outlined"
              sx={{ fontWeight: 600, fontSize: "0.75rem", height: 24 }}
            />
            <M3Button
              variant="outlined"
              size="small"
              component={Link}
              to={`/tickets/${ticket.id}`}
              startIcon={<M3Icon name="visibility" size={16} />}
              sx={{ fontSize: "0.8rem", py: 0.4, px: 1.25 }}
            >
              Просмотр
            </M3Button>
          </Stack>
        ) : (
          <Tooltip
            title={
              hasActiveTicket
                ? "У вас уже есть открытый тикет. Завершите его перед взятием следующего (правило «В одни руки»)."
                : "Взять тикет в работу и начать диалог с клиентом"
            }
            arrow
          >
            <span style={{ display: "inline-block", flexShrink: 0 }}>
              <M3Button
                variant="contained"
                size="small"
                onClick={() => onTakeTicket(ticket.id)}
                disabled={hasActiveTicket || isTaking}
                data-testid={`take-ticket-button-${ticket.id}`}
                startIcon={<M3Icon name={isTaking ? "hourglass_empty" : "play_arrow"} size={16} />}
                sx={{ fontSize: "0.8rem", py: 0.45, px: 1.5 }}
              >
                {isTaking ? "Берем..." : "Взять в работу"}
              </M3Button>
            </span>
          </Tooltip>
        )}
      </Stack>
    </Card>
  );
};

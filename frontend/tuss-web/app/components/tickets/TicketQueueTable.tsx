// app/components/tickets/TicketQueueTable.tsx
import React, { useState } from "react";
import { Link } from "react-router";
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Tooltip,
  Skeleton,
  Chip,
  Avatar,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Card,
} from "@mui/material";
import { M3Icon } from "~/components/ui/M3Icon";
import { M3Button } from "~/components/ui/M3Button";
import { SLAIndicator } from "~/components/tickets/SLAIndicator";
import { TicketQueueCard } from "~/components/tickets/TicketQueueCard";
import type { Ticket, TicketLineLevel } from "~/types/ticket";

export interface TicketQueueTableProps {
  tickets: Ticket[];
  isLoading: boolean;
  level: TicketLineLevel;
  hasActiveTicket: boolean;
  isAdminAudit: boolean;
  takingTicketId: string | null;
  onTakeTicket: (ticketId: string) => Promise<void>;
  emptyTitle: string;
  emptySubtitle: string;
  emptyIcon?: string;
}

export const TicketQueueTable: React.FC<TicketQueueTableProps> = ({
  tickets,
  isLoading,
  level,
  hasActiveTicket,
  isAdminAudit,
  takingTicketId,
  onTakeTicket,
  emptyTitle,
  emptySubtitle,
  emptyIcon = "inbox",
}) => {
  const [viewMode, setViewMode] = useState<"cards" | "table">(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("tuss_queue_view_mode");
      if (saved === "table" || saved === "cards") return saved;
    }
    return "cards"; // По умолчанию отображаются карточки!
  });

  const handleViewModeChange = (
    _event: React.MouseEvent<HTMLElement>,
    nextView: "cards" | "table" | null
  ) => {
    if (nextView !== null) {
      setViewMode(nextView);
      if (typeof window !== "undefined") {
        localStorage.setItem("tuss_queue_view_mode", nextView);
      }
    }
  };

  // Верхняя панель управления видом (Карточки / Таблица)
  const renderViewControls = () => (
    <Stack
      direction="row"
      sx={{
        justifyContent: "space-between",
        alignItems: "center",
        mb: 2,
        px: 0.5,
      }}
    >
      <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
        В очереди: <strong>{tickets.length}</strong>{" "}
        {tickets.length === 1
          ? "обращение"
          : tickets.length >= 2 && tickets.length <= 4
          ? "обращения"
          : "обращений"}
      </Typography>

      <ToggleButtonGroup
        value={viewMode}
        exclusive
        onChange={handleViewModeChange}
        size="small"
        data-testid="queue-view-toggle-group"
        sx={{
          bgcolor: (theme) =>
            theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.05)" : "#F1F4FB",
          borderRadius: 1,
          p: 0.25,
          "& .MuiToggleButton-root": {
            border: "none",
            borderRadius: 0.75,
            px: 1.25,
            py: 0.4,
            color: "text.secondary",
            "&.Mui-selected": {
              bgcolor: "background.paper",
              color: "primary.main",
              boxShadow: "0 1px 2px rgba(0, 0, 0, 0.06)",
              fontWeight: 600,
            },
          },
        }}
      >
        <ToggleButton value="cards" data-testid="queue-view-cards-button">
          <Stack direction="row" spacing={0.75} sx={{ alignItems: "center" }}>
            <M3Icon name="grid_view" size={16} />
            <Typography variant="caption" sx={{ fontWeight: "inherit", display: { xs: "none", sm: "inline" } }}>
              Карточки
            </Typography>
          </Stack>
        </ToggleButton>
        <ToggleButton value="table" data-testid="queue-view-table-button">
          <Stack direction="row" spacing={0.75} sx={{ alignItems: "center" }}>
            <M3Icon name="view_list" size={16} />
            <Typography variant="caption" sx={{ fontWeight: "inherit", display: { xs: "none", sm: "inline" } }}>
              Таблица
            </Typography>
          </Stack>
        </ToggleButton>
      </ToggleButtonGroup>
    </Stack>
  );

  // 1. Состояние скелетон-загрузки
  if (isLoading) {
    return (
      <Box>
        {renderViewControls()}
        {viewMode === "cards" ? (
          <Box
            data-testid="queue-skeleton-loading"
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "repeat(auto-fill, minmax(320px, 1fr))" },
              gap: 2.5,
            }}
          >
            {Array.from({ length: 6 }).map((_, index) => (
              <Card
                key={index}
                sx={{
                  p: 2.25,
                  borderRadius: 2,
                  border: "1px solid",
                  borderColor: "divider",
                  bgcolor: "background.paper",
                }}
              >
                <Stack direction="row" sx={{ justifyContent: "space-between", mb: 1.75 }}>
                  <Skeleton variant="rectangular" width={60} height={24} sx={{ borderRadius: 1 }} />
                  <Skeleton variant="rounded" width={90} height={24} sx={{ borderRadius: 1 }} />
                </Stack>
                <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", mb: 2 }}>
                  <Skeleton variant="circular" width={38} height={38} />
                  <Box sx={{ flex: 1 }}>
                    <Skeleton variant="text" width="70%" height={20} />
                    <Skeleton variant="text" width="40%" height={16} />
                  </Box>
                </Stack>
                <Skeleton variant="rectangular" height={60} sx={{ borderRadius: 1.5, mb: 2 }} />
                <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", pt: 1 }}>
                  <Skeleton variant="rectangular" width={75} height={20} sx={{ borderRadius: 1 }} />
                  <Skeleton variant="rounded" width={110} height={32} sx={{ borderRadius: 1 }} />
                </Stack>
              </Card>
            ))}
          </Box>
        ) : (
          <Paper
            elevation={0}
            data-testid="queue-skeleton-loading"
            sx={{
              borderRadius: 2,
              border: "1px solid",
              borderColor: "divider",
              overflow: "hidden",
              bgcolor: "background.paper",
            }}
          >
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600, width: 110 }}>№ Тикета</TableCell>
                    <TableCell sx={{ fontWeight: 600, width: 220 }}>Клиент</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Первое сообщение</TableCell>
                    {level === "l2" && (
                      <TableCell sx={{ fontWeight: 600, width: 220 }}>Причина эскалации</TableCell>
                    )}
                    <TableCell sx={{ fontWeight: 600, width: 150 }}>Регламент SLA</TableCell>
                    <TableCell sx={{ fontWeight: 600, width: 170, textAlign: "right" }}>
                      Действие
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {Array.from({ length: 5 }).map((_, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Skeleton variant="text" width={70} height={28} />
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
                          <Skeleton variant="circular" width={36} height={36} />
                          <Box sx={{ width: "100%" }}>
                            <Skeleton variant="text" width="80%" height={20} />
                            <Skeleton variant="text" width="50%" height={16} />
                          </Box>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Skeleton variant="text" width="90%" height={20} />
                        <Skeleton variant="text" width="60%" height={16} />
                      </TableCell>
                      {level === "l2" && (
                        <TableCell>
                          <Skeleton variant="text" width="85%" height={20} />
                        </TableCell>
                      )}
                      <TableCell>
                        <Skeleton variant="rounded" width={110} height={32} sx={{ borderRadius: 1 }} />
                      </TableCell>
                      <TableCell align="right">
                        <Skeleton variant="rounded" width={130} height={36} sx={{ borderRadius: 1, ml: "auto" }} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        )}
      </Box>
    );
  }

  // 2. Состояние пустой очереди (Empty State)
  if (tickets.length === 0) {
    return (
      <Paper
        elevation={0}
        data-testid="queue-empty-state"
        sx={{
          py: 8,
          px: 3,
          textAlign: "center",
          borderRadius: 2,
          border: "1px dashed",
          borderColor: "divider",
          bgcolor: (theme) => (theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.02)" : "#F8F9FE"),
        }}
      >
        <Box
          sx={{
            width: 64,
            height: 64,
            borderRadius: "50%",
            bgcolor: (theme) => (theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.08)" : "#E7F0FF"),
            color: "primary.main",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            mx: "auto",
            mb: 2,
          }}
        >
          <M3Icon name={emptyIcon} size={32} />
        </Box>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.75 }}>
          {emptyTitle}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 440, mx: "auto" }}>
          {emptySubtitle}
        </Typography>
      </Paper>
    );
  }

  // 3. Основной вывод очереди (Карточки или Таблица)
  return (
    <Box>
      {renderViewControls()}

      {viewMode === "cards" ? (
        <Box
          data-testid="queue-cards-grid"
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", sm: "repeat(auto-fill, minmax(320px, 1fr))" },
            gap: 2.5,
          }}
        >
          {tickets.map((ticket) => (
            <TicketQueueCard
              key={ticket.id}
              ticket={ticket}
              level={level}
              hasActiveTicket={hasActiveTicket}
              isAdminAudit={isAdminAudit}
              isTaking={takingTicketId === ticket.id}
              onTakeTicket={onTakeTicket}
            />
          ))}
        </Box>
      ) : (
        <Paper
          elevation={0}
          data-testid="queue-table"
          sx={{
            borderRadius: 2,
            border: "1px solid",
            borderColor: "divider",
            overflow: "hidden",
            bgcolor: "background.paper",
            boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)",
          }}
        >
          <TableContainer>
            <Table sx={{ minWidth: 700 }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600, color: "text.secondary", width: 110 }}>
                    № Тикета
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600, color: "text.secondary", width: 220 }}>
                    Клиент
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600, color: "text.secondary" }}>
                    Первое сообщение
                  </TableCell>
                  {level === "l2" && (
                    <TableCell sx={{ fontWeight: 600, color: "text.secondary", width: 220 }}>
                      Причина эскалации
                    </TableCell>
                  )}
                  <TableCell sx={{ fontWeight: 600, color: "text.secondary", width: 150 }}>
                    Регламент SLA
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600, color: "text.secondary", width: 180, textAlign: "right" }}>
                    Действие
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {tickets.map((ticket) => {
                  const clientInitials = ticket.client.fullName
                    ? ticket.client.fullName
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase()
                    : "TG";

                  return (
                    <TableRow
                      key={ticket.id}
                      hover
                      sx={{
                        transition: "background-color 0.15s ease",
                        "&:last-child td, &:last-child th": { border: 0 },
                      }}
                    >
                      {/* Номер тикета */}
                      <TableCell sx={{ fontWeight: 600, color: "primary.main" }}>
                        #{ticket.ticketNumber}
                      </TableCell>

                      {/* Клиент */}
                      <TableCell>
                        <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
                          <Avatar
                            sx={{
                              width: 36,
                              height: 36,
                              fontSize: "0.85rem",
                              fontWeight: 600,
                              bgcolor: "primary.light",
                              color: "primary.main",
                            }}
                          >
                            {clientInitials}
                          </Avatar>
                          <Box sx={{ minWidth: 0 }}>
                            <Typography
                              variant="body2"
                              sx={{ fontWeight: 700, color: "text.primary" }}
                              noWrap
                            >
                              {ticket.client.fullName}
                            </Typography>
                            <Typography
                              variant="caption"
                              sx={{ color: "text.secondary", display: "flex", alignItems: "center", gap: 0.4 }}
                              noWrap
                            >
                              {ticket.client.username ? `@${ticket.client.username}` : `ID: ${ticket.client.telegramUserId}`}
                            </Typography>
                          </Box>
                        </Stack>
                      </TableCell>

                      {/* Превью первого сообщения */}
                      <TableCell sx={{ maxWidth: 360 }}>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {ticket.firstMessagePreview || "—"}
                        </Typography>
                      </TableCell>

                      {/* Причина эскалации (только для L2) */}
                      {level === "l2" && (
                        <TableCell sx={{ maxWidth: 220 }}>
                          <Typography variant="body2" sx={{ fontWeight: 600, color: "warning.dark" }} noWrap>
                            {ticket.escalationReason || "—"}
                          </Typography>
                          {ticket.escalatedByUserName && (
                            <Typography variant="caption" color="text.secondary" noWrap>
                              От: {ticket.escalatedByUserName}
                            </Typography>
                          )}
                        </TableCell>
                      )}

                      {/* Индикатор SLA */}
                      <TableCell>
                        <SLAIndicator sla={ticket.sla} />
                      </TableCell>

                      {/* Целевое действие: Взять в работу */}
                      <TableCell align="right">
                        {isAdminAudit ? (
                          <Chip
                            label="Только аудит"
                            size="small"
                            variant="outlined"
                            sx={{ fontWeight: 600 }}
                          />
                        ) : (
                          <Tooltip
                            title={
                              hasActiveTicket
                                ? "У вас уже есть открытый тикет. Завершите его перед взятием следующего (правило «В одни руки»)."
                                : "Взять тикет в работу и перейти в диалог"
                            }
                            arrow
                          >
                            <span>
                              <M3Button
                                variant="contained"
                                size="small"
                                onClick={() => onTakeTicket(ticket.id)}
                                disabled={hasActiveTicket || takingTicketId === ticket.id}
                                isLoading={takingTicketId === ticket.id}
                                data-testid={`take-ticket-button-${ticket.id}`}
                                startIcon={
                                  <M3Icon
                                    name={takingTicketId === ticket.id ? "hourglass_empty" : "play_arrow"}
                                    size={18}
                                  />
                                }
                              >
                                {takingTicketId === ticket.id ? "Берем..." : "Взять в работу"}
                              </M3Button>
                            </span>
                          </Tooltip>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}
    </Box>
  );
};

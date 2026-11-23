// app/components/tickets/TicketQueueTable.tsx
import React from "react";
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
} from "@mui/material";
import { M3Icon } from "~/components/ui/M3Icon";
import { M3Button } from "~/components/ui/M3Button";
import { SLAIndicator } from "~/components/tickets/SLAIndicator";
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
  if (isLoading) {
    return (
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
                <TableCell sx={{ fontWeight: 700, width: 110 }}>№ Тикета</TableCell>
                <TableCell sx={{ fontWeight: 700, width: 220 }}>Клиент</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Первое сообщение</TableCell>
                {level === "l2" && (
                  <TableCell sx={{ fontWeight: 700, width: 220 }}>Эскалация</TableCell>
                )}
                <TableCell sx={{ fontWeight: 700, width: 150 }}>Регламент SLA</TableCell>
                <TableCell sx={{ fontWeight: 700, width: 170, textAlign: "right" }}>
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
                    <Skeleton variant="rounded" width={110} height={32} sx={{ borderRadius: 9999 }} />
                  </TableCell>
                  <TableCell align="right">
                    <Skeleton variant="rounded" width={130} height={36} sx={{ borderRadius: 9999, ml: "auto" }} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    );
  }

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

  return (
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
              <TableCell sx={{ fontWeight: 700, color: "text.secondary", width: 110 }}>
                № Тикета
              </TableCell>
              <TableCell sx={{ fontWeight: 700, color: "text.secondary", width: 220 }}>
                Клиент
              </TableCell>
              <TableCell sx={{ fontWeight: 700, color: "text.secondary" }}>
                Первое сообщение
              </TableCell>
              {level === "l2" && (
                <TableCell sx={{ fontWeight: 700, color: "text.secondary", width: 220 }}>
                  Причина эскалации
                </TableCell>
              )}
              <TableCell sx={{ fontWeight: 700, color: "text.secondary", width: 150 }}>
                Регламент SLA
              </TableCell>
              <TableCell sx={{ fontWeight: 700, color: "text.secondary", width: 180, textAlign: "right" }}>
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
                  <TableCell sx={{ fontWeight: 800, color: "primary.main" }}>
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
                          fontWeight: 700,
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
                  <TableCell>
                    <Tooltip
                      title={ticket.firstMessagePreview || "Текст обращения отсутствует"}
                      arrow
                      placement="top-start"
                    >
                      <Typography
                        variant="body2"
                        sx={{
                          color: "text.primary",
                          maxWidth: 320,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          cursor: "pointer",
                        }}
                      >
                        {ticket.firstMessagePreview || "—"}
                      </Typography>
                    </Tooltip>
                  </TableCell>

                  {/* Причина эскалации (для L2) */}
                  {level === "l2" && (
                    <TableCell>
                      <Box>
                        <Tooltip
                          title={ticket.escalationReason || "Причина не указана"}
                          arrow
                          placement="top"
                        >
                          <Typography
                            variant="body2"
                            sx={{
                              fontWeight: 600,
                              color: "error.main",
                              maxWidth: 200,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {ticket.escalationReason || "Без комментария"}
                          </Typography>
                        </Tooltip>
                        {ticket.escalatedByUserName && (
                          <Typography variant="caption" color="text.secondary">
                            От: {ticket.escalatedByUserName}
                          </Typography>
                        )}
                      </Box>
                    </TableCell>
                  )}

                  {/* Индикатор SLA */}
                  <TableCell>
                    <SLAIndicator sla={ticket.sla} />
                  </TableCell>

                  {/* Кнопка действия */}
                  <TableCell align="right">
                    {isAdminAudit ? (
                      <Chip
                        label="Только аудит"
                        size="small"
                        variant="outlined"
                        sx={{ color: "text.secondary", borderColor: "divider" }}
                      />
                    ) : hasActiveTicket ? (
                      <Tooltip title="Завершите текущий активный тикет перед взятием следующего" arrow>
                        <span>
                          <M3Button
                            variant="outlined"
                            size="small"
                            disabled
                            startIcon={<M3Icon name="play_arrow" size={16} />}
                          >
                            Взять в работу
                          </M3Button>
                        </span>
                      </Tooltip>
                    ) : (
                      <M3Button
                        variant="contained"
                        size="small"
                        loading={takingTicketId === ticket.id}
                        startIcon={<M3Icon name="play_arrow" size={16} />}
                        onClick={() => onTakeTicket(ticket.id)}
                      >
                        Взять в работу
                      </M3Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
};

// app/routes/tickets.archive.tsx
import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router";
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Stack,
  Chip,
  TextField,
  InputAdornment,
  MenuItem,
  Avatar,
  Tooltip,
  Skeleton,
  IconButton,
} from "@mui/material";
import { RoleGuard } from "~/components/auth/RoleGuard";
import { useAuth } from "~/context/AuthContext";
import { ticketsApi } from "~/api/tickets";
import { M3Icon } from "~/components/ui/M3Icon";
import { M3Button } from "~/components/ui/M3Button";
import type { Ticket } from "~/types/ticket";

export function meta() {
  return [
    { title: "Архив тикетов — TUSS" },
    { name: "description", content: "История закрытых обращений и журнал обслуживания" },
  ];
}

export function formatDateTime(isoString: string): string {
  try {
    const d = new Date(isoString);
    return d.toLocaleString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return isoString;
  }
}

export default function TicketsArchiveRoute() {
  const { user } = useAuth();

  const [allTickets, setAllTickets] = useState<Ticket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [periodFilter, setPeriodFilter] = useState<"all" | "today" | "7days" | "30days">("all");

  const loadArchiveData = async () => {
    setIsLoading(true);
    try {
      const data = await ticketsApi.getArchivedTickets();
      setAllTickets(data || []);
    } catch (err) {
      console.error("Ошибка при загрузке архива тикетов:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadArchiveData();
  }, []);

  // 1. Ролевая фильтрация (SRS Приложение В, Таблица В.1)
  const roleFilteredTickets = useMemo(() => {
    if (!user) return [];

    if (user.role === "operator_l1") {
      // L1 видит только свои закрытые тикеты
      return allTickets.filter((t) => t.assignedOperatorId === user.id);
    }

    if (user.role === "operator_l2") {
      // L2 видит все закрытые эскалированные обращения
      return allTickets.filter((t) => t.escalationLevel === "l2");
    }

    // Администратор видит все закрытые обращения компании
    return allTickets;
  }, [allTickets, user]);

  // 2. Поисковая фильтрация и фильтрация по периодам
  const filteredTickets = useMemo(() => {
    return roleFilteredTickets.filter((ticket) => {
      // Поиск по номеру, клиенту или тексту
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().replace("#", "").trim();
        const matchesNumber = String(ticket.ticketNumber).includes(q);
        const matchesClient =
          ticket.client.fullName?.toLowerCase().includes(q) ||
          ticket.client.username?.toLowerCase().includes(q);
        const matchesText = ticket.firstMessagePreview?.toLowerCase().includes(q);

        if (!matchesNumber && !matchesClient && !matchesText) {
          return false;
        }
      }

      // Фильтр по периоду
      if (periodFilter !== "all" && ticket.closedAt) {
        const closedTime = new Date(ticket.closedAt).getTime();
        const now = Date.now();
        const diffMs = now - closedTime;

        if (periodFilter === "today" && diffMs > 24 * 3600 * 1000) return false;
        if (periodFilter === "7days" && diffMs > 7 * 24 * 3600 * 1000) return false;
        if (periodFilter === "30days" && diffMs > 30 * 24 * 3600 * 1000) return false;
      }

      return true;
    });
  }, [roleFilteredTickets, searchQuery, periodFilter]);

  return (
    <RoleGuard allowedRoles={["operator_l1", "operator_l2", "admin"]}>
      <Box sx={{ maxWidth: 1200, mx: "auto" }}>
        {/* Заголовок страницы */}
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
            <Typography variant="h5" sx={{ fontWeight: 800 }}>
              Архив обращений
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Журнал закрытых диалогов с историей обслуживания и сообщениями клиентов
            </Typography>
          </div>

          <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
            <Chip
              label={`${filteredTickets.length} ${filteredTickets.length === 1 ? "тикет" : "тикетов"}`}
              color="default"
              sx={{ fontWeight: 700 }}
            />
            <Tooltip title="Обновить архив" arrow>
              <span>
                <IconButton
                  onClick={loadArchiveData}
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

        {/* Панель фильтров и поиска */}
        <Paper
          elevation={0}
          sx={{
            p: 2,
            mb: 3,
            borderRadius: 2,
            border: "1px solid",
            borderColor: "divider",
            display: "flex",
            flexDirection: { xs: "column", sm: "row" },
            gap: 2,
            bgcolor: "background.paper",
          }}
        >
          <TextField
            placeholder="Поиск по номеру #..., клиенту или тексту обращения..."
            fullWidth
            size="small"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <M3Icon name="search" size={20} />
                  </InputAdornment>
                ),
              },
              htmlInput: {
                "data-testid": "archive-search-input",
              },
            }}
          />

          <TextField
            select
            size="small"
            value={periodFilter}
            onChange={(e) => setPeriodFilter(e.target.value as any)}
            sx={{ minWidth: { xs: "100%", sm: 200 } }}
            slotProps={{
              htmlInput: {
                "data-testid": "archive-period-select",
              },
            }}
          >
            <MenuItem value="all">За все время</MenuItem>
            <MenuItem value="today">За 24 часа</MenuItem>
            <MenuItem value="7days">За 7 дней</MenuItem>
            <MenuItem value="30days">За 30 дней</MenuItem>
          </TextField>
        </Paper>

        {/* Таблица архивных обращений */}
        {isLoading ? (
          <Paper
            elevation={0}
            data-testid="archive-skeleton-loading"
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
                    <TableCell sx={{ fontWeight: 700, width: 180 }}>Оператор</TableCell>
                    <TableCell sx={{ fontWeight: 700, width: 160 }}>Дата закрытия</TableCell>
                    <TableCell sx={{ fontWeight: 700, width: 130, textAlign: "right" }}>
                      Действие
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {Array.from({ length: 4 }).map((_, idx) => (
                    <TableRow key={idx}>
                      <TableCell>
                        <Skeleton variant="text" width={60} height={24} />
                      </TableCell>
                      <TableCell>
                        <Skeleton variant="text" width={140} height={24} />
                      </TableCell>
                      <TableCell>
                        <Skeleton variant="text" width="80%" height={24} />
                      </TableCell>
                      <TableCell>
                        <Skeleton variant="text" width={110} height={24} />
                      </TableCell>
                      <TableCell>
                        <Skeleton variant="text" width={100} height={24} />
                      </TableCell>
                      <TableCell align="right">
                        <Skeleton variant="rounded" width={90} height={32} sx={{ borderRadius: 9999, ml: "auto" }} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        ) : filteredTickets.length === 0 ? (
          <Paper
            elevation={0}
            data-testid="archive-empty-state"
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
              <M3Icon name="archive" size={32} />
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.75 }}>
              {searchQuery ? "Обращения не найдены" : "В архиве пока нет закрытых обращений"}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 440, mx: "auto" }}>
              {searchQuery
                ? "Попробуйте изменить поисковый запрос или сбросить фильтр периода."
                : "Здесь будут отображаться завершенные диалоги вашей службы поддержки."}
            </Typography>
          </Paper>
        ) : (
          <Paper
            elevation={0}
            data-testid="archive-table"
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
                    <TableCell sx={{ fontWeight: 700, color: "text.secondary", width: 180 }}>
                      Ответственный
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, color: "text.secondary", width: 160 }}>
                      Дата закрытия
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, color: "text.secondary", width: 130, textAlign: "right" }}>
                      Действие
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredTickets.map((ticket) => {
                    const initials = ticket.client.fullName
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
                        {/* Номер */}
                        <TableCell sx={{ fontWeight: 800, color: "text.secondary" }}>
                          #{ticket.ticketNumber}
                        </TableCell>

                        {/* Клиент */}
                        <TableCell>
                          <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
                            <Avatar
                              sx={{
                                width: 34,
                                height: 34,
                                fontSize: "0.8rem",
                                fontWeight: 700,
                                bgcolor: "#F1F4FB",
                                color: "text.primary",
                              }}
                            >
                              {initials}
                            </Avatar>
                            <Box sx={{ minWidth: 0 }}>
                              <Typography variant="body2" sx={{ fontWeight: 700 }} noWrap>
                                {ticket.client.fullName}
                              </Typography>
                              <Typography variant="caption" color="text.secondary" noWrap>
                                {ticket.client.username
                                  ? `@${ticket.client.username}`
                                  : `ID: ${ticket.client.telegramUserId}`}
                              </Typography>
                            </Box>
                          </Stack>
                        </TableCell>

                        {/* Первое сообщение */}
                        <TableCell>
                          <Tooltip
                            title={ticket.firstMessagePreview || "Текст отсутствует"}
                            arrow
                            placement="top-start"
                          >
                            <Typography
                              variant="body2"
                              sx={{
                                maxWidth: 280,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {ticket.firstMessagePreview || "—"}
                            </Typography>
                          </Tooltip>
                        </TableCell>

                        {/* Ответственный */}
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {ticket.assignedOperatorName || "Служба поддержки"}
                          </Typography>
                          {ticket.escalationLevel === "l2" && (
                            <Chip label="L2" size="small" color="secondary" sx={{ height: 18, fontSize: "0.6875rem" }} />
                          )}
                        </TableCell>

                        {/* Дата закрытия */}
                        <TableCell>
                          <Typography variant="caption" sx={{ fontWeight: 600, color: "text.secondary" }}>
                            {ticket.closedAt ? formatDateTime(ticket.closedAt) : "—"}
                          </Typography>
                        </TableCell>

                        {/* Действие: Открыть */}
                        <TableCell align="right">
                          <M3Button
                            variant="outlined"
                            size="small"
                            component={Link}
                            to={`/tickets/${ticket.id}`}
                            startIcon={<M3Icon name="visibility" size={16} />}
                          >
                            Открыть
                          </M3Button>
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
    </RoleGuard>
  );
}

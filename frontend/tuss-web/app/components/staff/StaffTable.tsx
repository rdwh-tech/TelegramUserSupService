// app/components/staff/StaffTable.tsx
import React from "react";
import {
  Box,
  Card,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Avatar,
  Chip,
  Stack,
  Skeleton,
  IconButton,
  Tooltip,
  Select,
  MenuItem,
  FormControl,
} from "@mui/material";
import { Link } from "react-router";
import { M3Icon } from "~/components/ui/M3Icon";
import type { StaffMember } from "~/types/company";

interface StaffTableProps {
  staff: StaffMember[];
  isLoading?: boolean;
  onChangeRole: (member: StaffMember, newRole: "operator_l1" | "operator_l2") => void;
  onExclude: (member: StaffMember) => void;
}

export const StaffTable: React.FC<StaffTableProps> = ({
  staff,
  isLoading = false,
  onChangeRole,
  onExclude,
}) => {
  if (isLoading) {
    return (
      <Card
        data-testid="staff-table-skeleton"
        sx={{
          borderRadius: 2,
          border: "1px solid",
          borderColor: "divider",
          bgcolor: "background.paper",
          p: 2.5,
          boxShadow: "none",
        }}
      >
        <Skeleton variant="text" width={200} height={28} sx={{ mb: 2 }} />
        <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 1.5 }} />
      </Card>
    );
  }

  const isEmpty = !staff || staff.length === 0;

  return (
    <Card
      data-testid="staff-table-card"
      sx={{
        borderRadius: 2,
        border: "1px solid",
        borderColor: "divider",
        bgcolor: "background.paper",
        boxShadow: "none",
        overflow: "hidden",
      }}
    >
      <Box sx={{ p: 2.5, pb: 2 }}>
        <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              Список сотрудников
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Операторы первой и второй линии поддержки с правами обработки обращений
            </Typography>
          </div>
          <Typography variant="caption" sx={{ fontWeight: 600, color: "text.secondary" }}>
            Всего сотрудников: {staff.length}
          </Typography>
        </Stack>
      </Box>

      {isEmpty ? (
        <Box
          data-testid="staff-empty-state"
          sx={{
            py: 6,
            textAlign: "center",
            borderTop: "1px solid",
            borderColor: "divider",
          }}
        >
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: "50%",
              bgcolor: (theme) =>
                theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.08)" : "#E7F0FF",
              color: "primary.main",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              mx: "auto",
              mb: 1.5,
            }}
          >
            <M3Icon name="group_off" size={24} />
          </Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
            Сотрудники не найдены
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            В компании пока нет привязанных сотрудников. Пригласите оператора по 6-значному коду.
          </Typography>
        </Box>
      ) : (
        <TableContainer sx={{ borderTop: "1px solid", borderColor: "divider" }}>
          <Table size="medium" data-testid="staff-table">
            <TableHead>
              <TableRow
                sx={{
                  bgcolor: (theme) =>
                    theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.02)" : "#FAFAFC",
                }}
              >
                <TableCell sx={{ fontWeight: 600, color: "text.secondary", fontSize: "0.8rem" }}>
                  Сотрудник
                </TableCell>
                <TableCell
                  sx={{ fontWeight: 600, color: "text.secondary", fontSize: "0.8rem", width: 220 }}
                >
                  Роль в поддержке
                </TableCell>
                <TableCell
                  sx={{ fontWeight: 600, color: "text.secondary", fontSize: "0.8rem", width: 200 }}
                >
                  Текущая занятость
                </TableCell>
                <TableCell
                  align="right"
                  sx={{ fontWeight: 600, color: "text.secondary", fontSize: "0.8rem", width: 120 }}
                >
                  Действия
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {staff.map((member) => {
                const initials = member.fullName
                  ? member.fullName
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()
                  : member.login.slice(0, 2).toUpperCase();

                const isAdmin = member.role === "admin";
                const isL2 = member.role === "operator_l2";
                const hasActiveTicket = !!member.activeTicketNumber;

                return (
                  <TableRow
                    key={member.id}
                    hover
                    data-testid={`staff-row-${member.id}`}
                    sx={{
                      transition: "background-color 0.15s ease",
                      "&:last-child td, &:last-child th": { border: 0 },
                    }}
                  >
                    {/* Сотрудник */}
                    <TableCell>
                      <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
                        <Avatar
                          sx={{
                            width: 34,
                            height: 34,
                            fontSize: "0.775rem",
                            fontWeight: 700,
                            bgcolor: isAdmin
                              ? "primary.dark"
                              : isL2
                              ? "secondary.main"
                              : "primary.main",
                            color: "#FFFFFF",
                          }}
                        >
                          {initials}
                        </Avatar>
                        <Box sx={{ minWidth: 0 }}>
                          <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
                            {member.fullName}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" noWrap>
                            @{member.login}
                          </Typography>
                        </Box>
                      </Stack>
                    </TableCell>

                    {/* Роль (с возможностью переключения для операторов) */}
                    <TableCell>
                      {isAdmin ? (
                        <Chip
                          label="Администратор"
                          size="small"
                          color="primary"
                          variant="filled"
                          sx={{ height: 24, fontSize: "0.75rem", fontWeight: 700 }}
                        />
                      ) : (
                        <FormControl size="small" sx={{ minWidth: 160 }}>
                          <Select
                            value={member.role}
                            onChange={(e) =>
                              onChangeRole(member, e.target.value as "operator_l1" | "operator_l2")
                            }
                            data-testid={`role-select-${member.id}`}
                            sx={{
                              height: 30,
                              fontSize: "0.8rem",
                              borderRadius: 1,
                              "& .MuiSelect-select": { py: 0.5 },
                            }}
                          >
                            <MenuItem value="operator_l1" data-testid={`option-l1-${member.id}`}>
                              Оператор L1
                            </MenuItem>
                            <MenuItem value="operator_l2" data-testid={`option-l2-${member.id}`}>
                              Старший оператор L2
                            </MenuItem>
                          </Select>
                        </FormControl>
                      )}
                    </TableCell>

                    {/* Статус текущей занятости (правило «в одни руки») */}
                    <TableCell>
                      {hasActiveTicket ? (
                        <Stack direction="row" spacing={0.75} sx={{ alignItems: "center" }}>
                          <Box
                            sx={{
                              width: 8,
                              height: 8,
                              borderRadius: "50%",
                              bgcolor: "#D97706",
                              flexShrink: 0,
                            }}
                          />
                          <Chip
                            component={Link}
                            to={`/tickets/${member.activeTicketId}`}
                            label={`В работе: #${member.activeTicketNumber}`}
                            size="small"
                            clickable
                            color="warning"
                            variant="outlined"
                            sx={{
                              height: 24,
                              fontSize: "0.75rem",
                              fontWeight: 600,
                              fontVariantNumeric: "tabular-nums",
                            }}
                          />
                        </Stack>
                      ) : (
                        <Stack direction="row" spacing={0.75} sx={{ alignItems: "center" }}>
                          <Box
                            sx={{
                              width: 8,
                              height: 8,
                              borderRadius: "50%",
                              bgcolor: "#16694E",
                              flexShrink: 0,
                            }}
                          />
                          <Typography
                            variant="body2"
                            sx={{ color: "success.main", fontWeight: 600, fontSize: "0.825rem" }}
                          >
                            Свободен
                          </Typography>
                        </Stack>
                      )}
                    </TableCell>

                    {/* Действия: Исключение */}
                    <TableCell align="right">
                      {!isAdmin && (
                        <Tooltip title="Исключить сотрудника из компании">
                          <IconButton
                            onClick={() => onExclude(member)}
                            size="small"
                            color="error"
                            data-testid={`exclude-staff-${member.id}`}
                            sx={{
                              border: "1px solid",
                              borderColor: "divider",
                              borderRadius: 1,
                              p: 0.5,
                              "&:hover": {
                                bgcolor: (theme) =>
                                  theme.palette.mode === "dark"
                                    ? "rgba(186, 26, 26, 0.2)"
                                    : "rgba(186, 26, 26, 0.08)",
                              },
                            }}
                          >
                            <M3Icon name="person_remove" size={17} />
                          </IconButton>
                        </Tooltip>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Card>
  );
};
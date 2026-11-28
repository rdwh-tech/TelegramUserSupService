// app/components/analytics/OperatorPerformanceTable.tsx
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
} from "@mui/material";
import { Link } from "react-router";
import { M3Icon } from "~/components/ui/M3Icon";
import { M3Button } from "~/components/ui/M3Button";
import type { OperatorPerformanceItem } from "~/types/analytics";
import { formatDurationSeconds, formatPercentage, formatCSAT } from "./utils";

interface OperatorPerformanceTableProps {
  operators: OperatorPerformanceItem[];
  isLoading?: boolean;
}

export const OperatorPerformanceTable: React.FC<OperatorPerformanceTableProps> = ({
  operators,
  isLoading = false,
}) => {
  if (isLoading) {
    return (
      <Card
        data-testid="operator-performance-skeleton"
        sx={{
          borderRadius: 1.5,
          border: "1px solid",
          borderColor: "divider",
          bgcolor: "background.paper",
          p: 2.5,
          boxShadow: "none",
        }}
      >
        <Skeleton variant="text" width={240} height={28} sx={{ mb: 2 }} />
        <Skeleton variant="rectangular" height={160} sx={{ borderRadius: 1 }} />
      </Card>
    );
  }

  const isEmpty = !operators || operators.length === 0;

  return (
    <Card
      data-testid="operator-performance-card"
      sx={{
        borderRadius: 1.5,
        border: "1px solid",
        borderColor: "divider",
        bgcolor: "background.paper",
        boxShadow: "none",
        overflow: "hidden",
      }}
    >
      <Box sx={{ p: 2.5, pb: 1.5 }}>
        <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              Продуктивность сотрудников
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Индивидуальные показатели скорости ответа, удовлетворенности и соблюдения регламента
            </Typography>
          </div>
          <Typography variant="caption" sx={{ fontWeight: 600, color: "text.secondary" }}>
            Всего сотрудников: {operators.length}
          </Typography>
        </Stack>
      </Box>

      {isEmpty ? (
        <Box
          data-testid="operator-performance-empty"
          sx={{
            py: 6,
            textAlign: "center",
            borderTop: "1px solid",
            borderColor: "divider",
          }}
        >
          <Typography variant="body2" color="text.secondary">
            Нет данных о сотрудниках за выбранный период
          </Typography>
        </Box>
      ) : (
        <TableContainer sx={{ borderTop: "1px solid", borderColor: "divider" }}>
          <Table size="medium" data-testid="operator-performance-table">
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
                  align="center"
                  sx={{ fontWeight: 600, color: "text.secondary", fontSize: "0.8rem", width: 140 }}
                >
                  Закрыто тикетов
                </TableCell>
                <TableCell
                  align="center"
                  sx={{ fontWeight: 600, color: "text.secondary", fontSize: "0.8rem", width: 160 }}
                >
                  Средний FRT
                </TableCell>
                <TableCell
                  align="center"
                  sx={{ fontWeight: 600, color: "text.secondary", fontSize: "0.8rem", width: 150 }}
                >
                  Средний CSAT
                </TableCell>
                <TableCell
                  align="center"
                  sx={{ fontWeight: 600, color: "text.secondary", fontSize: "0.8rem", width: 160 }}
                >
                  Соблюдение SLA
                </TableCell>
                <TableCell
                  align="right"
                  sx={{ fontWeight: 600, color: "text.secondary", fontSize: "0.8rem", width: 150 }}
                >
                  Действия
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {operators.map((op) => {
                const initials = op.fullName
                  ? op.fullName
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()
                  : op.login.slice(0, 2).toUpperCase();

                const isL2 = op.role === "operator_l2";
                const compliance = op.slaCompliancePercentage;
                let slaBadgeColor: "success" | "warning" | "error" = "success";
                if (compliance !== null && compliance !== undefined) {
                  if (compliance < 85) slaBadgeColor = "error";
                  else if (compliance < 95) slaBadgeColor = "warning";
                }

                return (
                  <TableRow
                    key={op.operatorId}
                    hover
                    data-testid={`operator-row-${op.operatorId}`}
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
                            width: 32,
                            height: 32,
                            fontSize: "0.75rem",
                            fontWeight: 600,
                            bgcolor: isL2 ? "secondary.main" : "primary.main",
                            color: isL2 ? "secondary.contrastText" : "primary.contrastText",
                          }}
                        >
                          {initials}
                        </Avatar>
                        <Box sx={{ minWidth: 0 }}>
                          <Stack direction="row" spacing={0.75} sx={{ alignItems: "center" }}>
                            <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
                              {op.fullName}
                            </Typography>
                            <Chip
                              label={isL2 ? "L2" : "L1"}
                              size="small"
                              color={isL2 ? "secondary" : "default"}
                              variant="outlined"
                              sx={{ height: 18, fontSize: "0.6875rem", fontWeight: 700 }}
                            />
                          </Stack>
                          <Typography variant="caption" color="text.secondary" noWrap>
                            @{op.login}
                          </Typography>
                        </Box>
                      </Stack>
                    </TableCell>

                    {/* Закрыто тикетов */}
                    <TableCell align="center">
                      <Typography
                        variant="body2"
                        sx={{ fontWeight: 600, fontVariantNumeric: "tabular-nums" }}
                      >
                        {op.closedTicketsCount}
                      </Typography>
                    </TableCell>

                    {/* Средний FRT */}
                    <TableCell align="center">
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: 500,
                          fontVariantNumeric: "tabular-nums",
                          color: op.avgFrtSeconds ? "text.primary" : "text.secondary",
                          fontStyle: op.avgFrtSeconds ? "normal" : "italic",
                        }}
                      >
                        {formatDurationSeconds(op.avgFrtSeconds)}
                      </Typography>
                    </TableCell>

                    {/* Средний CSAT */}
                    <TableCell align="center">
                      {op.avgCsat !== null && op.avgCsat !== undefined ? (
                        <Stack
                          direction="row"
                          spacing={0.5}
                          sx={{ alignItems: "center", justifyContent: "center" }}
                        >
                          <Box sx={{ color: "#D97706", display: "flex", alignItems: "center" }}>
                            <M3Icon name="star" size={16} />
                          </Box>
                          <Typography
                            variant="body2"
                            sx={{ fontWeight: 600, fontVariantNumeric: "tabular-nums" }}
                          >
                            {formatCSAT(op.avgCsat)}
                          </Typography>
                        </Stack>
                      ) : (
                        <Typography variant="caption" color="text.secondary" sx={{ fontStyle: "italic" }}>
                          Нет данных
                        </Typography>
                      )}
                    </TableCell>

                    {/* Соблюдение SLA */}
                    <TableCell align="center">
                      {compliance !== null && compliance !== undefined ? (
                        <Chip
                          label={formatPercentage(compliance)}
                          size="small"
                          color={slaBadgeColor}
                          variant="filled"
                          sx={{
                            height: 22,
                            fontSize: "0.75rem",
                            fontWeight: 600,
                            fontVariantNumeric: "tabular-nums",
                          }}
                        />
                      ) : (
                        <Typography variant="caption" color="text.secondary" sx={{ fontStyle: "italic" }}>
                          Нет данных
                        </Typography>
                      )}
                    </TableCell>

                    {/* Действие: Аудит тикетов */}
                    <TableCell align="right">
                      <M3Button
                        variant="outlined"
                        size="small"
                        component={Link}
                        to={`/tickets/archive?operatorId=${op.operatorId}&operatorName=${encodeURIComponent(op.fullName)}`}
                        startIcon={<M3Icon name="visibility" size={15} />}
                        data-testid={`audit-operator-${op.operatorId}`}
                        sx={{ fontSize: "0.775rem", py: 0.25, px: 1 }}
                      >
                        Аудит тикетов
                      </M3Button>
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
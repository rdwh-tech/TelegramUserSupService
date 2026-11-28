// app/components/analytics/AnalyticsKPIGrid.tsx
import React from "react";
import { Box, Card, Stack, Typography, Skeleton } from "@mui/material";
import { M3Icon } from "~/components/ui/M3Icon";
import type { AnalyticsSummary } from "~/types/analytics";
import { formatDurationSeconds, formatPercentage, formatCSAT } from "./utils";

interface AnalyticsKPIGridProps {
  summary?: AnalyticsSummary | null;
  isLoading?: boolean;
}

interface KPICardConfig {
  id: string;
  title: string;
  value: string;
  isNoData: boolean;
  subtext?: string;
  icon: string;
  color: string;
}

export const AnalyticsKPIGrid: React.FC<AnalyticsKPIGridProps> = ({ summary, isLoading = false }) => {
  if (isLoading || !summary) {
    return (
      <Box
        data-testid="kpi-grid-skeleton"
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", md: "repeat(3, 1fr)" },
          gap: 2,
          mb: 3,
        }}
      >
        {Array.from({ length: 6 }).map((_, index) => (
          <Card
            key={index}
            sx={{
              p: 2.5,
              borderRadius: 1.5,
              border: "1px solid",
              borderColor: "divider",
              bgcolor: "background.paper",
            }}
          >
            <Stack direction="row" sx={{ justifyContent: "space-between", mb: 2 }}>
              <Skeleton variant="text" width="60%" height={24} />
              <Skeleton variant="circular" width={32} height={32} />
            </Stack>
            <Skeleton variant="text" width="40%" height={42} sx={{ mb: 1 }} />
            <Skeleton variant="text" width="50%" height={18} />
          </Card>
        ))}
      </Box>
    );
  }

  const hasFrt = summary.avgFrtSeconds !== null && summary.avgFrtSeconds !== undefined;
  const hasTtr = summary.avgTtrSeconds !== null && summary.avgTtrSeconds !== undefined;
  const hasCompliance =
    summary.slaCompliancePercentage !== null && summary.slaCompliancePercentage !== undefined;
  const hasCsat = summary.avgCsatRating !== null && summary.avgCsatRating !== undefined;

  const kpis: KPICardConfig[] = [
    {
      id: "active-tickets",
      title: "Активные тикеты",
      value: summary.activeTicketsCount.toString(),
      isNoData: false,
      subtext: "В очереди и работе прямо сейчас",
      icon: "chat",
      color: "#0077D6",
    },
    {
      id: "closed-tickets",
      title: "Закрыто тикетов",
      value: summary.closedTicketsCount.toString(),
      isNoData: false,
      subtext: "Успешно решено за период",
      icon: "task_alt",
      color: "#16694E",
    },
    {
      id: "avg-frt",
      title: "Среднее время 1-го ответа",
      value: hasFrt ? formatDurationSeconds(summary.avgFrtSeconds) : "Нет данных",
      isNoData: !hasFrt,
      subtext: hasFrt ? "Регламентное время реакции (FRT)" : undefined,
      icon: "timer",
      color: "#3E5F7A",
    },
    {
      id: "avg-ttr",
      title: "Среднее время решения",
      value: hasTtr ? formatDurationSeconds(summary.avgTtrSeconds) : "Нет данных",
      isNoData: !hasTtr,
      subtext: hasTtr ? "Полный цикл обработки (TTR)" : undefined,
      icon: "schedule",
      color: "#764E74",
    },
    {
      id: "sla-compliance",
      title: "Соблюдение SLA",
      value: hasCompliance ? formatPercentage(summary.slaCompliancePercentage) : "Нет данных",
      isNoData: !hasCompliance,
      subtext: hasCompliance
        ? summary.slaBreachesCount > 0
          ? `${summary.slaBreachesCount} нарушений регламента`
          : "Без нарушений регламента"
        : undefined,
      icon: "verified",
      color: (summary.slaCompliancePercentage ?? 100) >= 95 ? "#16694E" : "#BA1A1A",
    },
    {
      id: "avg-csat",
      title: "Средняя оценка CSAT",
      value: hasCsat ? `${formatCSAT(summary.avgCsatRating)} / 5.00` : "Нет данных",
      isNoData: !hasCsat,
      subtext: hasCsat ? "Оценка качества клиентами" : undefined,
      icon: "star",
      color: "#D97706",
    },
  ];

  return (
    <Box
      data-testid="analytics-kpi-grid"
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", md: "repeat(3, 1fr)" },
        gap: 2,
        mb: 3,
      }}
    >
      {kpis.map((kpi) => (
        <Card
          key={kpi.id}
          data-testid={`kpi-card-${kpi.id}`}
          sx={{
            p: 2.25,
            borderRadius: 1.5,
            border: "1px solid",
            borderColor: "divider",
            bgcolor: "background.paper",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            boxShadow: "none",
          }}
        >
          <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "flex-start", mb: 1.5 }}>
            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500, fontSize: "0.85rem" }}>
              {kpi.title}
            </Typography>
            <Box
              sx={{
                width: 32,
                height: 32,
                borderRadius: 1,
                bgcolor: (theme) =>
                  theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.08)" : `${kpi.color}14`,
                color: (theme) => (theme.palette.mode === "dark" ? "text.primary" : kpi.color),
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <M3Icon name={kpi.icon} size={18} />
            </Box>
          </Stack>

          <Box>
            <Typography
              variant="h5"
              data-testid={`kpi-value-${kpi.id}`}
              sx={{
                fontWeight: 600,
                color: kpi.isNoData ? "text.secondary" : "text.primary",
                fontStyle: kpi.isNoData ? "italic" : "normal",
                fontVariantNumeric: "tabular-nums",
                fontSize: kpi.isNoData ? "1.25rem" : "1.65rem",
                mb: 0.5,
                lineHeight: 1.2,
              }}
            >
              {kpi.value}
            </Typography>

            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ fontSize: "0.75rem", display: "block" }}
            >
              {kpi.subtext || "Нет зарегистрированных данных"}
            </Typography>
          </Box>
        </Card>
      ))}
    </Box>
  );
};

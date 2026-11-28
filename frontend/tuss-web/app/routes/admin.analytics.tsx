// app/routes/admin.analytics.tsx
import React, { useState, useMemo } from "react";
import {
  Box,
  Typography,
  Stack,
  Chip,
  Alert,
  IconButton,
  Tooltip,
} from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { RoleGuard } from "~/components/auth/RoleGuard";
import { M3Icon } from "~/components/ui/M3Icon";
import { M3Button } from "~/components/ui/M3Button";
import { analyticsApi } from "~/api/analytics";
import type { AnalyticsFilter } from "~/types/analytics";
import {
  AnalyticsFilterBar,
  AnalyticsKPIGrid,
  TicketVolumeChart,
  CSATHistogram,
  OperatorPerformanceTable,
  type FilterState,
} from "~/components/analytics";

export function meta() {
  return [
    { title: "Аналитическая панель и SLA — TUSS Admin" },
    {
      name: "description",
      content: "Сводные показатели эффективности поддержки, соблюдения SLA и удовлетворенности клиентов",
    },
  ];
}

export default function AdminAnalyticsRoute() {
  const [filters, setFilters] = useState<FilterState>({
    period: "7d",
    operatorId: "all",
  });

  // Преобразование пресетов в ISO диапазоны дат
  const queryFilter = useMemo<Partial<AnalyticsFilter>>(() => {
    const now = new Date();
    const result: Partial<AnalyticsFilter> = {};

    if (filters.operatorId !== "all") {
      result.operatorId = filters.operatorId;
    }

    if (filters.period === "today") {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      result.startDate = start.toISOString();
      result.endDate = now.toISOString();
    } else if (filters.period === "yesterday") {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, -1);
      result.startDate = start.toISOString();
      result.endDate = end.toISOString();
    } else if (filters.period === "7d") {
      const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      result.startDate = start.toISOString();
      result.endDate = now.toISOString();
    } else if (filters.period === "30d") {
      const start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      result.startDate = start.toISOString();
      result.endDate = now.toISOString();
    } else if (filters.period === "custom") {
      if (filters.startDate) result.startDate = new Date(filters.startDate).toISOString();
      if (filters.endDate) result.endDate = new Date(filters.endDate).toISOString();
    }

    return result;
  }, [filters]);

  // Запрос списка операторов
  const {
    data: operators = [],
    isLoading: isLoadingOperators,
  } = useQuery({
    queryKey: ["analytics", "operators"],
    queryFn: () => analyticsApi.getOperatorPerformance(),
  });

  // Запрос ключевых KPI метрик
  const {
    data: summary,
    isLoading: isLoadingSummary,
    isError: isErrorSummary,
    refetch: refetchSummary,
  } = useQuery({
    queryKey: ["analytics", "summary", queryFilter],
    queryFn: () => analyticsApi.getSummary(queryFilter),
  });

  // Запрос динамики объема тикетов
  const {
    data: volume = [],
    isLoading: isLoadingVolume,
    isError: isErrorVolume,
    refetch: refetchVolume,
  } = useQuery({
    queryKey: ["analytics", "volume", queryFilter],
    queryFn: () => analyticsApi.getTicketVolume(queryFilter),
  });

  // Запрос распределения оценок CSAT
  const {
    data: csat = [],
    isLoading: isLoadingCsat,
    isError: isErrorCsat,
    refetch: refetchCsat,
  } = useQuery({
    queryKey: ["analytics", "csat", queryFilter],
    queryFn: () => analyticsApi.getCSATDistribution(queryFilter),
  });

  const isAnyError = isErrorSummary || isErrorVolume || isErrorCsat;
  const isAnyLoading = isLoadingSummary || isLoadingVolume || isLoadingCsat;

  const handleRefreshAll = () => {
    refetchSummary();
    refetchVolume();
    refetchCsat();
  };

  // Фильтрация отображаемых операторов при выборе конкретного сотрудника
  const displayedOperators = useMemo(() => {
    if (filters.operatorId === "all") return operators;
    if (filters.operatorId === "empty") return [];
    return operators.filter((o) => o.operatorId === filters.operatorId);
  }, [operators, filters.operatorId]);

  return (
    <RoleGuard allowedRoles={["admin"]}>
      <Box sx={{ maxWidth: 1200, mx: "auto", pb: 5 }}>
        {/* Заголовок страницы */}
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={2}
          sx={{
            justifyContent: "space-between",
            alignItems: { xs: "flex-start", sm: "center" },
            mb: 3,
          }}
        >
          <div>
            <Typography variant="h5" sx={{ fontWeight: 700, letterSpacing: "-0.01em" }}>
              Аналитическая панель и SLA
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Сводные показатели операционной эффективности поддержки, соблюдения регламентов и оценок клиентов
            </Typography>
          </div>

          <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
            <Tooltip title="Обновить аналитические данные">
              <IconButton
                onClick={handleRefreshAll}
                disabled={isAnyLoading}
                size="small"
                data-testid="refresh-analytics-btn"
                sx={{
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: 1,
                  p: 0.75,
                }}
              >
                <M3Icon name="refresh" size={18} />
              </IconButton>
            </Tooltip>
            <Chip
              label="Панель администратора"
              color="secondary"
              variant="outlined"
              size="small"
              sx={{ fontWeight: 600, fontSize: "0.75rem" }}
            />
          </Stack>
        </Stack>

        {/* Ошибка загрузки данных с возможностью повтора */}
        {isAnyError && (
          <Alert
            severity="error"
            data-testid="analytics-error-banner"
            action={
              <M3Button color="inherit" size="small" onClick={handleRefreshAll}>
                Повторить
              </M3Button>
            }
            sx={{ mb: 3, borderRadius: 1.5 }}
          >
            Не удалось загрузить часть аналитических данных. Проверьте соединение с сервером.
          </Alert>
        )}

        {/* Панель фильтрации по периодам и операторам (TUSS-FE-19) */}
        <AnalyticsFilterBar
          filters={filters}
          onChange={setFilters}
          operators={operators}
          isLoading={isAnyLoading}
        />

        {/* Сетка из 6 ключевых KPI-виджетов (TUSS-FE-20) */}
        <AnalyticsKPIGrid summary={summary} isLoading={isLoadingSummary} />

        {/* Графики динамики тикетов и гистограмма оценок CSAT (TUSS-FE-21) */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", lg: "1.3fr 1fr" },
            gap: 2.5,
            mb: 3,
          }}
        >
          <Box sx={{ minHeight: 320 }}>
            <TicketVolumeChart data={volume} isLoading={isLoadingVolume} />
          </Box>
          <Box sx={{ minHeight: 320 }}>
            <CSATHistogram data={csat} isLoading={isLoadingCsat} />
          </Box>
        </Box>

        {/* Таблица продуктивности операторов и режим аудита (TUSS-FE-22) */}
        <OperatorPerformanceTable
          operators={displayedOperators}
          isLoading={isLoadingOperators}
        />
      </Box>
    </RoleGuard>
  );
}
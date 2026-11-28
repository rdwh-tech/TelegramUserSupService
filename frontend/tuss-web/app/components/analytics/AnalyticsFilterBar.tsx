// app/components/analytics/AnalyticsFilterBar.tsx
import React from "react";
import {
  Box,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Typography,
} from "@mui/material";
import { M3Icon } from "~/components/ui/M3Icon";
import type { OperatorPerformanceItem } from "~/types/analytics";

export type PeriodPreset = "today" | "yesterday" | "7d" | "30d" | "custom";

export interface FilterState {
  period: PeriodPreset;
  startDate?: string;
  endDate?: string;
  operatorId: string; // "all" or specific ID
}

interface AnalyticsFilterBarProps {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
  operators: OperatorPerformanceItem[];
  isLoading?: boolean;
}

export const AnalyticsFilterBar: React.FC<AnalyticsFilterBarProps> = ({
  filters,
  onChange,
  operators,
  isLoading = false,
}) => {
  const handlePeriodChange = (_: React.MouseEvent<HTMLElement>, newPeriod: PeriodPreset | null) => {
    if (!newPeriod) return;
    onChange({
      ...filters,
      period: newPeriod,
    });
  };

  const handleOperatorChange = (event: any) => {
    onChange({
      ...filters,
      operatorId: event.target.value as string,
    });
  };

  return (
    <Box
      data-testid="analytics-filter-bar"
      sx={{
        p: 2,
        borderRadius: 1.5,
        border: "1px solid",
        borderColor: "divider",
        bgcolor: "background.paper",
        mb: 3,
      }}
    >
      <Stack
        direction={{ xs: "column", lg: "row" }}
        spacing={2}
        sx={{
          justifyContent: "space-between",
          alignItems: { xs: "stretch", lg: "center" },
        }}
      >
        {/* Пресеты периодов */}
        <Box sx={{ minWidth: 0 }}>
          <Typography
            variant="caption"
            sx={{ fontWeight: 600, color: "text.secondary", display: "block", mb: 0.75 }}
          >
            Временной диапазон
          </Typography>
          <ToggleButtonGroup
            value={filters.period}
            exclusive
            onChange={handlePeriodChange}
            size="small"
            sx={{
              flexWrap: "wrap",
              "& .MuiToggleButton-root": {
                borderRadius: 1,
                px: 1.5,
                py: 0.5,
                fontSize: "0.825rem",
                fontWeight: 500,
                border: "1px solid",
                borderColor: "divider",
                "&.Mui-selected": {
                  bgcolor: (theme) =>
                    theme.palette.mode === "dark"
                      ? "rgba(255, 255, 255, 0.1)"
                      : "rgba(0, 90, 193, 0.08)",
                  color: "primary.main",
                  fontWeight: 600,
                },
              },
            }}
          >
            <ToggleButton value="today" data-testid="filter-period-today">
              Сегодня
            </ToggleButton>
            <ToggleButton value="yesterday" data-testid="filter-period-yesterday">
              Вчера
            </ToggleButton>
            <ToggleButton value="7d" data-testid="filter-period-7d">
              7 дней
            </ToggleButton>
            <ToggleButton value="30d" data-testid="filter-period-30d">
              30 дней
            </ToggleButton>
            <ToggleButton value="custom" data-testid="filter-period-custom">
              <Stack direction="row" spacing={0.5} sx={{ alignItems: "center" }}>
                <M3Icon name="date_range" size={16} />
                <span>Период</span>
              </Stack>
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>

        {/* Выбор дат при кастомном периоде и селектор оператора */}
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1.5}
          sx={{ alignItems: { xs: "stretch", sm: "flex-end" } }}
        >
          {filters.period === "custom" && (
            <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
              <TextField
                type="date"
                size="small"
                label="С"
                value={filters.startDate || ""}
                onChange={(e) => onChange({ ...filters, startDate: e.target.value })}
                slotProps={{
                  inputLabel: { shrink: true },
                  htmlInput: { "data-testid": "filter-start-date" },
                }}
                sx={{ width: 145 }}
              />
              <TextField
                type="date"
                size="small"
                label="По"
                value={filters.endDate || ""}
                onChange={(e) => onChange({ ...filters, endDate: e.target.value })}
                slotProps={{
                  inputLabel: { shrink: true },
                  htmlInput: { "data-testid": "filter-end-date" },
                }}
                sx={{ width: 145 }}
              />
            </Stack>
          )}

          {/* Селектор оператора */}
          <FormControl size="small" sx={{ minWidth: 220 }}>
            <InputLabel id="operator-select-label" sx={{ fontSize: "0.85rem" }}>
              Сотрудник
            </InputLabel>
            <Select
              labelId="operator-select-label"
              id="operator-select"
              value={filters.operatorId}
              label="Сотрудник"
              onChange={handleOperatorChange}
              data-testid="filter-operator-select"
              sx={{ borderRadius: 1 }}
            >
              <MenuItem value="all" data-testid="operator-option-all">
                <em>Все сотрудники</em>
              </MenuItem>
              {operators.map((op) => (
                <MenuItem
                  key={op.operatorId}
                  value={op.operatorId}
                  data-testid={`operator-option-${op.operatorId}`}
                >
                  <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                    <span>{op.fullName}</span>
                    <Typography variant="caption" color="text.secondary">
                      ({op.role === "operator_l2" ? "L2" : "L1"})
                    </Typography>
                  </Stack>
                </MenuItem>
              ))}
              <MenuItem value="empty" data-testid="operator-option-empty">
                <em>Тест пустого периода (нет данных)</em>
              </MenuItem>
            </Select>
          </FormControl>
        </Stack>
      </Stack>
    </Box>
  );
};

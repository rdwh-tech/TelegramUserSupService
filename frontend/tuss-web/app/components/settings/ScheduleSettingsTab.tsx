// app/components/settings/ScheduleSettingsTab.tsx
import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Stack,
  Card,
  Switch,
  TextField,
  Alert,
  Skeleton,
} from "@mui/material";
import { useQuery, useMutation } from "@tanstack/react-query";
import { companyApi } from "~/api/company";
import { M3Button } from "~/components/ui/M3Button";
import { M3Icon } from "~/components/ui/M3Icon";
import type { DaySchedule, DayOfWeek } from "~/types/schedule";

interface ScheduleSettingsTabProps {
  onSuccessToast: (msg: string) => void;
}

const DAY_NAMES: Record<DayOfWeek, string> = {
  1: "Понедельник",
  2: "Вторник",
  3: "Среда",
  4: "Четверг",
  5: "Пятница",
  6: "Суббота",
  7: "Воскресенье",
};

export const ScheduleSettingsTab: React.FC<ScheduleSettingsTabProps> = ({ onSuccessToast }) => {
  const [scheduleState, setScheduleState] = useState<DaySchedule[]>([]);
  const [validationError, setValidationError] = useState<string | null>(null);

  const {
    data: schedule = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["company", "schedule"],
    queryFn: () => companyApi.getSchedule(),
  });

  useEffect(() => {
    if (schedule && schedule.length > 0) {
      // Клонируем расписание в локальный стейт
      const sorted = [...schedule].sort((a, b) => a.dayOfWeek - b.dayOfWeek);
      setScheduleState(sorted);
    }
  }, [schedule]);

  const updateMutation = useMutation({
    mutationFn: (updatedSchedule: DaySchedule[]) => companyApi.updateSchedule(updatedSchedule),
    onSuccess: () => {
      setValidationError(null);
      refetch();
      onSuccessToast("Рабочее расписание успешно сохранено");
    },
    onError: (err: any) => {
      setValidationError(err?.response?.data?.message || "Не удалось сохранить расписание");
    },
  });

  const handleToggleDay = (dayOfWeek: DayOfWeek, checked: boolean) => {
    setScheduleState((prev) =>
      prev.map((day) =>
        day.dayOfWeek === dayOfWeek
          ? {
              ...day,
              isWorkingDay: checked,
              startTime: checked ? day.startTime || "09:00" : null,
              endTime: checked ? day.endTime || "18:00" : null,
            }
          : day
      )
    );
    if (validationError) setValidationError(null);
  };

  const handleTimeChange = (
    dayOfWeek: DayOfWeek,
    field: "startTime" | "endTime",
    value: string
  ) => {
    setScheduleState((prev) =>
      prev.map((day) =>
        day.dayOfWeek === dayOfWeek
          ? {
              ...day,
              [field]: value,
            }
          : day
      )
    );
    if (validationError) setValidationError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Валидация: для всех рабочих дней время окончания должно быть позже времени начала
    for (const day of scheduleState) {
      if (day.isWorkingDay) {
        if (!day.startTime || !day.endTime) {
          setValidationError(
            `Укажите время начала и окончания для дня: ${DAY_NAMES[day.dayOfWeek]}`
          );
          return;
        }

        if (day.endTime <= day.startTime) {
          setValidationError(
            `Время окончания должно быть позже времени начала (${DAY_NAMES[day.dayOfWeek]})`
          );
          return;
        }
      }
    }

    setValidationError(null);
    updateMutation.mutate(scheduleState);
  };

  if (isLoading) {
    return (
      <Box sx={{ maxWidth: 700, py: 2 }}>
        <Skeleton variant="text" width={220} height={32} sx={{ mb: 2 }} />
        <Skeleton variant="rectangular" height={80} sx={{ borderRadius: 1.5, mb: 2 }} />
        <Skeleton variant="rectangular" height={300} sx={{ borderRadius: 1.5 }} />
      </Box>
    );
  }

  if (isError) {
    return (
      <Alert
        severity="error"
        action={
          <M3Button color="inherit" size="small" onClick={() => refetch()}>
            Повторить
          </M3Button>
        }
        sx={{ borderRadius: 1.5, my: 2 }}
      >
        Не удалось загрузить расписание компании
      </Alert>
    );
  }

  return (
    <Box sx={{ maxWidth: 740, py: 1 }} data-testid="schedule-settings-tab">
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5 }}>
          Рабочее расписание компании (UTC+3 / МСК)
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Дни недели и часы смен для расчета регламентов SLA. Во внерабочее время таймеры ответа «замораживаются»
        </Typography>
      </Box>

      {/* Обязательный информационный баннер (TUSS-FE-28) */}
      <Alert
        severity="info"
        icon={<M3Icon name="schedule" size={20} />}
        data-testid="schedule-info-banner"
        sx={{ mb: 3, borderRadius: 1.5 }}
      >
        Изменения расписания применяются только к тикетам, созданным после сохранения.
      </Alert>

      {validationError && (
        <Alert
          severity="error"
          data-testid="schedule-error-alert"
          sx={{ mb: 3, borderRadius: 1.5 }}
        >
          {validationError}
        </Alert>
      )}

      <form onSubmit={handleSubmit}>
        <Card
          sx={{
            p: 2.5,
            mb: 3,
            borderRadius: 2,
            border: "1px solid",
            borderColor: "divider",
            bgcolor: "background.paper",
            boxShadow: "none",
          }}
        >
          <Stack spacing={2}>
            {scheduleState.map((day) => {
              const isWorking = day.isWorkingDay;

              return (
                <Box
                  key={day.dayOfWeek}
                  data-testid={`schedule-day-row-${day.dayOfWeek}`}
                  sx={{
                    p: 1.5,
                    borderRadius: 1.5,
                    border: "1px solid",
                    borderColor: isWorking ? "divider" : "transparent",
                    bgcolor: isWorking
                      ? "transparent"
                      : (theme) =>
                          theme.palette.mode === "dark"
                            ? "rgba(255, 255, 255, 0.02)"
                            : "rgba(0, 0, 0, 0.02)",
                    display: "flex",
                    flexDirection: { xs: "column", sm: "row" },
                    alignItems: { xs: "flex-start", sm: "center" },
                    justifyContent: "space-between",
                    gap: 2,
                  }}
                >
                  {/* Переключатель дня */}
                  <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", minWidth: 160 }}>
                    <Switch
                      checked={isWorking}
                      onChange={(e) => handleToggleDay(day.dayOfWeek, e.target.checked)}
                      data-testid={`schedule-switch-${day.dayOfWeek}`}
                      size="small"
                    />
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: isWorking ? 600 : 400,
                        color: isWorking ? "text.primary" : "text.secondary",
                      }}
                    >
                      {DAY_NAMES[day.dayOfWeek]}
                    </Typography>
                  </Stack>

                  {/* Интервал времени */}
                  {isWorking ? (
                    <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
                      <TextField
                        type="time"
                        size="small"
                        label="С (МСК)"
                        value={day.startTime || "09:00"}
                        onChange={(e) => handleTimeChange(day.dayOfWeek, "startTime", e.target.value)}
                        slotProps={{
                          inputLabel: { shrink: true },
                          htmlInput: {
                            "data-testid": `schedule-start-${day.dayOfWeek}`,
                            style: { fontVariantNumeric: "tabular-nums" },
                          },
                        }}
                        sx={{ width: 130 }}
                      />
                      <Typography variant="body2" color="text.secondary">
                        —
                      </Typography>
                      <TextField
                        type="time"
                        size="small"
                        label="По (МСК)"
                        value={day.endTime || "18:00"}
                        onChange={(e) => handleTimeChange(day.dayOfWeek, "endTime", e.target.value)}
                        slotProps={{
                          inputLabel: { shrink: true },
                          htmlInput: {
                            "data-testid": `schedule-end-${day.dayOfWeek}`,
                            style: { fontVariantNumeric: "tabular-nums" },
                          },
                        }}
                        sx={{ width: 130 }}
                      />
                    </Stack>
                  ) : (
                    <Typography variant="caption" color="text.secondary" sx={{ fontStyle: "italic", pr: 2 }}>
                      Выходной день
                    </Typography>
                  )}
                </Box>
              );
            })}
          </Stack>
        </Card>

        <Box>
          <M3Button
            type="submit"
            variant="contained"
            disabled={updateMutation.isPending}
            data-testid="save-schedule-btn"
          >
            {updateMutation.isPending ? "Сохранение..." : "Сохранить расписание"}
          </M3Button>
        </Box>
      </form>
    </Box>
  );
};
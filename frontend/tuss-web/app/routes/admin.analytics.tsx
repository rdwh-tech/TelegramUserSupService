// app/routes/admin.analytics.tsx
import React from "react";
import { Box, Typography, Card, CardContent, Stack, Chip, Grid } from "@mui/material";
import { RoleGuard } from "~/components/auth/RoleGuard";
import { M3Icon } from "~/components/ui/M3Icon";

export function meta() {
  return [
    { title: "Аналитика и SLA — TUSS Admin" },
    { name: "description", content: "Дашборд аналитики обслуживания клиентов и соблюдения SLA" },
  ];
}

export default function AdminAnalyticsRoute() {
  const kpiData = [
    { title: "Всего тикетов за сегодня", value: "148", change: "+12%", icon: "confirmation_number", color: "#005AC1" },
    { title: "Среднее время 1-го ответа", value: "3.2 мин", change: "-18%", icon: "timer", color: "#2E7D32" },
    { title: "Соблюдение SLA", value: "97.4%", change: "+0.8%", icon: "check_circle", color: "#2E7D32" },
    { title: "Средний CSAT", value: "4.8 / 5.0", change: "+0.2", icon: "star", color: "#ED6C02" },
  ];

  return (
    <RoleGuard allowedRoles={["admin"]}>
      <Box sx={{ maxWidth: 1200, mx: "auto" }}>
        <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", mb: 3 }}>
          <div>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              Аналитика и SLA
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Сводные метрики операционной эффективности службы поддержки и контроль SLA
            </Typography>
          </div>
          <Chip label="Панель администратора" color="secondary" variant="outlined" />
        </Stack>

        {/* Сетка ключевых показателей (KPI Cards) */}
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", md: "repeat(4, 1fr)" }, gap: 2, mb: 4 }}>
          {kpiData.map((kpi) => (
            <Card
              key={kpi.title}
              sx={{
                p: 2.5,
                borderRadius: 2,
                border: "1px solid",
                borderColor: "divider",
                boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
              }}
            >
              <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "flex-start", mb: 1.5 }}>
                <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                  {kpi.title}
                </Typography>
                <Box
                  sx={{
                    width: 36,
                    height: 36,
                    borderRadius: 1.5,
                    backgroundColor: `${kpi.color}14`,
                    color: kpi.color,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <M3Icon name={kpi.icon} size={20} />
                </Box>
              </Stack>
              <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>
                {kpi.value}
              </Typography>
              <Typography variant="caption" sx={{ color: kpi.change.startsWith("+") ? "success.main" : "text.secondary", fontWeight: 600 }}>
                {kpi.change} по сравнению со вчера
              </Typography>
            </Card>
          ))}
        </Box>

        <Card sx={{ p: 4, textAlign: "center", borderRadius: 2, border: "1px solid", borderColor: "divider" }}>
          <CardContent>
            <Box sx={{ color: "primary.main", mb: 1.5 }}>
              <M3Icon name="insights" size={48} />
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
              Детальные графики и отчеты
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 500, mx: "auto" }}>
              Интерактивные диаграммы нагрузки по часам и отчеты по операторам подключаются в спринте С1 (TUSS-FE-19).
            </Typography>
          </CardContent>
        </Card>
      </Box>
    </RoleGuard>
  );
}

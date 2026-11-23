// app/routes/queue.new.tsx
import React from "react";
import { Box, Typography, Card, CardContent, Stack, Chip } from "@mui/material";
import { RoleGuard } from "~/components/auth/RoleGuard";
import { M3Icon } from "~/components/ui/M3Icon";
import { M3Button } from "~/components/ui/M3Button";

export function meta() {
  return [
    { title: "Новые обращения — Очередь L1" },
    { name: "description", content: "Очередь входящих тикетов первой линии поддержки" },
  ];
}

export default function QueueNewRoute() {
  return (
    <RoleGuard allowedRoles={["operator_l1", "admin"]}>
      <Box sx={{ maxWidth: 1000, mx: "auto" }}>
        <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", mb: 3 }}>
          <div>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              Новые обращения
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Общая очередь входящих тикетов клиентов Telegram (L1)
            </Typography>
          </div>
          <Chip label="Очередь L1" color="primary" variant="outlined" />
        </Stack>

        <Card sx={{ p: 4, textAlign: "center", borderRadius: 3, border: "1px solid", borderColor: "divider" }}>
          <CardContent>
            <Box sx={{ color: "primary.main", mb: 1.5 }}>
              <M3Icon name="inbox" size={48} />
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
              Очередь новых тикетов
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 460, mx: "auto", mb: 3 }}>
              Модуль очередей тикетов с таймерами SLA и правилом «в одни руки» подключается в задаче TUSS-FE-06.
            </Typography>
            <M3Button variant="outlined" href="/tickets/active">
              Перейти к активному тикету
            </M3Button>
          </CardContent>
        </Card>
      </Box>
    </RoleGuard>
  );
}

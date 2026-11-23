// app/routes/queue.escalated.tsx
import React from "react";
import { Box, Typography, Card, CardContent, Stack, Chip } from "@mui/material";
import { RoleGuard } from "~/components/auth/RoleGuard";
import { M3Icon } from "~/components/ui/M3Icon";
import { M3Button } from "~/components/ui/M3Button";

export function meta() {
  return [
    { title: "Очередь эскалаций — Очередь L2" },
    { name: "description", content: "Очередь эскалированных тикетов старшей линии поддержки" },
  ];
}

export default function QueueEscalatedRoute() {
  return (
    <RoleGuard allowedRoles={["operator_l2", "admin"]}>
      <Box sx={{ maxWidth: 1000, mx: "auto" }}>
        <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", mb: 3 }}>
          <div>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              Очередь эскалаций (L2)
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Тикеты повышенной сложности, переданные с первой линии или по нарушению SLA
            </Typography>
          </div>
          <Chip label="Очередь L2" color="secondary" variant="outlined" />
        </Stack>

        <Card sx={{ p: 4, textAlign: "center", borderRadius: 3, border: "1px solid", borderColor: "divider" }}>
          <CardContent>
            <Box sx={{ color: "secondary.main", mb: 1.5 }}>
              <M3Icon name="call_made" size={48} />
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
              Эскалированные тикеты
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 480, mx: "auto", mb: 3 }}>
              Модуль эскалаций L2 с отображением причины передачи и комментариев подключается в задаче TUSS-FE-07.
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

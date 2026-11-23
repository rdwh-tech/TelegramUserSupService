// app/routes/tickets.active.tsx
import React from "react";
import { Box, Typography, Card, CardContent, Stack, Chip } from "@mui/material";
import { RoleGuard } from "~/components/auth/RoleGuard";
import { useAuth } from "~/context/AuthContext";
import { M3Icon } from "~/components/ui/M3Icon";
import { M3Button } from "~/components/ui/M3Button";

export function meta() {
  return [
    { title: "Мой активный тикет — TUSS" },
    { name: "description", content: "Рабочее место оператора с текущим активным тикетом" },
  ];
}

export default function TicketsActiveRoute() {
  const { user } = useAuth();
  const queuePath = user?.role === "operator_l2" ? "/queue/escalated" : "/queue/new";

  return (
    <RoleGuard allowedRoles={["operator_l1", "operator_l2", "admin"]}>
      <Box sx={{ maxWidth: 1000, mx: "auto" }}>
        <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", mb: 3 }}>
          <div>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              Мой активный тикет
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Правило «В одни руки»: оператор обрабатывает не более одного тикета единовременно
            </Typography>
          </div>
          <Chip label="В одни руки" color="info" variant="outlined" />
        </Stack>

        <Card sx={{ p: 4, textAlign: "center", borderRadius: 3, border: "1px solid", borderColor: "divider" }}>
          <CardContent>
            <Box sx={{ color: "text.secondary", mb: 1.5 }}>
              <M3Icon name="headset_mic" size={48} />
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
              Нет активного обращения в работе
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 460, mx: "auto", mb: 3 }}>
              Возьмите новый тикет из доступной очереди обращений для начала диалога с клиентом.
            </Typography>
            <M3Button variant="contained" href={queuePath}>
              Перейти к очереди
            </M3Button>
          </CardContent>
        </Card>
      </Box>
    </RoleGuard>
  );
}

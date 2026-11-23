// app/routes/admin.staff.tsx
import React from "react";
import { Box, Typography, Card, CardContent, Stack, Chip, Button } from "@mui/material";
import { RoleGuard } from "~/components/auth/RoleGuard";
import { M3Icon } from "~/components/ui/M3Icon";
import { M3Button } from "~/components/ui/M3Button";

export function meta() {
  return [
    { title: "Сотрудники компании — TUSS Admin" },
    { name: "description", content: "Управление штатом операторов, ролями и доступами" },
  ];
}

export default function AdminStaffRoute() {
  return (
    <RoleGuard allowedRoles={["admin"]}>
      <Box sx={{ maxWidth: 1100, mx: "auto" }}>
        <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", mb: 3 }}>
          <div>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              Сотрудники
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Управление операторами первой и второй линий, распределение ролей и блокировка
            </Typography>
          </div>
          <M3Button
            variant="contained"
            startIcon={<M3Icon name="person_add" size={18} />}
          >
            Пригласить оператора
          </M3Button>
        </Stack>

        <Card sx={{ p: 4, textAlign: "center", borderRadius: 3, border: "1px solid", borderColor: "divider" }}>
          <CardContent>
            <Box sx={{ color: "primary.main", mb: 1.5 }}>
              <M3Icon name="group" size={48} />
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
              Реестр сотрудников компании
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 500, mx: "auto" }}>
              Модуль управления персоналом с вводом инвайт-кода и переключением ролей L1/L2 разрабатывается в спринте С2 (TUSS-FE-23).
            </Typography>
          </CardContent>
        </Card>
      </Box>
    </RoleGuard>
  );
}

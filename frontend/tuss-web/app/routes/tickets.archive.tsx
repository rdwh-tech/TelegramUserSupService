// app/routes/tickets.archive.tsx
import React from "react";
import { Box, Typography, Card, CardContent, Stack, Chip, TextField, InputAdornment } from "@mui/material";
import { RoleGuard } from "~/components/auth/RoleGuard";
import { M3Icon } from "~/components/ui/M3Icon";

export function meta() {
  return [
    { title: "Архив тикетов — TUSS" },
    { name: "description", content: "История закрытых обращений и журнал обслуживания" },
  ];
}

export default function TicketsArchiveRoute() {
  return (
    <RoleGuard allowedRoles={["operator_l1", "operator_l2", "admin"]}>
      <Box sx={{ maxWidth: 1000, mx: "auto" }}>
        <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", mb: 3 }}>
          <div>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              Архив тикетов
            </Typography>
            <Typography variant="body2" color="text.secondary">
              История закрытых диалогов с фильтрацией по дате, операторам, статусам и оценкам CSAT
            </Typography>
          </div>
          <Chip label="Архив" variant="outlined" />
        </Stack>

        <Card sx={{ p: 3, mb: 3, borderRadius: 3, border: "1px solid", borderColor: "divider" }}>
          <TextField
            placeholder="Поиск по номеру тикета, логину клиента или тексту сообщения..."
            fullWidth
            size="small"
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <M3Icon name="search" size={20} />
                  </InputAdornment>
                ),
              },
            }}
          />
        </Card>

        <Card sx={{ p: 4, textAlign: "center", borderRadius: 3, border: "1px solid", borderColor: "divider" }}>
          <CardContent>
            <Box sx={{ color: "text.secondary", mb: 1.5 }}>
              <M3Icon name="archive" size={48} />
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
              Архив пуст
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 460, mx: "auto" }}>
              Полнофункциональный архив с пагинацией и экспортом подключается в задаче TUSS-FE-15.
            </Typography>
          </CardContent>
        </Card>
      </Box>
    </RoleGuard>
  );
}

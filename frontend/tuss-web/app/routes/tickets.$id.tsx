// app/routes/tickets.$id.tsx
import React from "react";
import { useParams, Link } from "react-router";
import { Box, Typography, Card, CardContent, Stack, Chip, Button } from "@mui/material";
import { RoleGuard } from "~/components/auth/RoleGuard";
import { M3Icon } from "~/components/ui/M3Icon";

export function meta() {
  return [
    { title: "Просмотр тикета — TUSS" },
    { name: "description", content: "Детали тикета и история сообщений" },
  ];
}

export default function TicketDetailsRoute() {
  const { id } = useParams<{ id: string }>();

  return (
    <RoleGuard allowedRoles={["operator_l1", "operator_l2", "admin"]}>
      <Box sx={{ maxWidth: 1000, mx: "auto" }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 2 }}>
          <Button
            component={Link}
            to="/tickets/archive"
            startIcon={<M3Icon name="arrow_back" size={18} />}
            size="small"
            color="inherit"
          >
            Назад к архиву
          </Button>
        </Stack>

        <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", mb: 3 }}>
          <div>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              Тикет #{id || "0000"}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Детализированный просмотр переписки и журнала событий обращения
            </Typography>
          </div>
          <Chip label="Просмотр" color="default" variant="outlined" />
        </Stack>

        <Card sx={{ p: 4, textAlign: "center", borderRadius: 3, border: "1px solid", borderColor: "divider" }}>
          <CardContent>
            <Box sx={{ color: "primary.main", mb: 1.5 }}>
              <M3Icon name="chat" size={48} />
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
              Диалог тикета #{id}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 460, mx: "auto" }}>
              Полная лента диалога с отправкой сообщений и вложений реализуется в задаче TUSS-FE-10.
            </Typography>
          </CardContent>
        </Card>
      </Box>
    </RoleGuard>
  );
}

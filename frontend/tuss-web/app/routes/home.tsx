// app/routes/home.tsx
import { useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Stack,
  Chip,
} from "@mui/material";
import { M3Button } from "~/components/ui/M3Button";
import { M3Icon } from "~/components/ui/M3Icon";
import type { Route } from "./+types/home";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "TUSS — Панель поддержки" },
    { name: "description", content: "Веб-панель оператора поддержки" },
  ];
}

export default function Home() {
  const [loading, setLoading] = useState(false);

  const handleClick = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 2000); // Симуляция сетевого запроса
  };

  return (
    <Box sx={{ maxWidth: 800, mx: "auto", p: 4 }}>
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 700 }}>
        Telegram User Support Service
      </Typography>

      <Card sx={{ p: 2, mb: 4 }}>
        <CardContent>
          <Stack
            direction="row"
            sx={{ justifyContent: "space-between", alignItems: "center", mb: 2 }}
          >
            <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
              <Typography variant="h6">Тикет #1042</Typography>
              <Chip
                icon={<M3Icon name="schedule" size={18} />}
                label="SLA: 14 мин."
                color="success"
                size="small"
              />
            </Stack>
            <Typography variant="body2" color="text.secondary">
              Клиент: @ivan_dev
            </Typography>
          </Stack>

          <Typography variant="body1" sx={{ mb: 3 }}>
            Здравствуйте! У меня возникла проблема с оплатой подписки через бот...
          </Typography>

          <Stack direction="row" spacing={2}>
            <M3Button
              variant="contained"
              startIcon={<M3Icon name="support_agent" />}
              isLoading={loading}
              onClick={handleClick}
            >
              Взять в работу
            </M3Button>

            <M3Button
              variant="outlined"
              color="error"
              startIcon={<M3Icon name="call_merge" />}
            >
              Эскалировать на L2
            </M3Button>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}

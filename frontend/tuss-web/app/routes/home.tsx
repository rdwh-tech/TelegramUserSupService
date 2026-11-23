// app/routes/home.tsx
import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Stack,
  Chip,
} from "@mui/material";
import { useAuth } from "~/context/AuthContext";
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
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading: isAuthLoading, logout } = useAuth();
  const [loading, setLoading] = useState(false);

  // Редирект на /login для неавторизованных пользователей
  useEffect(() => {
    if (!isAuthLoading && !isAuthenticated) {
      navigate("/login");
    }
  }, [isAuthLoading, isAuthenticated, navigate]);

  const handleClick = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 2000); // Симуляция сетевого запроса
  };

  if (isAuthLoading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh" }}>
        <Typography color="text.secondary">Проверка авторизации...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 880, mx: "auto", p: { xs: 2, sm: 4 } }}>
      {/* Шапка рабочего места */}
      <Stack
        direction="row"
        sx={{
          justifyContent: "space-between",
          alignItems: "center",
          mb: 4,
          pb: 2,
          borderBottom: "1px solid",
          borderColor: "divider",
        }}
      >
        <div>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            Telegram Support Service
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {user?.companyId ? `Компания ID: ${user.companyId}` : "Без привязки к компании"}
          </Typography>
        </div>

        {isAuthenticated && user && (
          <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
            <Chip
              icon={<M3Icon name="account_circle" size={18} />}
              label={`${user.fullName} (${user.role})`}
              color="primary"
              variant="outlined"
            />
            <M3Button
              variant="text"
              color="inherit"
              size="small"
              startIcon={<M3Icon name="logout" size={18} />}
              onClick={() => logout()}
            >
              Выйти
            </M3Button>
          </Stack>
        )}
      </Stack>

      <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
        Рабочее место оператора
      </Typography>

      <Card sx={{ p: 2, mb: 4, borderRadius: 3, border: "1px solid", borderColor: "divider" }}>
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

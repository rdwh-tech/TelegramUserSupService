// app/routes/login.tsx
import React, { useState } from "react";
import { Link, useNavigate } from "react-router";
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  InputAdornment,
  IconButton,
  Alert,
  Stack,
} from "@mui/material";
import { useAuth } from "~/context/AuthContext";
import { M3Button } from "~/components/ui/M3Button";
import { M3Icon } from "~/components/ui/M3Icon";
import { AuthBackground } from "~/components/ui/AuthBackground";
import type { Route } from "./+types/login";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Вход в систему — TUSS" },
    {
      name: "description",
      content: "Авторизация сотрудников в панели поддержки Telegram User Support Service",
    },
  ];
}

export default function LoginRoute() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [form, setForm] = useState({
    login: "",
    password: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{
    login?: string;
    password?: string;
  }>({});

  const validate = () => {
    const errors: { login?: string; password?: string } = {};
    if (!form.login.trim()) {
      errors.login = "Введите логин";
    }
    if (!form.password) {
      errors.password = "Введите пароль";
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!validate()) return;

    setIsLoading(true);
    try {
      const user = await login({
        login: form.login.trim(),
        password: form.password,
      });

      if (user.isBlocked) {
        setErrorMessage("Учетная запись заблокирована");
        return;
      }

      // Ролевая маршрутизация
      if (user.role === "unassigned_operator" || !user.companyId) {
        navigate("/onboarding/invite-code");
      } else if (user.role === "admin") {
        navigate("/admin/analytics");
      } else {
        navigate("/");
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || err.message || "";
      if (
        msg.includes("INVALID_CREDENTIALS") ||
        msg.includes("Неверный логин") ||
        msg.includes("401")
      ) {
        setErrorMessage("Неверный логин или пароль");
      } else if (msg.includes("BLOCKED") || msg.includes("заблокирован")) {
        setErrorMessage("Учетная запись заблокирована");
      } else {
        setErrorMessage(msg || "Не удалось войти в систему. Повторите попытку.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthBackground>
      <Card
        sx={{
          width: "100%",
          maxWidth: 440,
          p: { xs: 2.5, sm: 4 },
          background: "rgba(255, 255, 255, 0.88)",
          backdropFilter: "blur(20px)",
          boxShadow: "0 16px 40px -12px rgba(0, 45, 110, 0.08), 0 2px 6px rgba(0, 0, 0, 0.02)",
          borderRadius: 4,
          border: "1px solid rgba(255, 255, 255, 0.85)",
        }}
      >
        <CardContent sx={{ p: 0 }}>
          {/* Логотип и заголовок */}
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              textAlign: "center",
              mb: 3.5,
            }}
          >
            <Box
              sx={{
                width: 50,
                height: 50,
                borderRadius: "16px",
                background: "linear-gradient(135deg, #005AC1 0%, #1E78E9 100%)",
                color: "#FFFFFF",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                mb: 1.5,
                boxShadow: "0 8px 20px rgba(0, 90, 193, 0.22)",
              }}
            >
              <M3Icon name="headset_mic" size={26} />
            </Box>
            <Typography
              variant="h5"
              sx={{
                fontWeight: 700,
                letterSpacing: "-0.01em",
                color: "text.primary",
              }}
            >
              TUSS Support
            </Typography>
            <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.5 }}>
              Вход в веб-панель службы поддержки
            </Typography>
          </Box>

          {/* Сообщение об ошибке */}
          {errorMessage && (
            <Alert
              severity="error"
              sx={{ mb: 3, borderRadius: 2 }}
              icon={<M3Icon name="error" size={20} />}
            >
              {errorMessage}
            </Alert>
          )}

          {/* Форма авторизации */}
          <Box component="form" onSubmit={handleSubmit} noValidate>
            <Stack spacing={2.5}>
              <TextField
                label="Логин"
                fullWidth
                variant="outlined"
                value={form.login}
                onChange={(e) => {
                  setForm({ ...form, login: e.target.value });
                  if (fieldErrors.login) {
                    setFieldErrors({ ...fieldErrors, login: undefined });
                  }
                }}
                error={!!fieldErrors.login}
                helperText={fieldErrors.login}
                disabled={isLoading}
                autoFocus
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <M3Icon name="person" size={20} className="text-gray-500" />
                      </InputAdornment>
                    ),
                  },
                }}
              />

              <TextField
                label="Пароль"
                type={showPassword ? "text" : "password"}
                fullWidth
                variant="outlined"
                value={form.password}
                onChange={(e) => {
                  setForm({ ...form, password: e.target.value });
                  if (fieldErrors.password) {
                    setFieldErrors({ ...fieldErrors, password: undefined });
                  }
                }}
                error={!!fieldErrors.password}
                helperText={fieldErrors.password}
                disabled={isLoading}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <M3Icon name="lock" size={20} className="text-gray-500" />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          aria-label="переключить видимость пароля"
                          onClick={() => setShowPassword((prev) => !prev)}
                          edge="end"
                          size="small"
                        >
                          <M3Icon
                            name={showPassword ? "visibility_off" : "visibility"}
                            size={20}
                          />
                        </IconButton>
                      </InputAdornment>
                    ),
                  },
                }}
              />

              <M3Button
                type="submit"
                variant="contained"
                size="large"
                fullWidth
                isLoading={isLoading}
                sx={{ mt: 1, py: 1.4 }}
              >
                Войти
              </M3Button>
            </Stack>
          </Box>

          {/* Ссылка на регистрацию */}
          <Stack
            direction="row"
            spacing={0.5}
            sx={{
              justifyContent: "center",
              alignItems: "center",
              mt: 3,
              pt: 1,
            }}
          >
            <Typography variant="body2" color="text.secondary">
              Нет учетной записи?
            </Typography>
            <Link
              to="/register"
              style={{
                color: "#005AC1",
                textDecoration: "none",
                fontWeight: 600,
                fontSize: "0.875rem",
              }}
            >
              Зарегистрироваться
            </Link>
          </Stack>
        </CardContent>
      </Card>
    </AuthBackground>
  );
}

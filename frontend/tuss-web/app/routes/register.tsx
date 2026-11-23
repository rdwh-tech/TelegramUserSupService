// app/routes/register.tsx
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
  RadioGroup,
  FormControlLabel,
  Radio,
  FormLabel,
  FormControl,
} from "@mui/material";
import { useAuth } from "~/context/AuthContext";
import { M3Button } from "~/components/ui/M3Button";
import { M3Icon } from "~/components/ui/M3Icon";
import { AuthBackground } from "~/components/ui/AuthBackground";
import type { Route } from "./+types/register";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Регистрация — TUSS" },
    {
      name: "description",
      content: "Создание учетной записи сотрудника службы поддержки Telegram User Support Service",
    },
  ];
}

export default function RegisterRoute() {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [form, setForm] = useState({
    login: "",
    fullName: "",
    password: "",
    confirmPassword: "",
    role: "operator" as "operator" | "admin",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{
    login?: string;
    fullName?: string;
    password?: string;
    confirmPassword?: string;
  }>({});

  const validate = () => {
    const errors: typeof fieldErrors = {};

    if (!form.login.trim()) {
      errors.login = "Введите логин";
    } else if (form.login.trim().length < 3) {
      errors.login = "Логин должен содержать не менее 3 символов";
    }

    if (!form.fullName.trim()) {
      errors.fullName = "Введите ваше имя и фамилию";
    }

    if (!form.password) {
      errors.password = "Введите пароль";
    } else if (form.password.length < 6) {
      errors.password = "Пароль должен содержать не менее 6 символов";
    }

    if (!form.confirmPassword) {
      errors.confirmPassword = "Подтвердите пароль";
    } else if (form.password !== form.confirmPassword) {
      errors.confirmPassword = "Пароли не совпадают";
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
      const user = await register({
        login: form.login.trim(),
        fullName: form.fullName.trim(),
        password: form.password,
        role: form.role,
      });

      // Переход на онбординг согласно выбранной роли
      if (user.role === "admin") {
        navigate("/onboarding/create-company");
      } else {
        navigate("/onboarding/invite-code");
      }
    } catch (err: any) {
      const serverCode = err?.response?.data?.code || "";
      const msg = err?.response?.data?.message || err.message || "";
      if (
        serverCode === "LOGIN_ALREADY_EXISTS" ||
        msg.includes("LOGIN_ALREADY_EXISTS") ||
        msg.includes("уже используется") ||
        msg.includes("занят")
      ) {
        setFieldErrors((prev) => ({
          ...prev,
          login: "Этот логин уже используется",
        }));
      } else {
        setErrorMessage(msg || "Не удалось зарегистрироваться. Повторите попытку.");
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
          maxWidth: 480,
          p: { xs: 2.5, sm: 4 },
          background: "rgba(255, 255, 255, 0.88)",
          backdropFilter: "blur(20px)",
          boxShadow: "0 16px 40px -12px rgba(0, 45, 110, 0.08), 0 2px 6px rgba(0, 0, 0, 0.02)",
          borderRadius: 4,
          border: "1px solid rgba(255, 255, 255, 0.85)",
        }}
      >
        <CardContent sx={{ p: 0 }}>
          {/* Заголовок */}
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              textAlign: "center",
              mb: 3,
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
              <M3Icon name="person_add" size={26} />
            </Box>
            <Typography
              variant="h5"
              sx={{
                fontWeight: 700,
                letterSpacing: "-0.01em",
                color: "text.primary",
              }}
            >
              Регистрация в TUSS
            </Typography>
            <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.5 }}>
              Создание учетной записи сотрудника поддержки
            </Typography>
          </Box>

          {/* Общая ошибка */}
          {errorMessage && (
            <Alert
              severity="error"
              sx={{ mb: 3, borderRadius: 2 }}
              icon={<M3Icon name="error" size={20} />}
            >
              {errorMessage}
            </Alert>
          )}

          {/* Форма */}
          <Box component="form" onSubmit={handleSubmit} noValidate>
            <Stack spacing={2}>
              <TextField
                label="Логин"
                fullWidth
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
                        <M3Icon name="badge" size={20} className="text-gray-500" />
                      </InputAdornment>
                    ),
                  },
                }}
              />

              <TextField
                label="Имя и фамилия"
                fullWidth
                value={form.fullName}
                onChange={(e) => {
                  setForm({ ...form, fullName: e.target.value });
                  if (fieldErrors.fullName) {
                    setFieldErrors({ ...fieldErrors, fullName: undefined });
                  }
                }}
                error={!!fieldErrors.fullName}
                helperText={fieldErrors.fullName}
                disabled={isLoading}
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

              <TextField
                label="Подтверждение пароля"
                type={showConfirmPassword ? "text" : "password"}
                fullWidth
                value={form.confirmPassword}
                onChange={(e) => {
                  setForm({ ...form, confirmPassword: e.target.value });
                  if (fieldErrors.confirmPassword) {
                    setFieldErrors({ ...fieldErrors, confirmPassword: undefined });
                  }
                }}
                error={!!fieldErrors.confirmPassword}
                helperText={fieldErrors.confirmPassword}
                disabled={isLoading}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <M3Icon name="lock_reset" size={20} className="text-gray-500" />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          aria-label="переключить видимость подтверждения пароля"
                          onClick={() => setShowConfirmPassword((prev) => !prev)}
                          edge="end"
                          size="small"
                        >
                          <M3Icon
                            name={showConfirmPassword ? "visibility_off" : "visibility"}
                            size={20}
                          />
                        </IconButton>
                      </InputAdornment>
                    ),
                  },
                }}
              />

              {/* Выбор роли */}
              <FormControl component="fieldset" sx={{ pt: 1 }}>
                <FormLabel
                  component="legend"
                  sx={{ fontSize: "0.875rem", fontWeight: 600, color: "text.primary", mb: 0.5 }}
                >
                  Роль в системе
                </FormLabel>
                <RadioGroup
                  row
                  value={form.role}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      role: e.target.value as "operator" | "admin",
                    })
                  }
                >
                  <FormControlLabel
                    value="operator"
                    control={<Radio size="small" />}
                    label={
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          Оператор
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Обработка обращений
                        </Typography>
                      </Box>
                    }
                    sx={{ mr: 3 }}
                  />
                  <FormControlLabel
                    value="admin"
                    control={<Radio size="small" />}
                    label={
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          Администратор
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Управление компанией
                        </Typography>
                      </Box>
                    }
                  />
                </RadioGroup>
              </FormControl>

              <M3Button
                type="submit"
                variant="contained"
                size="large"
                fullWidth
                isLoading={isLoading}
                sx={{ mt: 2, py: 1.4 }}
              >
                Зарегистрироваться
              </M3Button>
            </Stack>
          </Box>

          {/* Ссылка на вход */}
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
              Уже есть аккаунт?
            </Typography>
            <Link
              to="/login"
              style={{
                color: "#005AC1",
                textDecoration: "none",
                fontWeight: 600,
                fontSize: "0.875rem",
              }}
            >
              Войти
            </Link>
          </Stack>
        </CardContent>
      </Card>
    </AuthBackground>
  );
}

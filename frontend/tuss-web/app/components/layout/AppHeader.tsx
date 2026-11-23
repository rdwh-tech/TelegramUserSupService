// app/components/layout/AppHeader.tsx
import React from "react";
import {
  Box,
  Typography,
  IconButton,
  Chip,
  Avatar,
  Stack,
  Tooltip,
} from "@mui/material";
import { useAuth } from "~/context/AuthContext";
import { M3Icon } from "~/components/ui/M3Icon";
import { M3Button } from "~/components/ui/M3Button";
import { ThemeSwitcherMenu } from "~/components/layout/ThemeSwitcherMenu";

interface AppHeaderProps {
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  isConnected?: boolean;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  sidebarOpen,
  onToggleSidebar,
  isConnected = true,
}) => {
  const { user, logout } = useAuth();

  // Локализация роли для бейджа
  const getRoleLabel = (role?: string) => {
    switch (role) {
      case "operator_l1":
        return "Оператор L1";
      case "operator_l2":
        return "Старший L2";
      case "admin":
        return "Администратор";
      case "unassigned_operator":
        return "Без компании";
      default:
        return "Сотрудник";
    }
  };

  const getRoleColor = (
    role?: string
  ): "primary" | "secondary" | "warning" | "default" => {
    switch (role) {
      case "admin":
        return "secondary";
      case "operator_l2":
        return "primary";
      case "operator_l1":
        return "primary";
      case "unassigned_operator":
        return "warning";
      default:
        return "default";
    }
  };

  return (
    <Box
      component="header"
      sx={{
        height: 64,
        position: "sticky",
        top: 0,
        zIndex: (theme) => theme.zIndex.drawer + 1,
        backgroundColor: "background.paper",
        borderBottom: "1px solid",
        borderColor: "divider",
        pl: 0,
        pr: { xs: 2, sm: 3 },
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        backdropFilter: "blur(12px)",
      }}
    >
      {/* Левая часть: кнопка меню (выровнена с 72px/240px сайдбаром), логотип и тег компании */}
      <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
        <Box
          sx={{
            width: sidebarOpen ? 240 : 72,
            transition: "width 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
            display: "flex",
            alignItems: "center",
            justifyContent: sidebarOpen ? "flex-start" : "center",
            px: sidebarOpen ? 2.5 : 0,
            flexShrink: 0,
            gap: 1.5,
          }}
        >
          <IconButton
            onClick={onToggleSidebar}
            aria-label={sidebarOpen ? "свернуть меню" : "развернуть меню"}
            size="medium"
            sx={{ color: "text.primary" }}
          >
            <M3Icon name={sidebarOpen ? "menu_open" : "menu"} size={24} />
          </IconButton>

          {sidebarOpen && (
            <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
              <Box
                sx={{
                  width: 34,
                  height: 34,
                  borderRadius: "10px",
                  background: (theme) =>
                    `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                  color: (theme) => theme.palette.primary.contrastText,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: (theme) => `0 2px 8px ${theme.palette.primary.main}40`,
                }}
              >
                <M3Icon name="support_agent" size={20} />
              </Box>
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 700,
                  letterSpacing: "-0.01em",
                  color: "text.primary",
                  fontSize: { xs: "1.05rem", sm: "1.2rem" },
                }}
              >
                TUSS
              </Typography>
            </Stack>
          )}
        </Box>

        {/* Если меню свернуто — логотип отображается в рабочей области шапки */}
        {!sidebarOpen && (
          <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", pl: 1 }}>
            <Box
              sx={{
                width: 34,
                height: 34,
                borderRadius: "10px",
                background: (theme) =>
                  `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                color: (theme) => theme.palette.primary.contrastText,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: (theme) => `0 2px 8px ${theme.palette.primary.main}40`,
              }}
            >
              <M3Icon name="support_agent" size={20} />
            </Box>
            <Typography
              variant="h6"
              sx={{
                fontWeight: 700,
                letterSpacing: "-0.01em",
                color: "text.primary",
                fontSize: { xs: "1.05rem", sm: "1.2rem" },
              }}
            >
              TUSS
            </Typography>
          </Stack>
        )}

        {/* Текущая компания (SRS 4.1.2) */}
        {user?.companyId ? (
          <Chip
            size="small"
            label={user.companyName || `Компания #${user.companyId}`}
            variant="outlined"
            sx={{
              display: { xs: "none", md: "inline-flex" },
              fontWeight: 500,
              fontSize: "0.75rem",
              borderColor: "divider",
            }}
          />
        ) : (
          <Chip
            size="small"
            label="Ожидание привязки"
            color="warning"
            variant="outlined"
            sx={{
              display: { xs: "none", md: "inline-flex" },
              fontWeight: 500,
              fontSize: "0.75rem",
            }}
          />
        )}
      </Stack>

      {/* Правая часть: переключатель тем M3, статус сети, профиль пользователя и выход */}
      <Stack direction="row" spacing={{ xs: 1, sm: 2 }} sx={{ alignItems: "center" }}>
        {/* Переключатель темы и палитры Material 3 */}
        <ThemeSwitcherMenu />

        {/* Индикатор сетевого соединения / WebSocket (FR-WEB-29, SRS 4.1.2) */}
        <Tooltip title={isConnected ? "WebSocket соединение активно" : "Связь потеряна"}>
          <Stack
            direction="row"
            spacing={0.8}
            sx={{
              alignItems: "center",
              px: 1.5,
              py: 0.5,
              borderRadius: 9999,
              backgroundColor: isConnected ? "rgba(46, 125, 50, 0.08)" : "rgba(211, 47, 47, 0.08)",
            }}
          >
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                backgroundColor: isConnected ? "#2E7D32" : "#D32F2F",
                boxShadow: isConnected ? "0 0 8px rgba(46, 125, 50, 0.6)" : "none",
              }}
            />
            <Typography
              variant="caption"
              sx={{
                fontWeight: 600,
                color: isConnected ? "#2E7D32" : "#D32F2F",
                display: { xs: "none", sm: "inline" },
              }}
            >
              {isConnected ? "В сети" : "Офлайн"}
            </Typography>
          </Stack>
        </Tooltip>

        {/* Профиль сотрудника */}
        {user && (
          <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
            <Avatar
              sx={{
                width: 36,
                height: 36,
                fontSize: "0.9rem",
                fontWeight: 600,
                bgcolor: "primary.main",
                color: "primary.contrastText",
              }}
            >
              {user.fullName ? user.fullName.charAt(0).toUpperCase() : user.login.charAt(0).toUpperCase()}
            </Avatar>

            <Box sx={{ display: { xs: "none", sm: "block" }, textAlign: "left" }}>
              <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.2 }}>
                {user.fullName || user.login}
              </Typography>
              <Chip
                label={getRoleLabel(user.role)}
                size="small"
                color={getRoleColor(user.role)}
                variant="outlined"
                sx={{
                  height: 18,
                  fontSize: "0.65rem",
                  fontWeight: 600,
                  mt: 0.3,
                  "& .MuiChip-label": { px: 0.8 },
                }}
              />
            </Box>
          </Stack>
        )}

        {/* Кнопка выхода */}
        <Tooltip title="Выйти из системы">
          <IconButton
            onClick={() => logout()}
            size="small"
            sx={{ color: "text.secondary", "&:hover": { color: "error.main" } }}
          >
            <M3Icon name="logout" size={20} />
          </IconButton>
        </Tooltip>
      </Stack>
    </Box>
  );
};

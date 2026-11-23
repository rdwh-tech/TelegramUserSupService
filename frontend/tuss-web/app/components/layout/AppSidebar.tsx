// app/components/layout/AppSidebar.tsx
import React from "react";
import { NavLink } from "react-router";
import {
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Tooltip,
  Divider,
  Typography,
} from "@mui/material";
import { useAuth } from "~/context/AuthContext";
import { M3Icon } from "~/components/ui/M3Icon";
import type { UserRole } from "~/types/user";

interface NavItemConfig {
  to: string;
  label: string;
  icon: string;
  badge?: string | number;
}

interface AppSidebarProps {
  isOpen: boolean;
}

export const AppSidebar: React.FC<AppSidebarProps> = ({ isOpen }) => {
  const { user } = useAuth();
  const role: UserRole = user?.role || "unassigned_operator";

  // Формирование пунктов меню строго по SRS Приложение В (Таблица В.1)
  const getNavItems = (): { main: NavItemConfig[]; audit?: NavItemConfig[] } => {
    switch (role) {
      case "operator_l1":
        return {
          main: [
            { to: "/queue/new", label: "Новые обращения", icon: "inbox" },
            { to: "/tickets/active", label: "Мой активный тикет", icon: "headset_mic" },
            { to: "/tickets/archive", label: "Архив тикетов", icon: "archive" },
          ],
        };

      case "operator_l2":
        return {
          main: [
            { to: "/queue/escalated", label: "Очередь эскалаций", icon: "call_made" },
            { to: "/tickets/active", label: "Мой активный тикет", icon: "headset_mic" },
            { to: "/tickets/archive", label: "Архив тикетов", icon: "archive" },
          ],
        };

      case "admin":
        return {
          main: [
            { to: "/admin/analytics", label: "Аналитика и SLA", icon: "analytics" },
            { to: "/admin/staff", label: "Сотрудники", icon: "group" },
            { to: "/admin/settings", label: "Настройки компании", icon: "settings" },
          ],
          audit: [
            { to: "/queue/new", label: "Очередь L1 (Аудит)", icon: "inbox" },
            { to: "/queue/escalated", label: "Очередь L2 (Аудит)", icon: "call_made" },
            { to: "/tickets/archive", label: "Архив всех тикетов", icon: "archive" },
          ],
        };

      case "unassigned_operator":
      default:
        return {
          main: [
            { to: "/onboarding/invite-code", label: "Код подключения", icon: "key" },
          ],
        };
    }
  };

  const navItems = getNavItems();

  const renderNavList = (items: NavItemConfig[]) => (
    <List sx={{ px: isOpen ? 1 : 0, py: 1, display: "flex", flexDirection: "column", gap: 0.5, alignItems: "center", width: "100%" }}>
      {items.map((item) => (
        <ListItem key={item.to} disablePadding sx={{ display: "flex", justifyContent: "center", width: "100%" }}>
          <NavLink
            to={item.to}
            style={{ textDecoration: "none", display: "flex", justifyContent: "center", width: isOpen ? "100%" : "auto", color: "inherit" }}
          >
            {({ isActive }) => {
              const buttonContent = (
                <ListItemButton
                  sx={{
                    minHeight: 44,
                    height: 44,
                    width: isOpen ? "100%" : 44,
                    borderRadius: 3,
                    px: isOpen ? 2 : 0,
                    justifyContent: isOpen ? "initial" : "center",
                    alignItems: "center",
                    backgroundColor: isActive ? "rgba(0, 90, 193, 0.12)" : "transparent",
                    color: isActive ? "primary.main" : "text.secondary",
                    fontWeight: isActive ? 600 : 500,
                    transition: "all 0.15s ease",
                    "&:hover": {
                      backgroundColor: isActive
                        ? "rgba(0, 90, 193, 0.16)"
                        : "rgba(0, 0, 0, 0.04)",
                      color: "primary.main",
                    },
                  }}
                >
                  <ListItemIcon
                    sx={{
                      minWidth: 0,
                      mr: isOpen ? 2 : 0,
                      justifyContent: "center",
                      alignItems: "center",
                      color: isActive ? "primary.main" : "inherit",
                    }}
                  >
                    <M3Icon name={item.icon} size={22} filled={isActive} />
                  </ListItemIcon>

                  {isOpen && (
                    <ListItemText
                      primary={
                        <Typography
                          variant="body2"
                          sx={{
                            fontSize: "0.875rem",
                            fontWeight: isActive ? 600 : 500,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {item.label}
                        </Typography>
                      }
                    />
                  )}
                </ListItemButton>
              );

              return !isOpen ? (
                <Tooltip title={item.label} placement="right" arrow>
                  {buttonContent}
                </Tooltip>
              ) : (
                buttonContent
              );
            }}
          </NavLink>
        </ListItem>
      ))}
    </List>
  );

  return (
    <Box
      component="nav"
      sx={{
        width: isOpen ? 240 : 72,
        flexShrink: 0,
        height: "calc(100vh - 64px)",
        position: "sticky",
        top: 64,
        borderRight: "1px solid",
        borderColor: "divider",
        backgroundColor: "background.paper",
        transition: "width 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
        overflowX: "hidden",
        overflowY: "auto",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
      }}
    >
      <Box>
        {renderNavList(navItems.main)}

        {/* Дополнительный блок аудита для администратора */}
        {navItems.audit && (
          <Box sx={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center" }}>
            <Divider sx={{ my: 1, width: isOpen ? "calc(100% - 32px)" : 44 }} />
            {isOpen && (
              <Typography
                variant="caption"
                sx={{
                  px: 3,
                  py: 0.5,
                  display: "block",
                  color: "text.secondary",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  fontSize: "0.65rem",
                  letterSpacing: "0.05em",
                  width: "100%",
                }}
              >
                Мониторинг
              </Typography>
            )}
            {renderNavList(navItems.audit)}
          </Box>
        )}
      </Box>

      {/* Нижняя информационная плашка */}
      {isOpen && (
        <Box sx={{ p: 2, borderTop: "1px solid", borderColor: "divider" }}>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
            TUSS Web Desk v1.0
          </Typography>
          <Typography variant="caption" sx={{ color: "text.secondary", opacity: 0.7 }}>
            Telegram Support Service
          </Typography>
        </Box>
      )}
    </Box>
  );
};

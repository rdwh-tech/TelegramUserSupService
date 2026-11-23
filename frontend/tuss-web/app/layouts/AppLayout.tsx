// app/layouts/AppLayout.tsx
import React, { useState, useEffect } from "react";
import { Outlet, useLocation, useNavigate } from "react-router";
import { Box, Typography, CircularProgress } from "@mui/material";
import { useAuth } from "~/context/AuthContext";
import { AppHeader } from "~/components/layout/AppHeader";
import { AppSidebar } from "~/components/layout/AppSidebar";

export default function AppLayout() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Состояние свернутости сайдбара
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Редирект неавторизованных пользователей на страницу входа
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate("/login", { state: { from: location }, replace: true });
    }
  }, [isLoading, isAuthenticated, navigate, location]);

  // На экранах онбординга стандартное меню скрывается по SRS 4.1.2
  const isOnboarding = location.pathname.startsWith("/onboarding");

  if (isLoading) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 2,
          backgroundColor: "background.default",
        }}
      >
        <CircularProgress size={36} color="primary" />
        <Typography variant="body2" color="text.secondary">
          Загрузка рабочего пространства...
        </Typography>
      </Box>
    );
  }

  if (!isAuthenticated || !user) {
    return null; // Ждем редиректа в useEffect
  }

  return (
    <Box sx={{ minHeight: "100vh", display: "flex", flexDirection: "column", backgroundColor: "background.default" }}>
      {/* 1. Верхняя панель (Header) */}
      <AppHeader
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
        isConnected={true}
      />

      {/* 2. Рабочее пространство (Sidebar + Main Area) */}
      <Box sx={{ display: "flex", flex: 1, position: "relative" }}>
        {/* Боковое меню (скрыто на онбординге) */}
        {!isOnboarding && <AppSidebar isOpen={sidebarOpen} />}

        {/* 3. Основная контентная область */}
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            p: { xs: 2, sm: 3, md: 4 },
            minHeight: "calc(100vh - 64px)",
            backgroundColor: "background.default",
            overflowX: "hidden",
            overflowY: "auto",
          }}
        >
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}

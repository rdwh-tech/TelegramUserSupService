// app/components/ui/AuthBackground.tsx
import React from "react";
import { Box } from "@mui/material";
import { ThemeSwitcherMenu } from "~/components/layout/ThemeSwitcherMenu";

export const AuthBackground: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  return (
    <Box
      sx={{
        minHeight: "100vh",
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        p: { xs: 2, sm: 3 },
        bgcolor: "background.default",
        overflow: "hidden",
      }}
    >
      {/* Кнопка переключения темы в правом верхнем углу страниц авторизации */}
      <Box sx={{ position: "absolute", top: 16, right: 16, zIndex: 10 }}>
        <ThemeSwitcherMenu />
      </Box>

      {/* Спокойный архитектурный градиент фона */}
      <Box
        sx={{
          position: "absolute",
          inset: 0,
          background: (theme) =>
            theme.palette.mode === "dark"
              ? "radial-gradient(ellipse at 50% 20%, rgba(255, 255, 255, 0.03) 0%, transparent 65%)"
              : "radial-gradient(ellipse at 50% 20%, rgba(0, 0, 0, 0.02) 0%, transparent 65%)",
          pointerEvents: "none",
        }}
      />

      {/* Центральный контент */}
      <Box
        sx={{
          position: "relative",
          zIndex: 1,
          width: "100%",
          display: "flex",
          justifyContent: "center",
        }}
      >
        {children}
      </Box>
    </Box>
  );
};

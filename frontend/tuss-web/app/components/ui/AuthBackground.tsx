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

      {/* Декоративная фоновая точечная сетка */}
      <Box
        sx={{
          position: "absolute",
          inset: 0,
          backgroundImage: (theme) =>
            theme.palette.mode === "dark"
              ? "radial-gradient(rgba(255, 255, 255, 0.08) 1.5px, transparent 1.5px)"
              : `radial-gradient(${theme.palette.primary.main}16 1.5px, transparent 1.5px)`,
          backgroundSize: "28px 28px",
          pointerEvents: "none",
          opacity: (theme) => (theme.palette.mode === "dark" ? 0.6 : 0.85),
        }}
      />

      {/* Плавающая градиентная сфера 1 (акцент сверху-слева) */}
      <Box
        className="animate-blob-1"
        sx={{
          position: "absolute",
          top: "-10%",
          left: "15%",
          width: { xs: 340, sm: 540 },
          height: { xs: 340, sm: 540 },
          borderRadius: "50%",
          background: (theme) =>
            theme.palette.mode === "dark"
              ? `radial-gradient(circle, ${theme.palette.primary.main}22 0%, transparent 72%)`
              : `radial-gradient(circle, ${theme.palette.primary.main}18 0%, ${theme.palette.primary.light}10 50%, transparent 72%)`,
          filter: "blur(65px)",
          pointerEvents: "none",
        }}
      />

      {/* Плавающая градиентная сфера 2 (акцент снизу-справа) */}
      <Box
        className="animate-blob-2"
        sx={{
          position: "absolute",
          bottom: "-12%",
          right: "10%",
          width: { xs: 380, sm: 600 },
          height: { xs: 380, sm: 600 },
          borderRadius: "50%",
          background: (theme) =>
            theme.palette.mode === "dark"
              ? `radial-gradient(circle, ${theme.palette.primary.dark}1c 0%, transparent 75%)`
              : `radial-gradient(circle, ${theme.palette.primary.main}12 0%, transparent 75%)`,
          filter: "blur(75px)",
          pointerEvents: "none",
        }}
      />

      {/* Плавающая градиентная сфера 3 (акцент по центру-слева) */}
      <Box
        className="animate-blob-3"
        sx={{
          position: "absolute",
          top: "40%",
          left: "5%",
          width: { xs: 280, sm: 460 },
          height: { xs: 280, sm: 460 },
          borderRadius: "50%",
          background: (theme) =>
            theme.palette.mode === "dark"
              ? `radial-gradient(circle, ${theme.palette.primary.main}15 0%, transparent 75%)`
              : `radial-gradient(circle, ${theme.palette.primary.main}10 0%, transparent 75%)`,
          filter: "blur(60px)",
          pointerEvents: "none",
        }}
      />

      {/* Центральный контент (карточка формы с эффектом frosted glass) */}
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

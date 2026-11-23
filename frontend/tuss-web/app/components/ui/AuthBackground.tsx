// app/components/ui/AuthBackground.tsx
import React from "react";
import { Box } from "@mui/material";

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
        backgroundColor: "#F7F9FD",
        overflow: "hidden",
      }}
    >
      {/* Декоративная фоновая точечная сетка */}
      <Box
        sx={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "radial-gradient(rgba(0, 90, 193, 0.08) 1.5px, transparent 1.5px)",
          backgroundSize: "28px 28px",
          pointerEvents: "none",
          opacity: 0.85,
        }}
      />

      {/* Плавающая градиентная сфера 1 (синий акцент сверху-слева) */}
      <Box
        className="animate-blob-1"
        sx={{
          position: "absolute",
          top: "-10%",
          left: "15%",
          width: { xs: 340, sm: 540 },
          height: { xs: 340, sm: 540 },
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(0, 90, 193, 0.16) 0%, rgba(56, 189, 248, 0.08) 50%, transparent 72%)",
          filter: "blur(65px)",
          pointerEvents: "none",
        }}
      />

      {/* Плавающая градиентная сфера 2 (индиго-фиолетовый акцент снизу-справа) */}
      <Box
        className="animate-blob-2"
        sx={{
          position: "absolute",
          bottom: "-12%",
          right: "10%",
          width: { xs: 380, sm: 600 },
          height: { xs: 380, sm: 600 },
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(99, 102, 241, 0.14) 0%, rgba(14, 165, 233, 0.08) 50%, transparent 75%)",
          filter: "blur(75px)",
          pointerEvents: "none",
        }}
      />

      {/* Плавающая градиентная сфера 3 (лазурный акцент по центру-слева) */}
      <Box
        className="animate-blob-3"
        sx={{
          position: "absolute",
          top: "40%",
          left: "5%",
          width: { xs: 280, sm: 460 },
          height: { xs: 280, sm: 460 },
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(56, 189, 248, 0.13) 0%, rgba(0, 90, 193, 0.05) 55%, transparent 75%)",
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

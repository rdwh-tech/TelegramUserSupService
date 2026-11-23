// app/routes/home.tsx
import { useEffect } from "react";
import { useNavigate } from "react-router";
import { Box, Typography, CircularProgress } from "@mui/material";
import { useAuth } from "~/context/AuthContext";

export function meta() {
  return [
    { title: "TUSS — Перенаправление" },
    { name: "description", content: "Рабочее место оператора службы поддержки" },
  ];
}

export default function HomeRoute() {
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated || !user) {
      navigate("/login", { replace: true });
      return;
    }

    // Если нет привязки к компании
    if (!user.companyId || user.role === "unassigned_operator") {
      if (user.role === "admin") {
        navigate("/onboarding/create-company", { replace: true });
      } else {
        navigate("/onboarding/invite-code", { replace: true });
      }
      return;
    }

    // Маршрутизация по ролям (SRS Приложение В)
    switch (user.role) {
      case "admin":
        navigate("/admin/analytics", { replace: true });
        break;
      case "operator_l2":
        navigate("/queue/escalated", { replace: true });
        break;
      case "operator_l1":
      default:
        navigate("/queue/new", { replace: true });
        break;
    }
  }, [user, isAuthenticated, isLoading, navigate]);

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "50vh",
        gap: 2,
      }}
    >
      <CircularProgress size={32} color="primary" />
      <Typography variant="body2" color="text.secondary">
        Перенаправление в рабочую область...
      </Typography>
    </Box>
  );
}

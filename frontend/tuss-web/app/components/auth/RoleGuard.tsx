// app/components/auth/RoleGuard.tsx
import React from "react";
import { Navigate, useLocation, useNavigate } from "react-router";
import { Box, Typography, Card, CardContent } from "@mui/material";
import { useAuth } from "~/context/AuthContext";
import { M3Icon } from "~/components/ui/M3Icon";
import { M3Button } from "~/components/ui/M3Button";
import type { UserRole } from "~/types/user";

interface RoleGuardProps {
  allowedRoles?: UserRole[];
  requireCompany?: boolean;
  children: React.ReactNode;
}

export const RoleGuard: React.FC<RoleGuardProps> = ({
  allowedRoles,
  requireCompany = true,
  children,
}) => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "50vh" }}>
        <Typography color="text.secondary">Проверка прав доступа...</Typography>
      </Box>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Проверка блокировки аккаунта (FR-API-17)
  if (user.isBlocked) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh", p: 2 }}>
        <Card sx={{ maxWidth: 440, p: 3, textAlign: "center", borderRadius: 2 }}>
          <CardContent>
            <Box sx={{ color: "error.main", mb: 1 }}>
              <M3Icon name="block" size={48} />
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
              Учетная запись заблокирована
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Ваш доступ к системе приостановлен администратором компании. Обратитесь к руководству.
            </Typography>
          </CardContent>
        </Card>
      </Box>
    );
  }

  // Проверка привязки к компании для сотрудников
  if (requireCompany && (!user.companyId || user.role === "unassigned_operator")) {
    if (user.role === "admin") {
      return <Navigate to="/onboarding/create-company" replace />;
    }
    return <Navigate to="/onboarding/invite-code" replace />;
  }

  // Проверка прав по списку допустимых ролей (RBAC)
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh", p: 2 }}>
        <Card sx={{ maxWidth: 460, p: 3, textAlign: "center", borderRadius: 2 }}>
          <CardContent>
            <Box sx={{ color: "warning.main", mb: 1 }}>
              <M3Icon name="lock" size={44} />
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
              Доступ ограничен
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Раздел недоступен для вашей роли ({user.role}). Перейдите в рабочий раздел или обратитесь к администратору.
            </Typography>
            <M3Button
              variant="contained"
              onClick={() => {
                if (user.role === "admin") navigate("/admin/analytics");
                else if (user.role === "operator_l2") navigate("/queue/escalated");
                else navigate("/queue/new");
              }}
            >
              Вернуться в рабочую область
            </M3Button>
          </CardContent>
        </Card>
      </Box>
    );
  }

  return <>{children}</>;
};

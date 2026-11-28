// app/routes/admin.staff.tsx
import React, { useState } from "react";
import {
  Box,
  Typography,
  Stack,
  Alert,
  Snackbar,
} from "@mui/material";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { RoleGuard } from "~/components/auth/RoleGuard";
import { M3Icon } from "~/components/ui/M3Icon";
import { M3Button } from "~/components/ui/M3Button";
import { companyApi } from "~/api/company";
import type { StaffMember } from "~/types/company";
import {
  StaffTable,
  InviteStaffModal,
  ExcludeStaffModal,
} from "~/components/staff";

export function meta() {
  return [
    { title: "Сотрудники компании — TUSS Admin" },
    {
      name: "description",
      content: "Управление штатом операторов, назначение линий поддержки L1/L2 и исключение сотрудников",
    },
  ];
}

export default function AdminStaffRoute() {
  const queryClient = useQueryClient();

  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [excludingMember, setExcludingMember] = useState<StaffMember | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // 1. Загрузка списка сотрудников
  const {
    data: staff = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["company", "staff"],
    queryFn: () => companyApi.getStaff(),
  });

  // 2. Мутация изменения роли сотрудника
  const changeRoleMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: "operator_l1" | "operator_l2" }) =>
      companyApi.updateStaffRole(id, role),
    onSuccess: (updated) => {
      queryClient.setQueryData<StaffMember[]>(["company", "staff"], (old) =>
        old ? old.map((m) => (m.id === updated.id ? updated : m)) : []
      );
      setToastMessage(`Роль сотрудника ${updated.fullName} изменена на ${updated.role === "operator_l2" ? "L2" : "L1"}`);
    },
  });

  const handleChangeRole = (member: StaffMember, newRole: "operator_l1" | "operator_l2") => {
    changeRoleMutation.mutate({ id: member.id, role: newRole });
  };

  const handleInviteSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ["company", "staff"] });
    setToastMessage("Приглашение успешно отправлено оператору");
  };

  const handleExcludeSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ["company", "staff"] });
    setToastMessage("Сотрудник успешно исключен из компании");
  };

  return (
    <RoleGuard allowedRoles={["admin"]}>
      <Box sx={{ maxWidth: 1100, mx: "auto", pb: 5 }}>
        {/* Заголовок страницы и кнопка приглашения */}
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={2}
          sx={{
            justifyContent: "space-between",
            alignItems: { xs: "flex-start", sm: "center" },
            mb: 3,
          }}
        >
          <div>
            <Typography variant="h5" sx={{ fontWeight: 700, letterSpacing: "-0.01em" }}>
              Сотрудники компании
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Управление операторами первой и второй линий, распределение ролей и контроль занятости
            </Typography>
          </div>

          <M3Button
            variant="contained"
            onClick={() => setIsInviteModalOpen(true)}
            startIcon={<M3Icon name="person_add" size={18} />}
            data-testid="open-invite-modal-btn"
          >
            Пригласить оператора
          </M3Button>
        </Stack>

        {/* Ошибка загрузки с повтором */}
        {isError && (
          <Alert
            severity="error"
            action={
              <M3Button color="inherit" size="small" onClick={() => refetch()}>
                Повторить
              </M3Button>
            }
            sx={{ mb: 3, borderRadius: 1.5 }}
          >
            Не удалось загрузить реестр сотрудников компании.
          </Alert>
        )}

        {/* Таблица сотрудников */}
        <StaffTable
          staff={staff}
          isLoading={isLoading}
          onChangeRole={handleChangeRole}
          onExclude={(member) => setExcludingMember(member)}
        />

        {/* Модальное окно инвайта (TUSS-FE-23) */}
        <InviteStaffModal
          open={isInviteModalOpen}
          onClose={() => setIsInviteModalOpen(false)}
          onSuccess={handleInviteSuccess}
        />

        {/* Модальное окно исключения сотрудника (TUSS-FE-24) */}
        <ExcludeStaffModal
          open={!!excludingMember}
          member={excludingMember}
          onClose={() => setExcludingMember(null)}
          onSuccess={handleExcludeSuccess}
        />

        {/* Toast уведомления */}
        <Snackbar
          open={!!toastMessage}
          autoHideDuration={4000}
          onClose={() => setToastMessage(null)}
          message={toastMessage}
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        />
      </Box>
    </RoleGuard>
  );
}
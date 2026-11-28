// app/components/settings/CompanyProfileTab.tsx
import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  TextField,
  Stack,
  Alert,
  Skeleton,
} from "@mui/material";
import { useQuery, useMutation } from "@tanstack/react-query";
import { companyApi } from "~/api/company";
import { M3Button } from "~/components/ui/M3Button";
import { useAuth } from "~/context/AuthContext";

interface CompanyProfileTabProps {
  onSuccessToast: (msg: string) => void;
}

export const CompanyProfileTab: React.FC<CompanyProfileTabProps> = ({ onSuccessToast }) => {
  const { refreshUser } = useAuth();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);

  const {
    data: company,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["company", "profile"],
    queryFn: () => companyApi.getCompany(),
  });

  useEffect(() => {
    if (company) {
      setName(company.name || "");
      setDescription(company.description || "");
    }
  }, [company]);

  const updateMutation = useMutation({
    mutationFn: (payload: { name: string; description?: string }) =>
      companyApi.updateCompany(payload),
    onSuccess: (updated) => {
      setName(updated.name);
      setDescription(updated.description || "");
      setError(null);
      onSuccessToast("Параметры компании успешно сохранены");
      refreshUser?.();
    },
    onError: (err: any) => {
      setError(err?.response?.data?.message || "Не удалось сохранить настройки компании");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Наименование компании обязательно для заполнения");
      return;
    }
    setError(null);
    updateMutation.mutate({
      name: name.trim(),
      description: description.trim() || undefined,
    });
  };

  if (isLoading) {
    return (
      <Box sx={{ maxWidth: 600, py: 2 }}>
        <Skeleton variant="text" width={220} height={32} sx={{ mb: 2 }} />
        <Skeleton variant="rectangular" height={56} sx={{ borderRadius: 1.5, mb: 2.5 }} />
        <Skeleton variant="rectangular" height={90} sx={{ borderRadius: 1.5, mb: 2.5 }} />
        <Skeleton variant="rectangular" width={140} height={40} sx={{ borderRadius: 1 }} />
      </Box>
    );
  }

  if (isError) {
    return (
      <Alert
        severity="error"
        action={
          <M3Button color="inherit" size="small" onClick={() => refetch()}>
            Повторить
          </M3Button>
        }
        sx={{ borderRadius: 1.5, my: 2 }}
      >
        Не удалось загрузить параметры компании
      </Alert>
    );
  }

  return (
    <Box sx={{ maxWidth: 640, py: 1 }} data-testid="company-profile-tab">
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5 }}>
          Профиль компании
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Отображаемое наименование компании и общая информация для сотрудников и клиентов
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 1.5 }} data-testid="company-error-alert">
          {error}
        </Alert>
      )}

      <form onSubmit={handleSubmit}>
        <Stack spacing={2.5}>
          <TextField
            label="Название компании"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (error) setError(null);
            }}
            fullWidth
            required
            disabled={updateMutation.isPending}
            slotProps={{
              htmlInput: {
                "data-testid": "company-name-input",
              },
            }}
            helperText="Отображается в шапке веб-панели и сообщениях Telegram-бота"
          />

          <TextField
            label="Описание деятельности"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            fullWidth
            multiline
            rows={3}
            disabled={updateMutation.isPending}
            slotProps={{
              htmlInput: {
                "data-testid": "company-description-input",
              },
            }}
            helperText="Внутреннее описание сервиса компании"
          />

          <Box sx={{ pt: 1 }}>
            <M3Button
              type="submit"
              variant="contained"
              disabled={updateMutation.isPending || !name.trim()}
              data-testid="save-company-btn"
            >
              {updateMutation.isPending ? "Сохранение..." : "Сохранить изменения"}
            </M3Button>
          </Box>
        </Stack>
      </form>
    </Box>
  );
};
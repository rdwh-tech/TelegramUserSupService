// app/components/settings/SLASettingsTab.tsx
import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Stack,
  Card,
  TextField,
  Alert,
  Skeleton,
} from "@mui/material";
import { useQuery, useMutation } from "@tanstack/react-query";
import { companyApi } from "~/api/company";
import { M3Button } from "~/components/ui/M3Button";
import type { SLAPolicy, UpdateSLAPolicyPayload } from "~/types/sla";

interface SLASettingsTabProps {
  onSuccessToast: (msg: string) => void;
}

export const SLASettingsTab: React.FC<SLASettingsTabProps> = ({ onSuccessToast }) => {
  const [frtL1, setFrtL1] = useState("15");
  const [ttrL1, setTtrL1] = useState("120");
  const [frtL2, setFrtL2] = useState("5");
  const [ttrL2, setTtrL2] = useState("60");
  const [error, setError] = useState<string | null>(null);

  const {
    data: slaPolicy,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["company", "sla"],
    queryFn: () => companyApi.getSLAPolicy(),
  });

  useEffect(() => {
    if (slaPolicy) {
      setFrtL1(String(slaPolicy.frtLimitMinutesL1 || 15));
      setTtrL1(String(slaPolicy.ttrLimitMinutesL1 || 120));
      setFrtL2(String(slaPolicy.frtLimitMinutesL2 || 5));
      setTtrL2(String(slaPolicy.ttrLimitMinutesL2 || 60));
    }
  }, [slaPolicy]);

  const updateMutation = useMutation({
    mutationFn: (payload: UpdateSLAPolicyPayload) => companyApi.updateSLAPolicy(payload),
    onSuccess: () => {
      setError(null);
      refetch();
      onSuccessToast("Нормативы SLA успешно обновлены");
    },
    onError: (err: any) => {
      setError(err?.response?.data?.message || "Не удалось сохранить нормативы SLA");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const frtNum = parseInt(frtL1, 10);
    const ttrNum = parseInt(ttrL1, 10);
    const frtL2Num = parseInt(frtL2, 10);
    const ttrL2Num = parseInt(ttrL2, 10);

    if (
      isNaN(frtNum) ||
      isNaN(ttrNum) ||
      frtNum <= 0 ||
      ttrNum <= 0 ||
      (frtL2 && (isNaN(frtL2Num) || frtL2Num <= 0)) ||
      (ttrL2 && (isNaN(ttrL2Num) || ttrL2Num <= 0))
    ) {
      setError("Нормативы SLA должны быть положительными целыми числами больше нуля");
      return;
    }

    setError(null);
    updateMutation.mutate({
      frtLimitMinutesL1: frtNum,
      ttrLimitMinutesL1: ttrNum,
      frtLimitMinutesL2: frtL2Num || undefined,
      ttrLimitMinutesL2: ttrL2Num || undefined,
    });
  };

  if (isLoading) {
    return (
      <Box sx={{ maxWidth: 640, py: 2 }}>
        <Skeleton variant="text" width={220} height={32} sx={{ mb: 2 }} />
        <Skeleton variant="rectangular" height={160} sx={{ borderRadius: 1.5, mb: 2.5 }} />
        <Skeleton variant="rectangular" height={160} sx={{ borderRadius: 1.5 }} />
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
        Не удалось загрузить нормативы SLA
      </Alert>
    );
  }

  return (
    <Box sx={{ maxWidth: 680, py: 1 }} data-testid="sla-settings-tab">
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5 }}>
          Регламентные нормативы SLA
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Пороговые лимиты времени реакции и решения тикетов для операторов первой и второй линий
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" data-testid="sla-error-alert" sx={{ mb: 3, borderRadius: 1.5 }}>
          {error}
        </Alert>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <Stack spacing={3}>
          {/* Нормативы первой линии (L1) */}
          <Card
            sx={{
              p: 2.5,
              borderRadius: 2,
              border: "1px solid",
              borderColor: "divider",
              bgcolor: "background.paper",
              boxShadow: "none",
            }}
          >
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
              Первая линия поддержки (L1)
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 2.5 }}>
              Стандартные регламенты для новых входящих обращений клиентов
            </Typography>

            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                type="number"
                label="Лимит первого ответа (FRT)"
                value={frtL1}
                onChange={(e) => {
                  setFrtL1(e.target.value);
                  if (error) setError(null);
                }}
                fullWidth
                required
                disabled={updateMutation.isPending}
                slotProps={{
                  htmlInput: {
                    min: 1,
                    step: 1,
                    "data-testid": "sla-frt-l1-input",
                    style: { fontVariantNumeric: "tabular-nums" },
                  },
                }}
                helperText="В минутах рабочего времени"
              />

              <TextField
                type="number"
                label="Лимит закрытия тикета (TTR)"
                value={ttrL1}
                onChange={(e) => {
                  setTtrL1(e.target.value);
                  if (error) setError(null);
                }}
                fullWidth
                required
                disabled={updateMutation.isPending}
                slotProps={{
                  htmlInput: {
                    min: 1,
                    step: 1,
                    "data-testid": "sla-ttr-l1-input",
                    style: { fontVariantNumeric: "tabular-nums" },
                  },
                }}
                helperText="В минутах рабочего времени"
              />
            </Stack>
          </Card>

          {/* Нормативы старших операторов (L2) */}
          <Card
            sx={{
              p: 2.5,
              borderRadius: 2,
              border: "1px solid",
              borderColor: "divider",
              bgcolor: "background.paper",
              boxShadow: "none",
            }}
          >
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
              Вторая линия поддержки (L2)
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 2.5 }}>
              Ускоренные регламенты для эскалированных и сложных инцидентов
            </Typography>

            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                type="number"
                label="Лимит первого ответа L2"
                value={frtL2}
                onChange={(e) => {
                  setFrtL2(e.target.value);
                  if (error) setError(null);
                }}
                fullWidth
                disabled={updateMutation.isPending}
                slotProps={{
                  htmlInput: {
                    min: 1,
                    step: 1,
                    "data-testid": "sla-frt-l2-input",
                    style: { fontVariantNumeric: "tabular-nums" },
                  },
                }}
                helperText="В минутах рабочего времени"
              />

              <TextField
                type="number"
                label="Лимит закрытия тикета L2"
                value={ttrL2}
                onChange={(e) => {
                  setTtrL2(e.target.value);
                  if (error) setError(null);
                }}
                fullWidth
                disabled={updateMutation.isPending}
                slotProps={{
                  htmlInput: {
                    min: 1,
                    step: 1,
                    "data-testid": "sla-ttr-l2-input",
                    style: { fontVariantNumeric: "tabular-nums" },
                  },
                }}
                helperText="В минутах рабочего времени"
              />
            </Stack>
          </Card>

          <Box>
            <M3Button
              type="submit"
              variant="contained"
              disabled={updateMutation.isPending}
              data-testid="save-sla-btn"
            >
              {updateMutation.isPending ? "Сохранение..." : "Сохранить нормативы SLA"}
            </M3Button>
          </Box>
        </Stack>
      </form>
    </Box>
  );
};
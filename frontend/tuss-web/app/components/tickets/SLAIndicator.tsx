// app/components/tickets/SLAIndicator.tsx
import React from "react";
import { Box, Tooltip, Stack, Typography } from "@mui/material";
import { M3Icon } from "~/components/ui/M3Icon";
import type { SLATimerInfo, SLAStatus } from "~/types/sla";

export interface SLAIndicatorProps {
  sla?: {
    frt?: SLATimerInfo;
    ttr?: SLATimerInfo;
  } | SLATimerInfo;
  label?: string;
  showDetails?: boolean;
}

const statusConfig: Record<
  SLAStatus,
  {
    bg: string;
    text: string;
    border: string;
    icon: string;
    defaultLabel: string;
  }
> = {
  ok: {
    bg: "#E8F5E9",
    text: "#1E6C30",
    border: "#C6F2C6",
    icon: "timer",
    defaultLabel: "В норме",
  },
  warning: {
    bg: "#FFF8E1",
    text: "#9A6B00",
    border: "#FFE08A",
    icon: "schedule",
    defaultLabel: "Внимание",
  },
  breached: {
    bg: "#FDF2F2",
    text: "#BA1A1A",
    border: "#FFDAD6",
    icon: "warning",
    defaultLabel: "Просрочено",
  },
  paused: {
    bg: "#F1F4FB",
    text: "#575E71",
    border: "#C4C6D0",
    icon: "pause_circle",
    defaultLabel: "На паузе",
  },
};

export const SLAIndicator: React.FC<SLAIndicatorProps> = ({ sla, label, showDetails = true }) => {
  if (!sla) {
    return (
      <Box
        sx={{
          display: "inline-flex",
          alignItems: "center",
          gap: 0.5,
          px: 1.25,
          py: 0.4,
          borderRadius: 9999,
          bgcolor: "#F1F4FB",
          color: "text.secondary",
          fontSize: "0.75rem",
          fontWeight: 600,
        }}
      >
        <M3Icon name="schedule" size={16} />
        <span>—</span>
      </Box>
    );
  }

  // Определяем основной таймер: если передан объект с frt/ttr, приоритет у более критичного
  const frtInfo: SLATimerInfo | undefined = "frt" in sla ? sla.frt : "status" in sla ? sla : undefined;
  const ttrInfo: SLATimerInfo | undefined = "ttr" in sla ? sla.ttr : undefined;

  // Выбираем основной отображаемый таймер:
  // Если есть FRT и он еще не зафиксирован как факт, ориентируемся на него
  let primaryInfo: SLATimerInfo = frtInfo || ttrInfo || {
    status: "ok",
    remainingSeconds: 0,
    formattedTime: "—",
    isPaused: false,
  };

  // Если FRT факт (например, для L2 эскалации), показываем TTR
  if (frtInfo?.formattedTime.includes("факт") && ttrInfo) {
    primaryInfo = ttrInfo;
  }

  const effectiveStatus: SLAStatus = primaryInfo.isPaused ? "paused" : primaryInfo.status;
  const config = statusConfig[effectiveStatus] || statusConfig.ok;

  const tooltipTitle = (
    <Box sx={{ p: 0.5 }}>
      <Typography variant="caption" sx={{ fontWeight: 700, display: "block", mb: 0.5 }}>
        Регламент SLA: {config.defaultLabel}
      </Typography>
      {frtInfo && (
        <Typography variant="caption" sx={{ display: "block" }}>
          • Время первого ответа (FRT): {frtInfo.formattedTime}
        </Typography>
      )}
      {ttrInfo && (
        <Typography variant="caption" sx={{ display: "block" }}>
          • Время решения (TTR): {ttrInfo.formattedTime}
        </Typography>
      )}
      {primaryInfo.isPaused && (
        <Typography variant="caption" sx={{ display: "block", color: "warning.light", mt: 0.5 }}>
          ⏸ Вне рабочих часов компании — таймер заморожен
        </Typography>
      )}
    </Box>
  );

  return (
    <Tooltip title={tooltipTitle} arrow placement="top">
      <Box
        data-testid="sla-indicator"
        data-status={effectiveStatus}
        sx={{
          display: "inline-flex",
          alignItems: "center",
          gap: 0.75,
          px: 1.5,
          py: 0.5,
          borderRadius: 9999,
          bgcolor: config.bg,
          color: config.text,
          border: `1px solid ${config.border}`,
          fontSize: "0.8125rem",
          fontWeight: 700,
          whiteSpace: "nowrap",
          cursor: "default",
          transition: "all 0.2s ease-in-out",
          animation: effectiveStatus === "breached"
            ? "slaBreachPulse 2s infinite ease-in-out"
            : effectiveStatus === "warning"
            ? "slaWarnPulse 3s infinite ease-in-out"
            : "none",
          "@keyframes slaBreachPulse": {
            "0%, 100%": { opacity: 1, transform: "scale(1)" },
            "50%": { opacity: 0.88, transform: "scale(1.02)" },
          },
          "@keyframes slaWarnPulse": {
            "0%, 100%": { opacity: 1 },
            "50%": { opacity: 0.92 },
          },
        }}
      >
        <M3Icon name={config.icon} size={16} />
        <span>
          {label ? `${label}: ` : ""}
          {primaryInfo.formattedTime}
        </span>
      </Box>
    </Tooltip>
  );
};

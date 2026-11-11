// app/types/sla.ts
export type SLAStatus = "ok" | "warning" | "breached" | "paused";

export interface SLAPolicy {
  id: string;
  companyId: string;
  version: number;
  frtLimitMinutesL1: number;
  ttrLimitMinutesL1: number;
  artLimitMinutesL1: number;
  frtLimitMinutesL2: number;
  ttrLimitMinutesL2: number;
  artLimitMinutesL2: number;
  isActive: boolean;
  createdAt: string;
}

export interface UpdateSLAPolicyPayload {
  frtLimitMinutesL1: number;
  ttrLimitMinutesL1: number;
  frtLimitMinutesL2?: number;
  ttrLimitMinutesL2?: number;
}

export interface SLATimerInfo {
  status: SLAStatus;
  remainingSeconds: number; // Оставшееся рабочее время в секундах (отрицательное при нарушении)
  formattedTime: string;    // "14 мин.", "-4 мин."
  isPaused: boolean;        // true, если обращение находится во внерабочих часах
}

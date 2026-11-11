// app/types/analytics.ts
import type { UserRole } from "./user";

export interface AnalyticsSummary {
  activeTicketsCount: number;
  closedTicketsCount: number;
  avgFrtSeconds: number | null; // Среднее время первого ответа (null если нет данных)
  avgTtrSeconds: number | null; // Среднее время закрытия (null если нет данных)
  slaBreachesCount: number;
  slaCompliancePercentage: number | null; // Доля соблюдения SLA (0 - 100)
  avgCsatRating: number | null; // Средняя оценка от 1.00 до 5.00
}

export interface AnalyticsFilter {
  startDate: string; // ISO string
  endDate: string;
  operatorId?: string;
  status?: "all" | "closed" | "sla_breached";
}

export interface CSATDistributionItem {
  rating: 1 | 2 | 3 | 4 | 5;
  count: number;
  percentage: number;
}

export interface TicketVolumePoint {
  timestamp: string;
  createdCount: number;
  closedCount: number;
}

export interface OperatorPerformanceItem {
  operatorId: string;
  fullName: string;
  login: string;
  role: UserRole;
  closedTicketsCount: number;
  avgFrtSeconds: number | null;
  avgCsat: number | null;
  slaCompliancePercentage: number | null;
}

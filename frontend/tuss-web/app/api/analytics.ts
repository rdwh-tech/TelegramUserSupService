// app/api/analytics.ts
import { apiClient } from "./client";
import type {
  AnalyticsSummary,
  AnalyticsFilter,
  CSATDistributionItem,
  TicketVolumePoint,
  OperatorPerformanceItem,
} from "~/types/analytics";

export const analyticsApi = {
  // Сводка ключевых KPI метрик (FR-WEB-16, TUSS-FE-20)
  async getSummary(filter?: Partial<AnalyticsFilter>): Promise<AnalyticsSummary> {
    const { data } = await apiClient.get<AnalyticsSummary>("/analytics/summary", {
      params: filter,
    });
    return data;
  },

  // Распределение оценок CSAT (FR-WEB-18, TUSS-FE-21)
  async getCSATDistribution(filter?: Partial<AnalyticsFilter>): Promise<CSATDistributionItem[]> {
    const { data } = await apiClient.get<CSATDistributionItem[]>("/analytics/csat", {
      params: filter,
    });
    return data;
  },

  // Динамика объема обращений (FR-WEB-18, TUSS-FE-21)
  async getTicketVolume(filter?: Partial<AnalyticsFilter>): Promise<TicketVolumePoint[]> {
    const { data } = await apiClient.get<TicketVolumePoint[]>("/analytics/volume", {
      params: filter,
    });
    return data;
  },

  // Продуктивность операторов (FR-WEB-19, TUSS-FE-22)
  async getOperatorPerformance(filter?: Partial<AnalyticsFilter>): Promise<OperatorPerformanceItem[]> {
    const { data } = await apiClient.get<OperatorPerformanceItem[]>("/analytics/operators", {
      params: filter,
    });
    return data;
  },
};

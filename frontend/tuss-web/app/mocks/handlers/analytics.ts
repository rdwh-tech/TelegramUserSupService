// app/mocks/handlers/analytics.ts
import { http, HttpResponse, delay } from "msw";
import {
  mockAnalyticsSummary,
  mockCSATDistribution,
  mockTicketVolume,
  mockOperatorPerformance,
} from "../data";

export const analyticsHandlers = [
  // Сводка метрик компании (FR-WEB-16)
  http.get("*/api/analytics/summary", async () => {
    await delay(250);
    return HttpResponse.json(mockAnalyticsSummary);
  }),

  // Распределение оценок CSAT (FR-WEB-18)
  http.get("*/api/analytics/csat", async () => {
    await delay(200);
    return HttpResponse.json(mockCSATDistribution);
  }),

  // Динамика нагрузки по дням (FR-WEB-18)
  http.get("*/api/analytics/volume", async () => {
    await delay(200);
    return HttpResponse.json(mockTicketVolume);
  }),

  // Продуктивность операторов (FR-WEB-19)
  http.get("*/api/analytics/operators", async () => {
    await delay(300);
    return HttpResponse.json(mockOperatorPerformance);
  }),
];

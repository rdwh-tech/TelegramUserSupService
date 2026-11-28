// app/mocks/handlers/analytics.ts
import { http, HttpResponse, delay } from "msw";
import {
  mockAnalyticsSummary,
  mockCSATDistribution,
  mockTicketVolume,
  mockOperatorPerformance,
} from "../data";

export const analyticsHandlers = [
  // Сводка метрик компании (FR-WEB-16, TUSS-FE-20)
  http.get("*/api/analytics/summary", async ({ request }) => {
    await delay(150);
    const url = new URL(request.url);
    const operatorId = url.searchParams.get("operatorId");

    if (operatorId === "empty") {
      return HttpResponse.json({
        activeTicketsCount: 0,
        closedTicketsCount: 0,
        avgFrtSeconds: null,
        avgTtrSeconds: null,
        slaBreachesCount: 0,
        slaCompliancePercentage: null,
        avgCsatRating: null,
      });
    }

    if (operatorId === "u-l1-001") {
      return HttpResponse.json({
        ...mockAnalyticsSummary,
        activeTicketsCount: 3,
        closedTicketsCount: 68,
        avgFrtSeconds: 210,
        avgTtrSeconds: 2400,
        avgCsatRating: 4.9,
        slaCompliancePercentage: 98.5,
      });
    }

    return HttpResponse.json(mockAnalyticsSummary);
  }),

  // Распределение оценок CSAT (FR-WEB-18, TUSS-FE-21)
  http.get("*/api/analytics/csat", async ({ request }) => {
    await delay(100);
    const url = new URL(request.url);
    const operatorId = url.searchParams.get("operatorId");

    if (operatorId === "empty") {
      return HttpResponse.json([]);
    }

    return HttpResponse.json(mockCSATDistribution);
  }),

  // Динамика нагрузки по дням (FR-WEB-18, TUSS-FE-21)
  http.get("*/api/analytics/volume", async ({ request }) => {
    await delay(100);
    const url = new URL(request.url);
    const operatorId = url.searchParams.get("operatorId");

    if (operatorId === "empty") {
      return HttpResponse.json([]);
    }

    return HttpResponse.json(mockTicketVolume);
  }),

  // Продуктивность операторов (FR-WEB-19, TUSS-FE-22)
  http.get("*/api/analytics/operators", async () => {
    await delay(150);
    return HttpResponse.json(mockOperatorPerformance);
  }),
];

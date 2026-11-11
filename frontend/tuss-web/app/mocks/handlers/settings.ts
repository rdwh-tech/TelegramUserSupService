// app/mocks/handlers/settings.ts
import { http, HttpResponse, delay } from "msw";
import {
  mockCompany,
  mockBotConfig,
  mockSchedule,
  mockSLAPolicy,
  mockFAQs,
} from "../data";
import type {
  UpdateCompanyPayload,
  UpdateBotConfigPayload,
  UpdateSLAPolicyPayload,
  CreateFAQPayload,
  UpdateFAQPayload,
  DaySchedule,
} from "~/types";

export const settingsHandlers = [
  // 1. Вкладка "Компания" (FR-WEB-21)
  http.get("*/api/company", async () => {
    await delay(200);
    return HttpResponse.json(mockCompany);
  }),

  http.put("*/api/company", async ({ request }) => {
    await delay(300);
    const body = (await request.json()) as UpdateCompanyPayload;
    if (body.name) mockCompany.name = body.name;
    if (body.description !== undefined) mockCompany.description = body.description;
    mockCompany.updatedAt = new Date().toISOString();
    return HttpResponse.json(mockCompany);
  }),

  // 2. Вкладка "Telegram-бот" (FR-WEB-22, 23, 24)
  http.get("*/api/company/bot", async () => {
    await delay(200);
    return HttpResponse.json(mockBotConfig);
  }),

  http.put("*/api/company/bot", async ({ request }) => {
    await delay(400);
    const body = (await request.json()) as UpdateBotConfigPayload;
    if (body.botToken) {
      mockBotConfig.botToken = body.botToken;
      mockBotConfig.isConnected = true;
      mockBotConfig.botUsername = "TechnoSupport_Bot";
    }
    if (body.welcomeMessage) {
      mockBotConfig.welcomeMessage = body.welcomeMessage;
    }
    mockBotConfig.updatedAt = new Date().toISOString();
    return HttpResponse.json(mockBotConfig);
  }),

  // 3. Вкладка "Расписание" (FR-WEB-26)
  http.get("*/api/company/schedule", async () => {
    await delay(200);
    return HttpResponse.json(mockSchedule);
  }),

  http.put("*/api/company/schedule", async ({ request }) => {
    await delay(350);
    const body = (await request.json()) as DaySchedule[];
    mockSchedule.splice(0, mockSchedule.length, ...body);
    return HttpResponse.json(mockSchedule);
  }),

  // 4. Вкладка "SLA" (FR-WEB-27)
  http.get("*/api/company/sla", async () => {
    await delay(200);
    return HttpResponse.json(mockSLAPolicy);
  }),

  http.put("*/api/company/sla", async ({ request }) => {
    await delay(300);
    const body = (await request.json()) as UpdateSLAPolicyPayload;
    mockSLAPolicy.frtLimitMinutesL1 = body.frtLimitMinutesL1;
    mockSLAPolicy.ttrLimitMinutesL1 = body.ttrLimitMinutesL1;
    if (body.frtLimitMinutesL2) mockSLAPolicy.frtLimitMinutesL2 = body.frtLimitMinutesL2;
    if (body.ttrLimitMinutesL2) mockSLAPolicy.ttrLimitMinutesL2 = body.ttrLimitMinutesL2;
    mockSLAPolicy.version += 1;
    return HttpResponse.json(mockSLAPolicy);
  }),

  // 5. Вкладка "FAQ" (FR-WEB-25)
  http.get("*/api/company/faqs", async () => {
    await delay(200);
    return HttpResponse.json(mockFAQs);
  }),

  http.post("*/api/company/faqs", async ({ request }) => {
    await delay(300);
    const body = (await request.json()) as CreateFAQPayload;
    const newFaq = {
      id: `faq-${Date.now()}`,
      companyId: "c-001",
      question: body.question,
      answer: body.answer,
      sortOrder: mockFAQs.length + 1,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    mockFAQs.push(newFaq);
    return HttpResponse.json(newFaq, { status: 201 });
  }),

  http.put("*/api/company/faqs/:id", async ({ params, request }) => {
    await delay(250);
    const body = (await request.json()) as UpdateFAQPayload;
    const index = mockFAQs.findIndex((f) => f.id === params.id);
    if (index === -1) {
      return HttpResponse.json({ message: "Запись FAQ не найдена" }, { status: 404 });
    }
    mockFAQs[index] = { ...mockFAQs[index], ...body, updatedAt: new Date().toISOString() };
    return HttpResponse.json(mockFAQs[index]);
  }),

  http.delete("*/api/company/faqs/:id", async ({ params }) => {
    await delay(250);
    const index = mockFAQs.findIndex((f) => f.id === params.id);
    if (index !== -1) {
      mockFAQs.splice(index, 1);
    }
    return HttpResponse.json({ success: true });
  }),
];

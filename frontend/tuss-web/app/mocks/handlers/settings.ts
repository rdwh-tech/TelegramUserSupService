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
  StaffMember,
  InviteOperatorPayload,
} from "~/types";

export let mockStaffMembers: StaffMember[] = [
  {
    id: "u-l1-001",
    login: "alex_l1",
    fullName: "Алексей Смирнов",
    role: "operator_l1",
    activeTicketId: "t-1041",
    activeTicketNumber: 1041,
    isBlocked: false,
    createdAt: "2026-01-10T10:00:00Z",
  },
  {
    id: "u-l2-002",
    login: "daria_l2",
    fullName: "Дарья Ковалёва",
    role: "operator_l2",
    activeTicketId: null,
    activeTicketNumber: null,
    isBlocked: false,
    createdAt: "2026-01-11T11:00:00Z",
  },
  {
    id: "u-adm-003",
    login: "admin_boss",
    fullName: "Иван Руководитель",
    role: "admin",
    activeTicketId: null,
    activeTicketNumber: null,
    isBlocked: false,
    createdAt: "2026-01-01T09:00:00Z",
  },
];

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

  // 6. Штат сотрудников (FR-WEB-6, FR-API-16..18)
  http.get("*/api/company/staff", async () => {
    await delay(200);
    return HttpResponse.json(mockStaffMembers);
  }),

  http.post("*/api/company/staff/invite", async ({ request }) => {
    await delay(350);
    const body = (await request.json()) as InviteOperatorPayload;
    const cleanCode = (body.code || "").trim().toUpperCase();

    // Валидация 6-значного персонального кода
    if (cleanCode !== "KUQ3W1" && cleanCode !== "VALID1" && cleanCode !== "OP1234") {
      return HttpResponse.json(
        { message: "Введенный код недействителен" },
        { status: 400 }
      );
    }

    const newStaff: StaffMember = {
      id: `u-invited-${Date.now()}`,
      login: "mikhail_new",
      fullName: "Михаил Новичков",
      role: body.role || "operator_l1",
      activeTicketId: null,
      activeTicketNumber: null,
      isBlocked: false,
      createdAt: new Date().toISOString(),
    };
    mockStaffMembers.push(newStaff);

    return HttpResponse.json({
      success: true,
      message: "Приглашение успешно отправлено",
      staff: newStaff,
    });
  }),

  http.patch("*/api/company/staff/:id/role", async ({ params, request }) => {
    await delay(250);
    const body = (await request.json()) as { role: "operator_l1" | "operator_l2" };
    const member = mockStaffMembers.find((m) => m.id === params.id);
    if (!member) {
      return HttpResponse.json({ message: "Сотрудник не найден" }, { status: 404 });
    }
    member.role = body.role;
    return HttpResponse.json(member);
  }),

  http.delete("*/api/company/staff/:id", async ({ params }) => {
    await delay(300);
    const idx = mockStaffMembers.findIndex((m) => m.id === params.id);
    if (idx !== -1) {
      mockStaffMembers.splice(idx, 1);
    }
    return HttpResponse.json({ success: true });
  }),
];

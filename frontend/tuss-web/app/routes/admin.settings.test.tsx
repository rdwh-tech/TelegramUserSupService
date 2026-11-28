// app/routes/admin.settings.test.tsx
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor, fireEvent } from "@testing-library/react";
import { renderWithProviders } from "~/../test/test-utils";
import AdminSettingsRoute from "./admin.settings";
import * as AuthContextModule from "~/context/AuthContext";
import { companyApi } from "~/api/company";
import type { User } from "~/types/user";
import type {
  Company,
  BotConfig,
  CompanySchedule,
  SLAPolicy,
  FAQItem,
} from "~/types";

const mockAdminUser: User = {
  id: "u-adm-003",
  login: "admin_boss",
  fullName: "Иван Руководитель",
  role: "admin",
  companyId: "c-001",
  isBlocked: false,
  createdAt: "2026-01-01T09:00:00Z",
  updatedAt: "2026-01-01T09:00:00Z",
};

const mockCompanyData: Company = {
  id: "c-001",
  name: "ООО ТехноПоддержка",
  description: "Клиентский сервис IT-решений",
  isActive: true,
  createdAt: "2026-01-01T09:00:00Z",
  updatedAt: "2026-01-01T09:00:00Z",
};

const mockBotData: BotConfig = {
  id: "bot-001",
  companyId: "c-001",
  botToken: "1234567890:ABCdefGHIjklMNOpqrSTUvwxYZ_mock",
  botUsername: "TechnoSupport_Bot",
  welcomeMessage: "Здравствуйте! Чем можем помочь?",
  isConnected: true,
  createdAt: "2026-01-01T10:00:00Z",
  updatedAt: "2026-01-01T10:00:00Z",
};

const mockFaqsData: FAQItem[] = [
  {
    id: "faq-001",
    companyId: "c-001",
    question: "Как привязать карту?",
    answer: "В разделе Настройки -> Оплата",
    sortOrder: 1,
    isActive: true,
    createdAt: "2026-01-05T10:00:00Z",
    updatedAt: "2026-01-05T10:00:00Z",
  },
];

const mockScheduleData: CompanySchedule = [
  { id: "s-1", companyId: "c-001", dayOfWeek: 1, isWorkingDay: true, startTime: "09:00", endTime: "18:00", timezone: "Europe/Moscow" },
  { id: "s-2", companyId: "c-001", dayOfWeek: 2, isWorkingDay: true, startTime: "09:00", endTime: "18:00", timezone: "Europe/Moscow" },
  { id: "s-3", companyId: "c-001", dayOfWeek: 3, isWorkingDay: true, startTime: "09:00", endTime: "18:00", timezone: "Europe/Moscow" },
  { id: "s-4", companyId: "c-001", dayOfWeek: 4, isWorkingDay: true, startTime: "09:00", endTime: "18:00", timezone: "Europe/Moscow" },
  { id: "s-5", companyId: "c-001", dayOfWeek: 5, isWorkingDay: true, startTime: "09:00", endTime: "18:00", timezone: "Europe/Moscow" },
  { id: "s-6", companyId: "c-001", dayOfWeek: 6, isWorkingDay: false, startTime: null, endTime: null, timezone: "Europe/Moscow" },
  { id: "s-7", companyId: "c-001", dayOfWeek: 7, isWorkingDay: false, startTime: null, endTime: null, timezone: "Europe/Moscow" },
];

const mockSlaData: SLAPolicy = {
  id: "sla-001",
  companyId: "c-001",
  version: 1,
  frtLimitMinutesL1: 15,
  ttrLimitMinutesL1: 120,
  artLimitMinutesL1: 10,
  frtLimitMinutesL2: 5,
  ttrLimitMinutesL2: 60,
  artLimitMinutesL2: 5,
  isActive: true,
  createdAt: "2026-01-01T09:00:00Z",
};

describe("AdminSettingsRoute Component [TUSS-FE-25..29]", () => {
  beforeEach(() => {
    vi.restoreAllMocks();

    vi.spyOn(AuthContextModule, "useAuth").mockReturnValue({
      user: mockAdminUser,
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      refreshUser: vi.fn(),
    });

    vi.spyOn(companyApi, "getCompany").mockResolvedValue({ ...mockCompanyData });
    vi.spyOn(companyApi, "getBotConfig").mockResolvedValue({ ...mockBotData });
    vi.spyOn(companyApi, "getFAQs").mockResolvedValue([...mockFaqsData]);
    vi.spyOn(companyApi, "getSchedule").mockResolvedValue([...mockScheduleData]);
    vi.spyOn(companyApi, "getSLAPolicy").mockResolvedValue({ ...mockSlaData });
  });

  it("Tab 1 (Company): allows editing company profile (TUSS-FE-25)", async () => {
    const updateSpy = vi.spyOn(companyApi, "updateCompany").mockResolvedValue({
      ...mockCompanyData,
      name: "ООО Новая Поддержка",
    });

    renderWithProviders(<AdminSettingsRoute />);

    await waitFor(() => {
      expect(screen.getByTestId("company-name-input")).toHaveValue("ООО ТехноПоддержка");
    });

    const nameInput = screen.getByTestId("company-name-input");
    fireEvent.change(nameInput, { target: { value: "ООО Новая Поддержка" } });

    const saveBtn = screen.getByTestId("save-company-btn");
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledWith({
        name: "ООО Новая Поддержка",
        description: "Клиентский сервис IT-решений",
      });
    });
  });

  it("Tab 2 (Telegram Bot): displays status and handles replacement modal (TUSS-FE-26)", async () => {
    renderWithProviders(<AdminSettingsRoute />);

    // Switch to Telegram-бот tab
    const botTab = screen.getByTestId("tab-bot");
    fireEvent.click(botTab);

    await waitFor(() => {
      expect(screen.getByTestId("bot-status-chip")).toHaveTextContent("Подключен");
      expect(screen.getByText("@TechnoSupport_Bot")).toBeInTheDocument();
      expect(screen.getByTestId("open-replace-bot-modal-btn")).toBeInTheDocument();
    });

    // Open Replace Bot Modal
    fireEvent.click(screen.getByTestId("open-replace-bot-modal-btn"));

    expect(screen.getByTestId("replace-bot-modal")).toBeInTheDocument();
    expect(
      screen.getByText(/Внимание: замена токена бота приведет к принудительному сбросу всех активных сессий/i)
    ).toBeInTheDocument();

    const replaceSpy = vi.spyOn(companyApi, "updateBotConfig").mockResolvedValue({
      ...mockBotData,
      botToken: "987654321:NEWTOKENABC",
    });

    const newTokenInput = screen.getByTestId("replace-token-input");
    fireEvent.change(newTokenInput, { target: { value: "987654321:NEWTOKENABC" } });

    const confirmBtn = screen.getByTestId("confirm-replace-bot-btn");
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(replaceSpy).toHaveBeenCalledWith({ botToken: "987654321:NEWTOKENABC" });
    });
  });

  it("Tab 3 (FAQ): displays questions and creates new FAQ item (TUSS-FE-27)", async () => {
    renderWithProviders(<AdminSettingsRoute />);

    // Switch to FAQ tab
    const faqTab = screen.getByTestId("tab-faq");
    fireEvent.click(faqTab);

    await waitFor(() => {
      expect(screen.getByText("Как привязать карту?")).toBeInTheDocument();
      expect(screen.getByTestId("add-faq-btn")).toBeInTheDocument();
    });

    const createFaqSpy = vi.spyOn(companyApi, "createFAQ").mockResolvedValue({
      id: "faq-002",
      companyId: "c-001",
      question: "Как вернуть товар?",
      answer: "Обратитесь в поддержку с чеком.",
      sortOrder: 2,
      isActive: true,
      createdAt: "2026-02-01T00:00:00Z",
      updatedAt: "2026-02-01T00:00:00Z",
    });

    fireEvent.click(screen.getByTestId("add-faq-btn"));
    expect(screen.getByTestId("faq-modal")).toBeInTheDocument();

    fireEvent.change(screen.getByTestId("faq-question-input"), {
      target: { value: "Как вернуть товар?" },
    });
    fireEvent.change(screen.getByTestId("faq-answer-input"), {
      target: { value: "Обратитесь в поддержку с чеком." },
    });

    fireEvent.click(screen.getByTestId("submit-faq-btn"));

    await waitFor(() => {
      expect(createFaqSpy).toHaveBeenCalledWith({
        question: "Как вернуть товар?",
        answer: "Обратитесь в поддержку с чеком.",
      });
    });
  });

  it("Tab 4 (Schedule): validates endTime > startTime and saves schedule (TUSS-FE-28)", async () => {
    renderWithProviders(<AdminSettingsRoute />);

    // Switch to Schedule tab
    const scheduleTab = screen.getByTestId("tab-schedule");
    fireEvent.click(scheduleTab);

    await waitFor(() => {
      expect(screen.getByTestId("schedule-info-banner")).toHaveTextContent(
        "Изменения расписания применяются только к тикетам, созданным после сохранения."
      );
      expect(screen.getByText("Понедельник")).toBeInTheDocument();
    });

    // Make end time before start time to trigger validation error
    const startInput = screen.getByTestId("schedule-start-1");
    const endInput = screen.getByTestId("schedule-end-1");

    fireEvent.change(startInput, { target: { value: "18:00" } });
    fireEvent.change(endInput, { target: { value: "09:00" } });

    const saveBtn = screen.getByTestId("save-schedule-btn");
    fireEvent.click(saveBtn);

    expect(screen.getByTestId("schedule-error-alert")).toHaveTextContent(
      "Время окончания должно быть позже времени начала"
    );

    // Fix end time and save successfully
    const updateScheduleSpy = vi.spyOn(companyApi, "updateSchedule").mockResolvedValue(mockScheduleData);

    fireEvent.change(endInput, { target: { value: "20:00" } });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(updateScheduleSpy).toHaveBeenCalled();
    });
  });

  it("Tab 5 (SLA): validates positive numbers and saves SLA thresholds (TUSS-FE-29)", async () => {
    renderWithProviders(<AdminSettingsRoute />);

    // Switch to SLA tab
    const slaTab = screen.getByTestId("tab-sla");
    fireEvent.click(slaTab);

    await waitFor(() => {
      expect(screen.getByTestId("sla-frt-l1-input")).toHaveValue(15);
      expect(screen.getByTestId("sla-ttr-l1-input")).toHaveValue(120);
    });

    // Test invalid negative or zero number
    const frtInput = screen.getByTestId("sla-frt-l1-input");
    fireEvent.change(frtInput, { target: { value: "-5" } });

    const saveBtn = screen.getByTestId("save-sla-btn");
    fireEvent.click(saveBtn);

    expect(screen.getByTestId("sla-error-alert")).toHaveTextContent(
      "Нормативы SLA должны быть положительными целыми числами больше нуля"
    );

    // Fix values and save
    const updateSlaSpy = vi.spyOn(companyApi, "updateSLAPolicy").mockResolvedValue(mockSlaData);

    fireEvent.change(frtInput, { target: { value: "20" } });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(updateSlaSpy).toHaveBeenCalledWith({
        frtLimitMinutesL1: 20,
        ttrLimitMinutesL1: 120,
        frtLimitMinutesL2: 5,
        ttrLimitMinutesL2: 60,
      });
    });
  });
});

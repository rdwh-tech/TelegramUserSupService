// app/routes/admin.analytics.test.tsx
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor, fireEvent } from "@testing-library/react";
import { renderWithProviders } from "~/../test/test-utils";
import AdminAnalyticsRoute from "./admin.analytics";
import * as AuthContextModule from "~/context/AuthContext";
import { analyticsApi } from "~/api/analytics";
import type { User } from "~/types/user";
import type {
  AnalyticsSummary,
  CSATDistributionItem,
  TicketVolumePoint,
  OperatorPerformanceItem,
} from "~/types/analytics";

const mockAdminUser: User = {
  id: "u-admin-001",
  login: "admin",
  fullName: "Главный Администратор",
  role: "admin",
  companyId: "c-001",
  isBlocked: false,
  createdAt: "2026-02-01T00:00:00Z",
  updatedAt: "2026-02-01T00:00:00Z",
};

const mockOperatorUser: User = {
  ...mockAdminUser,
  id: "u-l1-001",
  role: "operator_l1",
};

const sampleSummary: AnalyticsSummary = {
  activeTicketsCount: 24,
  closedTicketsCount: 148,
  avgFrtSeconds: 210, // 3 мин 30 с
  avgTtrSeconds: 2520, // 42 мин
  slaBreachesCount: 3,
  slaCompliancePercentage: 97.5,
  avgCsatRating: 4.85,
};

const sampleCSAT: CSATDistributionItem[] = [
  { rating: 5, count: 85, percentage: 70.8 },
  { rating: 4, count: 25, percentage: 20.8 },
  { rating: 3, count: 7, percentage: 5.8 },
  { rating: 2, count: 2, percentage: 1.7 },
  { rating: 1, count: 1, percentage: 0.8 },
];

const sampleVolume: TicketVolumePoint[] = [
  { timestamp: "Пн", createdCount: 25, closedCount: 22 },
  { timestamp: "Вт", createdCount: 30, closedCount: 28 },
  { timestamp: "Ср", createdCount: 28, closedCount: 30 },
];

const sampleOperators: OperatorPerformanceItem[] = [
  {
    operatorId: "u-l1-001",
    fullName: "Алексей Смирнов",
    login: "alex_l1",
    role: "operator_l1",
    closedTicketsCount: 68,
    avgFrtSeconds: 210,
    avgCsat: 4.9,
    slaCompliancePercentage: 98.5,
  },
  {
    operatorId: "u-l2-002",
    fullName: "Дарья Ковалёва",
    login: "daria_l2",
    role: "operator_l2",
    closedTicketsCount: 45,
    avgFrtSeconds: 120,
    avgCsat: 4.8,
    slaCompliancePercentage: 95.5,
  },
];

describe("AdminAnalyticsRoute Component", () => {
  beforeEach(() => {
    vi.restoreAllMocks();

    vi.spyOn(analyticsApi, "getSummary").mockResolvedValue(sampleSummary);
    vi.spyOn(analyticsApi, "getCSATDistribution").mockResolvedValue(sampleCSAT);
    vi.spyOn(analyticsApi, "getTicketVolume").mockResolvedValue(sampleVolume);
    vi.spyOn(analyticsApi, "getOperatorPerformance").mockResolvedValue(sampleOperators);
  });

  it("blocks non-admin users via RoleGuard", () => {
    vi.spyOn(AuthContextModule, "useAuth").mockReturnValue({
      user: mockOperatorUser,
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      refreshUser: vi.fn(),
    });

    renderWithProviders(<AdminAnalyticsRoute />);
    expect(screen.queryByText("Аналитическая панель и SLA")).not.toBeInTheDocument();
  });

  it("renders page header and 6 KPI cards for admin (FR-WEB-16, TUSS-FE-20)", async () => {
    vi.spyOn(AuthContextModule, "useAuth").mockReturnValue({
      user: mockAdminUser,
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      refreshUser: vi.fn(),
    });

    renderWithProviders(<AdminAnalyticsRoute />);

    expect(screen.getByText("Аналитическая панель и SLA")).toBeInTheDocument();
    expect(screen.getByText("Панель администратора")).toBeInTheDocument();

    await waitFor(() => {
      // 1. Активные тикеты
      expect(screen.getByTestId("kpi-value-active-tickets")).toHaveTextContent("24");
      // 2. Закрыто тикетов
      expect(screen.getByTestId("kpi-value-closed-tickets")).toHaveTextContent("148");
      // 3. Среднее время 1-го ответа (FRT)
      expect(screen.getByTestId("kpi-value-avg-frt")).toHaveTextContent("3 мин 30 с");
      // 4. Среднее время решения (TTR)
      expect(screen.getByTestId("kpi-value-avg-ttr")).toHaveTextContent("42 мин");
      // 5. Соблюдение SLA
      expect(screen.getByTestId("kpi-value-sla-compliance")).toHaveTextContent("97.5%");
      // 6. Средний CSAT
      expect(screen.getByTestId("kpi-value-avg-csat")).toHaveTextContent("4.85 / 5.00");
    });
  });

  it("displays 'Нет данных' fallback when KPI metrics are null (TUSS-FE-20)", async () => {
    vi.spyOn(AuthContextModule, "useAuth").mockReturnValue({
      user: mockAdminUser,
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      refreshUser: vi.fn(),
    });

    vi.spyOn(analyticsApi, "getSummary").mockResolvedValue({
      activeTicketsCount: 0,
      closedTicketsCount: 0,
      avgFrtSeconds: null,
      avgTtrSeconds: null,
      slaBreachesCount: 0,
      slaCompliancePercentage: null,
      avgCsatRating: null,
    });

    renderWithProviders(<AdminAnalyticsRoute />);

    await waitFor(() => {
      expect(screen.getByTestId("kpi-value-avg-frt")).toHaveTextContent("Нет данных");
      expect(screen.getByTestId("kpi-value-avg-ttr")).toHaveTextContent("Нет данных");
      expect(screen.getByTestId("kpi-value-sla-compliance")).toHaveTextContent("Нет данных");
      expect(screen.getByTestId("kpi-value-avg-csat")).toHaveTextContent("Нет данных");
    });
  });

  it("allows switching period presets and reveals custom date inputs (TUSS-FE-19)", async () => {
    vi.spyOn(AuthContextModule, "useAuth").mockReturnValue({
      user: mockAdminUser,
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      refreshUser: vi.fn(),
    });

    renderWithProviders(<AdminAnalyticsRoute />);

    // Wait for initial data to load so filters are not disabled
    await waitFor(() => {
      expect(screen.getByTestId("kpi-value-active-tickets")).toHaveTextContent("24");
    });

    const todayBtn = screen.getByTestId("filter-period-today");
    const yesterdayBtn = screen.getByTestId("filter-period-yesterday");
    const customBtn = screen.getByTestId("filter-period-custom");

    // Click yesterday
    fireEvent.click(yesterdayBtn);
    expect(yesterdayBtn).toHaveAttribute("aria-pressed", "true");

    // Click custom period to reveal date pickers
    fireEvent.click(customBtn);
    expect(screen.getByTestId("filter-start-date")).toBeInTheDocument();
    expect(screen.getByTestId("filter-end-date")).toBeInTheDocument();

    // Click today
    fireEvent.click(todayBtn);
    expect(todayBtn).toHaveAttribute("aria-pressed", "true");
    expect(screen.queryByTestId("filter-start-date")).not.toBeInTheDocument();
  });

  it("renders charts and CSAT histogram with correct values (TUSS-FE-21)", async () => {
    vi.spyOn(AuthContextModule, "useAuth").mockReturnValue({
      user: mockAdminUser,
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      refreshUser: vi.fn(),
    });

    renderWithProviders(<AdminAnalyticsRoute />);

    await waitFor(() => {
      expect(screen.getByTestId("ticket-volume-chart")).toBeInTheDocument();
      expect(screen.getByTestId("csat-histogram")).toBeInTheDocument();
      expect(screen.getByText("Всего оценок: 120")).toBeInTheDocument();
      expect(screen.getByTestId("csat-row-5")).toBeInTheDocument();
      expect(screen.getByText("70.8%")).toBeInTheDocument();
    });
  });

  it("handles empty chart states gracefully (TUSS-FE-21)", async () => {
    vi.spyOn(AuthContextModule, "useAuth").mockReturnValue({
      user: mockAdminUser,
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      refreshUser: vi.fn(),
    });

    vi.spyOn(analyticsApi, "getTicketVolume").mockResolvedValue([]);
    vi.spyOn(analyticsApi, "getCSATDistribution").mockResolvedValue([]);

    renderWithProviders(<AdminAnalyticsRoute />);

    await waitFor(() => {
      expect(screen.getByTestId("ticket-volume-empty")).toHaveTextContent(
        "Нет данных об обращениях за выбранный период"
      );
      expect(screen.getByTestId("csat-empty")).toHaveTextContent(
        "Оценок за выбранный период не поступало"
      );
    });
  });

  it("renders operator performance table with audit links (TUSS-FE-22)", async () => {
    vi.spyOn(AuthContextModule, "useAuth").mockReturnValue({
      user: mockAdminUser,
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      refreshUser: vi.fn(),
    });

    renderWithProviders(<AdminAnalyticsRoute />);

    await waitFor(() => {
      expect(screen.getByTestId("operator-row-u-l1-001")).toBeInTheDocument();
      expect(screen.getByText("Алексей Смирнов")).toBeInTheDocument();
      expect(screen.getByText("@alex_l1")).toBeInTheDocument();
      expect(screen.getByText("Дарья Ковалёва")).toBeInTheDocument();

      // Check Audit button
      const auditBtn = screen.getByTestId("audit-operator-u-l1-001");
      expect(auditBtn).toBeInTheDocument();
      expect(auditBtn).toHaveAttribute(
        "href",
        "/tickets/archive?operatorId=u-l1-001&operatorName=%D0%90%D0%BB%D0%B5%D0%BA%D1%81%D0%B5%D0%B9%20%D0%A1%D0%BC%D0%B8%D1%80%D0%BD%D0%BE%D0%B2"
      );
    });
  });

  it("displays error banner and allows retry when API fails", async () => {
    vi.spyOn(AuthContextModule, "useAuth").mockReturnValue({
      user: mockAdminUser,
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      refreshUser: vi.fn(),
    });

    vi.spyOn(analyticsApi, "getSummary").mockRejectedValue(new Error("Network Error"));

    renderWithProviders(<AdminAnalyticsRoute />);

    await waitFor(() => {
      expect(screen.getByTestId("analytics-error-banner")).toBeInTheDocument();
    });

    // Restore and click retry
    vi.spyOn(analyticsApi, "getSummary").mockResolvedValue(sampleSummary);
    const retryBtn = screen.getByText("Повторить");
    fireEvent.click(retryBtn);

    await waitFor(() => {
      expect(screen.getByTestId("kpi-value-active-tickets")).toHaveTextContent("24");
    });
  });
});

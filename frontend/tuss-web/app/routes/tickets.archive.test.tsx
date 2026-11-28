// app/routes/tickets.archive.test.tsx
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor, fireEvent } from "@testing-library/react";
import { renderWithProviders } from "~/../test/test-utils";
import TicketsArchiveRoute from "./tickets.archive";
import { ticketsApi } from "~/api/tickets";
import * as AuthContextModule from "~/context/AuthContext";
import type { Ticket } from "~/types/ticket";
import type { User } from "~/types/user";

const mockL1User: User = {
  id: "u-l1-001",
  login: "alex_l1",
  fullName: "Алексей Смирнов",
  role: "operator_l1",
  companyId: "c-001",
  isBlocked: false,
  createdAt: "2026-02-01T00:00:00Z",
  updatedAt: "2026-02-01T00:00:00Z",
};

const mockAdminUser: User = {
  ...mockL1User,
  id: "u-admin-001",
  role: "admin",
};

const sampleClosedTickets: Ticket[] = [
  {
    id: "t-arch-1",
    ticketNumber: 3001,
    companyId: "c-001",
    clientId: "c-01",
    client: {
      id: "c-01",
      companyId: "c-001",
      telegramUserId: 111,
      telegramChatId: 111,
      username: "olga_m",
      fullName: "Ольга Морозова",
      createdAt: "2026-02-01T00:00:00Z",
    },
    assignedOperatorId: "u-l1-001",
    assignedOperatorName: "Алексей Смирнов",
    slaPolicyId: "sla-001",
    status: "closed",
    escalationLevel: "l1",
    firstMessagePreview: "Как переключить тариф?",
    escalationReason: null,
    escalatedByUserId: null,
    escalatedAt: null,
    firstResponseAt: "2026-02-10T10:00:00Z",
    closedAt: "2026-02-10T10:30:00Z",
    createdAt: "2026-02-10T09:50:00Z",
    updatedAt: "2026-02-10T10:30:00Z",
  },
  {
    id: "t-arch-2",
    ticketNumber: 3002,
    companyId: "c-001",
    clientId: "c-02",
    client: {
      id: "c-02",
      companyId: "c-001",
      telegramUserId: 222,
      telegramChatId: 222,
      username: "kostya_s",
      fullName: "Константин Сидоров",
      createdAt: "2026-02-01T00:00:00Z",
    },
    assignedOperatorId: "u-l2-001",
    assignedOperatorName: "Елена Смирнова",
    slaPolicyId: "sla-001",
    status: "closed",
    escalationLevel: "l2",
    firstMessagePreview: "Ошибка авторизации через OAuth",
    escalationReason: "Требуется проверка интеграции",
    escalatedByUserId: "u-l1-001",
    escalatedByUserName: "Алексей Смирнов",
    escalatedAt: "2026-02-10T11:00:00Z",
    firstResponseAt: "2026-02-10T10:50:00Z",
    closedAt: "2026-02-10T11:40:00Z",
    createdAt: "2026-02-10T10:40:00Z",
    updatedAt: "2026-02-10T11:40:00Z",
  },
];

describe("TicketsArchiveRoute [TUSS-FE-16]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("filters tickets for Operator L1 to only show their own resolved tickets", async () => {
    vi.spyOn(AuthContextModule, "useAuth").mockReturnValue({
      user: mockL1User,
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      refreshUser: vi.fn(),
    });

    vi.spyOn(ticketsApi, "getArchivedTickets").mockResolvedValue(sampleClosedTickets);

    renderWithProviders(<TicketsArchiveRoute />);

    await waitFor(() => {
      // Тикет #3001 назначен на u-l1-001, должен отобразиться
      expect(screen.getByText("#3001")).toBeInTheDocument();
      expect(screen.getByText("Ольга Морозова")).toBeInTheDocument();
      // Тикет #3002 назначен на u-l2-001, не должен быть виден L1
      expect(screen.queryByText("#3002")).not.toBeInTheDocument();
    });
  });

  it("displays all closed tickets for Administrator in audit mode", async () => {
    vi.spyOn(AuthContextModule, "useAuth").mockReturnValue({
      user: mockAdminUser,
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      refreshUser: vi.fn(),
    });

    vi.spyOn(ticketsApi, "getArchivedTickets").mockResolvedValue(sampleClosedTickets);

    renderWithProviders(<TicketsArchiveRoute />);

    await waitFor(() => {
      expect(screen.getByText("#3001")).toBeInTheDocument();
      expect(screen.getByText("#3002")).toBeInTheDocument();
      expect(screen.getByText("Константин Сидоров")).toBeInTheDocument();
    });
  });

  it("filters search results when typing query into search field", async () => {
    vi.spyOn(AuthContextModule, "useAuth").mockReturnValue({
      user: mockAdminUser,
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      refreshUser: vi.fn(),
    });

    vi.spyOn(ticketsApi, "getArchivedTickets").mockResolvedValue(sampleClosedTickets);

    renderWithProviders(<TicketsArchiveRoute />);

    await waitFor(() => {
      expect(screen.getByText("#3001")).toBeInTheDocument();
      expect(screen.getByText("#3002")).toBeInTheDocument();
    });

    const searchInput = screen.getByTestId("archive-search-input");
    fireEvent.change(searchInput, { target: { value: "3002" } });

    await waitFor(() => {
      expect(screen.queryByText("#3001")).not.toBeInTheDocument();
      expect(screen.getByText("#3002")).toBeInTheDocument();
    });
  });

  it("shows empty state when no closed tickets match", async () => {
    vi.spyOn(AuthContextModule, "useAuth").mockReturnValue({
      user: mockAdminUser,
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      refreshUser: vi.fn(),
    });

    vi.spyOn(ticketsApi, "getArchivedTickets").mockResolvedValue([]);

    renderWithProviders(<TicketsArchiveRoute />);

    await waitFor(() => {
      expect(screen.getByText("В архиве пока нет закрытых обращений")).toBeInTheDocument();
    });
  });

  it("provides view button linking to ticket details", async () => {
    vi.spyOn(AuthContextModule, "useAuth").mockReturnValue({
      user: mockAdminUser,
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      refreshUser: vi.fn(),
    });

    vi.spyOn(ticketsApi, "getArchivedTickets").mockResolvedValue([sampleClosedTickets[0]]);

    renderWithProviders(<TicketsArchiveRoute />);

    await waitFor(() => {
      const openBtn = screen.getByRole("link", { name: /Открыть/i });
      expect(openBtn).toHaveAttribute("href", "/tickets/t-arch-1");
    });
  });

  it("handles operator audit mode from URL parameters", async () => {
    vi.spyOn(AuthContextModule, "useAuth").mockReturnValue({
      user: mockAdminUser,
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      refreshUser: vi.fn(),
    });

    vi.spyOn(ticketsApi, "getArchivedTickets").mockResolvedValue(sampleClosedTickets);

    renderWithProviders(<TicketsArchiveRoute />, {
      initialEntries: ["/tickets/archive?operatorId=u-l1-001&search=Алексей%20Смирнов"],
    });

    await waitFor(() => {
      expect(screen.getByTestId("audit-mode-banner")).toBeInTheDocument();
      expect(screen.getByText(/Режим аудита: показаны закрытые обращения сотрудника/i)).toBeInTheDocument();
      expect(screen.getByText("#3001")).toBeInTheDocument();
      expect(screen.queryByText("#3002")).not.toBeInTheDocument();
    });

    // Reset audit filter
    const resetBtn = screen.getByTestId("reset-audit-filter-btn");
    fireEvent.click(resetBtn);

    await waitFor(() => {
      expect(screen.queryByTestId("audit-mode-banner")).not.toBeInTheDocument();
      expect(screen.getByText("#3001")).toBeInTheDocument();
      expect(screen.getByText("#3002")).toBeInTheDocument();
    });
  });
});

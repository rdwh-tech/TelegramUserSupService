// app/routes/queue.new.test.tsx
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "~/../test/test-utils";
import QueueNewRoute from "./queue.new";
import { ticketsApi } from "~/api/tickets";
import * as AuthContextModule from "~/context/AuthContext";
import type { Ticket } from "~/types/ticket";
import type { User } from "~/types/user";

const mockNavigate = vi.fn();
vi.mock("react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router")>();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

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

const sampleTickets: Ticket[] = [
  {
    id: "t-1",
    ticketNumber: 1041,
    companyId: "c-001",
    clientId: "c-1",
    client: {
      id: "c-1",
      companyId: "c-001",
      telegramUserId: 111,
      telegramChatId: 111,
      username: "client_one",
      fullName: "Клиент Один",
      createdAt: "2026-02-01T00:00:00Z",
    },
    assignedOperatorId: null,
    slaPolicyId: "sla-001",
    status: "new",
    escalationLevel: "l1",
    firstMessagePreview: "Проблема с доступом к сервису",
    escalationReason: null,
    escalatedByUserId: null,
    escalatedAt: null,
    firstResponseAt: null,
    closedAt: null,
    createdAt: "2026-02-10T10:00:00Z",
    updatedAt: "2026-02-10T10:00:00Z",
    sla: {
      frt: { status: "ok", remainingSeconds: 600, formattedTime: "10 мин.", isPaused: false },
      ttr: { status: "ok", remainingSeconds: 3600, formattedTime: "60 мин.", isPaused: false },
    },
  },
  {
    id: "t-2",
    ticketNumber: 1042,
    companyId: "c-001",
    clientId: "c-2",
    client: {
      id: "c-2",
      companyId: "c-001",
      telegramUserId: 222,
      telegramChatId: 222,
      username: "client_two",
      fullName: "Клиент Два",
      createdAt: "2026-02-01T00:00:00Z",
    },
    assignedOperatorId: null,
    slaPolicyId: "sla-001",
    status: "new",
    escalationLevel: "l1",
    firstMessagePreview: "Оплата не проходит через СБП",
    escalationReason: null,
    escalatedByUserId: null,
    escalatedAt: null,
    firstResponseAt: null,
    closedAt: null,
    createdAt: "2026-02-10T10:05:00Z",
    updatedAt: "2026-02-10T10:05:00Z",
    sla: {
      frt: { status: "warning", remainingSeconds: 180, formattedTime: "3 мин.", isPaused: false },
      ttr: { status: "ok", remainingSeconds: 3000, formattedTime: "50 мин.", isPaused: false },
    },
  },
];

describe("QueueNewRoute (L1 New Tickets Queue)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(AuthContextModule, "useAuth").mockReturnValue({
      user: mockL1User,
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      refreshUser: vi.fn(),
    });
  });

  it("loads and renders L1 tickets list with numbers and clients", async () => {
    vi.spyOn(ticketsApi, "getNewTicketsQueue").mockResolvedValue(sampleTickets);
    vi.spyOn(ticketsApi, "getMyActiveTicket").mockResolvedValue(null);

    renderWithProviders(<QueueNewRoute />);

    await waitFor(() => {
      expect(screen.getByText("#1041")).toBeInTheDocument();
      expect(screen.getByText("Клиент Один")).toBeInTheDocument();
      expect(screen.getByText("#1042")).toBeInTheDocument();
      expect(screen.getByText("Клиент Два")).toBeInTheDocument();
    });
  });

  it("displays empty state when queue has no tickets", async () => {
    vi.spyOn(ticketsApi, "getNewTicketsQueue").mockResolvedValue([]);
    vi.spyOn(ticketsApi, "getMyActiveTicket").mockResolvedValue(null);

    renderWithProviders(<QueueNewRoute />);

    await waitFor(() => {
      expect(screen.getByText("Новых обращений нет. Отличная работа!")).toBeInTheDocument();
    });
  });

  it("renders ActiveTicketBanner and disables taking new tickets when active ticket exists", async () => {
    vi.spyOn(ticketsApi, "getNewTicketsQueue").mockResolvedValue(sampleTickets);
    vi.spyOn(ticketsApi, "getMyActiveTicket").mockResolvedValue({
      ...sampleTickets[0],
      id: "t-active",
      ticketNumber: 999,
      status: "in_progress",
    });

    renderWithProviders(<QueueNewRoute />);

    await waitFor(() => {
      expect(screen.getByTestId("active-ticket-banner")).toBeInTheDocument();
      expect(screen.getByText(/Правило «В одни руки» активно/i)).toBeInTheDocument();
    });

    const buttons = screen.getAllByRole("button", { name: /Взять в работу/i });
    buttons.forEach((btn) => {
      expect(btn).toBeDisabled();
    });
  });

  it("allows operator to take a ticket and navigates to active ticket route", async () => {
    vi.spyOn(ticketsApi, "getNewTicketsQueue").mockResolvedValue([sampleTickets[0]]);
    vi.spyOn(ticketsApi, "getMyActiveTicket").mockResolvedValue(null);
    vi.spyOn(ticketsApi, "assignTicket").mockResolvedValue({
      ...sampleTickets[0],
      status: "in_progress",
    });

    const user = userEvent.setup();
    renderWithProviders(<QueueNewRoute />);

    await waitFor(() => {
      expect(screen.getByText("#1041")).toBeInTheDocument();
    });

    const takeButton = screen.getByRole("button", { name: /Взять в работу/i });
    await user.click(takeButton);

    expect(ticketsApi.assignTicket).toHaveBeenCalledWith("t-1");
    expect(mockNavigate).toHaveBeenCalledWith("/tickets/active");
  });

  it("handles 409 collision (TICKET_ALREADY_TAKEN) by showing error and removing ticket from queue", async () => {
    vi.spyOn(ticketsApi, "getNewTicketsQueue").mockResolvedValue([...sampleTickets]);
    vi.spyOn(ticketsApi, "getMyActiveTicket").mockResolvedValue(null);

    const collisionError: any = new Error("Conflict");
    collisionError.response = {
      status: 409,
      data: {
        code: "TICKET_ALREADY_TAKEN",
        message: "Обращение уже взято в работу другим оператором",
      },
    };
    vi.spyOn(ticketsApi, "assignTicket").mockRejectedValue(collisionError);

    const user = userEvent.setup();
    renderWithProviders(<QueueNewRoute />);

    await waitFor(() => {
      expect(screen.getByText("#1041")).toBeInTheDocument();
    });

    const takeButtons = screen.getAllByRole("button", { name: /Взять в работу/i });
    await user.click(takeButtons[0]);

    // Должно появиться предупреждение об ошибке
    await waitFor(() => {
      expect(
        screen.getByText(/Обращение уже взято в работу другим оператором/i)
      ).toBeInTheDocument();
    });

    // Тикет #1041 удаляется из списка, остается только #1042
    expect(screen.queryByText("#1041")).not.toBeInTheDocument();
    expect(screen.getByText("#1042")).toBeInTheDocument();
  });

  it("displays audit chip when current user is admin", async () => {
    vi.spyOn(AuthContextModule, "useAuth").mockReturnValue({
      user: mockAdminUser,
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      refreshUser: vi.fn(),
    });

    vi.spyOn(ticketsApi, "getNewTicketsQueue").mockResolvedValue(sampleTickets);

    renderWithProviders(<QueueNewRoute />);

    await waitFor(() => {
      expect(screen.getByText("Режим аудита (Администратор)")).toBeInTheDocument();
      expect(screen.getAllByText("Только аудит")).toHaveLength(2);
    });
  });
});

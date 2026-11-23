// app/routes/queue.escalated.test.tsx
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "~/../test/test-utils";
import QueueEscalatedRoute from "./queue.escalated";
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

const mockL2User: User = {
  id: "u-l2-001",
  login: "elena_l2",
  fullName: "Елена Смирнова",
  role: "operator_l2",
  companyId: "c-001",
  isBlocked: false,
  createdAt: "2026-02-01T00:00:00Z",
  updatedAt: "2026-02-01T00:00:00Z",
};

const sampleEscalatedTickets: Ticket[] = [
  {
    id: "t-esc-1",
    ticketNumber: 2011,
    companyId: "c-001",
    clientId: "c-vip",
    client: {
      id: "c-vip",
      companyId: "c-001",
      telegramUserId: 999,
      telegramChatId: 999,
      username: "vip_client",
      fullName: "Виктор Серверный",
      createdAt: "2026-02-01T00:00:00Z",
    },
    assignedOperatorId: null,
    slaPolicyId: "sla-001",
    status: "new",
    escalationLevel: "l2",
    firstMessagePreview: "Ошибка 502 Bad Gateway в биллинге",
    escalationReason: "Требуется проверка серверных логов",
    escalatedByUserId: "u-l1-001",
    escalatedByUserName: "Алексей Смирнов",
    escalatedAt: "2026-02-10T11:00:00Z",
    firstResponseAt: "2026-02-10T10:45:00Z",
    closedAt: null,
    createdAt: "2026-02-10T10:40:00Z",
    updatedAt: "2026-02-10T11:00:00Z",
    sla: {
      frt: { status: "ok", remainingSeconds: 0, formattedTime: "5 мин (факт)", isPaused: false },
      ttr: { status: "warning", remainingSeconds: 600, formattedTime: "10 мин.", isPaused: false },
    },
  },
];

describe("QueueEscalatedRoute (L2 Escalated Tickets Queue)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(AuthContextModule, "useAuth").mockReturnValue({
      user: mockL2User,
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      refreshUser: vi.fn(),
    });
  });

  it("loads and renders L2 tickets with escalation reasons and authors", async () => {
    vi.spyOn(ticketsApi, "getEscalatedTicketsQueue").mockResolvedValue(sampleEscalatedTickets);
    vi.spyOn(ticketsApi, "getMyActiveTicket").mockResolvedValue(null);

    renderWithProviders(<QueueEscalatedRoute />);

    await waitFor(() => {
      expect(screen.getByText("#2011")).toBeInTheDocument();
      expect(screen.getByText("Виктор Серверный")).toBeInTheDocument();
      expect(screen.getByText("Требуется проверка серверных логов")).toBeInTheDocument();
      expect(screen.getByText("От: Алексей Смирнов")).toBeInTheDocument();
    });
  });

  it("displays empty state when there are no escalated tickets", async () => {
    vi.spyOn(ticketsApi, "getEscalatedTicketsQueue").mockResolvedValue([]);
    vi.spyOn(ticketsApi, "getMyActiveTicket").mockResolvedValue(null);

    renderWithProviders(<QueueEscalatedRoute />);

    await waitFor(() => {
      expect(screen.getByText("Нет эскалированных обращений. Все тикеты решены!")).toBeInTheDocument();
    });
  });

  it("allows operator L2 to take an escalated ticket and navigates to /tickets/active", async () => {
    vi.spyOn(ticketsApi, "getEscalatedTicketsQueue").mockResolvedValue(sampleEscalatedTickets);
    vi.spyOn(ticketsApi, "getMyActiveTicket").mockResolvedValue(null);
    vi.spyOn(ticketsApi, "assignTicket").mockResolvedValue({
      ...sampleEscalatedTickets[0],
      status: "in_progress",
    });

    const user = userEvent.setup();
    renderWithProviders(<QueueEscalatedRoute />);

    await waitFor(() => {
      expect(screen.getByText("#2011")).toBeInTheDocument();
    });

    const takeButton = screen.getByRole("button", { name: /Взять в работу/i });
    await user.click(takeButton);

    expect(ticketsApi.assignTicket).toHaveBeenCalledWith("t-esc-1");
    expect(mockNavigate).toHaveBeenCalledWith("/tickets/active");
  });
});

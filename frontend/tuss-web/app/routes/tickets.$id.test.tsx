// app/routes/tickets.$id.test.tsx
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { renderWithProviders } from "~/../test/test-utils";
import TicketDetailsRoute from "./tickets.$id";
import { ticketsApi } from "~/api/tickets";
import * as AuthContextModule from "~/context/AuthContext";
import type { Ticket } from "~/types/ticket";
import type { User } from "~/types/user";

vi.mock("react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router")>();
  return {
    ...actual,
    useParams: () => ({ id: "t-1042" }),
    useNavigate: () => vi.fn(),
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

const mockTicketData: Ticket = {
  id: "t-1042",
  ticketNumber: 1042,
  companyId: "c-001",
  clientId: "c-01",
  client: {
    id: "c-01",
    companyId: "c-001",
    telegramUserId: 991234,
    telegramChatId: 778899,
    username: "ivan_dev",
    fullName: "Иван Разработчик",
    createdAt: "2026-02-01T00:00:00Z",
  },
  assignedOperatorId: "u-l1-001",
  assignedOperatorName: "Алексей Смирнов",
  slaPolicyId: "sla-001",
  status: "in_progress",
  escalationLevel: "l1",
  firstMessagePreview: "Проблема с оплатой подписки",
  escalationReason: null,
  escalatedByUserId: null,
  escalatedAt: null,
  firstResponseAt: null,
  closedAt: null,
  createdAt: "2026-02-10T10:00:00Z",
  updatedAt: "2026-02-10T10:05:00Z",
  sla: {
    frt: { status: "ok", remainingSeconds: 600, formattedTime: "10 мин.", isPaused: false },
    ttr: { status: "ok", remainingSeconds: 3600, formattedTime: "60 мин.", isPaused: false },
  },
};

describe("TicketDetailsRoute [TUSS-FE-10]", () => {
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

  it("renders two-column layout with chat container and ticket sidebar", async () => {
    vi.spyOn(ticketsApi, "getTicketById").mockResolvedValue(mockTicketData);
    vi.spyOn(ticketsApi, "getMessages").mockResolvedValue([]);

    renderWithProviders(<TicketDetailsRoute />);

    await waitFor(() => {
      expect(screen.getByTestId("chat-container-panel")).toBeInTheDocument();
      expect(screen.getByTestId("ticket-sidebar")).toBeInTheDocument();
      expect(screen.getByText("Обращение #1042")).toBeInTheDocument();
      expect(screen.getAllByText("Иван Разработчик").length).toBeGreaterThanOrEqual(1);
    });
  });

  it("shows read-only badge when viewing as administrator", async () => {
    vi.spyOn(AuthContextModule, "useAuth").mockReturnValue({
      user: { ...mockL1User, id: "admin-1", role: "admin" },
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      refreshUser: vi.fn(),
    });

    vi.spyOn(ticketsApi, "getTicketById").mockResolvedValue(mockTicketData);
    vi.spyOn(ticketsApi, "getMessages").mockResolvedValue([]);

    renderWithProviders(<TicketDetailsRoute />);

    await waitFor(() => {
      expect(screen.getByText("Режим только для чтения")).toBeInTheDocument();
    });
  });

  it("displays error message if ticket loading fails", async () => {
    vi.spyOn(ticketsApi, "getTicketById").mockRejectedValue(new Error("Not found"));
    vi.spyOn(ticketsApi, "getMessages").mockResolvedValue([]);

    renderWithProviders(<TicketDetailsRoute />);

    await waitFor(() => {
      expect(screen.getByText(/Обращение не найдено или доступ ограничен/i)).toBeInTheDocument();
    });
  });
});

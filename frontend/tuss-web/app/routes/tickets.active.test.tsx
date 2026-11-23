// app/routes/tickets.active.test.tsx
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { renderWithProviders } from "~/../test/test-utils";
import TicketsActiveRoute from "./tickets.active";
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

const mockActiveTicket: Ticket = {
  id: "t-act-101",
  ticketNumber: 1042,
  companyId: "c-001",
  clientId: "c-01",
  client: {
    id: "c-01",
    companyId: "c-001",
    telegramUserId: 555666,
    telegramChatId: 555666,
    username: "active_user",
    fullName: "Иван Активный",
    createdAt: "2026-02-01T00:00:00Z",
  },
  assignedOperatorId: "u-l1-001",
  assignedOperatorName: "Алексей Смирнов",
  slaPolicyId: "sla-001",
  status: "in_progress",
  escalationLevel: "l1",
  firstMessagePreview: "Проблема с получением платежа",
  escalationReason: null,
  escalatedByUserId: null,
  escalatedAt: null,
  firstResponseAt: null,
  closedAt: null,
  createdAt: "2026-02-10T12:00:00Z",
  updatedAt: "2026-02-10T12:05:00Z",
  sla: {
    frt: { status: "ok", remainingSeconds: 600, formattedTime: "10 мин.", isPaused: false },
    ttr: { status: "ok", remainingSeconds: 3600, formattedTime: "60 мин.", isPaused: false },
  },
};

describe("TicketsActiveRoute", () => {
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

  it("renders empty state card when there is no active ticket", async () => {
    vi.spyOn(ticketsApi, "getMyActiveTicket").mockResolvedValue(null);

    renderWithProviders(<TicketsActiveRoute />);

    await waitFor(() => {
      expect(screen.getByText("Нет активного обращения в работе")).toBeInTheDocument();
      expect(screen.getByRole("link", { name: /Перейти к очереди/i })).toBeInTheDocument();
    });
  });

  it("renders active ticket card with details and action buttons when ticket exists", async () => {
    vi.spyOn(ticketsApi, "getMyActiveTicket").mockResolvedValue(mockActiveTicket);

    renderWithProviders(<TicketsActiveRoute />);

    await waitFor(() => {
      expect(screen.getByText(/Тикет #1042 — Иван Активный/i)).toBeInTheDocument();
      expect(screen.getByText("@active_user")).toBeInTheDocument();
      expect(screen.getByText("Проблема с получением платежа")).toBeInTheDocument();
      expect(screen.getByRole("link", { name: /Перейти в диалог/i })).toHaveAttribute(
        "href",
        "/tickets/t-act-101"
      );
    });
  });
});

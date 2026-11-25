// app/components/tickets/TicketSidebar.test.tsx
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "~/../test/test-utils";
import { TicketSidebar } from "./TicketSidebar";
import type { Ticket } from "~/types/ticket";

const mockActiveTicket: Ticket = {
  id: "t-sidebar-1",
  ticketNumber: 1042,
  companyId: "c-001",
  clientId: "c-01",
  client: {
    id: "c-01",
    companyId: "c-001",
    telegramUserId: 991234,
    telegramChatId: 778899,
    username: "marina_tg",
    fullName: "Марина Ковалева",
    createdAt: "2026-02-01T00:00:00Z",
  },
  assignedOperatorId: "u-l1-001",
  assignedOperatorName: "Алексей Смирнов",
  slaPolicyId: "sla-001",
  status: "in_progress",
  escalationLevel: "l1",
  firstMessagePreview: "Не проходит оплата",
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

const mockEscalatedTicket: Ticket = {
  ...mockActiveTicket,
  id: "t-sidebar-2",
  ticketNumber: 2001,
  escalationLevel: "l2",
  escalationReason: "Сложная ошибка базы данных",
  escalatedByUserName: "Оператор L1",
};

describe("TicketSidebar Component", () => {
  it("renders client profile with full name and telegram link", () => {
    renderWithProviders(<TicketSidebar ticket={mockActiveTicket} userRole="operator_l1" />);

    expect(screen.getByText("Марина Ковалева")).toBeInTheDocument();
    const link = screen.getByRole("link", { name: /@marina_tg/i });
    expect(link).toHaveAttribute("href", "https://t.me/marina_tg");
    expect(screen.getByText("991234")).toBeInTheDocument();
  });

  it("renders status and SLA timers for FRT and TTR", () => {
    renderWithProviders(<TicketSidebar ticket={mockActiveTicket} userRole="operator_l1" />);

    expect(screen.getByText("В работе")).toBeInTheDocument();
    expect(screen.getByText("FRT: 10 мин.")).toBeInTheDocument();
    expect(screen.getByText("TTR: 60 мин.")).toBeInTheDocument();
  });

  it("renders escalation block when ticket is escalated to L2", () => {
    renderWithProviders(<TicketSidebar ticket={mockEscalatedTicket} userRole="operator_l2" />);

    expect(screen.getByTestId("escalation-info-box")).toBeInTheDocument();
    expect(screen.getByText("Сложная ошибка базы данных")).toBeInTheDocument();
    expect(screen.getByText(/Оператор L1/i)).toBeInTheDocument();
  });

  it("shows escalate button for operator L1 and triggers callback", async () => {
    const handleEscalate = vi.fn();
    const handleClose = vi.fn();
    const user = userEvent.setup();

    renderWithProviders(
      <TicketSidebar
        ticket={mockActiveTicket}
        userRole="operator_l1"
        onOpenEscalateModal={handleEscalate}
        onOpenCloseModal={handleClose}
      />
    );

    const escalateBtn = screen.getByRole("button", { name: /Эскалировать на L2/i });
    expect(escalateBtn).toBeInTheDocument();
    await user.click(escalateBtn);
    expect(handleEscalate).toHaveBeenCalled();

    const closeBtn = screen.getByRole("button", { name: /Закрыть тикет/i });
    await user.click(closeBtn);
    expect(handleClose).toHaveBeenCalled();
  });

  it("hides escalate button for operator L2", () => {
    renderWithProviders(<TicketSidebar ticket={mockEscalatedTicket} userRole="operator_l2" />);

    expect(screen.queryByRole("button", { name: /Эскалировать на L2/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Закрыть тикет/i })).toBeInTheDocument();
  });

  it("renders completed banner when ticket is closed", () => {
    const closedTicket: Ticket = {
      ...mockActiveTicket,
      status: "closed",
      closedAt: "2026-02-10T12:00:00Z",
    };

    renderWithProviders(<TicketSidebar ticket={closedTicket} userRole="operator_l1" />);

    expect(screen.getByText("Тикет завершен")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Закрыть тикет/i })).not.toBeInTheDocument();
  });
});

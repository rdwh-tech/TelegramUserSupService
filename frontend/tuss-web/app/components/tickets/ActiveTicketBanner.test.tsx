// app/components/tickets/ActiveTicketBanner.test.tsx
import React from "react";
import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "~/../test/test-utils";
import { ActiveTicketBanner } from "./ActiveTicketBanner";
import type { Ticket } from "~/types/ticket";

const mockActiveTicket: Ticket = {
  id: "t-active-1",
  ticketNumber: 1042,
  companyId: "c-001",
  clientId: "c-01",
  client: {
    id: "c-01",
    companyId: "c-001",
    telegramUserId: 1234567,
    telegramChatId: 1234567,
    username: "ivan_dev",
    fullName: "Иван Разработчик",
    createdAt: "2026-02-01T00:00:00Z",
  },
  assignedOperatorId: "u-l1-001",
  assignedOperatorName: "Алексей Смирнов",
  slaPolicyId: "sla-001",
  status: "in_progress",
  escalationLevel: "l1",
  firstMessagePreview: "Проблема с оплатой",
  escalationReason: null,
  escalatedByUserId: null,
  escalatedAt: null,
  firstResponseAt: null,
  closedAt: null,
  createdAt: "2026-02-10T10:00:00Z",
  updatedAt: "2026-02-10T10:05:00Z",
};

describe("ActiveTicketBanner Component", () => {
  it("renders active ticket info with number and client name", () => {
    renderWithProviders(<ActiveTicketBanner activeTicket={mockActiveTicket} />);

    expect(screen.getByTestId("active-ticket-banner")).toBeInTheDocument();
    expect(screen.getByText(/Правило «В одни руки» активно/i)).toBeInTheDocument();
    expect(screen.getByText(/#1042/i)).toBeInTheDocument();
    expect(screen.getByText(/Иван Разработчик/i)).toBeInTheDocument();
  });

  it("renders link button to active ticket chat", () => {
    renderWithProviders(<ActiveTicketBanner activeTicket={mockActiveTicket} />);

    const button = screen.getByRole("link", { name: /Перейти к активному тикету/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute("href", "/tickets/active");
  });
});

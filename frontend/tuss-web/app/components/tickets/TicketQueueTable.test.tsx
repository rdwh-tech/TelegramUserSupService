// app/components/tickets/TicketQueueTable.test.tsx
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "~/../test/test-utils";
import { TicketQueueTable } from "./TicketQueueTable";
import type { Ticket } from "~/types/ticket";

const mockSampleTickets: Ticket[] = [
  {
    id: "t-101",
    ticketNumber: 101,
    companyId: "c-001",
    clientId: "c-1",
    client: {
      id: "c-1",
      companyId: "c-001",
      telegramUserId: 111,
      telegramChatId: 111,
      username: "user_one",
      fullName: "Анна Смирнова",
      createdAt: "2026-02-01T00:00:00Z",
    },
    assignedOperatorId: null,
    slaPolicyId: "sla-001",
    status: "new",
    escalationLevel: "l1",
    firstMessagePreview: "Не работает кнопка входа",
    escalationReason: null,
    escalatedByUserId: null,
    escalatedAt: null,
    firstResponseAt: null,
    closedAt: null,
    createdAt: "2026-02-10T12:00:00Z",
    updatedAt: "2026-02-10T12:00:00Z",
    sla: {
      frt: { status: "ok", remainingSeconds: 600, formattedTime: "10 мин.", isPaused: false },
      ttr: { status: "ok", remainingSeconds: 3600, formattedTime: "60 мин.", isPaused: false },
    },
  },
  {
    id: "t-102",
    ticketNumber: 102,
    companyId: "c-001",
    clientId: "c-2",
    client: {
      id: "c-2",
      companyId: "c-001",
      telegramUserId: 222,
      telegramChatId: 222,
      username: "user_two",
      fullName: "Борис Иванов",
      createdAt: "2026-02-01T00:00:00Z",
    },
    assignedOperatorId: null,
    slaPolicyId: "sla-001",
    status: "new",
    escalationLevel: "l2",
    firstMessagePreview: "Ошибка базы данных 500",
    escalationReason: "Требуется помощь DevOps",
    escalatedByUserId: "u-1",
    escalatedByUserName: "Оператор L1",
    escalatedAt: "2026-02-10T12:30:00Z",
    firstResponseAt: null,
    closedAt: null,
    createdAt: "2026-02-10T12:20:00Z",
    updatedAt: "2026-02-10T12:30:00Z",
    sla: {
      frt: { status: "warning", remainingSeconds: 120, formattedTime: "2 мин.", isPaused: false },
      ttr: { status: "ok", remainingSeconds: 2400, formattedTime: "40 мин.", isPaused: false },
    },
  },
];

describe("TicketQueueTable Component", () => {
  it("renders 5 skeleton rows when loading", () => {
    renderWithProviders(
      <TicketQueueTable
        tickets={[]}
        isLoading={true}
        level="l1"
        hasActiveTicket={false}
        isAdminAudit={false}
        takingTicketId={null}
        onTakeTicket={vi.fn()}
        emptyTitle="Пусто"
        emptySubtitle="Нет данных"
      />
    );

    expect(screen.getByTestId("queue-skeleton-loading")).toBeInTheDocument();
  });

  it("renders empty state card when tickets list is empty", () => {
    renderWithProviders(
      <TicketQueueTable
        tickets={[]}
        isLoading={false}
        level="l1"
        hasActiveTicket={false}
        isAdminAudit={false}
        takingTicketId={null}
        onTakeTicket={vi.fn()}
        emptyTitle="Новых обращений нет. Отличная работа!"
        emptySubtitle="Все входящие сообщения от пользователей Telegram обработаны."
      />
    );

    expect(screen.getByTestId("queue-empty-state")).toBeInTheDocument();
    expect(screen.getByText("Новых обращений нет. Отличная работа!")).toBeInTheDocument();
    expect(screen.getByText(/Все входящие сообщения от пользователей Telegram/i)).toBeInTheDocument();
  });

  it("renders ticket list with numbers, clients, previews and SLA", () => {
    renderWithProviders(
      <TicketQueueTable
        tickets={mockSampleTickets}
        isLoading={false}
        level="l1"
        hasActiveTicket={false}
        isAdminAudit={false}
        takingTicketId={null}
        onTakeTicket={vi.fn()}
        emptyTitle="Пусто"
        emptySubtitle="Нет данных"
      />
    );

    expect(screen.getByText("#101")).toBeInTheDocument();
    expect(screen.getByText("Анна Смирнова")).toBeInTheDocument();
    expect(screen.getByText("@user_one")).toBeInTheDocument();
    expect(screen.getByText("Не работает кнопка входа")).toBeInTheDocument();
    expect(screen.getByText("10 мин.")).toBeInTheDocument();

    expect(screen.getByText("#102")).toBeInTheDocument();
    expect(screen.getByText("Борис Иванов")).toBeInTheDocument();
  });

  it("renders escalation reason and author when level is l2", () => {
    renderWithProviders(
      <TicketQueueTable
        tickets={mockSampleTickets}
        isLoading={false}
        level="l2"
        hasActiveTicket={false}
        isAdminAudit={false}
        takingTicketId={null}
        onTakeTicket={vi.fn()}
        emptyTitle="Пусто"
        emptySubtitle="Нет данных"
      />
    );

    expect(screen.getByText("Причина эскалации")).toBeInTheDocument();
    expect(screen.getByText("Требуется помощь DevOps")).toBeInTheDocument();
    expect(screen.getByText("От: Оператор L1")).toBeInTheDocument();
  });

  it("triggers onTakeTicket when take button is clicked", async () => {
    const handleTake = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();

    renderWithProviders(
      <TicketQueueTable
        tickets={[mockSampleTickets[0]]}
        isLoading={false}
        level="l1"
        hasActiveTicket={false}
        isAdminAudit={false}
        takingTicketId={null}
        onTakeTicket={handleTake}
        emptyTitle="Пусто"
        emptySubtitle="Нет данных"
      />
    );

    const takeButton = screen.getByRole("button", { name: /Взять в работу/i });
    expect(takeButton).toBeEnabled();

    await user.click(takeButton);
    expect(handleTake).toHaveBeenCalledWith("t-101");
  });

  it("disables take button when operator already has an active ticket", () => {
    renderWithProviders(
      <TicketQueueTable
        tickets={[mockSampleTickets[0]]}
        isLoading={false}
        level="l1"
        hasActiveTicket={true}
        isAdminAudit={false}
        takingTicketId={null}
        onTakeTicket={vi.fn()}
        emptyTitle="Пусто"
        emptySubtitle="Нет данных"
      />
    );

    const disabledButton = screen.getByRole("button", { name: /Взять в работу/i });
    expect(disabledButton).toBeDisabled();
  });

  it("renders 'Только аудит' badge when user is administrator", () => {
    renderWithProviders(
      <TicketQueueTable
        tickets={[mockSampleTickets[0]]}
        isLoading={false}
        level="l1"
        hasActiveTicket={false}
        isAdminAudit={true}
        takingTicketId={null}
        onTakeTicket={vi.fn()}
        emptyTitle="Пусто"
        emptySubtitle="Нет данных"
      />
    );

    expect(screen.getByText("Только аудит")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Взять в работу/i })).not.toBeInTheDocument();
  });
});

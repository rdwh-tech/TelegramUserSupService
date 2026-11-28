import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { renderWithProviders } from "~/../test/test-utils";
import QueueNewRoute from "~/routes/queue.new";
import AppLayout from "~/layouts/AppLayout";
import { useWebSocket } from "~/context/WebSocketContext";
import * as AuthContextModule from "~/context/AuthContext";
import { ticketsApi } from "~/api/tickets";
import type { Ticket } from "~/types/ticket";

describe("E2E Real-Time & Resilience Suite (TUSS-FE-30..34, SRS 6.1..6.18)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const setupAuth = (role: "operator_l1" | "operator_l2" | "admin" = "operator_l1") => {
    vi.spyOn(AuthContextModule, "useAuth").mockReturnValue({
      user: {
        id: "u-op-001",
        login: "operator1",
        fullName: "Оператор Первый",
        role,
        companyId: "comp-001",
        companyName: "ТехноСервис",
        isBlocked: false,
        createdAt: "",
        updatedAt: "",
      },
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      refreshUser: vi.fn(),
    });
  };

  const mockTicket: Ticket = {
    id: "t-101",
    ticketNumber: 101,
    status: "new",
    escalationLevel: "l1",
    firstMessagePreview: "Не проходит оплата картой",
    companyId: "comp-001",
    clientId: "c-101",
    assignedOperatorId: null,
    slaPolicyId: "sla-001",
    escalationReason: null,
    escalatedByUserId: null,
    escalatedAt: null,
    firstResponseAt: null,
    closedAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    client: {
      id: "c-101",
      companyId: "comp-001",
      telegramUserId: 998877,
      telegramChatId: 998877,
      username: "petrov",
      fullName: "Петр Петров",
      createdAt: new Date().toISOString(),
    },
    sla: {
      frt: {
        status: "ok",
        remainingSeconds: 600,
        formattedTime: "10 мин.",
        isPaused: false,
      },
      ttr: {
        status: "ok",
        remainingSeconds: 3300,
        formattedTime: "55 мин.",
        isPaused: false,
      },
    },
  };

  it("adds newly created Telegram ticket to L1 queue in real time without page reload (TUSS-FE-30)", async () => {
    setupAuth("operator_l1");

    vi.spyOn(ticketsApi, "getNewTicketsQueue").mockResolvedValueOnce([]);
    vi.spyOn(ticketsApi, "getMyActiveTicket").mockResolvedValueOnce(null);

    function QueueWithSimulate() {
      const { simulateEvent } = useWebSocket();
      return (
        <div>
          <button
            data-testid="simulate-new-ticket"
            onClick={() =>
              simulateEvent({
                type: "ticket.created",
                payload: { ticket: mockTicket },
              })
            }
          >
            Создать тикет из Telegram
          </button>
          <QueueNewRoute />
        </div>
      );
    }

    renderWithProviders(<QueueWithSimulate />, { initialEntries: ["/queue/new"] });

    // Очередь изначально пуста
    expect(await screen.findByTestId("queue-empty-state")).toBeInTheDocument();

    // Клиент пишет в Telegram-бот -> приходит WebSocket-событие ticket.created
    fireEvent.click(screen.getByTestId("simulate-new-ticket"));

    // Тикет немедленно появляется в очереди оператора без ручной перезагрузки
    await waitFor(() => {
      expect(screen.getByText("#101")).toBeInTheDocument();
      expect(screen.getByText("Петр Петров")).toBeInTheDocument();
      expect(screen.getByText("Не проходит оплата картой")).toBeInTheDocument();
    });
  });

  it("removes ticket from queue in real time when taken by another operator (TUSS-FE-30 AC 3)", async () => {
    setupAuth("operator_l1");

    vi.spyOn(ticketsApi, "getNewTicketsQueue").mockResolvedValueOnce([mockTicket]);
    vi.spyOn(ticketsApi, "getMyActiveTicket").mockResolvedValueOnce(null);

    function QueueWithAssignedSimulate() {
      const { simulateEvent } = useWebSocket();
      return (
        <div>
          <button
            data-testid="simulate-assigned-ticket"
            onClick={() =>
              simulateEvent({
                type: "ticket.assigned",
                payload: {
                  ticketId: "t-101",
                  assignedTo: "u-another-operator",
                  operatorName: "Иван Смирнов",
                },
              })
            }
          >
            Забрать другим оператором
          </button>
          <QueueNewRoute />
        </div>
      );
    }

    renderWithProviders(<QueueWithAssignedSimulate />, { initialEntries: ["/queue/new"] });

    expect(await screen.findByText("#101")).toBeInTheDocument();

    // Другой оператор взял тикет в работу -> отправлено событие ticket.assigned
    fireEvent.click(screen.getByTestId("simulate-assigned-ticket"));

    // Карточка мгновенно исчезает из очереди коллеги
    await waitFor(() => {
      expect(screen.queryByText("#101")).not.toBeInTheDocument();
    });
  });

  it("shows reconnection warning banner when connection drops and recovers on reconnect (TUSS-FE-31)", async () => {
    setupAuth("operator_l1");

    function LayoutWithStatusControls() {
      const { service } = useWebSocket();
      return (
        <div>
          <button
            data-testid="simulate-drop"
            onClick={() => service.simulateStatus("reconnecting")}
          >
            Симуляция обрыва
          </button>
          <button
            data-testid="simulate-disconnect"
            onClick={() => service.simulateStatus("disconnected")}
          >
            Симуляция дисконнекта
          </button>
          <button
            data-testid="simulate-restore"
            onClick={() => service.simulateStatus("connected")}
          >
            Симуляция восстановления
          </button>
          <AppLayout />
        </div>
      );
    }

    renderWithProviders(<LayoutWithStatusControls />);

    // В обычном режиме статус "В сети" и баннера нет
    expect(screen.getByText("В сети")).toBeInTheDocument();
    expect(screen.queryByTestId("reconnection-banner")).not.toBeInTheDocument();

    // 1. Обрыв связи -> статус "reconnecting"
    fireEvent.click(screen.getByTestId("simulate-drop"));
    expect(screen.getByText("Переподключение")).toBeInTheDocument();
    expect(screen.getByTestId("reconnection-banner")).toBeInTheDocument();
    expect(
      screen.getByText("Соединение потеряно. Выполняется восстановление...")
    ).toBeInTheDocument();

    // 2. Исчерпание попыток -> статус "disconnected"
    fireEvent.click(screen.getByTestId("simulate-disconnect"));
    expect(screen.getByText("Отключено")).toBeInTheDocument();
    expect(
      screen.getByText("Соединение с сервером потеряно. Проверьте интернет-соединение.")
    ).toBeInTheDocument();
    expect(screen.getByTestId("reconnect-button")).toBeInTheDocument();

    // 3. Восстановление связи -> статус "connected"
    fireEvent.click(screen.getByTestId("simulate-restore"));
    expect(screen.getByText("В сети")).toBeInTheDocument();
    expect(screen.queryByTestId("reconnection-banner")).not.toBeInTheDocument();
  });

  it("prevents double-click race condition on taking tickets (TUSS-FE-33)", async () => {
    setupAuth("operator_l1");

    vi.spyOn(ticketsApi, "getNewTicketsQueue").mockResolvedValueOnce([mockTicket]);
    vi.spyOn(ticketsApi, "getMyActiveTicket").mockResolvedValueOnce(null);

    // Задержка ответа API для проверки одновременных кликов
    let resolveAssign: (val: any) => void;
    const assignPromise = new Promise((resolve) => {
      resolveAssign = resolve;
    });
    const assignSpy = vi.spyOn(ticketsApi, "assignTicket").mockImplementation(() => assignPromise as any);

    renderWithProviders(<QueueNewRoute />, { initialEntries: ["/queue/new"] });

    expect(await screen.findByText("#101")).toBeInTheDocument();

    const takeButton = screen.getByTestId("take-ticket-button-t-101");

    // Первый клик
    fireEvent.click(takeButton);
    expect(assignSpy).toHaveBeenCalledTimes(1);

    // Второй клик во время выполнения запроса (Double-click)
    fireEvent.click(takeButton);
    // Запрос НЕ должен дублироваться
    expect(assignSpy).toHaveBeenCalledTimes(1);

    // Разрешаем промис
    resolveAssign!({ ...mockTicket, assignedOperatorId: "u-op-001" });
  });
});

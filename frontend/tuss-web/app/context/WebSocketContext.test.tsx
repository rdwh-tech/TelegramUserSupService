import React from "react";
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WebSocketProvider, useWebSocket } from "./WebSocketContext";
import { WebSocketService } from "~/services/websocket";
import type { Ticket } from "~/types/ticket";
import type { TicketMessage } from "~/types/message";

const createMockTicket = (id: string, ticketNumber: number, fullName: string): Ticket => ({
  id,
  ticketNumber,
  status: "new",
  escalationLevel: "l1",
  firstMessagePreview: "Проблема с оплатой",
  companyId: "comp-1",
  clientId: `c-${id}`,
  assignedOperatorId: null,
  slaPolicyId: "sla-1",
  escalationReason: null,
  escalatedByUserId: null,
  escalatedAt: null,
  firstResponseAt: null,
  closedAt: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  client: {
    id: `c-${id}`,
    companyId: "comp-1",
    telegramUserId: 12345,
    telegramChatId: 54321,
    username: "user",
    fullName,
    createdAt: new Date().toISOString(),
  },
});

function TestConsumer() {
  const { status, isConnected, simulateEvent, reconnect } = useWebSocket();

  return (
    <div>
      <span data-testid="ws-status">{status}</span>
      <span data-testid="ws-connected">{String(isConnected)}</span>
      <button
        onClick={() =>
          simulateEvent({
            type: "ticket.created",
            payload: {
              ticket: createMockTicket("t-ws-100", 100, "Иван Иванов"),
            },
          })
        }
      >
        Simulate Created
      </button>
      <button
        onClick={() =>
          simulateEvent({
            type: "ticket.assigned",
            payload: {
              ticketId: "t-ws-100",
              assignedTo: "u-operator-2",
            },
          })
        }
      >
        Simulate Assigned
      </button>
      <button
        onClick={() =>
          simulateEvent({
            type: "chat.message_received",
            payload: {
              ticketId: "t-ws-100",
              message: {
                id: "msg-ws-1",
                ticketId: "t-ws-100",
                senderType: "client",
                senderName: "Иван Иванов",
                text: "Помогите с заказом",
                isDelivered: true,
                createdAt: new Date().toISOString(),
              },
            },
          })
        }
      >
        Simulate Message
      </button>
      <button onClick={reconnect}>Reconnect</button>
    </div>
  );
}

describe("WebSocketContext & Real-Time Sync (TUSS-FE-30, TUSS-FE-31)", () => {
  let queryClient: QueryClient;
  let service: WebSocketService;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    service = new WebSocketService();
  });

  it("provides connected status and integrates with query cache", () => {
    render(
      <QueryClientProvider client={queryClient}>
        <WebSocketProvider service={service}>
          <TestConsumer />
        </WebSocketProvider>
      </QueryClientProvider>
    );

    expect(screen.getByTestId("ws-status").textContent).toBe("connected");
    expect(screen.getByTestId("ws-connected").textContent).toBe("true");
  });

  it("updates L1 queue cache when ticket.created event arrives (TUSS-FE-30)", () => {
    // Initial cache with 1 ticket
    const initialTicket = createMockTicket("t-existing", 99, "Анна");
    queryClient.setQueryData<Ticket[]>(["tickets", "queue", "l1"], [initialTicket]);

    render(
      <QueryClientProvider client={queryClient}>
        <WebSocketProvider service={service}>
          <TestConsumer />
        </WebSocketProvider>
      </QueryClientProvider>
    );

    act(() => {
      screen.getByText("Simulate Created").click();
    });

    const updatedQueue = queryClient.getQueryData<Ticket[]>([
      "tickets",
      "queue",
      "l1",
    ]);

    expect(updatedQueue).toHaveLength(2);
    expect(updatedQueue?.[0].id).toBe("t-ws-100");
    expect(updatedQueue?.[1].id).toBe("t-existing");
  });

  it("removes ticket from queues in real time when ticket.assigned arrives (TUSS-FE-30 AC 3)", () => {
    const ticketToTake = createMockTicket("t-ws-100", 100, "Иван");
    queryClient.setQueryData<Ticket[]>([
      "tickets",
      "queue",
      "l1",
    ], [ticketToTake]);

    render(
      <QueryClientProvider client={queryClient}>
        <WebSocketProvider service={service}>
          <TestConsumer />
        </WebSocketProvider>
      </QueryClientProvider>
    );

    expect(queryClient.getQueryData(["tickets", "queue", "l1"])).toHaveLength(1);

    act(() => {
      screen.getByText("Simulate Assigned").click();
    });

    const queueAfterAssign = queryClient.getQueryData<Ticket[]>([
      "tickets",
      "queue",
      "l1",
    ]);
    expect(queueAfterAssign).toHaveLength(0);
  });

  it("appends message to chat query data when chat.message_received arrives (TUSS-FE-30)", () => {
    queryClient.setQueryData<TicketMessage[]>(
      ["ticket", "t-ws-100", "messages"],
      []
    );

    render(
      <QueryClientProvider client={queryClient}>
        <WebSocketProvider service={service}>
          <TestConsumer />
        </WebSocketProvider>
      </QueryClientProvider>
    );

    act(() => {
      screen.getByText("Simulate Message").click();
    });

    const messages = queryClient.getQueryData<TicketMessage[]>([
      "ticket",
      "t-ws-100",
      "messages",
    ]);
    expect(messages).toHaveLength(1);
    expect(messages?.[0].text).toBe("Помогите с заказом");
  });
});

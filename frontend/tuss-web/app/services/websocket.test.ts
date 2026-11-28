import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { WebSocketService } from "./websocket";
import type { TicketCreatedEvent, TicketAssignedEvent } from "~/types/websocket";

describe("WebSocketService (TUSS-FE-30, TUSS-FE-31)", () => {
  let service: WebSocketService;

  beforeEach(() => {
    vi.useFakeTimers();
    service = new WebSocketService({
      maxReconnectAttempts: 3,
      initialReconnectDelay: 500,
      maxReconnectDelay: 2000,
    });
  });

  afterEach(() => {
    service.disconnect();
    vi.useRealTimers();
  });

  it("initializes with disconnected status", () => {
    expect(service.getStatus()).toBe("disconnected");
    expect(service.isConnected()).toBe(false);
  });

  it("notifies status handlers on status transition", () => {
    const statusSpy = vi.fn();
    service.onStatusChange(statusSpy);

    expect(statusSpy).toHaveBeenCalledWith("disconnected");

    service.connect();
    expect(statusSpy).toHaveBeenCalledWith("connected");
    expect(service.isConnected()).toBe(true);
  });

  it("subscribes and dispatches typed events", () => {
    const createdSpy = vi.fn();
    const unsub = service.on("ticket.created", createdSpy);

    const mockEvent: TicketCreatedEvent = {
      type: "ticket.created",
      payload: {
        ticket: {
          id: "t-realtime-001",
          ticketNumber: 101,
          status: "new",
          escalationLevel: "l1",
          firstMessagePreview: "Проблема с оплатой",
          companyId: "c-1",
          clientId: "c-001",
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
            id: "c-001",
            companyId: "c-1",
            telegramUserId: 1234567,
            telegramChatId: 7654321,
            username: "asmirnov",
            fullName: "Алексей Смирнов",
            createdAt: new Date().toISOString(),
          },
        },
      },
    };

    service.emit(mockEvent);
    expect(createdSpy).toHaveBeenCalledWith(mockEvent);

    // After unsubscribe, handler should not be called
    unsub();
    service.emit(mockEvent);
    expect(createdSpy).toHaveBeenCalledTimes(1);
  });

  it("handles disconnection and manual reconnect", () => {
    service.connect();
    expect(service.isConnected()).toBe(true);

    service.disconnect();
    expect(service.getStatus()).toBe("disconnected");

    service.reconnect();
    expect(service.getStatus()).toBe("connected");
  });

  it("handles simulateStatus transitions", () => {
    const statusSpy = vi.fn();
    service.onStatusChange(statusSpy);

    service.simulateStatus("reconnecting");
    expect(service.getStatus()).toBe("reconnecting");

    service.simulateStatus("disconnected");
    expect(service.getStatus()).toBe("disconnected");

    expect(statusSpy).toHaveBeenCalledWith("reconnecting");
    expect(statusSpy).toHaveBeenCalledWith("disconnected");
  });
});

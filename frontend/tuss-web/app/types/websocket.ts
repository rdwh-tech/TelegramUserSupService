// app/types/websocket.ts
import type { Ticket, TicketStatus } from "./ticket";
import type { TicketMessage } from "./message";

export type WebSocketConnectionStatus =
  | "connected"
  | "connecting"
  | "reconnecting"
  | "disconnected";

export interface TicketCreatedEvent {
  type: "ticket.created";
  payload: {
    ticket: Ticket;
  };
}

export interface TicketAssignedEvent {
  type: "ticket.assigned";
  payload: {
    ticketId: string;
    assignedTo: string;
    operatorName?: string;
  };
}

export interface TicketStatusChangedEvent {
  type: "ticket.status_changed";
  payload: {
    ticketId: string;
    status: TicketStatus;
    previousStatus?: TicketStatus;
    resolution?: string;
    escalatedReason?: string;
  };
}

export interface ChatMessageReceivedEvent {
  type: "chat.message_received";
  payload: {
    ticketId: string;
    message: TicketMessage;
  };
}

export interface StaffUpdatedEvent {
  type: "operator.invited" | "staff.updated";
  payload: {
    companyId: string;
    operatorId?: string;
  };
}

export type WebSocketEvent =
  | TicketCreatedEvent
  | TicketAssignedEvent
  | TicketStatusChangedEvent
  | ChatMessageReceivedEvent
  | StaffUpdatedEvent;

export type WebSocketEventType = WebSocketEvent["type"];

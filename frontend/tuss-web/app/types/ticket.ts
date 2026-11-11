// app/types/ticket.ts
import type { SLATimerInfo } from "./sla";

export type TicketStatus = "new" | "in_progress" | "waiting_client" | "closed";
export type TicketLineLevel = "l1" | "l2";

export interface TelegramClient {
  id: string;
  companyId: string;
  telegramUserId: number;
  telegramChatId: number;
  username: string | null;
  fullName: string;
  createdAt: string;
}

export interface Ticket {
  id: string;
  ticketNumber: number;
  companyId: string;
  clientId: string;
  client: TelegramClient;
  assignedOperatorId: string | null;
  assignedOperatorName?: string | null;
  slaPolicyId: string;
  status: TicketStatus;
  escalationLevel: TicketLineLevel;
  firstMessagePreview: string | null;
  escalationReason: string | null;
  escalatedByUserId: string | null;
  escalatedByUserName?: string | null;
  escalatedAt: string | null;
  firstResponseAt: string | null;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
  sla?: {
    frt: SLATimerInfo;
    ttr: SLATimerInfo;
  };
}

export interface EscalateTicketPayload {
  reason?: string;
}

export interface CloseTicketPayload {
  resolutionNotes?: string;
}

// app/api/tickets.ts
import { apiClient } from "./client";
import type {
  Ticket,
  EscalateTicketPayload,
  CloseTicketPayload,
} from "~/types/ticket";
import type { TicketMessage, SendMessagePayload } from "~/types/message";

export const ticketsApi = {
  // Очередь тикетов L1 (новые)
  async getNewTicketsQueue(): Promise<Ticket[]> {
    const { data } = await apiClient.get<Ticket[]>("/tickets/queue/l1");
    return data;
  },

  // Очередь эскалаций L2
  async getEscalatedTicketsQueue(): Promise<Ticket[]> {
    const { data } = await apiClient.get<Ticket[]>("/tickets/queue/l2");
    return data;
  },

  // Активный тикет текущего оператора ("в одни руки")
  async getMyActiveTicket(): Promise<Ticket | null> {
    const { data } = await apiClient.get<Ticket | null>("/tickets/my-active");
    return data;
  },

  // Карточка тикета по ID
  async getTicketById(ticketId: string): Promise<Ticket> {
    const { data } = await apiClient.get<Ticket>(`/tickets/${ticketId}`);
    return data;
  },

  // Взять тикет в работу
  async assignTicket(ticketId: string): Promise<Ticket> {
    const { data } = await apiClient.post<Ticket>(`/tickets/${ticketId}/assign`);
    return data;
  },

  // Эскалировать на L2
  async escalateTicket(ticketId: string, payload: EscalateTicketPayload): Promise<Ticket> {
    const { data } = await apiClient.post<Ticket>(`/tickets/${ticketId}/escalate`, payload);
    return data;
  },

  // Закрыть тикет
  async closeTicket(ticketId: string, payload?: CloseTicketPayload): Promise<Ticket> {
    const { data } = await apiClient.post<Ticket>(`/tickets/${ticketId}/close`, payload);
    return data;
  },

  // История переписки тикета
  async getMessages(ticketId: string): Promise<TicketMessage[]> {
    const { data } = await apiClient.get<TicketMessage[]>(`/tickets/${ticketId}/messages`);
    return data;
  },

  // Отправка сообщения
  async sendMessage(payload: SendMessagePayload): Promise<TicketMessage> {
    if (payload.attachments && payload.attachments.length > 0) {
      const formData = new FormData();
      formData.append("text", payload.text);
      payload.attachments.forEach((file) => formData.append("files", file));

      const { data } = await apiClient.post<TicketMessage>(
        `/tickets/${payload.ticketId}/messages`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      return data;
    }

    const { data } = await apiClient.post<TicketMessage>(
      `/tickets/${payload.ticketId}/messages`,
      { text: payload.text }
    );
    return data;
  },
};

// app/mocks/handlers/tickets.ts
import { http, HttpResponse, delay } from "msw";
import { mockTickets, mockMessages, mockUsers } from "../data";
import type { EscalateTicketPayload, Ticket } from "~/types";

let currentActiveTicket: Ticket | null = null;

export const ticketsHandlers = [
  // Очередь новых тикетов L1 (FR-WEB-7)
  http.get("*/api/tickets/queue/l1", async () => {
    await delay(300);
    const l1Tickets = mockTickets.filter(
      (t) => t.status === "new" && t.escalationLevel === "l1"
    );
    return HttpResponse.json(l1Tickets);
  }),

  // Очередь эскалаций L2 (FR-WEB-10)
  http.get("*/api/tickets/queue/l2", async () => {
    await delay(300);
    const l2Tickets = mockTickets.filter(
      (t) => t.status === "new" && t.escalationLevel === "l2"
    );
    return HttpResponse.json(l2Tickets);
  }),

  // Мой активный тикет ("в одни руки") (FR-WEB-8)
  http.get("*/api/tickets/my-active", async () => {
    await delay(200);
    return HttpResponse.json(currentActiveTicket);
  }),

  // Карточка конкретного тикета
  http.get("*/api/tickets/:id", async ({ params }) => {
    await delay(250);
    const ticket =
      mockTickets.find((t) => t.id === params.id) ||
      (currentActiveTicket?.id === params.id ? currentActiveTicket : null);

    if (!ticket) {
      return HttpResponse.json({ message: "Тикет не найден" }, { status: 404 });
    }
    return HttpResponse.json(ticket);
  }),

  // Взять тикет в работу (FR-WEB-8)
  http.post("*/api/tickets/:id/assign", async ({ params }) => {
    await delay(400);

    // Бизнес-правило "в одни руки"
    if (currentActiveTicket) {
      return HttpResponse.json(
        {
          message: `У вас уже есть активный тикет #${currentActiveTicket.ticketNumber}. Завершите его перед взятием следующего.`,
        },
        { status: 409 }
      );
    }

    const ticketIndex = mockTickets.findIndex((t) => t.id === params.id);
    if (ticketIndex === -1) {
      return HttpResponse.json({ message: "Тикет уже взят другим оператором" }, { status: 404 });
    }

    const targetTicket = mockTickets[ticketIndex];
    const assigned: Ticket = {
      ...targetTicket,
      status: "in_progress",
      assignedOperatorId: mockUsers.operator_l1.id,
      assignedOperatorName: mockUsers.operator_l1.fullName,
      updatedAt: new Date().toISOString(),
    };

    mockTickets.splice(ticketIndex, 1);
    currentActiveTicket = assigned;

    return HttpResponse.json(assigned);
  }),

  // Эскалация на L2 (FR-WEB-9)
  http.post("*/api/tickets/:id/escalate", async ({ params, request }) => {
    await delay(350);
    const body = (await request.json().catch(() => ({}))) as EscalateTicketPayload;

    const ticket = currentActiveTicket || mockTickets.find((t) => t.id === params.id);
    if (!ticket) {
      return HttpResponse.json({ message: "Тикет не найден" }, { status: 404 });
    }

    const escalatedTicket: Ticket = {
      ...ticket,
      status: "new",
      escalationLevel: "l2",
      assignedOperatorId: null,
      assignedOperatorName: null,
      escalationReason: body.reason || "Передано на старшую линию",
      escalatedByUserId: mockUsers.operator_l1.id,
      escalatedByUserName: mockUsers.operator_l1.fullName,
      escalatedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      sla: {
        frt: { status: "ok", remainingSeconds: 300, formattedTime: "5 мин.", isPaused: false },
        ttr: { status: "ok", remainingSeconds: 3600, formattedTime: "60 мин.", isPaused: false },
      },
    };

    if (currentActiveTicket?.id === ticket.id) {
      currentActiveTicket = null;
    }

    mockTickets.push(escalatedTicket);
    return HttpResponse.json(escalatedTicket);
  }),

  // Закрытие тикета (FR-WEB-12)
  http.post("*/api/tickets/:id/close", async ({ params }) => {
    await delay(350);

    const ticket = currentActiveTicket || mockTickets.find((t) => t.id === params.id);
    if (!ticket) {
      return HttpResponse.json({ message: "Тикет не найден" }, { status: 404 });
    }

    const closedTicket: Ticket = {
      ...ticket,
      status: "closed",
      closedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (currentActiveTicket?.id === ticket.id) {
      currentActiveTicket = null;
    }

    return HttpResponse.json(closedTicket);
  }),

  // Сообщения по тикету (FR-WEB-11)
  http.get("*/api/tickets/:id/messages", async ({ params }) => {
    await delay(200);
    const messages = mockMessages[params.id as string] || [];
    return HttpResponse.json(messages);
  }),

  // Отправка нового сообщения (FR-WEB-11)
  http.post("*/api/tickets/:id/messages", async ({ params, request }) => {
    await delay(300);
    let text = "";

    const contentType = request.headers.get("Content-Type") || "";
    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      text = (formData.get("text") as string) || "";
    } else {
      const json = (await request.json()) as { text: string };
      text = json.text;
    }

    const ticketId = params.id as string;
    const newMessage = {
      id: `m-${Date.now()}`,
      ticketId,
      senderType: "operator" as const,
      senderUserId: mockUsers.operator_l1.id,
      senderName: mockUsers.operator_l1.fullName,
      text,
      isDelivered: true,
      createdAt: new Date().toISOString(),
    };

    if (!mockMessages[ticketId]) {
      mockMessages[ticketId] = [];
    }
    mockMessages[ticketId].push(newMessage);

    return HttpResponse.json(newMessage);
  }),
];

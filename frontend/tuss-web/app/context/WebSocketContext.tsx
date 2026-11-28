// app/context/WebSocketContext.tsx
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "~/context/AuthContext";
import {
  WebSocketService,
  webSocketService,
} from "~/services/websocket";
import type {
  WebSocketConnectionStatus,
  WebSocketEvent,
} from "~/types/websocket";
import type { Ticket } from "~/types/ticket";
import type { TicketMessage } from "~/types/message";

export interface WebSocketContextValue {
  status: WebSocketConnectionStatus;
  isConnected: boolean;
  isReconnecting: boolean;
  isDisconnected: boolean;
  reconnect: () => void;
  simulateEvent: (event: WebSocketEvent) => void;
  service: WebSocketService;
}

const WebSocketContext = createContext<WebSocketContextValue | null>(null);

export interface WebSocketProviderProps {
  children: React.ReactNode;
  service?: WebSocketService;
}

export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({
  children,
  service = webSocketService,
}) => {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<WebSocketConnectionStatus>(
    service.getStatus()
  );

  // Безопасное получение пользователя (в некоторых тестах AuthProvider может отсутствовать)
  let user: any = null;
  try {
    const auth = useAuth();
    user = auth?.user;
  } catch {
    user = null;
  }

  const prevStatusRef = useRef<WebSocketConnectionStatus>(status);

  // 1. Подписка на статус сокета
  useEffect(() => {
    const unsubscribe = service.onStatusChange((newStatus) => {
      const prev = prevStatusRef.current;
      setStatus(newStatus);
      prevStatusRef.current = newStatus;

      // При восстановлении соединения выполняем инвалидацию кэша (TUSS-FE-31, AC 4)
      if (
        (prev === "reconnecting" || prev === "disconnected") &&
        newStatus === "connected"
      ) {
        queryClient.invalidateQueries();
      }
    });

    return () => {
      unsubscribe();
    };
  }, [service, queryClient]);

  // 2. Подключение при авторизации сотрудника
  useEffect(() => {
    if (user?.companyId) {
      service.connect({
        companyId: String(user.companyId),
      });
    } else {
      // Для непривязанного или неавторизованного пользователя
      service.connect();
    }

    return () => {
      // При размонтировании провайдера закрываем соединение
      // service.disconnect();
    };
  }, [service, user?.companyId]);

  // 3. Подписка на шину событий реального времени (TUSS-FE-30)
  useEffect(() => {
    // 3.1. Создание нового тикета клиентом в Telegram -> мгновенное появление в очереди L1
    const unsubCreated = service.on("ticket.created", (event) => {
      const newTicket = event.payload.ticket;
      if (!newTicket) return;

      queryClient.setQueryData<Ticket[]>(["tickets", "queue", "l1"], (old) => {
        if (!old) return [newTicket];
        // Если тикет уже есть в списке — не дублируем
        if (old.some((t) => t.id === newTicket.id)) return old;
        return [newTicket, ...old];
      });

      // Также инвалидируем общую очередь для обновления счетчиков
      queryClient.invalidateQueries({ queryKey: ["tickets", "queue"] });
    });

    // 3.2. Взятие тикета сотрудником -> удаление карточки из очередей коллег (TUSS-FE-30, AC 3)
    const unsubAssigned = service.on("ticket.assigned", (event) => {
      const { ticketId } = event.payload;
      if (!ticketId) return;

      queryClient.setQueryData<Ticket[]>(["tickets", "queue", "l1"], (old) =>
        old ? old.filter((t) => t.id !== ticketId) : []
      );
      queryClient.setQueryData<Ticket[]>(["tickets", "queue", "l2"], (old) =>
        old ? old.filter((t) => t.id !== ticketId) : []
      );

      queryClient.invalidateQueries({ queryKey: ["tickets", "queue"] });
    });

    // 3.3. Изменение статуса тикета (закрытие, эскалация и т.д.)
    const unsubStatusChanged = service.on("ticket.status_changed", (event) => {
      const { ticketId, status: newTicketStatus } = event.payload;
      if (!ticketId) return;

      if (newTicketStatus === "closed") {
        // Убираем из всех очередей
        queryClient.setQueryData<Ticket[]>(["tickets", "queue", "l1"], (old) =>
          old ? old.filter((t) => t.id !== ticketId) : []
        );
        queryClient.setQueryData<Ticket[]>(["tickets", "queue", "l2"], (old) =>
          old ? old.filter((t) => t.id !== ticketId) : []
        );
      }

      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      queryClient.invalidateQueries({ queryKey: ["ticket", ticketId] });
      queryClient.invalidateQueries({ queryKey: ["analytics"] });
    });

    // 3.4. Входящие сообщения в чат активного тикета
    const unsubMessage = service.on("chat.message_received", (event) => {
      const { ticketId, message } = event.payload;
      if (!ticketId || !message) return;

      queryClient.setQueryData<TicketMessage[]>(
        ["ticket", ticketId, "messages"],
        (old) => {
          if (!old) return [message];
          if (old.some((m) => m.id === message.id)) return old;
          return [...old, message];
        }
      );

      // Обновляем preview последнего сообщения в очереди
      queryClient.invalidateQueries({ queryKey: ["ticket", ticketId] });
    });

    // 3.5. Обновления штата сотрудников
    const unsubStaff = service.on("operator.invited", () => {
      queryClient.invalidateQueries({ queryKey: ["staff"] });
    });

    return () => {
      unsubCreated();
      unsubAssigned();
      unsubStatusChanged();
      unsubMessage();
      unsubStaff();
    };
  }, [service, queryClient]);

  const reconnect = useCallback(() => {
    service.reconnect();
  }, [service]);

  const simulateEvent = useCallback(
    (event: WebSocketEvent) => {
      service.emit(event);
    },
    [service]
  );

  const value: WebSocketContextValue = {
    status,
    isConnected: status === "connected",
    isReconnecting: status === "reconnecting",
    isDisconnected: status === "disconnected",
    reconnect,
    simulateEvent,
    service,
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocket = (): WebSocketContextValue => {
  const context = useContext(WebSocketContext);
  if (!context) {
    // Безопасный fallback, если компонент рендерится вне WebSocketProvider
    return {
      status: "connected",
      isConnected: true,
      isReconnecting: false,
      isDisconnected: false,
      reconnect: () => {},
      simulateEvent: () => {},
      service: webSocketService,
    };
  }
  return context;
};

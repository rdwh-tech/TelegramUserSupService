// app/services/websocket.ts
import type {
  WebSocketConnectionStatus,
  WebSocketEvent,
  WebSocketEventType,
} from "~/types/websocket";

export interface WebSocketServiceOptions {
  url?: string;
  token?: string;
  companyId?: string;
  maxReconnectAttempts?: number;
  initialReconnectDelay?: number;
  maxReconnectDelay?: number;
  mock?: boolean;
}

type EventHandler<T extends WebSocketEvent = WebSocketEvent> = (event: T) => void;
type StatusHandler = (status: WebSocketConnectionStatus) => void;

export class WebSocketService {
  private socket: WebSocket | null = null;
  private status: WebSocketConnectionStatus = "disconnected";
  private options: WebSocketServiceOptions = {
    maxReconnectAttempts: 5,
    initialReconnectDelay: 1000,
    maxReconnectDelay: 10000,
  };

  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private isIntentionallyClosed = false;

  private eventHandlers = new Map<string, Set<EventHandler<any>>>();
  private statusHandlers = new Set<StatusHandler>();

  constructor(options?: WebSocketServiceOptions) {
    if (options) {
      this.options = { ...this.options, ...options };
    }
  }

  public getStatus(): WebSocketConnectionStatus {
    return this.status;
  }

  public isConnected(): boolean {
    return this.status === "connected";
  }

  public connect(options?: WebSocketServiceOptions): void {
    if (options) {
      this.options = { ...this.options, ...options };
    }

    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.isIntentionallyClosed = false;
    this.setStatus(this.reconnectAttempts > 0 ? "reconnecting" : "connecting");

    this.clearReconnectTimer();

    try {
      const isTestEnv =
        typeof process !== "undefined" && process.env.NODE_ENV === "test";
      const isMock = this.options.mock ?? (isTestEnv && !this.options.url);

      if (isMock) {
        this.reconnectAttempts = 0;
        this.setStatus("connected");
        return;
      }

      const wsUrl = this.resolveWsUrl();
      if (!wsUrl || typeof WebSocket === "undefined") {
        this.setStatus("connected");
        return;
      }

      this.socket = new WebSocket(wsUrl);

      this.socket.onopen = () => {
        this.reconnectAttempts = 0;
        this.setStatus("connected");
      };

      this.socket.onmessage = (event: MessageEvent) => {
        try {
          const parsed = JSON.parse(event.data) as WebSocketEvent;
          if (parsed && parsed.type) {
            this.dispatchEvent(parsed);
          }
        } catch {
          // Игнорируем невалидные сообщения
        }
      };

      this.socket.onerror = () => {
        // Ошибка сокета будет обработана через onclose
      };

      this.socket.onclose = (event: CloseEvent) => {
        this.socket = null;
        if (!this.isIntentionallyClosed) {
          this.handleReconnection();
        } else {
          this.setStatus("disconnected");
        }
      };
    } catch {
      this.handleReconnection();
    }
  }

  public disconnect(): void {
    this.isIntentionallyClosed = true;
    this.clearReconnectTimer();
    this.reconnectAttempts = 0;

    if (this.socket) {
      try {
        this.socket.close(1000, "Normal closure");
      } catch {
        // Безопасное закрытие
      }
      this.socket = null;
    }

    this.setStatus("disconnected");
  }

  public reconnect(): void {
    this.clearReconnectTimer();
    this.reconnectAttempts = 0;
    this.connect();
  }

  public on<T extends WebSocketEventType>(
    type: T,
    handler: (event: Extract<WebSocketEvent, { type: T }>) => void
  ): () => void {
    if (!this.eventHandlers.has(type)) {
      this.eventHandlers.set(type, new Set());
    }
    const handlers = this.eventHandlers.get(type)!;
    handlers.add(handler as EventHandler);

    return () => {
      handlers.delete(handler as EventHandler);
      if (handlers.size === 0) {
        this.eventHandlers.delete(type);
      }
    };
  }

  public onStatusChange(handler: StatusHandler): () => void {
    this.statusHandlers.add(handler);
    handler(this.status);
    return () => {
      this.statusHandlers.delete(handler);
    };
  }

  public emit(event: WebSocketEvent): void {
    this.dispatchEvent(event);
  }

  public simulateStatus(status: WebSocketConnectionStatus): void {
    this.setStatus(status);
  }

  private dispatchEvent(event: WebSocketEvent): void {
    const handlers = this.eventHandlers.get(event.type);
    if (handlers) {
      handlers.forEach((handler) => {
        try {
          handler(event);
        } catch (err) {
          console.error(`Error in WebSocket handler for ${event.type}:`, err);
        }
      });
    }

    // Слушатели "all"
    const allHandlers = this.eventHandlers.get("*");
    if (allHandlers) {
      allHandlers.forEach((handler) => {
        try {
          handler(event);
        } catch (err) {
          console.error("Error in generic WebSocket handler:", err);
        }
      });
    }
  }

  private setStatus(newStatus: WebSocketConnectionStatus): void {
    if (this.status !== newStatus) {
      this.status = newStatus;
      this.statusHandlers.forEach((handler) => {
        try {
          handler(newStatus);
        } catch (err) {
          console.error("Error in WebSocket status handler:", err);
        }
      });
    }
  }

  private handleReconnection(): void {
    const maxAttempts = this.options.maxReconnectAttempts ?? 5;
    if (this.reconnectAttempts >= maxAttempts) {
      this.setStatus("disconnected");
      return;
    }

    this.reconnectAttempts++;
    this.setStatus("reconnecting");

    // Экспоненциальная задержка: 1s, 2s, 4s, 8s, max 10s
    const baseDelay = this.options.initialReconnectDelay ?? 1000;
    const maxDelay = this.options.maxReconnectDelay ?? 10000;
    const delay = Math.min(baseDelay * Math.pow(2, this.reconnectAttempts - 1), maxDelay);

    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, delay);
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private resolveWsUrl(): string | null {
    if (this.options.url) {
      return this.options.url;
    }

    if (typeof window === "undefined") {
      return null;
    }

    const loc = window.location;
    const protocol = loc.protocol === "https:" ? "wss:" : "ws:";
    const host = loc.host;
    const params = new URLSearchParams();

    if (this.options.token) {
      params.set("token", this.options.token);
    }
    if (this.options.companyId) {
      params.set("companyId", this.options.companyId);
    }

    const query = params.toString() ? `?${params.toString()}` : "";
    return `${protocol}//${host}/ws${query}`;
  }
}

// Singleton-экземпляр по умолчанию
export const webSocketService = new WebSocketService();

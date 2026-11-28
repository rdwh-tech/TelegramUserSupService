import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
import { renderWithProviders } from "~/../test/test-utils";
import { ReconnectionBanner } from "./ReconnectionBanner";
import * as WebSocketContextModule from "~/context/WebSocketContext";
import { WebSocketService } from "~/services/websocket";

describe("ReconnectionBanner Component (TUSS-FE-31)", () => {
  const mockReconnect = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const setupWebSocket = (status: "connected" | "reconnecting" | "connecting" | "disconnected") => {
    vi.spyOn(WebSocketContextModule, "useWebSocket").mockReturnValue({
      status,
      isConnected: status === "connected",
      isReconnecting: status === "reconnecting" || status === "connecting",
      isDisconnected: status === "disconnected",
      reconnect: mockReconnect,
      simulateEvent: vi.fn(),
      service: new WebSocketService(),
    });
  };

  it("does not render when status is 'connected'", () => {
    setupWebSocket("connected");
    renderWithProviders(<ReconnectionBanner />);

    expect(screen.queryByTestId("reconnection-banner")).not.toBeInTheDocument();
  });

  it("renders warning banner when reconnecting (TUSS-FE-31 AC 2)", () => {
    setupWebSocket("reconnecting");
    renderWithProviders(<ReconnectionBanner />);

    expect(screen.getByTestId("reconnection-banner")).toBeInTheDocument();
    expect(
      screen.getByText("Соединение потеряно. Выполняется восстановление...")
    ).toBeInTheDocument();
  });

  it("renders error banner with retry button when disconnected (TUSS-FE-31 AC 3)", () => {
    setupWebSocket("disconnected");
    renderWithProviders(<ReconnectionBanner />);

    expect(screen.getByTestId("reconnection-banner")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Соединение с сервером потеряно. Проверьте интернет-соединение."
      )
    ).toBeInTheDocument();

    const retryButton = screen.getByTestId("reconnect-button");
    expect(retryButton).toBeInTheDocument();

    fireEvent.click(retryButton);
    expect(mockReconnect).toHaveBeenCalledTimes(1);
  });
});

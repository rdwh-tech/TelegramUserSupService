import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
import { renderWithProviders } from "~/../test/test-utils";
import { AppHeader } from "./AppHeader";
import * as AuthContextModule from "~/context/AuthContext";
import * as WebSocketContextModule from "~/context/WebSocketContext";
import { WebSocketService } from "~/services/websocket";
import type { User } from "~/types/user";

describe("AppHeader Component", () => {
  const mockLogout = vi.fn();
  const mockToggleSidebar = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const setupAuth = (user: User | null) => {
    vi.spyOn(AuthContextModule, "useAuth").mockReturnValue({
      user,
      isAuthenticated: !!user,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: mockLogout,
      refreshUser: vi.fn(),
    });
  };

  it("renders brand logo and connection status 'В сети'", () => {
    setupAuth({
      id: "u-1",
      login: "alex",
      fullName: "Алексей Иванов",
      role: "operator_l1",
      companyId: "c-001",
      companyName: "ООО Сервис",
      isBlocked: false,
      createdAt: "",
      updatedAt: "",
    });

    renderWithProviders(
      <AppHeader sidebarOpen={true} onToggleSidebar={mockToggleSidebar} isConnected={true} />
    );

    expect(screen.getByText("TUSS")).toBeInTheDocument();
    expect(screen.getByText("В сети")).toBeInTheDocument();
  });

  it("displays company name chip when user has company", () => {
    setupAuth({
      id: "u-1",
      login: "alex",
      fullName: "Алексей Иванов",
      role: "operator_l1",
      companyId: "c-001",
      companyName: "ООО Сервис IT",
      isBlocked: false,
      createdAt: "",
      updatedAt: "",
    });

    renderWithProviders(
      <AppHeader sidebarOpen={true} onToggleSidebar={mockToggleSidebar} />
    );

    expect(screen.getByText("ООО Сервис IT")).toBeInTheDocument();
  });

  it("displays 'Ожидание привязки' when user has no companyId", () => {
    setupAuth({
      id: "u-2",
      login: "new_op",
      fullName: "Новый Оператор",
      role: "unassigned_operator",
      companyId: null,
      companyName: null,
      isBlocked: false,
      createdAt: "",
      updatedAt: "",
    });

    renderWithProviders(
      <AppHeader sidebarOpen={true} onToggleSidebar={mockToggleSidebar} />
    );

    expect(screen.getByText("Ожидание привязки")).toBeInTheDocument();
    expect(screen.getByText("Без компании")).toBeInTheDocument();
  });

  it("renders role badges correctly for admin, l2, l1", () => {
    setupAuth({
      id: "u-3",
      login: "boss",
      fullName: "Главный Админ",
      role: "admin",
      companyId: "c-001",
      isBlocked: false,
      createdAt: "",
      updatedAt: "",
    });

    renderWithProviders(
      <AppHeader sidebarOpen={true} onToggleSidebar={mockToggleSidebar} />
    );

    expect(screen.getByText("Администратор")).toBeInTheDocument();
    expect(screen.getByText("Главный Админ")).toBeInTheDocument();
  });

  it("calls onToggleSidebar when menu button is clicked", () => {
    setupAuth({
      id: "u-1",
      login: "alex",
      fullName: "Алексей",
      role: "operator_l1",
      companyId: "c-001",
      isBlocked: false,
      createdAt: "",
      updatedAt: "",
    });

    renderWithProviders(
      <AppHeader sidebarOpen={true} onToggleSidebar={mockToggleSidebar} />
    );

    const menuButton = screen.getByLabelText("свернуть меню");
    fireEvent.click(menuButton);
    expect(mockToggleSidebar).toHaveBeenCalledTimes(1);
  });

  it("calls logout when exit button is clicked", () => {
    setupAuth({
      id: "u-1",
      login: "alex",
      fullName: "Алексей",
      role: "operator_l1",
      companyId: "c-001",
      isBlocked: false,
      createdAt: "",
      updatedAt: "",
    });

    renderWithProviders(
      <AppHeader sidebarOpen={true} onToggleSidebar={mockToggleSidebar} />
    );

    const logoutButton = screen.getByLabelText("Выйти из системы");
    fireEvent.click(logoutButton);
    expect(mockLogout).toHaveBeenCalledTimes(1);
  });

  it("renders 'Переподключение' when WebSocket is reconnecting (TUSS-FE-31 AC 1)", () => {
    setupAuth({
      id: "u-1",
      login: "alex",
      fullName: "Алексей",
      role: "operator_l1",
      companyId: "c-001",
      isBlocked: false,
      createdAt: "",
      updatedAt: "",
    });

    vi.spyOn(WebSocketContextModule, "useWebSocket").mockReturnValue({
      status: "reconnecting",
      isConnected: false,
      isReconnecting: true,
      isDisconnected: false,
      reconnect: vi.fn(),
      simulateEvent: vi.fn(),
      service: new WebSocketService(),
    });

    renderWithProviders(
      <AppHeader sidebarOpen={true} onToggleSidebar={mockToggleSidebar} />
    );

    expect(screen.getByText("Переподключение")).toBeInTheDocument();
  });

  it("renders 'Отключено' and allows reconnect on click (TUSS-FE-31 AC 1)", () => {
    setupAuth({
      id: "u-1",
      login: "alex",
      fullName: "Алексей",
      role: "operator_l1",
      companyId: "c-001",
      isBlocked: false,
      createdAt: "",
      updatedAt: "",
    });

    const mockReconnect = vi.fn();
    vi.spyOn(WebSocketContextModule, "useWebSocket").mockReturnValue({
      status: "disconnected",
      isConnected: false,
      isReconnecting: false,
      isDisconnected: true,
      reconnect: mockReconnect,
      simulateEvent: vi.fn(),
      service: new WebSocketService(),
    });

    renderWithProviders(
      <AppHeader sidebarOpen={true} onToggleSidebar={mockToggleSidebar} />
    );

    expect(screen.getByText("Отключено")).toBeInTheDocument();

    const indicator = screen.getByTestId("connection-status-indicator");
    fireEvent.click(indicator);
    expect(mockReconnect).toHaveBeenCalledTimes(1);
  });
});

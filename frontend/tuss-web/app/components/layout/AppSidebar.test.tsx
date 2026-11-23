import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "~/../test/test-utils";
import { AppSidebar } from "./AppSidebar";
import * as AuthContextModule from "~/context/AuthContext";
import type { UserRole, User } from "~/types/user";

describe("AppSidebar Component (RBAC Navigation)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const setupRole = (role: UserRole) => {
    const user: User = {
      id: "u-test",
      login: "testuser",
      fullName: "Тестовый Пользователь",
      role,
      companyId: role === "unassigned_operator" ? null : "c-001",
      isBlocked: false,
      createdAt: "",
      updatedAt: "",
    };

    vi.spyOn(AuthContextModule, "useAuth").mockReturnValue({
      user,
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      refreshUser: vi.fn(),
    });
  };

  it("renders L1 operator menu items strictly according to SRS Table В.1", () => {
    setupRole("operator_l1");
    renderWithProviders(<AppSidebar isOpen={true} />);

    expect(screen.getByText("Новые обращения")).toBeInTheDocument();
    expect(screen.getByText("Мой активный тикет")).toBeInTheDocument();
    expect(screen.getByText("Архив тикетов")).toBeInTheDocument();

    // Запрещенные разделы не должны отображаться
    expect(screen.queryByText("Очередь эскалаций")).not.toBeInTheDocument();
    expect(screen.queryByText("Сотрудники")).not.toBeInTheDocument();
    expect(screen.queryByText("Настройки компании")).not.toBeInTheDocument();
  });

  it("renders L2 senior operator menu items strictly according to SRS Table В.1", () => {
    setupRole("operator_l2");
    renderWithProviders(<AppSidebar isOpen={true} />);

    expect(screen.getByText("Очередь эскалаций")).toBeInTheDocument();
    expect(screen.getByText("Мой активный тикет")).toBeInTheDocument();
    expect(screen.getByText("Архив тикетов")).toBeInTheDocument();

    expect(screen.queryByText("Новые обращения")).not.toBeInTheDocument();
    expect(screen.queryByText("Сотрудники")).not.toBeInTheDocument();
  });

  it("renders Admin menu items and monitoring audit section according to SRS Table В.1", () => {
    setupRole("admin");
    renderWithProviders(<AppSidebar isOpen={true} />);

    expect(screen.getByText("Аналитика и SLA")).toBeInTheDocument();
    expect(screen.getByText("Сотрудники")).toBeInTheDocument();
    expect(screen.getByText("Настройки компании")).toBeInTheDocument();
    expect(screen.getByText("Мониторинг")).toBeInTheDocument();
    expect(screen.getByText("Очередь L1 (Аудит)")).toBeInTheDocument();
    expect(screen.getByText("Очередь L2 (Аудит)")).toBeInTheDocument();
  });

  it("renders unassigned operator menu item", () => {
    setupRole("unassigned_operator");
    renderWithProviders(<AppSidebar isOpen={true} />);

    expect(screen.getByText("Код подключения")).toBeInTheDocument();
    expect(screen.queryByText("Новые обращения")).not.toBeInTheDocument();
    expect(screen.queryByText("Аналитика и SLA")).not.toBeInTheDocument();
  });

  it("hides text labels when collapsed to 72px icons rail", () => {
    setupRole("operator_l1");
    renderWithProviders(<AppSidebar isOpen={false} />);

    // Текстовые подписи скрыты при isOpen={false}
    expect(screen.queryByText("Новые обращения")).not.toBeInTheDocument();
    expect(screen.queryByText("TUSS Web Desk v1.0")).not.toBeInTheDocument();
  });
});

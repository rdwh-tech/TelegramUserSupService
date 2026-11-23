import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "~/../test/test-utils";
import { RoleGuard } from "./RoleGuard";
import * as AuthContextModule from "~/context/AuthContext";
import type { User } from "~/types/user";

describe("RoleGuard Component (RBAC Protection)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const setupAuth = (user: User | null, isAuthenticated = true, isLoading = false) => {
    vi.spyOn(AuthContextModule, "useAuth").mockReturnValue({
      user,
      isAuthenticated,
      isLoading,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      refreshUser: vi.fn(),
    });
  };

  it("shows loading state when auth is loading", () => {
    setupAuth(null, false, true);

    renderWithProviders(
      <RoleGuard>
        <div>Секретный контент</div>
      </RoleGuard>
    );

    expect(screen.getByText("Проверка прав доступа...")).toBeInTheDocument();
    expect(screen.queryByText("Секретный контент")).not.toBeInTheDocument();
  });

  it("blocks and shows blocked screen if user.isBlocked is true", () => {
    setupAuth({
      id: "u-blocked",
      login: "bad_guy",
      fullName: "Заблокированный",
      role: "operator_l1",
      companyId: "c-001",
      isBlocked: true,
      createdAt: "",
      updatedAt: "",
    });

    renderWithProviders(
      <RoleGuard>
        <div>Секретный контент</div>
      </RoleGuard>
    );

    expect(screen.getByText("Учетная запись заблокирована")).toBeInTheDocument();
    expect(screen.queryByText("Секретный контент")).not.toBeInTheDocument();
  });

  it("shows 'Доступ ограничен' when user role is not in allowedRoles", () => {
    setupAuth({
      id: "u-l1",
      login: "alex_l1",
      fullName: "Алексей L1",
      role: "operator_l1",
      companyId: "c-001",
      isBlocked: false,
      createdAt: "",
      updatedAt: "",
    });

    renderWithProviders(
      <RoleGuard allowedRoles={["admin"]}>
        <div>Панель администратора</div>
      </RoleGuard>
    );

    expect(screen.getByText("Доступ ограничен")).toBeInTheDocument();
    expect(screen.getByText(/Раздел недоступен для вашей роли/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Вернуться в рабочую область" })).toBeInTheDocument();
    expect(screen.queryByText("Панель администратора")).not.toBeInTheDocument();
  });

  it("renders protected children when user role is allowed and attached to company", () => {
    setupAuth({
      id: "u-adm",
      login: "admin_boss",
      fullName: "Администратор",
      role: "admin",
      companyId: "c-001",
      isBlocked: false,
      createdAt: "",
      updatedAt: "",
    });

    renderWithProviders(
      <RoleGuard allowedRoles={["admin"]}>
        <div>Панель администратора</div>
      </RoleGuard>
    );

    expect(screen.getByText("Панель администратора")).toBeInTheDocument();
  });

  it("allows unassigned operator to view onboarding screen when requireCompany is false", () => {
    setupAuth({
      id: "u-new",
      login: "new_op",
      fullName: "Новичок",
      role: "unassigned_operator",
      companyId: null,
      isBlocked: false,
      createdAt: "",
      updatedAt: "",
    });

    renderWithProviders(
      <RoleGuard requireCompany={false} allowedRoles={["unassigned_operator", "operator_l1"]}>
        <div>Экран ввода инвайт-кода</div>
      </RoleGuard>
    );

    expect(screen.getByText("Экран ввода инвайт-кода")).toBeInTheDocument();
  });
});

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "~/../test/test-utils";
import AppLayout from "./AppLayout";
import * as AuthContextModule from "~/context/AuthContext";
import type { User } from "~/types/user";

describe("AppLayout Component (3-Zone Shell)", () => {
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

  it("shows loading workspace indicator when auth is loading", () => {
    setupAuth(null, false, true);
    renderWithProviders(<AppLayout />);

    expect(screen.getByText("Загрузка рабочего пространства...")).toBeInTheDocument();
  });

  it("renders 3-zone shell (Header, Sidebar, Main Content) for authenticated user", () => {
    setupAuth({
      id: "u-l1",
      login: "alex_l1",
      fullName: "Алексей Иванов",
      role: "operator_l1",
      companyId: "c-001",
      companyName: "ООО Сервис",
      isBlocked: false,
      createdAt: "",
      updatedAt: "",
    });

    renderWithProviders(<AppLayout />, { initialEntries: ["/queue/new"] });

    // 1. Header elements
    expect(screen.getByText("TUSS")).toBeInTheDocument();
    expect(screen.getByText("ООО Сервис")).toBeInTheDocument();

    // 2. Sidebar elements
    expect(screen.getByText("Новые обращения")).toBeInTheDocument();
    expect(screen.getByText("Мой активный тикет")).toBeInTheDocument();

    // 3. Main container present
    expect(document.querySelector("main")).toBeInTheDocument();
  });

  it("hides sidebar on onboarding routes according to SRS 4.1.2", () => {
    setupAuth({
      id: "u-new",
      login: "mikhail",
      fullName: "Михаил",
      role: "unassigned_operator",
      companyId: null,
      companyName: null,
      isBlocked: false,
      createdAt: "",
      updatedAt: "",
    });

    renderWithProviders(<AppLayout />, { initialEntries: ["/onboarding/invite-code"] });

    // Сайдбар не должен присутствовать на экране онбординга
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
    expect(screen.queryByText("Код подключения")).not.toBeInTheDocument();
  });
});

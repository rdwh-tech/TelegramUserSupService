import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "~/../test/test-utils";
import HomeRoute from "./home";
import * as AuthContextModule from "~/context/AuthContext";
import type { User } from "~/types/user";

const mockNavigate = vi.fn();

vi.mock("react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router")>();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe("Home Route (Role-based Dispatcher)", () => {
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

  it("redirects unauthenticated users to /login", () => {
    setupAuth(null, false, false);
    renderWithProviders(<HomeRoute />);

    expect(mockNavigate).toHaveBeenCalledWith("/login", { replace: true });
  });

  it("redirects unassigned operator to /onboarding/invite-code", () => {
    setupAuth({
      id: "u-1",
      login: "mikhail",
      fullName: "Михаил",
      role: "unassigned_operator",
      companyId: null,
      isBlocked: false,
      createdAt: "",
      updatedAt: "",
    });

    renderWithProviders(<HomeRoute />);

    expect(mockNavigate).toHaveBeenCalledWith("/onboarding/invite-code", { replace: true });
  });

  it("redirects admin without company to /onboarding/create-company", () => {
    setupAuth({
      id: "u-2",
      login: "admin_new",
      fullName: "Админ",
      role: "admin",
      companyId: null,
      isBlocked: false,
      createdAt: "",
      updatedAt: "",
    });

    renderWithProviders(<HomeRoute />);

    expect(mockNavigate).toHaveBeenCalledWith("/onboarding/create-company", { replace: true });
  });

  it("redirects operator L1 with company to /queue/new", () => {
    setupAuth({
      id: "u-3",
      login: "alex_l1",
      fullName: "Алексей",
      role: "operator_l1",
      companyId: "c-001",
      isBlocked: false,
      createdAt: "",
      updatedAt: "",
    });

    renderWithProviders(<HomeRoute />);

    expect(mockNavigate).toHaveBeenCalledWith("/queue/new", { replace: true });
  });

  it("redirects senior operator L2 with company to /queue/escalated", () => {
    setupAuth({
      id: "u-4",
      login: "daria_l2",
      fullName: "Дарья",
      role: "operator_l2",
      companyId: "c-001",
      isBlocked: false,
      createdAt: "",
      updatedAt: "",
    });

    renderWithProviders(<HomeRoute />);

    expect(mockNavigate).toHaveBeenCalledWith("/queue/escalated", { replace: true });
  });

  it("redirects admin with company to /admin/analytics", () => {
    setupAuth({
      id: "u-5",
      login: "boss",
      fullName: "Иван",
      role: "admin",
      companyId: "c-001",
      isBlocked: false,
      createdAt: "",
      updatedAt: "",
    });

    renderWithProviders(<HomeRoute />);

    expect(mockNavigate).toHaveBeenCalledWith("/admin/analytics", { replace: true });
  });
});

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { renderWithProviders } from "~/../test/test-utils";
import OnboardingInviteCodeRoute from "./onboarding.invite-code";
import * as AuthContextModule from "~/context/AuthContext";
import { authApi } from "~/api/auth";
import type { CompanyInvitation, User } from "~/types/user";

describe("Onboarding Invite Code Route", () => {
  const mockUser: User = {
    id: "u-op-7842",
    login: "mikhail",
    fullName: "Михаил Новичков",
    role: "unassigned_operator",
    companyId: null,
    isBlocked: false,
    createdAt: "",
    updatedAt: "",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(AuthContextModule, "useAuth").mockReturnValue({
      user: mockUser,
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      refreshUser: vi.fn().mockResolvedValue(mockUser),
    });
  });

  it("renders connection code and copies it on button click", async () => {
    vi.spyOn(authApi, "getInviteCode").mockResolvedValue({
      id: "code-1",
      operatorId: "u-op-7842",
      code: "784291",
      expiresAt: "",
      isUsed: false,
    });
    vi.spyOn(authApi, "getPendingInvitations").mockResolvedValue([]);

    renderWithProviders(<OnboardingInviteCodeRoute />);

    expect(await screen.findByText("784291")).toBeInTheDocument();
    expect(screen.getByText("Код подключения оператора")).toBeInTheDocument();

    const copyBtn = screen.getByRole("button", { name: "Скопировать код" });
    fireEvent.click(copyBtn);

    expect(await screen.findByText("Скопировано в буфер")).toBeInTheDocument();
  });

  it("displays empty state when operator has no pending invitations", async () => {
    vi.spyOn(authApi, "getInviteCode").mockResolvedValue({
      id: "code-1",
      operatorId: "u-op-7842",
      code: "784291",
      expiresAt: "",
      isUsed: false,
    });
    vi.spyOn(authApi, "getPendingInvitations").mockResolvedValue([]);

    renderWithProviders(<OnboardingInviteCodeRoute />);

    expect(await screen.findByText("Нет входящих приглашений")).toBeInTheDocument();
  });

  it("displays invitation cards and allows accepting an invitation", async () => {
    const mockInvite: CompanyInvitation = {
      id: "inv-101",
      companyId: "c-001",
      companyName: "ООО «ТехноСервис»",
      operatorId: "u-op-7842",
      roleToAssign: "operator_l1",
      status: "pending",
      createdAt: "",
    };

    vi.spyOn(authApi, "getInviteCode").mockResolvedValue({
      id: "code-1",
      operatorId: "u-op-7842",
      code: "784291",
      expiresAt: "",
      isUsed: false,
    });
    vi.spyOn(authApi, "getPendingInvitations").mockResolvedValue([mockInvite]);
    const acceptSpy = vi.spyOn(authApi, "acceptInvitation").mockResolvedValue({
      ...mockUser,
      companyId: "c-001",
      role: "operator_l1",
    });

    renderWithProviders(<OnboardingInviteCodeRoute />);

    expect(await screen.findByText("ООО «ТехноСервис»")).toBeInTheDocument();
    expect(screen.getByText(/Оператор первой линии/i)).toBeInTheDocument();

    const acceptBtn = screen.getByRole("button", { name: "Принять" });
    fireEvent.click(acceptBtn);

    await waitFor(() => {
      expect(acceptSpy).toHaveBeenCalledWith("inv-101");
    });
  });

  it("allows rejecting an invitation and removes it from view", async () => {
    const mockInvite: CompanyInvitation = {
      id: "inv-102",
      companyId: "c-002",
      companyName: "ООО «ДругойСервис»",
      operatorId: "u-op-7842",
      roleToAssign: "operator_l2",
      status: "pending",
      createdAt: "",
    };

    vi.spyOn(authApi, "getInviteCode").mockResolvedValue({
      id: "code-1",
      operatorId: "u-op-7842",
      code: "784291",
      expiresAt: "",
      isUsed: false,
    });
    vi.spyOn(authApi, "getPendingInvitations").mockResolvedValue([mockInvite]);
    const rejectSpy = vi.spyOn(authApi, "rejectInvitation").mockResolvedValue();

    renderWithProviders(<OnboardingInviteCodeRoute />);

    expect(await screen.findByText("ООО «ДругойСервис»")).toBeInTheDocument();

    const rejectBtn = screen.getByRole("button", { name: "Отклонить" });
    fireEvent.click(rejectBtn);

    await waitFor(() => {
      expect(rejectSpy).toHaveBeenCalledWith("inv-102");
    });

    expect(await screen.findByText("Нет входящих приглашений")).toBeInTheDocument();
  });
});

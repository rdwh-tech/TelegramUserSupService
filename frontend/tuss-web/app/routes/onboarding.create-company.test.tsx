import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { renderWithProviders } from "~/../test/test-utils";
import OnboardingCreateCompanyRoute from "./onboarding.create-company";
import * as AuthContextModule from "~/context/AuthContext";
import { authApi } from "~/api/auth";
import type { User } from "~/types/user";

describe("Onboarding Create Company Route", () => {
  const mockAdmin: User = {
    id: "u-adm-01",
    login: "admin_boss",
    fullName: "Иван Руководитель",
    role: "admin",
    companyId: null,
    isBlocked: false,
    createdAt: "",
    updatedAt: "",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(AuthContextModule, "useAuth").mockReturnValue({
      user: mockAdmin,
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      refreshUser: vi.fn().mockResolvedValue(mockAdmin),
    });
  });

  it("renders company creation form with inputs and disabled button when empty", () => {
    renderWithProviders(<OnboardingCreateCompanyRoute />);

    expect(screen.getByText("Создание компании")).toBeInTheDocument();
    expect(screen.getByLabelText(/Название компании или проекта/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Часовой пояс/i)).toBeInTheDocument();

    const submitBtn = screen.getByRole("button", { name: /Создать компанию и продолжить/i });
    expect(submitBtn).toBeDisabled();
  });

  it("submits company creation with entered name", async () => {
    const createSpy = vi.spyOn(authApi, "createCompany").mockResolvedValue({
      ...mockAdmin,
      companyId: "c-001",
      companyName: "ООО Новый Стартап",
    });

    renderWithProviders(<OnboardingCreateCompanyRoute />);

    const input = screen.getByLabelText(/Название компании или проекта/i);
    fireEvent.change(input, { target: { value: "ООО Новый Стартап" } });

    const submitBtn = screen.getByRole("button", { name: /Создать компанию и продолжить/i });
    expect(submitBtn).not.toBeDisabled();
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(createSpy).toHaveBeenCalledWith({ name: "ООО Новый Стартап" });
    });

    expect(await screen.findByText(/Компания «ООО Новый Стартап» успешно создана/)).toBeInTheDocument();
  });
});

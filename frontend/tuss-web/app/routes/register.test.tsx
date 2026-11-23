import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { renderWithProviders } from "~/../test/test-utils";
import RegisterRoute from "./register";
import * as AuthContextModule from "~/context/AuthContext";

describe("Register Route", () => {
  const mockRegister = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(AuthContextModule, "useAuth").mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      login: vi.fn(),
      register: mockRegister,
      logout: vi.fn(),
      refreshUser: vi.fn(),
    });
  });

  it("renders registration form with role selector", () => {
    renderWithProviders(<RegisterRoute />);

    expect(screen.getByText("Регистрация в TUSS")).toBeInTheDocument();
    expect(screen.getByLabelText(/Логин/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Имя и фамилия/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Пароль/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Подтверждение пароля/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Оператор/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Администратор/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Зарегистрироваться" })).toBeInTheDocument();
  });

  it("validates password mismatch before submitting", async () => {
    renderWithProviders(<RegisterRoute />);

    fireEvent.change(screen.getByLabelText(/Логин/i), { target: { value: "testuser" } });
    fireEvent.change(screen.getByLabelText(/Имя и фамилия/i), { target: { value: "Иван Иванов" } });
    fireEvent.change(screen.getByLabelText(/^Пароль/i), { target: { value: "Pass123" } });
    fireEvent.change(screen.getByLabelText(/Подтверждение пароля/i), { target: { value: "Pass999" } });

    fireEvent.click(screen.getByRole("button", { name: "Зарегистрироваться" }));

    expect(await screen.findByText("Пароли не совпадают")).toBeInTheDocument();
    expect(mockRegister).not.toHaveBeenCalled();
  });

  it("calls register with correct payload when valid", async () => {
    mockRegister.mockResolvedValue({
      id: "u-new",
      login: "new_operator",
      fullName: "Алексей Смирнов",
      role: "unassigned_operator",
      companyId: null,
    });

    renderWithProviders(<RegisterRoute />);

    fireEvent.change(screen.getByLabelText(/Логин/i), { target: { value: "new_operator" } });
    fireEvent.change(screen.getByLabelText(/Имя и фамилия/i), { target: { value: "Алексей Смирнов" } });
    fireEvent.change(screen.getByLabelText(/^Пароль/i), { target: { value: "Secret123" } });
    fireEvent.change(screen.getByLabelText(/Подтверждение пароля/i), { target: { value: "Secret123" } });

    fireEvent.click(screen.getByRole("button", { name: "Зарегистрироваться" }));

    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledWith({
        login: "new_operator",
        fullName: "Алексей Смирнов",
        password: "Secret123",
        role: "operator",
      });
    });
  });

  it("handles duplicate login error from API", async () => {
    mockRegister.mockRejectedValue({
      response: { data: { code: "LOGIN_ALREADY_EXISTS", message: "Этот логин уже используется" } },
    });

    renderWithProviders(<RegisterRoute />);

    fireEvent.change(screen.getByLabelText(/Логин/i), { target: { value: "existing_user" } });
    fireEvent.change(screen.getByLabelText(/Имя и фамилия/i), { target: { value: "Иван" } });
    fireEvent.change(screen.getByLabelText(/^Пароль/i), { target: { value: "Secret123" } });
    fireEvent.change(screen.getByLabelText(/Подтверждение пароля/i), { target: { value: "Secret123" } });

    fireEvent.click(screen.getByRole("button", { name: "Зарегистрироваться" }));

    expect(await screen.findByText("Этот логин уже используется")).toBeInTheDocument();
  });
});

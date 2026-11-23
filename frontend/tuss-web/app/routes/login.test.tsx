import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { renderWithProviders } from "~/../test/test-utils";
import LoginRoute from "./login";
import * as AuthContextModule from "~/context/AuthContext";

describe("Login Route", () => {
  const mockLogin = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(AuthContextModule, "useAuth").mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      login: mockLogin,
      register: vi.fn(),
      logout: vi.fn(),
      refreshUser: vi.fn(),
    });
  });

  it("renders login form with input fields and submit button", () => {
    renderWithProviders(<LoginRoute />);

    expect(screen.getByText("TUSS Support")).toBeInTheDocument();
    expect(screen.getByLabelText(/Логин/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Пароль/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Войти" })).toBeInTheDocument();
    expect(screen.getByText("Зарегистрироваться")).toBeInTheDocument();
  });

  it("validates required fields before submitting", async () => {
    renderWithProviders(<LoginRoute />);

    fireEvent.click(screen.getByRole("button", { name: "Войти" }));

    expect(await screen.findByText("Введите логин")).toBeInTheDocument();
    expect(await screen.findByText("Введите пароль")).toBeInTheDocument();
    expect(mockLogin).not.toHaveBeenCalled();
  });

  it("toggles password visibility when eye icon is clicked", () => {
    renderWithProviders(<LoginRoute />);

    const passwordInput = screen.getByLabelText(/Пароль/i);
    expect(passwordInput).toHaveAttribute("type", "password");

    const toggleButton = screen.getByLabelText("переключить видимость пароля");
    fireEvent.click(toggleButton);

    expect(passwordInput).toHaveAttribute("type", "text");

    fireEvent.click(screen.getByLabelText("переключить видимость пароля"));
    expect(passwordInput).toHaveAttribute("type", "password");
  });

  it("calls login function with credentials when form is valid", async () => {
    mockLogin.mockResolvedValue({
      id: "u-1",
      login: "alex_l1",
      role: "operator_l1",
      companyId: "c-001",
    });

    renderWithProviders(<LoginRoute />);

    fireEvent.change(screen.getByLabelText(/Логин/i), { target: { value: "alex_l1" } });
    fireEvent.change(screen.getByLabelText(/Пароль/i), { target: { value: "secret123" } });
    fireEvent.click(screen.getByRole("button", { name: "Войти" }));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith({
        login: "alex_l1",
        password: "secret123",
      });
    });
  });

  it("displays server error alert when login fails", async () => {
    mockLogin.mockRejectedValue({
      response: { data: { message: "Неверный логин или пароль" } },
    });

    renderWithProviders(<LoginRoute />);

    fireEvent.change(screen.getByLabelText(/Логин/i), { target: { value: "wrong_user" } });
    fireEvent.change(screen.getByLabelText(/Пароль/i), { target: { value: "wrong_pass" } });
    fireEvent.click(screen.getByRole("button", { name: "Войти" }));

    expect(await screen.findByText("Неверный логин или пароль")).toBeInTheDocument();
  });
});

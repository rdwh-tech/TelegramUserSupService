// app/routes/admin.staff.test.tsx
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor, fireEvent, within } from "@testing-library/react";
import { renderWithProviders } from "~/../test/test-utils";
import AdminStaffRoute from "./admin.staff";
import * as AuthContextModule from "~/context/AuthContext";
import { companyApi } from "~/api/company";
import type { User } from "~/types/user";
import type { StaffMember } from "~/types/company";

const mockAdminUser: User = {
  id: "u-adm-003",
  login: "admin_boss",
  fullName: "Иван Руководитель",
  role: "admin",
  companyId: "c-001",
  isBlocked: false,
  createdAt: "2026-01-01T09:00:00Z",
  updatedAt: "2026-01-01T09:00:00Z",
};

const mockOperatorUser: User = {
  ...mockAdminUser,
  id: "u-l1-001",
  role: "operator_l1",
};

const sampleStaff: StaffMember[] = [
  {
    id: "u-l1-001",
    login: "alex_l1",
    fullName: "Алексей Смирнов",
    role: "operator_l1",
    activeTicketId: "t-1041",
    activeTicketNumber: 1041,
    isBlocked: false,
    createdAt: "2026-01-10T10:00:00Z",
  },
  {
    id: "u-l2-002",
    login: "daria_l2",
    fullName: "Дарья Ковалёва",
    role: "operator_l2",
    activeTicketId: null,
    activeTicketNumber: null,
    isBlocked: false,
    createdAt: "2026-01-11T11:00:00Z",
  },
  {
    id: "u-adm-003",
    login: "admin_boss",
    fullName: "Иван Руководитель",
    role: "admin",
    activeTicketId: null,
    activeTicketNumber: null,
    isBlocked: false,
    createdAt: "2026-01-01T09:00:00Z",
  },
];

describe("AdminStaffRoute Component [TUSS-FE-23, TUSS-FE-24]", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(companyApi, "getStaff").mockResolvedValue([...sampleStaff]);
  });

  it("blocks non-admin users via RoleGuard", () => {
    vi.spyOn(AuthContextModule, "useAuth").mockReturnValue({
      user: mockOperatorUser,
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      refreshUser: vi.fn(),
    });

    renderWithProviders(<AdminStaffRoute />);
    expect(screen.queryByText("Сотрудники компании")).not.toBeInTheDocument();
  });

  it("renders staff table with roles, active ticket status and counters for admin", async () => {
    vi.spyOn(AuthContextModule, "useAuth").mockReturnValue({
      user: mockAdminUser,
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      refreshUser: vi.fn(),
    });

    renderWithProviders(<AdminStaffRoute />);

    expect(screen.getByText("Сотрудники компании")).toBeInTheDocument();

    await waitFor(() => {
      // Counter
      expect(screen.getByText("Всего сотрудников: 3")).toBeInTheDocument();

      // Employees
      expect(within(screen.getByTestId("staff-row-u-l1-001")).getByText("Алексей Смирнов")).toBeInTheDocument();
      expect(within(screen.getByTestId("staff-row-u-l1-001")).getByText("@alex_l1")).toBeInTheDocument();
      expect(within(screen.getByTestId("staff-row-u-l1-001")).getByText("В работе: #1041")).toBeInTheDocument();

      expect(within(screen.getByTestId("staff-row-u-l2-002")).getByText("Дарья Ковалёва")).toBeInTheDocument();
      expect(within(screen.getByTestId("staff-row-u-l2-002")).getByText("@daria_l2")).toBeInTheDocument();
      expect(within(screen.getByTestId("staff-row-u-l2-002")).getByText("Свободен")).toBeInTheDocument();

      expect(within(screen.getByTestId("staff-row-u-adm-003")).getByText("Иван Руководитель")).toBeInTheDocument();
      expect(within(screen.getByTestId("staff-row-u-adm-003")).getByText("Администратор")).toBeInTheDocument();
    });
  });

  it("allows changing operator role between L1 and L2 (TUSS-FE-23)", async () => {
    vi.spyOn(AuthContextModule, "useAuth").mockReturnValue({
      user: mockAdminUser,
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      refreshUser: vi.fn(),
    });

    const updateRoleSpy = vi.spyOn(companyApi, "updateStaffRole").mockResolvedValue({
      ...sampleStaff[0],
      role: "operator_l2",
    });

    renderWithProviders(<AdminStaffRoute />);

    await waitFor(() => {
      expect(screen.getByTestId("role-select-u-l1-001")).toBeInTheDocument();
    });

    const roleSelect = screen.getByTestId("role-select-u-l1-001");
    const button = within(roleSelect).getByRole("combobox");
    fireEvent.mouseDown(button);

    const optionL2 = await screen.findByRole("option", { name: "Старший оператор L2" });
    fireEvent.click(optionL2);

    await waitFor(() => {
      expect(updateRoleSpy).toHaveBeenCalledWith("u-l1-001", "operator_l2");
    });
  });

  it("handles invite operator flow with invalid code error (TUSS-FE-23)", async () => {
    vi.spyOn(AuthContextModule, "useAuth").mockReturnValue({
      user: mockAdminUser,
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      refreshUser: vi.fn(),
    });

    const inviteSpy = vi.spyOn(companyApi, "inviteOperator").mockRejectedValue({
      response: { data: { message: "Введенный код недействителен" } },
    });

    renderWithProviders(<AdminStaffRoute />);

    await waitFor(() => {
      expect(screen.getByTestId("open-invite-modal-btn")).toBeInTheDocument();
    });

    // Open modal
    fireEvent.click(screen.getByTestId("open-invite-modal-btn"));
    expect(screen.getByTestId("invite-staff-modal")).toBeInTheDocument();

    // Type invalid code
    const codeInput = screen.getByTestId("invite-code-input");
    fireEvent.change(codeInput, { target: { value: "BAD123" } });

    // Submit
    const submitBtn = screen.getByTestId("submit-invite-btn");
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(inviteSpy).toHaveBeenCalledWith({ code: "BAD123", role: "operator_l1" });
      expect(screen.getByTestId("invite-error-alert")).toHaveTextContent("Введенный код недействителен");
    });
  });

  it("handles successful operator invite (TUSS-FE-23)", async () => {
    vi.spyOn(AuthContextModule, "useAuth").mockReturnValue({
      user: mockAdminUser,
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      refreshUser: vi.fn(),
    });

    const inviteSpy = vi.spyOn(companyApi, "inviteOperator").mockResolvedValue({
      success: true,
      message: "Приглашение успешно отправлено",
    });

    renderWithProviders(<AdminStaffRoute />);

    await waitFor(() => {
      expect(screen.getByTestId("open-invite-modal-btn")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("open-invite-modal-btn"));

    const codeInput = screen.getByTestId("invite-code-input");
    fireEvent.change(codeInput, { target: { value: "KUQ3W1" } });

    const submitBtn = screen.getByTestId("submit-invite-btn");
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(inviteSpy).toHaveBeenCalledWith({ code: "KUQ3W1", role: "operator_l1" });
      expect(screen.queryByTestId("invite-staff-modal")).not.toBeInTheDocument();
    });
  });

  it("handles excluding an operator with confirmation dialog (TUSS-FE-24)", async () => {
    vi.spyOn(AuthContextModule, "useAuth").mockReturnValue({
      user: mockAdminUser,
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      refreshUser: vi.fn(),
    });

    const excludeSpy = vi.spyOn(companyApi, "excludeStaffMember").mockResolvedValue({
      success: true,
    });

    renderWithProviders(<AdminStaffRoute />);

    await waitFor(() => {
      expect(screen.getByTestId("exclude-staff-u-l1-001")).toBeInTheDocument();
    });

    // Click exclude icon on Alexei
    fireEvent.click(screen.getByTestId("exclude-staff-u-l1-001"));

    // Modal opens
    expect(screen.getByTestId("exclude-staff-modal")).toBeInTheDocument();
    expect(
      screen.getByText(/Все незакрытые тикеты сотрудника автоматически вернутся в общую очередь/i)
    ).toBeInTheDocument();

    // Confirm
    const confirmBtn = screen.getByTestId("confirm-exclude-btn");
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(excludeSpy).toHaveBeenCalledWith("u-l1-001");
      expect(screen.queryByTestId("exclude-staff-modal")).not.toBeInTheDocument();
    });
  });
});

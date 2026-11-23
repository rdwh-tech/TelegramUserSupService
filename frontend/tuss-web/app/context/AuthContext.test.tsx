import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { AuthProvider, useAuth } from "./AuthContext";
import { authApi } from "~/api/auth";
import { authStorage } from "~/api/authStorage";
import type { User } from "~/types/user";

describe("AuthContext", () => {
  const mockUser: User = {
    id: "u-123",
    login: "alex_l1",
    fullName: "Алексей Смирнов",
    role: "operator_l1",
    companyId: "c-001",
    isBlocked: false,
    createdAt: "",
    updatedAt: "",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    authStorage.clearAuth();
  });

  it("throws error if useAuth is used outside of AuthProvider", () => {
    // Подавляем консольную ошибку React для ожидаемого выброса исключения
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => renderHook(() => useAuth())).toThrow("useAuth must be used within an AuthProvider");
    spy.mockRestore();
  });

  it("loads user profile via getMe on mount if token exists in storage", async () => {
    authStorage.setToken("mock-token-abc");
    vi.spyOn(authApi, "getMe").mockResolvedValue(mockUser);

    const { result } = renderHook(() => useAuth(), {
      wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
    });

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user?.login).toBe("alex_l1");
  });

  it("updates user state upon successful login", async () => {
    vi.spyOn(authApi, "getMe").mockRejectedValue(new Error("No token"));
    vi.spyOn(authApi, "login").mockImplementation(async () => {
      authStorage.setToken("token-new");
      authStorage.setUser(mockUser);
      return {
        accessToken: "token-new",
        user: mockUser,
      };
    });

    const { result } = renderHook(() => useAuth(), {
      wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.login({ login: "alex_l1", password: "Password123" });
    });

    expect(result.current.user?.id).toBe("u-123");
    expect(result.current.isAuthenticated).toBe(true);
  });

  it("clears user and session on logout", async () => {
    authStorage.setToken("token-active");
    authStorage.setUser(mockUser);
    vi.spyOn(authApi, "getMe").mockResolvedValue(mockUser);
    vi.spyOn(authApi, "logout").mockResolvedValue();

    const { result } = renderHook(() => useAuth(), {
      wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
    });

    await waitFor(() => expect(result.current.isAuthenticated).toBe(true));

    await act(async () => {
      await result.current.logout();
    });

    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });

  it("clears user when window receives 'tuss:unauthorized' event", async () => {
    authStorage.setToken("token-active");
    authStorage.setUser(mockUser);
    vi.spyOn(authApi, "getMe").mockResolvedValue(mockUser);

    const { result } = renderHook(() => useAuth(), {
      wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
    });

    await waitFor(() => expect(result.current.isAuthenticated).toBe(true));

    act(() => {
      window.dispatchEvent(new Event("tuss:unauthorized"));
    });

    expect(result.current.user).toBeNull();
  });
});

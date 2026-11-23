// app/api/auth.ts
import { apiClient } from "./client";
import { authStorage } from "./authStorage";
import type {
  AuthResponse,
  LoginPayload,
  RegisterPayload,
  User,
  OperatorInviteCode,
  CompanyInvitation,
} from "~/types/user";

export const authApi = {
  async login(payload: LoginPayload): Promise<AuthResponse> {
    const { data } = await apiClient.post<AuthResponse>("/auth/login", payload);
    authStorage.setToken(data.accessToken);
    authStorage.setUser(data.user);
    return data;
  },

  async register(payload: RegisterPayload): Promise<AuthResponse> {
    const { data } = await apiClient.post<AuthResponse>("/auth/register", payload);
    authStorage.setToken(data.accessToken);
    authStorage.setUser(data.user);
    return data;
  },

  async logout(): Promise<void> {
    try {
      await apiClient.post("/auth/logout");
    } finally {
      authStorage.clearAuth();
    }
  },

  async getMe(): Promise<User> {
    const { data } = await apiClient.get<User>("/auth/me");
    authStorage.setUser(data);
    return data;
  },

  // Получить активный инвайт-код оператора (FR-WEB-5)
  async getInviteCode(): Promise<OperatorInviteCode> {
    const { data } = await apiClient.get<OperatorInviteCode>("/operator/connection-code");
    return data;
  },

  // Получить входящие приглашения в компанию (FR-WEB-5)
  async getPendingInvitations(): Promise<CompanyInvitation[]> {
    const { data } = await apiClient.get<CompanyInvitation[]>("/operator/invitations/pending");
    return data;
  },

  // Принять приглашение компании
  async acceptInvitation(invitationId: string): Promise<User> {
    const { data } = await apiClient.post<User>(`/operator/invitations/${invitationId}/accept`);
    authStorage.setUser(data);
    return data;
  },

  // Отклонить приглашение компании
  async rejectInvitation(invitationId: string): Promise<void> {
    await apiClient.post(`/operator/invitations/${invitationId}/reject`);
  },
};

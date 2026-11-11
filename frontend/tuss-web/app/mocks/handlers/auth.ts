// app/mocks/handlers/auth.ts
import { http, HttpResponse, delay } from "msw";
import {
  mockUsers,
  mockInviteCode,
  mockInvitations,
} from "../data";
import type { LoginPayload, RegisterPayload } from "~/types";

export const authHandlers = [
  // Вход пользователя
  http.post("*/api/auth/login", async ({ request }) => {
    await delay(300);
    const body = (await request.json()) as LoginPayload;

    if (!body.login || !body.password) {
      return HttpResponse.json(
        { message: "Логин и пароль обязательны для заполнения" },
        { status: 400 }
      );
    }

    const user =
      Object.values(mockUsers).find((u) => u.login === body.login) ||
      mockUsers.operator_l1;

    return HttpResponse.json({
      accessToken: "mock-jwt-token-xyz-123",
      user,
    });
  }),

  // Регистрация пользователя
  http.post("*/api/auth/register", async ({ request }) => {
    await delay(400);
    const body = (await request.json()) as RegisterPayload;

    const newUser = {
      id: `u-${Date.now()}`,
      companyId: null,
      login: body.login,
      fullName: body.fullName || body.login,
      role: (body.role === "admin" ? "admin" : "unassigned_operator") as any,
      isBlocked: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return HttpResponse.json({
      accessToken: "mock-jwt-token-registered",
      user: newUser,
    });
  }),

  // Получение профиля текущего пользователя
  http.get("*/api/auth/me", async ({ request }) => {
    await delay(200);
    const authHeader = request.headers.get("Authorization");
    if (!authHeader) {
      return HttpResponse.json({ message: "Не авторизован" }, { status: 401 });
    }
    return HttpResponse.json(mockUsers.operator_l1);
  }),

  // Выход
  http.post("*/api/auth/logout", async () => {
    await delay(150);
    return HttpResponse.json({ success: true });
  }),

  // Получение 6-значного инвайт-кода непривязанного оператора (FR-WEB-5)
  http.get("*/api/operator/connection-code", async () => {
    await delay(200);
    return HttpResponse.json(mockInviteCode);
  }),

  // Список входящих приглашений оператора
  http.get("*/api/operator/invitations/pending", async () => {
    await delay(200);
    return HttpResponse.json(mockInvitations);
  }),

  // Принятие приглашения компании
  http.post("*/api/operator/invitations/:id/accept", async () => {
    await delay(300);
    const acceptedUser = {
      ...mockUsers.unassigned,
      companyId: "c-001",
      role: "operator_l1" as const,
    };
    return HttpResponse.json(acceptedUser);
  }),

  // Отклонение приглашения
  http.post("*/api/operator/invitations/:id/reject", async () => {
    await delay(200);
    return HttpResponse.json({ success: true });
  }),
];

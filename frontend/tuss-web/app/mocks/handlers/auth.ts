// app/mocks/handlers/auth.ts
import { http, HttpResponse, delay } from "msw";
import { mockUsers, mockInviteCode, mockInvitations } from "../data";
import type { LoginPayload, RegisterPayload, User, UserRole, CompanyInvitation } from "~/types";

// Хранилище зарегистрированных пользователей в памяти MSW
const registeredUsers: Map<string, User> = new Map(
  Object.values(mockUsers).map((u) => [u.id, { ...u }])
);

// Карта входящих приглашений оператора: operatorId -> CompanyInvitation[]
// Изначально только у тестового пользователя u-new-004 есть демо-приглашение.
// У всех вновь зарегистрированных операторов список приглашений пуст!
const operatorInvitations: Map<string, CompanyInvitation[]> = new Map([
  [mockUsers.unassigned.id, [...mockInvitations]],
]);

function findUserByLogin(login: string): User | undefined {
  for (const user of registeredUsers.values()) {
    if (user.login.toLowerCase() === login.trim().toLowerCase()) {
      return user;
    }
  }
  return undefined;
}

function createToken(userId: string): string {
  return `mock-jwt-${userId}-${Date.now()}`;
}

function getUserIdFromToken(authHeader: string | null): string | null {
  if (!authHeader) return null;
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) return null;

  // Токен формата mock-jwt-<userId>-<timestamp>
  const match = token.match(/^mock-jwt-([^-]+(?:-[^-]+)*)-(\d+)$/);
  if (match) {
    return match[1];
  }

  // Фиксированные демо-токены
  if (token === "mock-jwt-token-xyz-123" || token === "token-l1") return mockUsers.operator_l1.id;
  if (token === "token-l2") return mockUsers.operator_l2.id;
  if (token === "token-admin") return mockUsers.admin.id;
  if (token === "token-unassigned") return mockUsers.unassigned.id;

  return null;
}

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

    const user = findUserByLogin(body.login);
    if (!user) {
      return HttpResponse.json(
        { message: "Неверный логин или пароль" },
        { status: 401 }
      );
    }

    if (user.isBlocked) {
      return HttpResponse.json(
        { message: "Учетная запись заблокирована" },
        { status: 403 }
      );
    }

    const token = createToken(user.id);
    return HttpResponse.json({
      accessToken: token,
      user,
    });
  }),

  // Регистрация пользователя
  http.post("*/api/auth/register", async ({ request }) => {
    await delay(400);
    const body = (await request.json()) as RegisterPayload;

    const existing = findUserByLogin(body.login);
    if (existing) {
      return HttpResponse.json(
        { message: "Этот логин уже используется", code: "LOGIN_ALREADY_EXISTS" },
        { status: 409 }
      );
    }

    const newId = `u-${Date.now()}`;
    const role: UserRole = body.role === "admin" ? "admin" : "unassigned_operator";

    const newUser: User = {
      id: newId,
      companyId: null, // Новый пользователь всегда изначально БЕЗ компании!
      login: body.login.trim(),
      fullName: body.fullName?.trim() || body.login.trim(),
      role,
      isBlocked: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    registeredUsers.set(newId, newUser);
    operatorInvitations.set(newId, []); // У нового оператора 0 приглашений

    const token = createToken(newId);
    return HttpResponse.json({
      accessToken: token,
      user: newUser,
    });
  }),

  // Получение профиля текущего пользователя
  http.get("*/api/auth/me", async ({ request }) => {
    await delay(150);
    const authHeader = request.headers.get("Authorization");
    const userId = getUserIdFromToken(authHeader);

    if (!userId) {
      return HttpResponse.json({ message: "Не авторизован" }, { status: 401 });
    }

    const user = registeredUsers.get(userId);
    if (!user) {
      return HttpResponse.json({ message: "Пользователь не найден" }, { status: 401 });
    }

    return HttpResponse.json(user);
  }),

  // Выход
  http.post("*/api/auth/logout", async () => {
    await delay(150);
    return HttpResponse.json({ success: true });
  }),

  // Получение 6-значного инвайт-кода непривязанного оператора (FR-WEB-5)
  http.get("*/api/operator/connection-code", async ({ request }) => {
    await delay(200);
    const userId = getUserIdFromToken(request.headers.get("Authorization"));
    const user = userId ? registeredUsers.get(userId) : null;

    // Персональный 6-значный код для конкретного пользователя
    const generatedCode = user
      ? user.id.replace(/[^a-zA-Z0-9]/g, "").slice(-6).toUpperCase()
      : mockInviteCode.code;

    return HttpResponse.json({
      id: `code-${userId || "01"}`,
      operatorId: userId || mockUsers.unassigned.id,
      code: generatedCode.length === 6 ? generatedCode : "KUQ3W1",
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      isUsed: false,
    });
  }),

  // Список входящих приглашений оператора
  http.get("*/api/operator/invitations/pending", async ({ request }) => {
    await delay(200);
    const userId = getUserIdFromToken(request.headers.get("Authorization"));
    const invites = (userId && operatorInvitations.get(userId)) || [];
    return HttpResponse.json(invites);
  }),

  // Принятие приглашения компании
  http.post("*/api/operator/invitations/:id/accept", async ({ params, request }) => {
    await delay(300);
    const userId = getUserIdFromToken(request.headers.get("Authorization"));
    const user = userId ? registeredUsers.get(userId) : null;

    if (!user) {
      return HttpResponse.json({ message: "Не авторизован" }, { status: 401 });
    }

    // Привязываем оператора к компании
    const updatedUser: User = {
      ...user,
      companyId: "c-001",
      role: "operator_l1", // Принимается на роль оператора первой линии
      updatedAt: new Date().toISOString(),
    };
    registeredUsers.set(user.id, updatedUser);

    if (userId) {
      operatorInvitations.set(userId, []);
    }

    return HttpResponse.json(updatedUser);
  }),

  // Отклонение приглашения
  http.post("*/api/operator/invitations/:id/reject", async ({ request }) => {
    await delay(200);
    const userId = getUserIdFromToken(request.headers.get("Authorization"));
    if (userId) {
      operatorInvitations.set(userId, []);
    }
    return HttpResponse.json({ success: true });
  }),

  // Создание компании администратором (FR-API-28)
  http.post("*/api/company", async ({ request }) => {
    await delay(300);
    const body = (await request.json()) as { name: string; timezone?: string };
    const userId = getUserIdFromToken(request.headers.get("Authorization"));
    const user = userId ? registeredUsers.get(userId) : null;

    const companyId = "c-001";
    let updatedUser: User | null = null;
    if (user) {
      updatedUser = {
        ...user,
        companyId,
        updatedAt: new Date().toISOString(),
      };
      registeredUsers.set(user.id, updatedUser);
    }

    return HttpResponse.json({
      company: { id: companyId, name: body.name },
      user: updatedUser || { ...mockUsers.admin, companyId },
    });
  }),
];

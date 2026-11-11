// app/types/user.ts
export type UserRole =
  | "admin"
  | "operator_l1"
  | "operator_l2"
  | "unassigned_operator";

export interface User {
  id: string;
  companyId: string | null;
  login: string;
  fullName: string;
  role: UserRole;
  isBlocked: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  accessToken: string;
  user: User;
}

export interface LoginPayload {
  login: string;
  password: string;
}

export interface RegisterPayload {
  login: string;
  password: string;
  fullName: string;
  role: "operator" | "admin"; // Роль при первичной регистрации
}

export interface OperatorInviteCode {
  id: string;
  operatorId: string;
  code: string;
  expiresAt: string;
  isUsed: boolean;
}

export type InvitationStatus = "pending" | "accepted" | "rejected" | "expired";

export interface CompanyInvitation {
  id: string;
  companyId: string;
  companyName: string;
  operatorId: string;
  roleToAssign: "operator_l1" | "operator_l2";
  status: InvitationStatus;
  createdAt: string;
}

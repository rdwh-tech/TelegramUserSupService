// app/types/company.ts
export interface Company {
  id: string;
  name: string;
  description?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCompanyPayload {
  name: string;
  description?: string;
}

export interface UpdateCompanyPayload {
  name?: string;
  description?: string;
}

export interface BotConfig {
  id: string;
  companyId: string;
  botToken: string;
  botUsername: string | null;
  welcomeMessage: string;
  isConnected: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateBotConfigPayload {
  botToken?: string;
  welcomeMessage?: string;
}

export interface StaffMember {
  id: string;
  login: string;
  fullName: string;
  role: "operator_l1" | "operator_l2" | "admin";
  activeTicketId?: string | null;
  activeTicketNumber?: number | null;
  isBlocked?: boolean;
  createdAt: string;
}

export interface InviteOperatorPayload {
  code: string;
  role: "operator_l1" | "operator_l2";
}

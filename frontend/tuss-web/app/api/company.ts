// app/api/company.ts
import { apiClient } from "./client";
import type {
  Company,
  UpdateCompanyPayload,
  BotConfig,
  UpdateBotConfigPayload,
  StaffMember,
  InviteOperatorPayload,
  CompanySchedule,
  DaySchedule,
  SLAPolicy,
  UpdateSLAPolicyPayload,
  FAQItem,
  CreateFAQPayload,
  UpdateFAQPayload,
} from "~/types";

export const companyApi = {
  // 1. Профиль компании (FR-WEB-20, FR-WEB-21)
  async getCompany(): Promise<Company> {
    const { data } = await apiClient.get<Company>("/company");
    return data;
  },

  async updateCompany(payload: UpdateCompanyPayload): Promise<Company> {
    const { data } = await apiClient.put<Company>("/company", payload);
    return data;
  },

  // 2. Telegram-бот (FR-WEB-22..24)
  async getBotConfig(): Promise<BotConfig> {
    const { data } = await apiClient.get<BotConfig>("/company/bot");
    return data;
  },

  async updateBotConfig(payload: UpdateBotConfigPayload): Promise<BotConfig> {
    const { data } = await apiClient.put<BotConfig>("/company/bot", payload);
    return data;
  },

  // 3. Расписание компании (FR-WEB-26)
  async getSchedule(): Promise<CompanySchedule> {
    const { data } = await apiClient.get<CompanySchedule>("/company/schedule");
    return data;
  },

  async updateSchedule(schedule: DaySchedule[]): Promise<CompanySchedule> {
    const { data } = await apiClient.put<CompanySchedule>("/company/schedule", schedule);
    return data;
  },

  // 4. SLA нормативы (FR-WEB-27)
  async getSLAPolicy(): Promise<SLAPolicy> {
    const { data } = await apiClient.get<SLAPolicy>("/company/sla");
    return data;
  },

  async updateSLAPolicy(payload: UpdateSLAPolicyPayload): Promise<SLAPolicy> {
    const { data } = await apiClient.put<SLAPolicy>("/company/sla", payload);
    return data;
  },

  // 5. FAQ (FR-WEB-25)
  async getFAQs(): Promise<FAQItem[]> {
    const { data } = await apiClient.get<FAQItem[]>("/company/faqs");
    return data;
  },

  async createFAQ(payload: CreateFAQPayload): Promise<FAQItem> {
    const { data } = await apiClient.post<FAQItem>("/company/faqs", payload);
    return data;
  },

  async updateFAQ(id: string, payload: UpdateFAQPayload): Promise<FAQItem> {
    const { data } = await apiClient.put<FAQItem>(`/company/faqs/${id}`, payload);
    return data;
  },

  async deleteFAQ(id: string): Promise<void> {
    await apiClient.delete(`/company/faqs/${id}`);
  },

  // 6. Штат сотрудников (FR-WEB-6, FR-API-16..18)
  async getStaff(): Promise<StaffMember[]> {
    const { data } = await apiClient.get<StaffMember[]>("/company/staff");
    return data;
  },

  async inviteOperator(payload: InviteOperatorPayload): Promise<{ success: boolean; message?: string }> {
    const { data } = await apiClient.post<{ success: boolean; message?: string }>(
      "/company/staff/invite",
      payload
    );
    return data;
  },

  async updateStaffRole(id: string, role: "operator_l1" | "operator_l2"): Promise<StaffMember> {
    const { data } = await apiClient.patch<StaffMember>(`/company/staff/${id}/role`, { role });
    return data;
  },

  async excludeStaffMember(id: string): Promise<{ success: boolean }> {
    const { data } = await apiClient.delete<{ success: boolean }>(`/company/staff/${id}`);
    return data;
  },
};

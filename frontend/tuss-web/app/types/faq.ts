// app/types/faq.ts
export interface FAQItem {
  id: string;
  companyId: string;
  question: string;
  answer: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFAQPayload {
  question: string;
  answer: string;
  sortOrder?: number;
}

export interface UpdateFAQPayload {
  question?: string;
  answer?: string;
  sortOrder?: number;
  isActive?: boolean;
}

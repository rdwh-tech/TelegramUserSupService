// app/mocks/data.ts
import type {
  User,
  Company,
  BotConfig,
  CompanySchedule,
  SLAPolicy,
  FAQItem,
  Ticket,
  TicketMessage,
  OperatorInviteCode,
  CompanyInvitation,
  AnalyticsSummary,
  CSATDistributionItem,
  TicketVolumePoint,
  OperatorPerformanceItem,
} from "~/types";

export const mockUsers: Record<string, User> = {
  operator_l1: {
    id: "u-l1-001",
    companyId: "c-001",
    login: "alex_l1",
    fullName: "Алексей Смирнов",
    role: "operator_l1",
    isBlocked: false,
    createdAt: "2026-01-10T10:00:00Z",
    updatedAt: "2026-01-10T10:00:00Z",
  },
  operator_l2: {
    id: "u-l2-002",
    companyId: "c-001",
    login: "daria_l2",
    fullName: "Дарья Ковалёва",
    role: "operator_l2",
    isBlocked: false,
    createdAt: "2026-01-11T11:00:00Z",
    updatedAt: "2026-01-11T11:00:00Z",
  },
  admin: {
    id: "u-adm-003",
    companyId: "c-001",
    login: "admin_boss",
    fullName: "Иван Руководитель",
    role: "admin",
    isBlocked: false,
    createdAt: "2026-01-01T09:00:00Z",
    updatedAt: "2026-01-01T09:00:00Z",
  },
  unassigned: {
    id: "u-new-004",
    companyId: null,
    login: "mikhail_new",
    fullName: "Михаил Новичков",
    role: "unassigned_operator",
    isBlocked: false,
    createdAt: "2026-02-01T12:00:00Z",
    updatedAt: "2026-02-01T12:00:00Z",
  },
};

export const mockCompany: Company = {
  id: "c-001",
  name: "ООО ТехноПоддержка",
  description: "Клиентский сервис IT-решений",
  isActive: true,
  createdAt: "2026-01-01T09:00:00Z",
  updatedAt: "2026-01-01T09:00:00Z",
};

export const mockBotConfig: BotConfig = {
  id: "bot-001",
  companyId: "c-001",
  botToken: "1234567890:ABCdefGHIjklMNOpqrSTUvwxYZ_mock",
  botUsername: "TechnoSupport_Bot",
  welcomeMessage: "Здравствуйте! Вы обратились в службу поддержки компании ООО ТехноПоддержка. Чем мы можем вам помочь?",
  isConnected: true,
  createdAt: "2026-01-01T10:00:00Z",
  updatedAt: "2026-01-01T10:00:00Z",
};

export const mockSchedule: CompanySchedule = [
  { id: "s-1", companyId: "c-001", dayOfWeek: 1, isWorkingDay: true, startTime: "09:00", endTime: "18:00", timezone: "Europe/Moscow" },
  { id: "s-2", companyId: "c-001", dayOfWeek: 2, isWorkingDay: true, startTime: "09:00", endTime: "18:00", timezone: "Europe/Moscow" },
  { id: "s-3", companyId: "c-001", dayOfWeek: 3, isWorkingDay: true, startTime: "09:00", endTime: "18:00", timezone: "Europe/Moscow" },
  { id: "s-4", companyId: "c-001", dayOfWeek: 4, isWorkingDay: true, startTime: "09:00", endTime: "18:00", timezone: "Europe/Moscow" },
  { id: "s-5", companyId: "c-001", dayOfWeek: 5, isWorkingDay: true, startTime: "09:00", endTime: "18:00", timezone: "Europe/Moscow" },
  { id: "s-6", companyId: "c-001", dayOfWeek: 6, isWorkingDay: false, startTime: null, endTime: null, timezone: "Europe/Moscow" },
  { id: "s-7", companyId: "c-001", dayOfWeek: 7, isWorkingDay: false, startTime: null, endTime: null, timezone: "Europe/Moscow" },
];

export const mockSLAPolicy: SLAPolicy = {
  id: "sla-001",
  companyId: "c-001",
  version: 1,
  frtLimitMinutesL1: 15,
  ttrLimitMinutesL1: 120,
  artLimitMinutesL1: 10,
  frtLimitMinutesL2: 5,
  ttrLimitMinutesL2: 60,
  artLimitMinutesL2: 5,
  isActive: true,
  createdAt: "2026-01-01T09:00:00Z",
};

export const mockFAQs: FAQItem[] = [
  {
    id: "faq-001",
    companyId: "c-001",
    question: "Как привязать банковскую карту для оплаты?",
    answer: "В главном меню перейдите в раздел «Настройки» -> «Способы оплаты» и нажмите «Добавить карту».",
    sortOrder: 1,
    isActive: true,
    createdAt: "2026-01-05T10:00:00Z",
    updatedAt: "2026-01-05T10:00:00Z",
  },
  {
    id: "faq-002",
    companyId: "c-001",
    question: "Какой регламент ответа службы поддержки?",
    answer: "В рабочее время (Пн-Пт 9:00–18:00 МСК) первый ответ оператора поступает в течение 15 минут.",
    sortOrder: 2,
    isActive: true,
    createdAt: "2026-01-05T10:05:00Z",
    updatedAt: "2026-01-05T10:05:00Z",
  },
];

export let mockTickets: Ticket[] = [
  {
    id: "t-1041",
    ticketNumber: 1041,
    companyId: "c-001",
    clientId: "client-01",
    client: {
      id: "client-01",
      companyId: "c-001",
      telegramUserId: 99123451,
      telegramChatId: 99123451,
      username: "marina_k",
      fullName: "Марина Ковалева",
      createdAt: "2026-02-10T12:00:00Z",
    },
    assignedOperatorId: null,
    slaPolicyId: "sla-001",
    status: "new",
    escalationLevel: "l1",
    firstMessagePreview: "Не получается привязать корпоративную карту в приложении",
    escalationReason: null,
    escalatedByUserId: null,
    escalatedAt: null,
    firstResponseAt: null,
    closedAt: null,
    createdAt: new Date(Date.now() - 3 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 3 * 60 * 1000).toISOString(),
    sla: {
      frt: { status: "ok", remainingSeconds: 720, formattedTime: "12 мин.", isPaused: false },
      ttr: { status: "ok", remainingSeconds: 7000, formattedTime: "116 мин.", isPaused: false },
    },
  },
  {
    id: "t-1042",
    ticketNumber: 1042,
    companyId: "c-001",
    clientId: "client-02",
    client: {
      id: "client-02",
      companyId: "c-001",
      telegramUserId: 99123452,
      telegramChatId: 99123452,
      username: "ivan_dev",
      fullName: "Иван Разработчик",
      createdAt: "2026-02-10T13:00:00Z",
    },
    assignedOperatorId: null,
    slaPolicyId: "sla-001",
    status: "new",
    escalationLevel: "l1",
    firstMessagePreview: "Здравствуйте! У меня возникла проблема с оплатой подписки через бот...",
    escalationReason: null,
    escalatedByUserId: null,
    escalatedAt: null,
    firstResponseAt: null,
    closedAt: null,
    createdAt: new Date(Date.now() - 11 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 11 * 60 * 1000).toISOString(),
    sla: {
      frt: { status: "warning", remainingSeconds: 240, formattedTime: "4 мин.", isPaused: false },
      ttr: { status: "ok", remainingSeconds: 6500, formattedTime: "108 мин.", isPaused: false },
    },
  },
  {
    id: "t-1043",
    ticketNumber: 1043,
    companyId: "c-001",
    clientId: "client-03",
    client: {
      id: "client-03",
      companyId: "c-001",
      telegramUserId: 99123453,
      telegramChatId: 99123453,
      username: "dmitry_p",
      fullName: "Дмитрий Попов",
      createdAt: "2026-02-10T14:00:00Z",
    },
    assignedOperatorId: null,
    slaPolicyId: "sla-001",
    status: "new",
    escalationLevel: "l1",
    firstMessagePreview: "Срочно! Деньги списались, но доступ к боту не открылся!",
    escalationReason: null,
    escalatedByUserId: null,
    escalatedAt: null,
    firstResponseAt: null,
    closedAt: null,
    createdAt: new Date(Date.now() - 17 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 17 * 60 * 1000).toISOString(),
    sla: {
      frt: { status: "breached", remainingSeconds: -120, formattedTime: "-2 мин.", isPaused: false },
      ttr: { status: "warning", remainingSeconds: 1500, formattedTime: "25 мин.", isPaused: false },
    },
  },
  {
    id: "t-2011",
    ticketNumber: 2011,
    companyId: "c-001",
    clientId: "client-04",
    client: {
      id: "client-04",
      companyId: "c-001",
      telegramUserId: 99123454,
      telegramChatId: 99123454,
      username: "sergey_vip",
      fullName: "Сергей Васильев",
      createdAt: "2026-02-10T14:30:00Z",
    },
    assignedOperatorId: null,
    slaPolicyId: "sla-001",
    status: "new",
    escalationLevel: "l2",
    firstMessagePreview: "Сервер выдает 502 Bad Gateway уже второй час",
    escalationReason: "Требуется проверка на стороне DevOps/серверных логов",
    escalatedByUserId: "u-l1-001",
    escalatedByUserName: "Алексей Смирнов",
    escalatedAt: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
    firstResponseAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
    closedAt: null,
    createdAt: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
    sla: {
      frt: { status: "ok", remainingSeconds: 0, formattedTime: "4 мин 12 с (факт)", isPaused: false },
      ttr: { status: "ok", remainingSeconds: 2800, formattedTime: "46 мин.", isPaused: false },
    },
  },
];

export const mockMessages: Record<string, TicketMessage[]> = {
  "t-1042": [
    {
      id: "m-1",
      ticketId: "t-1042",
      senderType: "client",
      senderName: "Иван Разработчик",
      text: "Здравствуйте! У меня возникла проблема с оплатой подписки через бот.",
      isDelivered: true,
      createdAt: new Date(Date.now() - 11 * 60 * 1000).toISOString(),
    },
    {
      id: "m-2",
      ticketId: "t-1042",
      senderType: "client",
      senderName: "Иван Разработчик",
      text: "Скриншот ошибки прикрепляю ниже. Пишет 'Transaction declined by bank'.",
      isDelivered: true,
      createdAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
    },
  ],
};

export const mockInviteCode: OperatorInviteCode = {
  id: "code-01",
  operatorId: "u-new-004",
  code: "KUQ3W1",
  expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  isUsed: false,
};

export const mockInvitations: CompanyInvitation[] = [
  {
    id: "inv-001",
    companyId: "c-001",
    companyName: "ООО ТехноПоддержка",
    operatorId: "u-new-004",
    roleToAssign: "operator_l1",
    status: "pending",
    createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
  },
];

export const mockAnalyticsSummary: AnalyticsSummary = {
  activeTicketsCount: 8,
  closedTicketsCount: 142,
  avgFrtSeconds: 245, // 4 мин 5 сек
  avgTtrSeconds: 2700, // 45 мин
  slaBreachesCount: 4,
  slaCompliancePercentage: 97.2,
  avgCsatRating: 4.86,
};

export const mockCSATDistribution: CSATDistributionItem[] = [
  { rating: 5, count: 95, percentage: 67 },
  { rating: 4, count: 32, percentage: 23 },
  { rating: 3, count: 10, percentage: 7 },
  { rating: 2, count: 3, percentage: 2 },
  { rating: 1, count: 2, percentage: 1 },
];

export const mockTicketVolume: TicketVolumePoint[] = [
  { timestamp: "Пн", createdCount: 24, closedCount: 22 },
  { timestamp: "Вт", createdCount: 31, closedCount: 29 },
  { timestamp: "Ср", createdCount: 28, closedCount: 30 },
  { timestamp: "Чт", createdCount: 42, closedCount: 38 },
  { timestamp: "Пт", createdCount: 35, closedCount: 34 },
  { timestamp: "Сб", createdCount: 12, closedCount: 11 },
  { timestamp: "Вс", createdCount: 8, closedCount: 8 },
];

export const mockOperatorPerformance: OperatorPerformanceItem[] = [
  {
    operatorId: "u-l1-001",
    fullName: "Алексей Смирнов",
    login: "alex_l1",
    role: "operator_l1",
    closedTicketsCount: 68,
    avgFrtSeconds: 210,
    avgCsat: 4.9,
    slaCompliancePercentage: 98.5,
  },
  {
    operatorId: "u-l2-002",
    fullName: "Дарья Ковалёва",
    login: "daria_l2",
    role: "operator_l2",
    closedTicketsCount: 45,
    avgFrtSeconds: 120,
    avgCsat: 4.8,
    slaCompliancePercentage: 95.5,
  },
];

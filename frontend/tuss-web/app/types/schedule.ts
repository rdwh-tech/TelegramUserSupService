// app/types/schedule.ts
export type DayOfWeek = 1 | 2 | 3 | 4 | 5 | 6 | 7; // 1 = Понедельник, 7 = Воскресенье

export interface DaySchedule {
  id: string;
  companyId: string;
  dayOfWeek: DayOfWeek;
  isWorkingDay: boolean;
  startTime: string | null; // формат "HH:mm", например "09:00"
  endTime: string | null;   // формат "HH:mm", например "18:00"
  timezone: string;
}

export type CompanySchedule = DaySchedule[];

export interface UpdateDaySchedulePayload {
  dayOfWeek: DayOfWeek;
  isWorkingDay: boolean;
  startTime?: string | null;
  endTime?: string | null;
}

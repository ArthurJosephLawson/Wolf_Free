import { create } from "zustand";
import { calendarService } from "../../services/calendar";
import { toAppError } from "../../lib/errors";
import type {
  CalendarEvent,
  CalendarEventUpdate,
  DaySummary,
  NewCalendarEvent,
} from "../../types";
import { startOfMonth, todayKey, toDateKey } from "../../lib/date";

interface CalendarStore {
  viewMonth: Date;
  selectedDate: string;
  summaries: DaySummary[];
  events: CalendarEvent[];
  loading: boolean;
  error: string | null;

  load: () => Promise<void>;
  selectDate: (date: string) => Promise<void>;
  goToMonth: (month: Date) => Promise<void>;
  goToToday: () => Promise<void>;
  create: (event: NewCalendarEvent) => Promise<CalendarEvent | null>;
  update: (id: string, update: CalendarEventUpdate) => Promise<boolean>;
  remove: (id: string) => Promise<boolean>;
  upcoming: (limit?: number) => Promise<CalendarEvent[]>;
  clearError: () => void;
}

export const useCalendarStore = create<CalendarStore>((set, get) => ({
  viewMonth: startOfMonth(new Date()),
  selectedDate: todayKey(),
  summaries: [],
  events: [],
  loading: false,
  error: null,

  async load() {
    const month = get().viewMonth;
    set({ loading: true, error: null });
    try {
      const [summaries, events] = await Promise.all([
        calendarService.monthSummaries(
          month.getFullYear(),
          month.getMonth() + 1,
        ),
        calendarService.eventsForDay(get().selectedDate),
      ]);
      set({ summaries, events, loading: false });
    } catch (error) {
      set({
        loading: false,
        error: toAppError(error, "Wolf could not load your calendar.").message,
      });
    }
  },

  async selectDate(date) {
    set({ selectedDate: date });
    try {
      const events = await calendarService.eventsForDay(date);
      set({ events });
    } catch (error) {
      set({
        error: toAppError(error, "Wolf could not load that day.").message,
      });
    }
  },

  async goToMonth(month) {
    set({ viewMonth: startOfMonth(month) });
    await get().load();
  },

  async goToToday() {
    const today = new Date();
    set({ viewMonth: startOfMonth(today), selectedDate: toDateKey(today) });
    await get().load();
  },

  async create(event) {
    try {
      const created = await calendarService.create(event);
      await get().load();
      return created;
    } catch (error) {
      set({
        error: toAppError(error, "Wolf could not create that event.").message,
      });
      return null;
    }
  },

  async update(id, update) {
    try {
      await calendarService.update(id, update);
      await get().load();
      return true;
    } catch (error) {
      set({
        error: toAppError(error, "Wolf could not update that event.").message,
      });
      return false;
    }
  },

  async remove(id) {
    try {
      await calendarService.remove(id);
      await get().load();
      return true;
    } catch (error) {
      set({
        error: toAppError(error, "Wolf could not delete that event.").message,
      });
      return false;
    }
  },

  async upcoming(limit = 5) {
    try {
      return await calendarService.upcoming(limit);
    } catch {
      return [];
    }
  },

  clearError() {
    set({ error: null });
  },
}));

export function eventsOn(
  summaries: DaySummary[],
  date: string,
): DaySummary | undefined {
  return summaries.find((s) => s.date === date);
}

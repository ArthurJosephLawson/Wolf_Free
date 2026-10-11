import { invoke } from "./ipc";
import type {
  CalendarEvent,
  CalendarEventUpdate,
  CalendarOverview,
  DaySummary,
  NewCalendarEvent,
} from "../types";

export const calendarService = {
  list(range: { from?: string; to?: string }): Promise<CalendarEvent[]> {
    return invoke<CalendarEvent[]>("list_events", { query: range });
  },

  upcoming(limit = 5): Promise<CalendarEvent[]> {
    return invoke<CalendarEvent[]>("upcoming_events", { limit });
  },

  create(event: NewCalendarEvent): Promise<CalendarEvent> {
    return invoke<CalendarEvent>("create_event", { event });
  },

  update(id: string, update: CalendarEventUpdate): Promise<CalendarEvent> {
    return invoke<CalendarEvent>("update_event", { id, update });
  },

  remove(id: string): Promise<void> {
    return invoke<void>("delete_event", { id });
  },

  monthSummaries(year: number, month: number): Promise<DaySummary[]> {
    return invoke<DaySummary[]>("month_summaries", { year, month });
  },

  eventsForDay(date: string): Promise<CalendarEvent[]> {
    return invoke<CalendarEvent[]>("events_for_day", { date });
  },

  overview(): Promise<CalendarOverview> {
    return invoke<CalendarOverview>("calendar_overview");
  },

  dueReminders(): Promise<CalendarEvent[]> {
    return invoke<CalendarEvent[]>("due_event_reminders");
  },

  markNotified(id: string): Promise<void> {
    return invoke<void>("mark_event_notified", { id });
  },
};

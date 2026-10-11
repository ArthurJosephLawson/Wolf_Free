import { parseDateTimeKey } from "./date";

export interface ReminderEvent {
  id: string;
  title: string;
  startTime: string;
  notifiedAt: string | null;
}

export function minutesUntil(startTime: string, now: Date): number {
  const start = parseDateTimeKey(startTime);
  if (Number.isNaN(start.getTime())) return 0;
  return Math.max(0, Math.ceil((start.getTime() - now.getTime()) / 60_000));
}

export function pendingReminders(
  events: ReminderEvent[],
  now: Date,
): ReminderEvent[] {
  return events
    .filter((event) => event.notifiedAt === null)
    .filter((event) => {
      const start = parseDateTimeKey(event.startTime).getTime();
      return !Number.isNaN(start) && start >= now.getTime();
    })
    .sort(
      (a, b) =>
        parseDateTimeKey(a.startTime).getTime() -
        parseDateTimeKey(b.startTime).getTime(),
    );
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const DATETIME_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

export function toDateKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function toDateTimeKey(date: Date = new Date()): string {
  const h = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  return `${toDateKey(date)}T${h}:${min}`;
}

export function todayKey(): string {
  return toDateKey(new Date());
}

export function isDateKey(value: string): boolean {
  if (!DATE_RE.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number) as [number, number, number];
  const date = new Date(y, m - 1, d);
  return (
    date.getFullYear() === y &&
    date.getMonth() === m - 1 &&
    date.getDate() === d
  );
}

export function isDateTimeKey(value: string): boolean {
  if (!DATETIME_RE.test(value)) return false;
  return isDateKey(value.slice(0, 10));
}

export function parseDateKey(value: string): Date {
  const [y, m, d] = value.split("-").map(Number) as [number, number, number];
  return new Date(y, m - 1, d);
}

export function parseDateTimeKey(value: string): Date {
  const date = value.slice(0, 10);
  const time = value.slice(11, 16);
  const [h, min] = time.split(":").map(Number) as [number, number];
  const base = parseDateKey(date);
  base.setHours(h, min, 0, 0);
  return base;
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export const WEEKDAY_LABELS = [
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
  "Sun",
] as const;

export function monthGrid(view: Date): Date[] {
  const first = startOfMonth(view);
  const lead = (first.getDay() + 6) % 7;
  const start = addDays(first, -lead);
  return Array.from({ length: 42 }, (_, i) => addDays(start, i));
}

export function formatTime(value: string): string {
  return value.length >= 16 ? value.slice(11, 16) : value;
}

export function formatDayShort(value: string): string {
  const date = parseDateKey(value.slice(0, 10));
  return `${date.getDate()} ${date.toLocaleDateString(undefined, { month: "short" })}`;
}

export function formatDayLong(value: string): string {
  const date = parseDateKey(value.slice(0, 10));
  return `${WEEKDAY_LABELS[(date.getDay() + 6) % 7]} ${date.getDate()} ${date.toLocaleDateString(undefined, { month: "short" })}`;
}

export function relativeDay(
  value: string,
  reference: Date = new Date(),
): string {
  const key = toDateKey(reference);
  const target = value.slice(0, 10);
  const days = Math.round(
    (parseDateKey(target).getTime() - parseDateKey(key).getTime()) / 86_400_000,
  );
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days === -1) return "Yesterday";
  if (days < 0) return `${Math.abs(days)}d overdue`;
  if (days <= 6)
    return WEEKDAY_LABELS[(parseDateKey(target).getDay() + 6) % 7]!;
  return formatDayShort(target);
}

export function formatClock(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function formatDuration(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

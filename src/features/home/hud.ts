import { parseDateKey, WEEKDAY_LABELS } from "../../lib/date";

const MONTH_LABELS = [
  "JAN",
  "FEB",
  "MAR",
  "APR",
  "MAY",
  "JUN",
  "JUL",
  "AUG",
  "SEP",
  "OCT",
  "NOV",
  "DEC",
];

export function hudLine(
  dateKey: string,
  open: number,
  overdue: number,
): string {
  const date = parseDateKey(dateKey);
  const weekday = WEEKDAY_LABELS[(date.getDay() + 6) % 7]!.toUpperCase();
  const month = MONTH_LABELS[date.getMonth()];
  return `${weekday} ${date.getDate()} ${month} · ${open} OPEN · ${overdue} OVERDUE`;
}

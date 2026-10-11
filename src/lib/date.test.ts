import { describe, expect, it } from "vitest";
import {
  isDateKey,
  isDateTimeKey,
  addDays,
  monthGrid,
  parseDateKey,
  relativeDay,
  toDateKey,
  toDateTimeKey,
  formatClock,
  formatDayLong,
  formatDuration,
  formatTime,
  WEEKDAY_LABELS,
} from "./date";

describe("date keys", () => {
  it("formats a date as YYYY-MM-DD in local time", () => {
    expect(toDateKey(new Date(2026, 8, 28))).toBe("2026-09-28");
    expect(toDateTimeKey(new Date(2026, 8, 28, 9, 5))).toBe("2026-09-28T09:05");
  });

  it("rejects impossible dates", () => {
    expect(isDateKey("2026-02-30")).toBe(false);
    expect(isDateKey("2026-13-01")).toBe(false);
    expect(isDateKey("2026-9-1")).toBe(false);
    expect(isDateKey("")).toBe(false);
  });

  it("accepts real dates, including leap days", () => {
    expect(isDateKey("2024-02-29")).toBe(true);
    expect(isDateKey("2026-09-28")).toBe(true);
  });

  it("validates naive datetimes", () => {
    expect(isDateTimeKey("2026-09-28T14:30")).toBe(true);
    expect(isDateTimeKey("2026-09-28 14:30")).toBe(false);
    expect(isDateTimeKey("2026-02-30T10:00")).toBe(false);
  });
});

describe("arithmetic", () => {
  it("adds days across a month boundary", () => {
    expect(toDateKey(addDays(new Date(2026, 0, 31), 1))).toBe("2026-02-01");
  });

  it("builds a Monday-first 6x7 month grid", () => {
    const grid = monthGrid(new Date(2026, 8, 1));
    expect(grid).toHaveLength(42);

    expect(toDateKey(grid[0]!)).toBe("2026-08-31");
    const first = grid[0]!;
    expect(WEEKDAY_LABELS[(first.getDay() + 6) % 7]).toBe("Mon");
  });
});

describe("relative labels", () => {
  const reference = parseDateKey("2026-09-28");

  it("names the nearby days", () => {
    expect(relativeDay("2026-09-28", reference)).toBe("Today");
    expect(relativeDay("2026-09-29", reference)).toBe("Tomorrow");
    expect(relativeDay("2026-09-27", reference)).toBe("Yesterday");
  });

  it("reports how late something is", () => {
    expect(relativeDay("2026-09-25", reference)).toBe("3d overdue");
  });

  it("falls back to a weekday for the coming week", () => {
    expect(relativeDay("2026-09-30", reference)).toBe("Wed");
  });
});

describe("formatting", () => {
  it("formats durations and clocks", () => {
    expect(formatClock(1500)).toBe("25:00");
    expect(formatClock(-5)).toBe("00:00");
    expect(formatDuration(4500)).toBe("1h 15m");
    expect(formatDuration(300)).toBe("5m");
  });

  it("slices times out of naive datetimes", () => {
    expect(formatTime("2026-09-28T14:30")).toBe("14:30");
    expect(formatDayLong("2026-09-28")).toBe("Mon 28 Sep");
  });
});

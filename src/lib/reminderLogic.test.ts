import { describe, expect, it } from "vitest";
import {
  minutesUntil,
  pendingReminders,
  type ReminderEvent,
} from "./reminderLogic";

function event(overrides: Partial<ReminderEvent> = {}): ReminderEvent {
  return {
    id: "e1",
    title: "Standup",
    startTime: "2026-09-28T14:30",
    notifiedAt: null,
    ...overrides,
  };
}

const NOW = new Date(2026, 8, 28, 14, 0);

describe("minutesUntil", () => {
  it("counts whole minutes up to the start", () => {
    expect(minutesUntil("2026-09-28T14:30", NOW)).toBe(30);
  });

  it("rounds a partial minute up rather than to zero", () => {
    const almost = new Date(2026, 8, 28, 14, 29, 30);
    expect(minutesUntil("2026-09-28T14:30", almost)).toBe(1);
  });

  it("never reports negative minutes for a start in the past", () => {
    expect(minutesUntil("2026-09-28T13:00", NOW)).toBe(0);
  });

  it("is zero exactly at the start", () => {
    expect(minutesUntil("2026-09-28T14:00", NOW)).toBe(0);
  });

  it("reads the start as local time across a DST change", () => {
    expect(minutesUntil("2026-03-29T01:30", new Date(2026, 2, 29, 1, 0))).toBe(
      30,
    );
  });

  it("treats an unparseable start as immediate", () => {
    expect(minutesUntil("not-a-date", NOW)).toBe(0);
  });
});

describe("pendingReminders", () => {
  it("keeps undelivered events and orders them by start", () => {
    const result = pendingReminders(
      [
        event({ id: "late", startTime: "2026-09-28T15:00" }),
        event({ id: "soon", startTime: "2026-09-28T14:10" }),
      ],
      NOW,
    );
    expect(result.map((e) => e.id)).toEqual(["soon", "late"]);
  });

  it("drops events that have already been notified", () => {
    const result = pendingReminders(
      [event({ notifiedAt: "2026-09-28T14:00:00Z" })],
      NOW,
    );
    expect(result).toEqual([]);
  });

  it("drops events that have already started", () => {
    const result = pendingReminders(
      [event({ startTime: "2026-09-28T13:00" })],
      NOW,
    );
    expect(result).toEqual([]);
  });

  it("keeps an event starting at exactly now", () => {
    const result = pendingReminders(
      [event({ startTime: "2026-09-28T14:00" })],
      NOW,
    );
    expect(result).toHaveLength(1);
  });

  it("drops unparseable starts instead of throwing", () => {
    expect(pendingReminders([event({ startTime: "oops" })], NOW)).toEqual([]);
  });

  it("returns an empty list for no events", () => {
    expect(pendingReminders([], NOW)).toEqual([]);
  });
});

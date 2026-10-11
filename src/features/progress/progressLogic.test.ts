import { describe, expect, it } from "vitest";
import {
  daysUntil,
  groupCommitsByDay,
  nearestCountdown,
} from "./progressLogic";
import type { CommitLog, Countdown } from "../../types";

function countdown(overrides: Partial<Countdown> = {}): Countdown {
  return {
    id: "c1",
    label: "Release",
    targetDate: "2026-10-20",
    currentValue: 0,
    targetValue: 0,
    completedAt: null,
    createdAt: "2026-10-01T00:00:00Z",
    updatedAt: "2026-10-01T00:00:00Z",
    ...overrides,
  };
}

function commit(overrides: Partial<CommitLog> = {}): CommitLog {
  return {
    id: "k1",
    committedOn: "2026-10-05",
    message: "first",
    filesChanged: 1,
    linesAdded: 10,
    linesRemoved: 2,
    createdAt: "2026-10-05T12:00:00Z",
    ...overrides,
  };
}

describe("daysUntil", () => {
  it("counts whole days between two date keys", () => {
    expect(daysUntil("2026-10-20", "2026-10-20")).toBe(0);
    expect(daysUntil("2026-10-21", "2026-10-20")).toBe(1);
    expect(daysUntil("2026-10-19", "2026-10-20")).toBe(-1);
    expect(daysUntil("2026-11-01", "2026-10-31")).toBe(1);
    expect(daysUntil("2027-01-01", "2026-12-31")).toBe(1);
    expect(daysUntil("2026-12-31", "2026-01-01")).toBe(364);
  });

  it("treats an unparseable date as the day itself", () => {
    expect(daysUntil("not-a-date", "2026-10-20")).toBe(0);
    expect(daysUntil("2026-10-20", "garbage")).toBe(0);
  });
});

describe("groupCommitsByDay", () => {
  it("groups commits and puts the newest day first", () => {
    const groups = groupCommitsByDay([
      commit({ id: "a", committedOn: "2026-10-03" }),
      commit({ id: "b", committedOn: "2026-10-05" }),
      commit({ id: "c", committedOn: "2026-10-03" }),
      commit({ id: "d", committedOn: "2026-10-05" }),
    ]);

    expect(groups.map((group) => group.day)).toEqual([
      "2026-10-05",
      "2026-10-03",
    ]);
    expect(groups[0]!.commits.map((entry) => entry.id)).toEqual(["b", "d"]);
    expect(groups[1]!.commits.map((entry) => entry.id)).toEqual(["a", "c"]);
  });

  it("returns nothing for an empty ledger", () => {
    expect(groupCommitsByDay([])).toEqual([]);
  });
});

describe("nearestCountdown", () => {
  it("picks the closest countdown that has not arrived yet", () => {
    const today = "2026-10-20";
    const nearest = nearestCountdown(
      [
        countdown({ id: "far", targetDate: "2026-12-01" }),
        countdown({ id: "near", targetDate: "2026-10-23" }),
        countdown({ id: "mid", targetDate: "2026-11-01" }),
      ],
      today,
    );

    expect(nearest?.id).toBe("near");
  });

  it("skips countdowns that already passed", () => {
    const nearest = nearestCountdown(
      [countdown({ id: "past", targetDate: "2026-10-01" })],
      "2026-10-20",
    );

    expect(nearest).toBeNull();
  });

  it("skips countdowns already marked complete", () => {
    const nearest = nearestCountdown(
      [countdown({ completedAt: "2026-10-19T10:00:00Z" })],
      "2026-10-20",
    );

    expect(nearest).toBeNull();
  });

  it("returns the countdown landing today when one lands today", () => {
    const nearest = nearestCountdown(
      [countdown({ id: "today", targetDate: "2026-10-20" })],
      "2026-10-20",
    );

    expect(nearest?.id).toBe("today");
    expect(daysUntil(nearest!.targetDate, "2026-10-20")).toBe(0);
  });

  it("keeps the first of two equally near countdowns", () => {
    const nearest = nearestCountdown(
      [
        countdown({ id: "first", targetDate: "2026-10-25" }),
        countdown({ id: "second", targetDate: "2026-10-25" }),
      ],
      "2026-10-20",
    );

    expect(nearest?.id).toBe("first");
  });
});

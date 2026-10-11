import { describe, expect, it } from "vitest";
import {
  advance,
  describe as describeTimer,
  initialSnapshot,
  isRunning,
  nextPhaseAfter,
  pause,
  phaseSeconds,
  progressFraction,
  reset,
  skip,
  start,
  tick,
  untilLongBreak,
  focusSummary,
} from "./timerLogic";
import { DEFAULT_SETTINGS } from "../settings/settingsStore";
import type { FocusStats, Settings } from "../../types";

const SETTINGS: Settings = {
  ...DEFAULT_SETTINGS,
  focusMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  sessionsBeforeLongBreak: 4,
};
const T0 = 1_700_000_000_000;

describe("phases", () => {
  it("converts a phase to seconds", () => {
    expect(phaseSeconds("focus", SETTINGS)).toBe(1500);
    expect(phaseSeconds("short_break", SETTINGS)).toBe(300);
    expect(phaseSeconds("long_break", SETTINGS)).toBe(900);
  });

  it("starts idle with a full focus block", () => {
    const snapshot = initialSnapshot(SETTINGS);
    expect(snapshot.status).toBe("IDLE");
    expect(snapshot.remaining).toBe(1500);
    expect(snapshot.startedAt).toBeNull();
  });
});

describe("running", () => {
  it("moves from idle to focusing on start", () => {
    const snapshot = start(initialSnapshot(SETTINGS), T0);
    expect(snapshot.phase).toBe("focus");
    expect(snapshot.status).toBe("FOCUSING");
    expect(snapshot.startedAt).toBe(T0);
    expect(isRunning(snapshot.status)).toBe(true);
  });

  it("counts down from the start time", () => {
    const started = start(initialSnapshot(SETTINGS), T0);
    const later = tick(started, T0 + 60_000);
    expect(later.remaining).toBe(1440);
  });

  it("does not tick while paused", () => {
    const paused = pause(start(initialSnapshot(SETTINGS), T0), T0 + 10_000);
    expect(paused.status).toBe("PAUSED");
    expect(tick(paused, T0 + 600_000).remaining).toBe(paused.remaining);
  });

  it("resumes from where it was paused", () => {
    const paused = pause(start(initialSnapshot(SETTINGS), T0), T0 + 10_000);
    const resumed = start(paused, T0 + 20_000);

    expect(tick(resumed, T0 + 50_000).remaining).toBe(1500 - 40);
  });

  it("completes when the time runs out", () => {
    const started = start(initialSnapshot(SETTINGS), T0);
    const done = tick(started, T0 + 1_500_000);
    expect(done.status).toBe("COMPLETED");
    expect(done.remaining).toBe(0);
  });

  it("resets back to a full block", () => {
    const halfway = tick(start(initialSnapshot(SETTINGS), T0), T0 + 600_000);
    const fresh = reset(SETTINGS, halfway);
    expect(fresh.remaining).toBe(1500);
    expect(fresh.status).toBe("IDLE");
  });
});

describe("phase progression", () => {
  it("goes to a short break after one focus block", () => {
    const focused = {
      ...initialSnapshot(SETTINGS),
      phase: "focus" as const,
      status: "COMPLETED" as const,
      completedInSet: 0,
    };
    expect(nextPhaseAfter(focused, { settings: SETTINGS })).toEqual({
      phase: "short_break",
      completedInSet: 1,
    });
  });

  it("earns a long break on the fourth session and resets the counter", () => {
    const focused = {
      ...initialSnapshot(SETTINGS),
      phase: "focus" as const,
      status: "COMPLETED" as const,
      completedInSet: 3,
    };
    expect(nextPhaseAfter(focused, { settings: SETTINGS })).toEqual({
      phase: "long_break",
      completedInSet: 0,
    });
  });

  it("returns to focus after a break", () => {
    const onBreak = {
      ...initialSnapshot(SETTINGS),
      phase: "short_break" as const,
      status: "COMPLETED" as const,
      completedInSet: 2,
    };
    expect(nextPhaseAfter(onBreak, { settings: SETTINGS })).toEqual({
      phase: "focus",
      completedInSet: 2,
    });
  });

  it("starts the next phase running", () => {
    const focused = {
      ...initialSnapshot(SETTINGS),
      phase: "focus" as const,
      status: "COMPLETED" as const,
    };
    const next = advance(focused, { settings: SETTINGS }, T0);
    expect(next.phase).toBe("short_break");
    expect(next.status).toBe("BREAK");
    expect(next.remaining).toBe(300);
  });

  it("leaves a skipped phase paused", () => {
    const focused = {
      ...initialSnapshot(SETTINGS),
      phase: "focus" as const,
      status: "FOCUSING" as const,
      startedAt: T0,
    };
    const skipped = skip(focused, { settings: SETTINGS }, T0 + 1_000);
    expect(skipped.phase).toBe("short_break");
    expect(skipped.status).toBe("PAUSED");
    expect(skipped.startedAt).toBeNull();
  });

  it("counts down to the long break", () => {
    const snapshot = { ...initialSnapshot(SETTINGS), completedInSet: 2 };
    expect(untilLongBreak(snapshot, SETTINGS)).toBe(2);
  });
});

describe("presentation", () => {
  it("reports progress as a fraction", () => {
    const halfway = tick(start(initialSnapshot(SETTINGS), T0), T0 + 750_000);
    expect(progressFraction(halfway)).toBeCloseTo(0.5, 2);
  });

  it("describes each status in plain language", () => {
    expect(
      describeTimer({ ...initialSnapshot(SETTINGS), status: "FOCUSING" }),
    ).toBe("Focusing.");
    expect(describeTimer({ ...initialSnapshot(SETTINGS) })).toBe(
      "Ready when you are.",
    );
  });

  it("summarises a day of focus", () => {
    const stats: FocusStats = {
      completedToday: 0,
      completedWeek: 0,
      totalCompleted: 0,
      focusMinutesToday: 0,
      focusMinutesWeek: 0,
      dailyMinutes: [],
    };
    expect(focusSummary(stats)).toBe("No sessions yet today.");
    expect(
      focusSummary({ ...stats, completedToday: 1, focusMinutesToday: 25 }),
    ).toBe("1 session · 25 min focused today.");
    expect(
      focusSummary({ ...stats, completedToday: 3, focusMinutesToday: 75 }),
    ).toBe("3 sessions · 75 min focused today.");
  });
});

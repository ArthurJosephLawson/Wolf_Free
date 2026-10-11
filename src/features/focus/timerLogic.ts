import type {
  FocusPhase,
  FocusStats,
  Settings,
  TimerStatus,
} from "../../types";

export interface TimerSnapshot {
  phase: FocusPhase;
  status: TimerStatus;

  remaining: number;

  total: number;

  completedInSet: number;

  startedAt: number | null;

  accumulatedMs: number;
}

export function phaseSeconds(phase: FocusPhase, settings: Settings): number {
  switch (phase) {
    case "focus":
      return settings.focusMinutes * 60;
    case "short_break":
      return settings.shortBreakMinutes * 60;
    case "long_break":
      return settings.longBreakMinutes * 60;
    case "idle":
    default:
      return settings.focusMinutes * 60;
  }
}

export function initialSnapshot(settings: Settings): TimerSnapshot {
  const phase: FocusPhase = "idle";
  return {
    phase,
    status: "IDLE",
    remaining: phaseSeconds("focus", settings),
    total: phaseSeconds("focus", settings),
    completedInSet: 0,
    startedAt: null,
    accumulatedMs: 0,
  };
}

export function start(snapshot: TimerSnapshot, now: number): TimerSnapshot {
  if (isRunning(snapshot.status)) return snapshot;

  const phase: FocusPhase =
    snapshot.phase === "idle" ? "focus" : snapshot.phase;

  const resuming = snapshot.status === "PAUSED";
  return {
    ...snapshot,
    phase,
    status: phase === "focus" ? "FOCUSING" : "BREAK",
    startedAt: now,
    accumulatedMs: resuming ? snapshot.accumulatedMs : 0,
  };
}

export function pause(snapshot: TimerSnapshot, now: number): TimerSnapshot {
  if (snapshot.status !== "FOCUSING" && snapshot.status !== "BREAK")
    return snapshot;
  return {
    ...snapshot,
    status: "PAUSED",
    accumulatedMs: snapshot.accumulatedMs + (now - (snapshot.startedAt ?? now)),
    startedAt: null,
  };
}

export function reset(
  settings: Settings,
  snapshot: TimerSnapshot,
): TimerSnapshot {
  const phase: FocusPhase = snapshot.phase === "idle" ? "idle" : snapshot.phase;
  return {
    ...initialSnapshot(settings),
    phase,
    total: phaseSeconds(phase === "idle" ? "focus" : phase, settings),
    remaining: phaseSeconds(phase === "idle" ? "focus" : phase, settings),
  };
}

export function tick(snapshot: TimerSnapshot, now: number): TimerSnapshot {
  if (snapshot.status !== "FOCUSING" && snapshot.status !== "BREAK")
    return snapshot;
  const elapsed =
    (snapshot.accumulatedMs + (now - (snapshot.startedAt ?? now))) / 1000;
  const remaining = Math.max(0, Math.round(snapshot.total - elapsed));
  if (remaining > 0) return { ...snapshot, remaining };
  return { ...snapshot, remaining: 0, status: "COMPLETED", startedAt: null };
}

interface TransitionContext {
  settings: Settings;
}

export function nextPhaseAfter(
  snapshot: TimerSnapshot,
  ctx: TransitionContext,
): { phase: FocusPhase; completedInSet: number } {
  if (snapshot.phase === "focus") {
    const completedInSet = snapshot.completedInSet + 1;
    const needsLong = completedInSet >= ctx.settings.sessionsBeforeLongBreak;
    return {
      phase: needsLong ? "long_break" : "short_break",
      completedInSet: needsLong ? 0 : completedInSet,
    };
  }
  return { phase: "focus", completedInSet: snapshot.completedInSet };
}

export function advance(
  snapshot: TimerSnapshot,
  ctx: TransitionContext,
  now: number,
): TimerSnapshot {
  const { phase, completedInSet } = nextPhaseAfter(snapshot, ctx);
  const total = phaseSeconds(phase, ctx.settings);
  return {
    phase,
    status: phase === "focus" ? "FOCUSING" : "BREAK",
    remaining: total,
    total,
    completedInSet,
    startedAt: now,
    accumulatedMs: 0,
  };
}

export function skip(
  snapshot: TimerSnapshot,
  ctx: TransitionContext,
  now: number,
): TimerSnapshot {
  return { ...advance(snapshot, ctx, now), status: "PAUSED", startedAt: null };
}

export function isRunning(status: TimerStatus): boolean {
  return status === "FOCUSING" || status === "BREAK";
}

export function progressFraction(snapshot: TimerSnapshot): number {
  if (snapshot.total <= 0) return 0;
  return Math.min(1, Math.max(0, 1 - snapshot.remaining / snapshot.total));
}

export function describe(snapshot: TimerSnapshot): string {
  switch (snapshot.status) {
    case "IDLE":
      return "Ready when you are.";
    case "FOCUSING":
      return "Focusing.";
    case "BREAK":
      return "On a break.";
    case "PAUSED":
      return "Paused.";
    case "COMPLETED":
      return "Phase complete.";
    default:
      return "";
  }
}

export function untilLongBreak(
  snapshot: TimerSnapshot,
  settings: Settings,
): number {
  return Math.max(
    0,
    settings.sessionsBeforeLongBreak - snapshot.completedInSet,
  );
}

export function focusSummary(stats: FocusStats): string {
  if (stats.completedToday === 0) return "No sessions yet today.";
  const plural = stats.completedToday === 1 ? "session" : "sessions";
  return `${stats.completedToday} ${plural} · ${stats.focusMinutesToday} min focused today.`;
}

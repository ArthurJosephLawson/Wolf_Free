import type { WolfState } from "./sprites";

const FRAME_DURATIONS: Record<WolfState, readonly number[]> = {
  idle: [300, 350, 200, 350],

  blink: [100, 100, 100],

  speaking: [120, 120, 120, 120],

  listening: [450, 200, 450],

  happy: [200, 200, 300, 300],

  winking: [150, 400, 150],
  huffing: [200, 150, 300],
  puffing: [300, 300, 400],

  sad: [500, 500, 500, 500],

  held: [400, 400, 400, 400],
  land: [80, 70],
};

interface FrameTiming {
  durations: readonly number[];

  ttlMs: number | null;
}

export const TIMINGS: Record<WolfState, FrameTiming> = {
  idle: { durations: FRAME_DURATIONS.idle, ttlMs: null },
  blink: { durations: FRAME_DURATIONS.blink, ttlMs: null },
  speaking: { durations: FRAME_DURATIONS.speaking, ttlMs: 30_000 },
  listening: { durations: FRAME_DURATIONS.listening, ttlMs: 20_000 },
  happy: { durations: FRAME_DURATIONS.happy, ttlMs: 6_000 },
  winking: { durations: FRAME_DURATIONS.winking, ttlMs: 2_000 },
  huffing: { durations: FRAME_DURATIONS.huffing, ttlMs: 8_000 },
  puffing: { durations: FRAME_DURATIONS.puffing, ttlMs: 20_000 },
  sad: { durations: FRAME_DURATIONS.sad, ttlMs: null },
  held: { durations: FRAME_DURATIONS.held, ttlMs: null },
  land: { durations: FRAME_DURATIONS.land, ttlMs: null },
};

export function frameDurations(state: WolfState, frameCount: number): number[] {
  const pattern = FRAME_DURATIONS[state] ?? FRAME_DURATIONS.idle;
  return Array.from(
    { length: frameCount },
    (_, i) => pattern[i % pattern.length]!,
  );
}

const FALLBACK_FRAME_MS = 1_200;

export function frameInterval(state: WolfState): number {
  return TIMINGS[state]?.durations[0] ?? FALLBACK_FRAME_MS;
}

export function stateTtl(state: WolfState): number | null {
  return TIMINGS[state]?.ttlMs ?? null;
}

export const BLINK_MIN_MS = 3_000;
export const BLINK_MAX_MS = 6_000;

export function nextBlinkDelay(random: () => number = Math.random): number {
  return BLINK_MIN_MS + random() * (BLINK_MAX_MS - BLINK_MIN_MS);
}

export type WolfSignal =
  | "default"
  | "thinking"
  | "speaking"
  | "focus-active"
  | "focus-paused"
  | "break-active"
  | "task-completed"
  | "task-created"
  | "all-clear"
  | "busy"
  | "poked"
  | "offline"
  | "sleep";

export const WOLF_SIGNALS = [
  "default",
  "thinking",
  "speaking",
  "focus-active",
  "focus-paused",
  "break-active",
  "task-completed",
  "task-created",
  "all-clear",
  "busy",
  "poked",
  "offline",
  "sleep",
] as const satisfies readonly WolfSignal[];

export function isWolfSignal(value: unknown): value is WolfSignal {
  return (
    typeof value === "string" &&
    (WOLF_SIGNALS as readonly string[]).includes(value)
  );
}

export function resolveState(signal: WolfSignal): WolfState {
  if (signal === "offline") return "sad";

  switch (signal) {
    case "speaking":
      return "speaking";
    case "thinking":
      return "puffing";
    case "focus-active":
      return "listening";
    case "busy":
      return "listening";
    case "focus-paused":
      return "huffing";
    case "break-active":
      return "happy";
    case "task-completed":
      return "happy";
    case "task-created":
      return "happy";
    case "all-clear":
      return "happy";
    case "poked":
      return "winking";
    case "sleep":
    case "default":
    default:
      return "idle";
  }
}

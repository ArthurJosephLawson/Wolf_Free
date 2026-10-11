import { create } from "zustand";
import { focusService } from "../../services/focus";
import { MESSAGES, notifyQuiet } from "../../services/notify";
import { toAppError } from "../../lib/errors";
import { DEFAULT_SETTINGS } from "../settings/settingsStore";
import type {
  FocusPhase,
  FocusSession,
  FocusStats,
  Settings,
  TimerStatus,
} from "../../types";
import {
  advance,
  initialSnapshot,
  isRunning,
  pause,
  progressFraction,
  reset as resetTo,
  skip,
  start as startTimer,
  tick,
  untilLongBreak,
  type TimerSnapshot,
} from "./timerLogic";

interface FocusStore {
  settings: Settings;
  snapshot: TimerSnapshot;
  sessions: FocusSession[];
  stats: FocusStats | null;
  error: string | null;

  lastCompletedPhase: FocusPhase | null;

  init: (settings: Settings) => void;
  refresh: () => Promise<void>;
  start: () => void;
  pause: () => void;
  reset: () => void;
  skipPhase: () => void;
  advancePhase: () => void;
  tick: () => Promise<void>;
  acknowledgeCompletion: () => void;
  clearError: () => void;
}

export const useFocusStore = create<FocusStore>((set, get) => ({
  settings: DEFAULT_SETTINGS,
  snapshot: initialSnapshot(DEFAULT_SETTINGS),
  sessions: [],
  stats: null,
  error: null,
  lastCompletedPhase: null,

  init(settings) {
    if (JSON.stringify(get().settings) === JSON.stringify(settings)) return;
    set({
      settings,
      snapshot: initialSnapshot(settings),
      lastCompletedPhase: null,
    });
  },

  async refresh() {
    try {
      const [sessions, stats] = await Promise.all([
        focusService.list(20),
        focusService.stats(),
      ]);
      set({ sessions, stats, error: null });
    } catch (error) {
      set({
        error: toAppError(error, "Wolf could not load your focus history.")
          .message,
      });
    }
  },

  start() {
    const current = get().snapshot;
    const snapshot =
      current.status === "COMPLETED"
        ? advance(current, { settings: get().settings }, Date.now())
        : startTimer(current, Date.now());
    set({ snapshot });
  },

  pause() {
    set({ snapshot: pause(get().snapshot, Date.now()) });
  },

  reset() {
    set({
      snapshot: resetTo(get().settings, get().snapshot),
      lastCompletedPhase: null,
    });
  },

  skipPhase() {
    set({
      snapshot: skip(get().snapshot, { settings: get().settings }, Date.now()),
    });
  },

  advancePhase() {
    set({
      snapshot: advance(
        get().snapshot,
        { settings: get().settings },
        Date.now(),
      ),
      lastCompletedPhase: null,
    });
  },

  async tick() {
    const now = Date.now();
    const before = get().snapshot;
    const ticked = tick(before, now);

    if (before.status === "COMPLETED") {
      set({ snapshot: ticked });
      return;
    }

    if (ticked.status !== "COMPLETED") {
      if (ticked.remaining !== before.remaining) set({ snapshot: ticked });
      return;
    }

    set({ snapshot: ticked, lastCompletedPhase: before.phase });

    if (before.startedAt !== null && before.phase !== "idle") {
      try {
        await focusService.create({
          startedAt: new Date(before.startedAt).toISOString(),
          endedAt: new Date(now).toISOString(),
          durationSeconds: before.total,
          completed: true,
          kind: before.phase,
        });
      } catch (error) {
        set({
          error: toAppError(error, "Wolf could not save that focus session.")
            .message,
        });
      }
    }

    await notifyQuiet(
      before.phase === "focus"
        ? MESSAGES.focusComplete(Math.round(before.total / 60))
        : MESSAGES.breakComplete(),
    );

    const autoStart =
      before.phase === "focus"
        ? get().settings.autoStartBreaks
        : get().settings.autoStartFocus;
    if (autoStart) {
      set({
        snapshot: advance(get().snapshot, { settings: get().settings }, now),
      });
    }

    await get().refresh();
  },

  acknowledgeCompletion() {
    set({ lastCompletedPhase: null });
  },

  clearError() {
    set({ error: null });
  },
}));

interface TimerView {
  phase: FocusPhase;
  status: TimerStatus;
  running: boolean;
  remaining: number;
  total: number;
  progress: number;
  completedInSet: number;
  untilLongBreak: number;
}

export function selectTimerView(state: FocusStore): TimerView {
  const { snapshot } = state;
  return {
    phase: snapshot.phase,
    status: snapshot.status,
    running: isRunning(snapshot.status),
    remaining: snapshot.remaining,
    total: snapshot.total,
    progress: progressFraction(snapshot),
    completedInSet: snapshot.completedInSet,
    untilLongBreak: untilLongBreak(snapshot, state.settings),
  };
}

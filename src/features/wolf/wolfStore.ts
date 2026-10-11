import { create } from "zustand";
import type { WolfSignal } from "../../assets/wolf/animation";
import { resolveState, stateTtl } from "../../assets/wolf/animation";
import type { WolfState } from "../../assets/wolf/sprites";
import { desktopService } from "../../services/desktop";

interface WolfStore {
  signal: WolfSignal;
  state: WolfState;

  expiresAt: number | null;

  pulse: number;

  push: (signal: WolfSignal) => void;

  pushShared: (signal: WolfSignal) => void;
  hold: (state: WolfState) => void;
  settle: () => void;

  reevaluate: () => void;
}

export const useWolfStore = create<WolfStore>((set, get) => ({
  signal: "default",
  state: resolveState("default"),
  expiresAt: null,
  pulse: 0,

  push(signal) {
    const now = Date.now();
    const resolved = resolveState(signal);

    const ttl = stateTtl(resolved);
    set((prev) => ({
      signal,
      state: resolved,
      expiresAt: ttl === null ? null : now + ttl,

      pulse: TRANSIENT.has(resolved) ? prev.pulse + 1 : prev.pulse,
    }));
  },

  pushShared(signal) {
    get().push(signal);
    void desktopService.broadcastWolfSignal(signal);
  },

  hold(state) {
    set({ signal: "default", state, expiresAt: null });
  },

  settle() {
    set({
      signal: "default",
      state: resolveState("default"),
      expiresAt: null,
    });
  },

  reevaluate() {
    const { signal, expiresAt } = get();
    if (expiresAt !== null && Date.now() >= expiresAt) {
      get().settle();
      return;
    }

    const next = resolveState(signal);
    if (next !== get().state) set({ state: next });
  },
}));

const TRANSIENT = new Set<WolfState>([
  "speaking",
  "happy",
  "winking",
  "huffing",
  "puffing",
]);

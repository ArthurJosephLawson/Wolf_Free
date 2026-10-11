import { create } from "zustand";
import type { Route } from "../types";

type ToastTone = "info" | "success" | "warning" | "error";

export interface Toast {
  id: number;
  tone: ToastTone;
  title: string;
  body?: string;
}

interface UiStore {
  route: Route;
  companionVisible: boolean;
  toasts: Toast[];
  nextToastId: number;

  setRoute: (route: Route) => void;
  setCompanionVisible: (visible: boolean) => void;
  pushToast: (toast: Omit<Toast, "id">) => number;
  dismissToast: (id: number) => void;
  clearToasts: () => void;
}

export const useUiStore = create<UiStore>((set, get) => ({
  route: "home",
  companionVisible: true,
  toasts: [],
  nextToastId: 1,

  setRoute(route) {
    set({ route });
  },

  setCompanionVisible(companionVisible) {
    set({ companionVisible });
  },

  pushToast(toast) {
    const id = get().nextToastId;
    set((state) => ({
      toasts: [...state.toasts, { ...toast, id }],
      nextToastId: id + 1,
    }));
    return id;
  },

  dismissToast(id) {
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
  },

  clearToasts() {
    set({ toasts: [] });
  },
}));

export function greeting(name: string, hour = new Date().getHours()): string {
  const part =
    hour < 5
      ? "Still up"
      : hour < 12
        ? "Good morning"
        : hour < 18
          ? "Good afternoon"
          : "Good evening";
  return name.trim() ? `${part}, ${name.trim()}` : part;
}

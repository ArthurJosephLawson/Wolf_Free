import { create } from "zustand";
import { habitService } from "../../services/habits";
import { toAppError } from "../../lib/errors";
import type { HabitUpdate, HabitWithProgress, NewHabit } from "../../types";
import { todayKey } from "../../lib/date";

interface HabitStore {
  habits: HabitWithProgress[];
  loading: boolean;
  saving: boolean;
  error: string | null;

  load: () => Promise<void>;
  refresh: () => Promise<void>;
  create: (habit: NewHabit) => Promise<boolean>;
  update: (id: string, update: HabitUpdate) => Promise<boolean>;
  setArchived: (id: string, archived: boolean) => Promise<boolean>;
  remove: (id: string) => Promise<boolean>;

  toggleToday: (id: string) => Promise<boolean>;
  clearError: () => void;
}

export const useHabitStore = create<HabitStore>((set, get) => ({
  habits: [],
  loading: false,
  saving: false,
  error: null,

  async load() {
    set({ loading: true, error: null });
    try {
      const habits = await habitService.list(false);
      set({ habits, loading: false });
    } catch (error) {
      set({
        loading: false,
        error: toAppError(error, "Wolf could not load your habits.").message,
      });
    }
  },

  async refresh() {
    try {
      const habits = await habitService.list(false);
      set({ habits, error: null });
    } catch {
      return;
    }
  },

  async create(habit) {
    set({ saving: true, error: null });
    try {
      await habitService.create(habit);
      const habits = await habitService.list(false);
      set({ habits, saving: false });
      return true;
    } catch (error) {
      set({
        saving: false,
        error: toAppError(error, "Wolf could not create that habit.").message,
      });
      return false;
    }
  },

  async update(id, update) {
    set({ saving: true, error: null });
    try {
      await habitService.update(id, update);
      const habits = await habitService.list(false);
      set({ habits, saving: false });
      return true;
    } catch (error) {
      set({
        saving: false,
        error: toAppError(error, "Wolf could not update that habit.").message,
      });
      return false;
    }
  },

  async setArchived(id, archived) {
    set({ saving: true, error: null });
    try {
      await habitService.setArchived(id, archived);
      const habits = await habitService.list(false);
      set({ habits, saving: false });
      return true;
    } catch (error) {
      set({
        saving: false,
        error: toAppError(error, "Wolf could not archive that habit.").message,
      });
      return false;
    }
  },

  async remove(id) {
    set({ saving: true, error: null });
    try {
      await habitService.remove(id);
      set((state) => ({
        habits: state.habits.filter((h) => h.id !== id),
        saving: false,
      }));
      return true;
    } catch (error) {
      set({
        saving: false,
        error: toAppError(error, "Wolf could not delete that habit.").message,
      });
      return false;
    }
  },

  async toggleToday(id) {
    const before = get().habits.find((h) => h.id === id);
    if (!before) return false;
    const target = !before.completedToday;
    const today = todayKey();

    set((state) => ({
      habits: state.habits.map((h) =>
        h.id === id ? { ...h, completedToday: target } : h,
      ),
    }));

    try {
      if (target) {
        await habitService.complete(id, today);
      } else {
        await habitService.uncomplete(id, today);
      }
    } catch (error) {
      set((state) => ({
        habits: state.habits.map((h) => (h.id === id ? before : h)),
        error: toAppError(error, "Wolf could not update that habit.").message,
      }));
      return false;
    }

    await get().refresh();
    return true;
  },

  clearError() {
    set({ error: null });
  },
}));

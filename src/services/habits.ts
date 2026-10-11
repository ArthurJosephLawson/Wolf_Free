import { invoke } from "./ipc";
import type {
  Habit,
  HabitCompletion,
  HabitUpdate,
  HabitWithProgress,
  NewHabit,
} from "../types";

export const habitService = {
  list(includeArchived = false): Promise<HabitWithProgress[]> {
    return invoke<HabitWithProgress[]>("list_habits", { includeArchived });
  },

  create(habit: NewHabit): Promise<Habit> {
    return invoke<Habit>("create_habit", { habit });
  },

  update(id: string, update: HabitUpdate): Promise<Habit> {
    return invoke<Habit>("update_habit", { id, update });
  },

  setArchived(id: string, archived: boolean): Promise<Habit> {
    return invoke<Habit>("set_habit_archived", { id, archived });
  },

  remove(id: string): Promise<void> {
    return invoke<void>("delete_habit", { id });
  },

  complete(habitId: string, date?: string): Promise<HabitCompletion> {
    return invoke<HabitCompletion>("complete_habit", {
      habitId,
      date: date ?? null,
    });
  },

  uncomplete(habitId: string, date: string): Promise<void> {
    return invoke<void>("uncomplete_habit", { habitId, date });
  },

  completions(habitId: string): Promise<string[]> {
    return invoke<string[]>("list_habit_completions", { id: habitId });
  },
};

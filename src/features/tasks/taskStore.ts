import { create } from "zustand";
import { taskService } from "../../services/tasks";
import { toAppError } from "../../lib/errors";
import type {
  NewTask,
  Task,
  TaskFilter,
  TaskSort,
  TaskUpdate,
} from "../../types";
import { filterAndSort } from "./taskLogic";
import { todayKey } from "../../lib/date";

interface TaskStore {
  tasks: Task[];
  filter: TaskFilter;
  sort: TaskSort;
  search: string;
  loading: boolean;
  error: string | null;
  lastCompletedId: string | null;

  load: () => Promise<void>;
  setFilter: (filter: TaskFilter) => void;
  setSort: (sort: TaskSort) => void;
  setSearch: (search: string) => void;
  create: (task: NewTask) => Promise<Task | null>;
  update: (id: string, update: TaskUpdate) => Promise<boolean>;
  setCompleted: (id: string, completed: boolean) => Promise<boolean>;
  remove: (id: string) => Promise<boolean>;
  clearError: () => void;
  consumeCompletion: () => string | null;
}

export const useTaskStore = create<TaskStore>((set, get) => ({
  tasks: [],
  filter: "all",
  sort: "default",
  search: "",
  loading: false,
  error: null,
  lastCompletedId: null,

  async load() {
    set({ loading: true, error: null });
    try {
      const tasks = await taskService.list({ filter: "all", sort: "default" });
      set({ tasks, loading: false });
    } catch (error) {
      set({
        loading: false,
        error: toAppError(error, "Wolf could not load your tasks.").message,
      });
    }
  },

  setFilter(filter) {
    set({ filter });
  },

  setSort(sort) {
    set({ sort });
  },

  setSearch(search) {
    set({ search });
  },

  async create(task) {
    try {
      const created = await taskService.create(task);
      set((state) => ({ tasks: [...state.tasks, created], error: null }));
      return created;
    } catch (error) {
      set({
        error: toAppError(error, "Wolf could not create that task.").message,
      });
      return null;
    }
  },

  async update(id, update) {
    try {
      const saved = await taskService.update(id, update);
      set((state) => ({
        tasks: state.tasks.map((t) => (t.id === saved.id ? saved : t)),
        error: null,
      }));
      return true;
    } catch (error) {
      set({
        error: toAppError(error, "Wolf could not update that task.").message,
      });
      return false;
    }
  },

  async setCompleted(id, completed) {
    try {
      const saved = await taskService.setCompleted(id, completed);
      set((state) => ({
        tasks: state.tasks.map((t) => (t.id === saved.id ? saved : t)),
        error: null,

        lastCompletedId: completed ? saved.id : state.lastCompletedId,
      }));
      return true;
    } catch (error) {
      set({
        error: toAppError(error, "Wolf could not update that task.").message,
      });
      return false;
    }
  },

  async remove(id) {
    try {
      await taskService.remove(id);
      set((state) => ({
        tasks: state.tasks.filter((t) => t.id !== id),
        error: null,
      }));
      return true;
    } catch (error) {
      set({
        error: toAppError(error, "Wolf could not delete that task.").message,
      });
      return false;
    }
  },

  clearError() {
    set({ error: null });
  },

  consumeCompletion() {
    const id = get().lastCompletedId;
    if (id) set({ lastCompletedId: null });
    return id;
  },
}));

export function selectVisibleTasks(state: TaskStore): Task[] {
  const base = state.search.trim()
    ? state.tasks.filter((t) => {
        const needle = state.search.trim().toLowerCase();
        return (
          t.title.toLowerCase().includes(needle) ||
          t.description.toLowerCase().includes(needle)
        );
      })
    : state.tasks;
  return filterAndSort(base, state.filter, state.sort);
}

export function selectTaskCounts(state: TaskStore): {
  total: number;
  open: number;
  done: number;
  overdue: number;
  today: number;
} {
  const key = todayKey();
  let done = 0;
  let overdue = 0;
  let today = 0;
  for (const task of state.tasks) {
    if (task.completed) done += 1;
    const due = task.dueDate?.slice(0, 10) ?? null;
    if (!task.completed && due !== null && due < key) overdue += 1;
    if (!task.completed && due === key) today += 1;
  }
  return {
    total: state.tasks.length,
    open: state.tasks.length - done,
    done,
    overdue,
    today,
  };
}

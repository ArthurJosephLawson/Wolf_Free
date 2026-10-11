import { invoke } from "./ipc";
import type {
  NewTask,
  Task,
  TaskListQuery,
  TaskOverview,
  TaskStats,
  TaskUpdate,
} from "../types";

export const taskService = {
  list(query: TaskListQuery): Promise<Task[]> {
    return invoke<Task[]>("list_tasks", { query });
  },

  create(task: NewTask): Promise<Task> {
    return invoke<Task>("create_task", { task });
  },

  update(id: string, update: TaskUpdate): Promise<Task> {
    return invoke<Task>("update_task", { id, update });
  },

  setCompleted(id: string, completed: boolean): Promise<Task> {
    return invoke<Task>("set_task_completed", { id, completed });
  },

  remove(id: string): Promise<void> {
    return invoke<void>("delete_task", { id });
  },

  stats(): Promise<TaskStats> {
    return invoke<TaskStats>("task_stats");
  },

  overview(): Promise<TaskOverview> {
    return invoke<TaskOverview>("task_overview");
  },
};

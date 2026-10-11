import type { Task, TaskFilter, TaskPriority, TaskSort } from "../../types";
import { PRIORITY_LABELS } from "../../types";
import { parseDateKey, relativeDay, toDateKey } from "../../lib/date";

interface TaskView {
  task: Task;
  dueLabel: string;
  priorityLabel: string;
  overdue: boolean;
  dueToday: boolean;
}

export function filterAndSort(
  tasks: Task[],
  filter: TaskFilter,
  sort: TaskSort,
  today = new Date(),
): Task[] {
  const key = toDateKey(today);
  const filtered = tasks.filter((task) => matchesFilter(task, filter, key));
  return sortTasks(filtered, sort);
}

export function matchesFilter(
  task: Task,
  filter: TaskFilter,
  todayKey: string,
): boolean {
  switch (filter) {
    case "all":
      return true;
    case "active":
      return !task.completed;
    case "completed":
      return task.completed;
    case "today":
      return task.dueDate?.slice(0, 10) === todayKey;
    case "overdue":
      return (
        !task.completed &&
        task.dueDate !== null &&
        task.dueDate.slice(0, 10) < todayKey
      );
    default:
      return true;
  }
}

export function sortTasks(tasks: Task[], sort: TaskSort): Task[] {
  const open = (t: Task) => (t.completed ? 1 : 0);
  const copy = [...tasks];

  switch (sort) {
    case "dueDate":
      copy.sort(
        (a, b) =>
          open(a) - open(b) ||
          compareNullableDate(a.dueDate, b.dueDate) ||
          b.priority - a.priority,
      );
      break;
    case "priority":
      copy.sort(
        (a, b) =>
          open(a) - open(b) ||
          b.priority - a.priority ||
          compareNullableDate(a.dueDate, b.dueDate),
      );
      break;
    case "alphabetical":
      copy.sort((a, b) => open(a) - open(b) || a.title.localeCompare(b.title));
      break;
    case "created":
      copy.sort(
        (a, b) => open(a) - open(b) || b.createdAt.localeCompare(a.createdAt),
      );
      break;
    case "default":
    default:
      copy.sort(
        (a, b) =>
          open(a) - open(b) ||
          compareNullableDate(a.dueDate, b.dueDate) ||
          b.priority - a.priority ||
          a.createdAt.localeCompare(b.createdAt),
      );
      break;
  }
  return copy;
}

function compareNullableDate(a: string | null, b: string | null): number {
  if (a === b) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return a.localeCompare(b);
}

export function toView(task: Task, today = new Date()): TaskView {
  const key = toDateKey(today);
  const due = task.dueDate?.slice(0, 10) ?? null;
  return {
    task,
    dueLabel: due ? relativeDay(due, today) : "No date",
    priorityLabel: PRIORITY_LABELS[task.priority],
    overdue: !task.completed && due !== null && due < key,
    dueToday: due === key,
  };
}

export function prioritySymbol(priority: TaskPriority): string {
  return ["▁", "▂", "▃", "█"][priority] ?? "▂";
}

export function dayPressure(stats: {
  dueToday: number;
  overdue: number;
}): "all-clear" | "default" | "busy" {
  if (stats.overdue > 0) return "busy";
  if (stats.dueToday === 0) return "all-clear";
  if (stats.dueToday <= 2) return "default";
  return "busy";
}

export function daysBetween(a: string, b: string): number {
  return Math.round(
    (parseDateKey(b).getTime() - parseDateKey(a).getTime()) / 86_400_000,
  );
}

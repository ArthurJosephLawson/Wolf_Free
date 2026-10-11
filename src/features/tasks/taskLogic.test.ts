import { describe, expect, it } from "vitest";
import {
  daysBetween,
  dayPressure,
  filterAndSort,
  matchesFilter,
  prioritySymbol,
  sortTasks,
  toView,
} from "./taskLogic";
import { parseDateKey } from "../../lib/date";
import type { Task } from "../../types";

const TODAY = parseDateKey("2026-09-28");

function task(overrides: Partial<Task> = {}): Task {
  return {
    id: "t1",
    title: "Task",
    description: "",
    completed: false,
    priority: 1,
    dueDate: null,
    createdAt: "2026-09-01T09:00:00.000Z",
    updatedAt: "2026-09-01T09:00:00.000Z",
    completedAt: null,
    ...overrides,
  };
}

describe("filters", () => {
  const overdue = task({ id: "overdue", dueDate: "2026-09-27" });
  const today = task({ id: "today", dueDate: "2026-09-28" });
  const done = task({ id: "done", completed: true, dueDate: "2026-09-20" });

  it("selects open work", () => {
    expect(matchesFilter(overdue, "active", "2026-09-28")).toBe(true);
    expect(matchesFilter(done, "active", "2026-09-28")).toBe(false);
  });

  it("selects overdue work and ignores completed tasks", () => {
    expect(matchesFilter(overdue, "overdue", "2026-09-28")).toBe(true);
    expect(matchesFilter(today, "overdue", "2026-09-28")).toBe(false);
    expect(
      matchesFilter(
        task({ completed: true, dueDate: "2026-09-01" }),
        "overdue",
        "2026-09-28",
      ),
    ).toBe(false);
  });

  it("treats the due date as a calendar day, not a timestamp", () => {
    expect(matchesFilter(today, "today", "2026-09-28")).toBe(true);
  });
});

describe("sorting", () => {
  it("keeps open work above finished work", () => {
    const sorted = sortTasks(
      [task({ id: "a", completed: true }), task({ id: "b" })],
      "created",
    );
    expect(sorted.map((t) => t.id)).toEqual(["b", "a"]);
  });

  it("puts dateless tasks last", () => {
    const sorted = sortTasks(
      [task({ id: "none" }), task({ id: "dated", dueDate: "2026-10-01" })],
      "dueDate",
    );
    expect(sorted.map((t) => t.id)).toEqual(["dated", "none"]);
  });

  it("sorts by priority, highest first", () => {
    const sorted = sortTasks(
      [task({ id: "low", priority: 0 }), task({ id: "urgent", priority: 3 })],
      "priority",
    );
    expect(sorted.map((t) => t.id)).toEqual(["urgent", "low"]);
  });

  it("filters and sorts in one pass, earliest due date first", () => {
    const list = [
      task({ id: "done", completed: true }),
      task({ id: "late", dueDate: "2026-09-01" }),
      task({ id: "soon", dueDate: "2026-09-28" }),
    ];
    expect(
      filterAndSort(list, "active", "dueDate", TODAY).map((t) => t.id),
    ).toEqual(["late", "soon"]);
  });
});

describe("presentation", () => {
  it("flags overdue and due-today tasks", () => {
    expect(toView(task({ dueDate: "2026-09-20" }), TODAY).overdue).toBe(true);
    expect(toView(task({ dueDate: "2026-09-28" }), TODAY).dueToday).toBe(true);
    expect(toView(task({ dueDate: "2026-09-30" }), TODAY).overdue).toBe(false);
  });

  it("labels a task with no date", () => {
    expect(toView(task(), TODAY).dueLabel).toBe("No date");
  });

  it("picks a day pressure that drives the wolf's pose", () => {
    expect(dayPressure({ dueToday: 0, overdue: 0 })).toBe("all-clear");
    expect(dayPressure({ dueToday: 1, overdue: 0 })).toBe("default");
    expect(dayPressure({ dueToday: 6, overdue: 0 })).toBe("busy");
    expect(dayPressure({ dueToday: 0, overdue: 1 })).toBe("busy");
  });

  it("has a symbol per priority", () => {
    expect(prioritySymbol(0)).toBe("▁");
    expect(prioritySymbol(3)).toBe("█");
  });

  it("counts days between keys", () => {
    expect(daysBetween("2026-09-28", "2026-09-30")).toBe(2);
    expect(daysBetween("2026-09-30", "2026-09-28")).toBe(-2);
  });
});

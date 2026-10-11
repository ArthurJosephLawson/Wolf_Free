import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const PAGES = [
  "src/features/tasks/TasksPage.tsx",
  "src/features/habits/HabitsPage.tsx",
  "src/features/calendar/CalendarPage.tsx",
  "src/features/focus/FocusPage.tsx",
  "src/features/progress/ProgressPage.tsx",
  "src/features/settings/SettingsPage.tsx",
];

describe("error notes", () => {
  it.each(PAGES)("%s places its error inside the first panel", (page) => {
    const source = readFileSync(join(process.cwd(), page), "utf8");
    const panel = source.indexOf("<Panel");
    const note = source.indexOf("<ErrorNote");
    expect(panel).toBeGreaterThanOrEqual(0);
    expect(note).toBeGreaterThan(panel);
  });
});

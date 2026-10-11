import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const EVENT = readFileSync(
  join(
    process.cwd(),
    "src",
    "features",
    "calendar",
    "EventFormDialog.tsx",
  ),
  "utf8",
);
const HABITS = readFileSync(
  join(process.cwd(), "src", "features", "habits", "HabitsPage.tsx"),
  "utf8",
);

describe("event form feedback", () => {
  it("explains why saving is blocked", () => {
    expect(EVENT).toContain("End must be after start.");
    expect(EVENT).toContain("hint={endInvalid");
  });
});

describe("habit archiving", () => {
  it("confirms before hiding a habit", () => {
    expect(HABITS).toContain("setPendingArchive");
    expect(HABITS).toContain("Archive habit?");
    expect(HABITS).not.toContain(
      "onArchive={() => void store.setArchived(habit.id, true)}",
    );
  });
});

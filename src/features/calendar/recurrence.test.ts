import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const TYPES = readFileSync(
  join(process.cwd(), "src", "types", "index.ts"),
  "utf8",
);
const DIALOG = readFileSync(
  join(
    process.cwd(),
    "src",
    "features",
    "calendar",
    "EventFormDialog.tsx",
  ),
  "utf8",
);
const CALENDAR = readFileSync(
  join(process.cwd(), "src", "features", "calendar", "CalendarPage.tsx"),
  "utf8",
);
const HOME = readFileSync(
  join(process.cwd(), "src", "features", "home", "HomePage.tsx"),
  "utf8",
);

describe("event recurrence", () => {
  it("declares the four rules on the wire types", () => {
    expect(TYPES).toContain(
      'export type RecurrenceRule = "none" | "daily" | "weekdays" | "weekly";',
    );
    expect(TYPES).toContain("recurrence: RecurrenceRule;");
    expect(TYPES).toContain("recurrence?: RecurrenceRule;");
  });

  it("offers a repeat picker in the event form", () => {
    expect(DIALOG).toContain('label="Repeat"');
    expect(DIALOG).toContain('id="event-recurrence"');
    expect(DIALOG).toContain('value: "weekdays"');
    expect(DIALOG).toContain("recurrence,");
  });

  it("keys expanded occurrences by start time so repeats never collide", () => {
    expect(CALENDAR).toContain("key={`${event.id}:${event.startTime}`}");
    expect(HOME).toContain("key={`${event.id}:${event.startTime}`}");
    expect(CALENDAR).not.toContain("key={event.id}");
    expect(HOME).not.toContain("key={event.id}");
  });
});

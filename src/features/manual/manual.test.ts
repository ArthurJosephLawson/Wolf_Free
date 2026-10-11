import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { NAV } from "../../app/nav";

const PAGE = readFileSync(
  join(process.cwd(), "src", "features", "manual", "ManualPage.tsx"),
  "utf8",
);
const APP = readFileSync(join(process.cwd(), "src", "app", "App.tsx"), "utf8");
const TYPES = readFileSync(
  join(process.cwd(), "src", "types", "index.ts"),
  "utf8",
);

describe("manual", () => {
  it("is a first-class route with a sidebar entry", () => {
    expect(TYPES).toContain('"manual"');
    const entry = NAV.find((item) => item.route === "manual");
    expect(entry?.label).toBe("Manual");
    expect(entry?.icon).toBe("book");
  });

  it("renders through the app switch", () => {
    expect(APP).toContain('case "manual":');
    expect(APP).toContain("<ManualPage />");
  });

  it("documents every major surface", () => {
    for (const topic of [
      "Getting started",
      "Tasks",
      "Habits",
      "Calendar",
      "Focus",
      "Progress and review",
      "The companion",
      "Backup and data",
      "App launchers",
      "Keyboard shortcuts",
      "About this edition",
    ]) {
      expect(PAGE).toContain(topic);
    }
  });
});

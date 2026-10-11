import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { NAV } from "../../app/nav";

const PAGE = readFileSync(
  join(process.cwd(), "src", "features", "review", "ReviewPage.tsx"),
  "utf8",
);
const APP = readFileSync(join(process.cwd(), "src", "app", "App.tsx"), "utf8");
const TYPES = readFileSync(
  join(process.cwd(), "src", "types", "index.ts"),
  "utf8",
);

describe("review", () => {
  it("is a first-class route with a sidebar entry", () => {
    expect(TYPES).toContain('"review"');
    const entry = NAV.find((item) => item.route === "review");
    expect(entry?.label).toBe("Review");
    expect(NAV.some((item) => item.route === "review")).toBe(true);
    expect(NAV[NAV.length - 1]?.route).toBe("settings");
  });

  it("renders through the app switch", () => {
    expect(APP).toContain('case "review":');
    expect(APP).toContain("<ReviewPage />");
  });

  it("summarises the week, overdue work and habits left", () => {
    expect(PAGE).toContain('title="This week"');
    expect(PAGE).toContain('title="Overdue"');
    expect(PAGE).toContain('title="Due today"');
    expect(PAGE).toContain('title="Habits left today"');
    expect(PAGE).toContain("xpService.summary(7)");
    expect(PAGE).toContain("taskService.overview()");
    expect(PAGE).toContain("focusService.stats()");
    expect(PAGE).toContain("habitService.list()");
  });

  it("reuses existing services instead of adding commands", () => {
    expect(PAGE).not.toContain("invoke(");
  });
});

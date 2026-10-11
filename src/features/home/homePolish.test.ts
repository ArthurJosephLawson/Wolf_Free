import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const HOME = readFileSync(
  join(process.cwd(), "src", "features", "home", "HomePage.tsx"),
  "utf8",
);
const GLOBALS = readFileSync(
  join(process.cwd(), "src", "styles", "globals.css"),
  "utf8",
);

describe("list title cells", () => {
  it("use one shared rule that shrinks and wraps", () => {
    const rule = /\.list__body\s*\{([^}]*)\}/.exec(GLOBALS)?.[1] ?? "";
    expect(rule).toContain("min-width: 0");
    expect(rule).toContain("word-break: break-word");
    expect(HOME.match(/className="list__body"/g) ?? []).toHaveLength(3);
  });
});

describe("time gutters", () => {
  it("match the calendar's width on the home page", () => {
    expect(HOME).not.toContain("width: 62");
    expect(HOME).toContain("width: 74");
  });
});

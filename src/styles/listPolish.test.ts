import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const GLOBALS = readFileSync(
  join(process.cwd(), "src", "styles", "globals.css"),
  "utf8",
);

describe("completed list rows", () => {
  it("carry a dimming rule for their data attribute", () => {
    const rule =
      /\.list__item\[data-completed\]\s*\{([^}]*)\}/.exec(GLOBALS)?.[1] ?? "";
    expect(rule).toContain("opacity");
  });
});

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const TYPES = readFileSync(
  join(process.cwd(), "src", "types", "index.ts"),
  "utf8",
);
const STORE = readFileSync(
  join(
    process.cwd(),
    "src",
    "features",
    "progress",
    "progressStore.ts",
  ),
  "utf8",
);

describe("countdown xp", () => {
  it("counts countdowns as an xp source on the wire", () => {
    expect(TYPES).toContain(
      'export type XpSource = "task" | "habit" | "focus" | "countdown";',
    );
  });

  it("refreshes the summary after a countdown changes or disappears", () => {
    expect(STORE).toContain("void get().refreshSummary();");
    const calls = STORE.split("void get().refreshSummary();").length - 1;
    expect(calls).toBe(2);
    expect(STORE).toContain("async updateCountdown");
    expect(STORE).toContain("async removeCountdown");
  });
});

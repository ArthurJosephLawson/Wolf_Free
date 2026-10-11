import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const PAGE = readFileSync(
  join(process.cwd(), "src", "features", "settings", "SettingsPage.tsx"),
  "utf8",
);

describe("about panel environment load", () => {
  it("distinguishes a failure from the first load", () => {
    expect(PAGE).toContain("envError");
    expect(PAGE).toContain("Could not read the environment.");
    expect(PAGE).not.toContain(".catch(() => setEnv(null))");
  });
});

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const APP = readFileSync(join(process.cwd(), "src", "app", "App.tsx"), "utf8");
const COMPANION = readFileSync(
  join(process.cwd(), "src", "features", "wolf", "Companion.tsx"),
  "utf8",
);
const ROUTES = readFileSync(
  join(process.cwd(), "src", "app", "useRouteKeys.ts"),
  "utf8",
);

describe("preference wiring", () => {
  it("applies accent, text size and spacing on the main window", () => {
    expect(APP).toContain("dataset.accent = settings.accent");
    expect(APP).toContain("dataset.text = settings.textSize");
    expect(APP).toContain("dataset.density = settings.density");
  });

  it("applies the accent on the companion window", () => {
    expect(COMPANION).toContain("dataset.accent");
  });

  it("mounts the app shortcuts", () => {
    expect(APP).toContain("useAppShortcuts()");
  });
});

describe("route keys", () => {
  it("stay quiet while a modal is open", () => {
    expect(ROUTES).toContain("modal-backdrop");
  });
});

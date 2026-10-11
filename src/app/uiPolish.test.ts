import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const APP = readFileSync(join(process.cwd(), "src", "app", "App.tsx"), "utf8");
const TOAST = readFileSync(
  join(process.cwd(), "src", "app", "ToastHost.tsx"),
  "utf8",
);
const GLOBALS = readFileSync(
  join(process.cwd(), "src", "styles", "globals.css"),
  "utf8",
);

describe("toast polish", () => {
  it("gives the dismiss button a 24px target", () => {
    const rule = /\.toast__close\s*\{([^}]*)\}/.exec(GLOBALS)?.[1] ?? "";
    expect(rule).toContain("min-width: 24px");
    expect(rule).toContain("min-height: 24px");
  });

  it("pauses the countdown while hovered or focused", () => {
    expect(TOAST).toContain("onPointerEnter={pause}");
    expect(TOAST).toContain("onPointerLeave={resume}");
    expect(TOAST).toContain("onFocusCapture={pause}");
    expect(TOAST).toContain("onBlurCapture={resume}");
  });
});

describe("sidebar refresh", () => {
  it("says that it reloads tasks", () => {
    expect(APP).toContain('title="Reload tasks"');
    expect(APP).not.toContain('title="Refresh data"');
    expect(APP).not.toContain(">Refresh</span>");
  });
});

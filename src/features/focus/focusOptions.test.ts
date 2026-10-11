import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const STORE = readFileSync(
  join(process.cwd(), "src", "features", "focus", "focusStore.ts"),
  "utf8",
);
const PAGE = readFileSync(
  join(process.cwd(), "src", "features", "focus", "FocusPage.tsx"),
  "utf8",
);

describe("focus completion flow", () => {
  it("offers a start break or start focus call to action once a phase completes", () => {
    expect(PAGE).toContain("view.status === \"COMPLETED\"");
    expect(PAGE).toContain("▶ Start break");
    expect(PAGE).toContain("▶ Start focus");
    expect(PAGE).toContain("focus.advancePhase()");
  });

  it("no longer disables the primary button at completion", () => {
    expect(PAGE).not.toContain('disabled={view.status === "COMPLETED"}');
  });

  it("advances from completion through its own store action", () => {
    expect(STORE).toContain("advancePhase()");
    expect(STORE).toContain("advance(");
    expect(STORE).toContain("lastCompletedPhase: null");
  });

  it("starts from the next phase when the timer is already completed", () => {
    expect(STORE).toContain('current.status === "COMPLETED"');
    expect(STORE).toContain("? advance(current,");
  });
});

describe("auto start", () => {
  it("starts the next phase when its setting is on", () => {
    expect(STORE).toContain("settings.autoStartBreaks");
    expect(STORE).toContain("settings.autoStartFocus");
    expect(STORE).toContain("if (autoStart) {");
    expect(STORE).toContain("snapshot: advance(get().snapshot,");
  });
});

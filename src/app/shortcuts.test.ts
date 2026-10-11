import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const SHORTCUTS = readFileSync(
  join(process.cwd(), "src", "app", "useAppShortcuts.ts"),
  "utf8",
);

describe("app shortcuts", () => {
  it("opens the quick add box with n", () => {
    expect(SHORTCUTS).toContain('"quick-add-title"');
    expect(SHORTCUTS).toContain("focus()");
  });

  it("toggles the focus timer with ctrl+shift+f", () => {
    expect(SHORTCUTS).toContain("useFocusStore");
    expect(SHORTCUTS).toContain('"f"');
    expect(SHORTCUTS).toContain("shiftKey");
  });

  it("toggles the companion with ctrl+shift+w", () => {
    expect(SHORTCUTS).toContain("toggleCompanion");
    expect(SHORTCUTS).toContain('"w"');
  });

  it("never fires while typing in a field", () => {
    expect(SHORTCUTS).toContain("INPUT|TEXTAREA|SELECT");
  });
});

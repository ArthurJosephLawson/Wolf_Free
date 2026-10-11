import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const COMPANION = readFileSync(
  join(process.cwd(), "src", "features", "wolf", "Companion.tsx"),
  "utf8",
);

describe("companion options", () => {
  it("gates the idle animation interval on its setting", () => {
    expect(COMPANION).toContain("if (!idleAnimations) return;");
    expect(COMPANION).toContain("}, [idleAnimations]);");
    expect(COMPANION).toContain("s.settings.companionIdleAnimations");
  });

  it("hands the click action setting to the drag logic", () => {
    expect(COMPANION).toContain(
      "useSettingsStore((s) => s.settings.companionClickAction)",
    );
    expect(COMPANION).toContain(
      "dragRelease(dragRef.current, pointOf(event), clickAction)",
    );
  });
});

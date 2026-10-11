import { describe, expect, it } from "vitest";
import { hudLine } from "./hud";

describe("hudLine", () => {
  it("formats the today status line", () => {
    expect(hudLine("2026-10-06", 0, 0)).toBe("TUE 6 OCT · 0 OPEN · 0 OVERDUE");
  });

  it("keeps both counts when they are not zero", () => {
    expect(hudLine("2026-01-01", 4, 2)).toBe("THU 1 JAN · 4 OPEN · 2 OVERDUE");
  });

  it("never greets the user", () => {
    expect(hudLine("2026-10-06", 0, 0)).not.toMatch(/good|hello|evening|wolf/i);
  });
});

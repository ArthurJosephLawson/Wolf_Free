import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  join(process.cwd(), "src", "app", "useDesktopEvents.ts"),
  "utf8",
);

describe("tray payload handling", () => {
  it("only changes route when the payload carries one", () => {
    expect(source).not.toContain('else setRoute("home")');
    expect(source).toContain("if (payload.route) {");
    expect(source).toContain("setRoute(payload.route);");
  });

  it("opens the main window only for route payloads", () => {
    const showMainCount = source.split("showMain").length - 1;
    expect(showMainCount).toBe(1);
    const routeBranch = source.slice(
      source.indexOf("if (payload.route) {"),
      source.indexOf("if (payload.focus"),
    );
    expect(routeBranch).toContain("showMain();");
  });

  it("keeps focus shortcuts out of the route logic", () => {
    expect(source).toContain('if (payload.focus === "start")');
    expect(source).toContain('if (payload.focus === "pause")');
  });
});

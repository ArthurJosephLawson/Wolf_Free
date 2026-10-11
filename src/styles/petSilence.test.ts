import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const STYLES = join(process.cwd(), "src", "styles");
const GLOBALS = readFileSync(join(STYLES, "globals.css"), "utf8");

describe("pet chrome styling", () => {
  it("ships no speech bubble style", () => {
    expect(GLOBALS).not.toContain(".companion-root__bubble");
  });

  it("has no state caption rule", () => {
    expect(GLOBALS).not.toContain(".wolf__status");
  });
});

describe("the crt layer is retired", () => {
  it("ships no crt stylesheet", () => {
    expect(existsSync(join(STYLES, "crt.css"))).toBe(false);
    expect(readdirSync(STYLES)).not.toContain("crt.css");
  });

  it("no stylesheet or component still keys off the crt attribute", () => {
    for (const file of readdirSync(STYLES)) {
      if (!file.endsWith(".css")) continue;
      const css = readFileSync(join(STYLES, file), "utf8");
      expect(css, `${file} still styles data-crt`).not.toContain("[data-crt");
    }
    const app = readFileSync(
      join(process.cwd(), "src", "app", "App.tsx"),
      "utf8",
    );
    expect(app).not.toContain("dataset.crt");
    expect(app).toContain("dataset.effects");
  });

  it("gates animation behind the effects attribute", () => {
    expect(GLOBALS).toContain('html[data-effects="off"]');
  });
});

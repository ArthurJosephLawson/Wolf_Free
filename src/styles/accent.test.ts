import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const GLOBALS = readFileSync(
  join(process.cwd(), "src", "styles", "globals.css"),
  "utf8",
);

const ACCENTS: Record<string, string> = {
  green: "#39ff14",
  amber: "#e0a458",
  rose: "#e081a0",
};

const BACKGROUNDS = ["#0a0e11", "#0f1418", "#141b20"];
const INK = "#0a0e11";

function luminance(hex: string): number {
  const h = hex.replace("#", "");
  const channel = (raw: number) => {
    const c = raw / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const [r, g, b] = [0, 2, 4].map((i) =>
    channel(parseInt(h.slice(i, i + 2), 16)),
  );
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}

function contrast(a: string, b: string): number {
  const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (high! + 0.05) / (low! + 0.05);
}

describe("accent palette", () => {
  it("defines an override block for every accent", () => {
    for (const name of Object.keys(ACCENTS)) {
      const block = new RegExp(
        `html\\[data-accent="${name}"\\]\\s*\\{([^}]*)\\}`,
      ).exec(GLOBALS)?.[1];
      expect(block, `missing block for ${name}`).toBeTruthy();
      expect(block).toContain("--accent:");
      expect(block).toContain("--focus:");
    }
  });

  it("declares each accent with the hex the design specifies", () => {
    for (const [name, hex] of Object.entries(ACCENTS)) {
      const block = new RegExp(
        `html\\[data-accent="${name}"\\]\\s*\\{([^}]*)\\}`,
      ).exec(GLOBALS)![1]!;
      expect(block.toLowerCase()).toContain(hex);
    }
  });

  it("keeps every accent legible on every surface", () => {
    for (const hex of Object.values(ACCENTS)) {
      for (const background of BACKGROUNDS) {
        expect(contrast(hex, background)).toBeGreaterThanOrEqual(4.5);
      }
      expect(contrast(INK, hex)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("uses neon green as the default and primary accent", () => {
    const root = /:root\s*\{([^}]*)\}/.exec(GLOBALS)?.[1] ?? "";
    const theme = readFileSync(
      join(process.cwd(), "src", "styles", "theme.css"),
      "utf8",
    );
    expect(theme).toContain("--accent: #39ff14");
    expect(GLOBALS).toContain('data-accent="green"');
    expect(GLOBALS).not.toContain("#4fb3bf");
    expect(root).not.toContain("cyan");
  });
});

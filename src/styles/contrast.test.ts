import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const THEME = readFileSync(
  join(process.cwd(), "src", "styles", "theme.css"),
  "utf8",
);
const GLOBALS = readFileSync(
  join(process.cwd(), "src", "styles", "globals.css"),
  "utf8",
);

function rawVar(name: string): string {
  const match = new RegExp(`--${name}:\\s*([^;]+);`).exec(THEME);
  if (!match) throw new Error(`missing --${name}`);
  return match[1]!.trim();
}

function resolveVar(name: string): string {
  const value = rawVar(name);
  const ref = /^var\((--[\w-]+)\)$/.exec(value);
  if (ref) return resolveVar(ref[1]!.slice(2));
  return value;
}

function luminance(hex: string): number {
  const h = hex.replace("#", "");
  const channel = (raw: number) => {
    const c = raw / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const [r, g, b] = [0, 2, 4].map((i) =>
    channel(parseInt(h.slice(i, i + 2), 16)),
  );
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}

function contrast(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

describe("control borders", () => {
  it("clear 3:1 against the panel and the input fill", () => {
    const border = resolveVar("border-strong");
    expect(contrast(border, resolveVar("panel"))).toBeGreaterThanOrEqual(3);
    expect(contrast(border, resolveVar("bg-sunken"))).toBeGreaterThanOrEqual(3);
  });

  it("paints text inputs with the strong border", () => {
    const rule =
      /\.input,[\s\S]*?\.textarea\s*\{([^}]*)\}/.exec(GLOBALS)?.[1] ?? "";
    expect(rule).toContain("var(--border-strong)");
  });

  it("still changes color on hover", () => {
    const hover =
      /\.input:hover,[\s\S]*?\.textarea:hover\s*\{([^}]*)\}/.exec(GLOBALS)
        ?.[1] ?? "";
    const value = /border-color:\s*([^;]+);/.exec(hover)?.[1]?.trim() ?? "";
    expect(value).not.toBe("");
    const resolved = value.startsWith("var(")
      ? resolveVar(value.slice(6, -1))
      : value;
    expect(resolved).not.toBe(resolveVar("border-strong"));
  });
});

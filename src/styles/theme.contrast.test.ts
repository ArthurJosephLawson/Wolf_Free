import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const SRC = join(process.cwd(), "src");
const STYLES = join(SRC, "styles");
const THEME = readFileSync(join(STYLES, "theme.css"), "utf8");

const DECLARATION = /(--[\w-]+)\s*:\s*([^;]+);/g;

const declarations = new Map<string, string>();
for (const match of THEME.matchAll(DECLARATION)) {
  declarations.set(match[1]!, match[2]!.trim());
}

function resolve(token: string, depth = 0): string {
  if (depth > 10) throw new Error(`var() cycle at ${token}`);
  const value = declarations.get(token);
  if (!value) throw new Error(`undefined token ${token}`);
  const reference = /^var\((--[\w-]+)\)$/.exec(value);
  return reference ? resolve(reference[1]!, depth + 1) : value;
}

function channels(value: string): [number, number, number, number] {
  const hex = /^#([0-9a-f]{6})$/i.exec(value);
  if (hex) {
    const n = Number.parseInt(hex[1]!, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255, 1];
  }
  const short = /^#([0-9a-f]{3})$/i.exec(value);
  if (short) {
    const [r, g, b] = [...short[1]!].map((c) => Number.parseInt(c + c, 16));
    return [r!, g!, b!, 1];
  }
  const rgba = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/i.exec(value);
  if (rgba) {
    return [Number(rgba[1]), Number(rgba[2]), Number(rgba[3]), 1];
  }
  throw new Error(`unsupported color value "${value}"`);
}

function luminance(value: string): number {
  const [r, g, b] = channels(value);
  const part = (raw: number) => {
    const c = raw / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * part(r!) + 0.7152 * part(g!) + 0.0722 * part(b!);
}

function contrast(a: string, b: string): number {
  const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (high! + 0.05) / (low! + 0.05);
}

const BACKGROUNDS = ["--bg-sunken", "--bg", "--panel"] as const;
const TEXT = 4.5;
const UI = 3;

const TEXT_TOKENS = [
  "--text",
  "--text-dim",
  "--text-faint",
  "--primary",
  "--success",
  "--warning",
  "--accent",
  "--danger",
];

const UI_TOKENS = [
  "--border-strong",
  "--primary-dim",
  "--success-dim",
  "--warning-dim",
  "--danger-dim",
];

const FILLS = ["--primary", "--success", "--warning", "--accent", "--danger"];

describe("theme contrast", () => {
  it("computes WCAG relative luminance correctly", () => {
    expect(contrast("#000000", "#ffffff")).toBeCloseTo(21, 1);
    expect(contrast("#ffffff", "#ffffff")).toBeCloseTo(1, 5);
  });

  it("keeps every text token legible on every surface", () => {
    for (const token of TEXT_TOKENS) {
      for (const background of BACKGROUNDS) {
        const ratio = contrast(resolve(token), resolve(background));
        expect(
          ratio,
          `${token} on ${background} is ${ratio.toFixed(2)}, needs ${TEXT}`,
        ).toBeGreaterThanOrEqual(TEXT);
      }
    }
  });

  it("keeps every interface token distinguishable on every surface", () => {
    for (const token of UI_TOKENS) {
      for (const background of BACKGROUNDS) {
        const ratio = contrast(resolve(token), resolve(background));
        expect(
          ratio,
          `${token} on ${background} is ${ratio.toFixed(2)}, needs ${UI}`,
        ).toBeGreaterThanOrEqual(UI);
      }
    }
  });

  it("keeps ink readable on every bright fill", () => {
    const ink = resolve("--outline");
    for (const fill of FILLS) {
      const ratio = contrast(ink, resolve(fill));
      expect(
        ratio,
        `--outline on ${fill} is ${ratio.toFixed(2)}, needs ${TEXT}`,
      ).toBeGreaterThanOrEqual(TEXT);
    }
  });
});

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) out.push(...walk(path));
    else out.push(path);
  }
  return out;
}

const HEX = /#[0-9a-f]{3,8}\b/i;
const FN = /\b(?:rgba?|hsla?)\(/i;

describe("color literals", () => {
  it("keeps every color outside the styles directory in theme.css", () => {
    const offenders: string[] = [];
    for (const file of walk(SRC)) {
      if (!/\.(ts|tsx)$/.test(file)) continue;
      if (file.includes(`${join(SRC, "styles")}/`)) continue;
      const lines = readFileSync(file, "utf8").split("\n");
      lines.forEach((line, index) => {
        if (HEX.test(line) || FN.test(line)) {
          offenders.push(
            `${file.replace(SRC, "")}:${index + 1}: ${line.trim()}`,
          );
        }
      });
    }
    expect(offenders).toEqual([]);
  });
});

const FONT_TOKEN = /^var\(--font-(?:body|mono)\)$/;
const FONT_FACE_BLOCK = /@font-face\s*\{[^}]*\}/gi;
const CSS_FONT = /font-family:\s*([^;]+);/gi;
const TS_FONT = /\bfontFamily:\s*"([^"]+)"/g;
const GLOBALS = readFileSync(join(STYLES, "globals.css"), "utf8");
const FONTS_DIR = join(SRC, "assets", "fonts");

describe("font tokens", () => {
  it("defines exactly the tokens the type system calls for", () => {
    for (const token of ["--font-body", "--font-mono"]) {
      expect(declarations.get(token), `${token} is missing`).toBeTruthy();
    }
    for (const retired of ["--font-ui", "--font-display", "--font-pixel"]) {
      expect(
        declarations.get(retired),
        `${retired} should be gone`,
      ).toBeUndefined();
    }
    for (const file of walk(SRC)) {
      const contents = readFileSync(file, "utf8");
      if (
        /var\(--font-(?:pixel|ui|display)\)|--font-(?:pixel|ui|display)\s*:/.test(
          contents,
        )
      ) {
        throw new Error(`retired font token still referenced in ${file}`);
      }
    }
  });

  it("routes every font-family through a token", () => {
    const offenders: string[] = [];
    for (const file of walk(SRC)) {
      const contents = readFileSync(file, "utf8");
      if (file.endsWith(".css")) {
        const body = contents.replace(FONT_FACE_BLOCK, "");
        for (const match of body.matchAll(CSS_FONT)) {
          const value = match[1]!.trim();
          if (value !== "inherit" && !FONT_TOKEN.test(value)) {
            offenders.push(`${file.replace(SRC, "")}: ${value}`);
          }
        }
      } else if (/\.(ts|tsx)$/.test(file)) {
        for (const match of contents.matchAll(TS_FONT)) {
          const value = match[1]!;
          if (!FONT_TOKEN.test(value)) {
            offenders.push(`${file.replace(SRC, "")}: ${value}`);
          }
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it("registers a face for every bundled font file", () => {
    const registered = new Set(
      [...GLOBALS.matchAll(/url\("\.\.\/assets\/fonts\/([^"]+)"\)/g)].map(
        (match) => match[1]!,
      ),
    );
    const bundled = readdirSync(FONTS_DIR).filter((name) =>
      name.endsWith(".ttf"),
    );
    expect(bundled.length).toBeGreaterThan(0);
    expect([...registered].sort()).toEqual([...bundled].sort());
  });

  it("keeps the global rendering rules in force", () => {
    for (const rule of [
      "-webkit-font-smoothing: antialiased",
      "text-rendering: optimizeLegibility",
    ]) {
      expect(GLOBALS.includes(rule), `${rule} is missing`).toBe(true);
    }
  });
});

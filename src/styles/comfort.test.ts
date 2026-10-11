import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const GLOBALS = readFileSync(
  join(process.cwd(), "src", "styles", "globals.css"),
  "utf8",
);

function rule(pattern: string): string {
  const match = new RegExp(pattern).exec(GLOBALS)?.[1] ?? "";
  return match;
}

describe("comfort tokens", () => {
  it("starts from the shipped 15px body size and 8pt gap", () => {
    expect(GLOBALS).toMatch(/--body-size:\s*15px/);
    expect(GLOBALS).toMatch(/--gap:\s*var\(--space-3\)/);
  });

  it("drives the root font size from the body size token", () => {
    expect(GLOBALS).toMatch(/html\s*\{\s*font-size:\s*var\(--body-size\)/);
  });

  it("offers three text sizes and three spacings", () => {
    expect(rule(`html\\[data-text="sm"\\]\\s*\\{([^}]*)\\}`)).toContain(
      "--body-size: 14px",
    );
    expect(rule(`html\\[data-text="lg"\\]\\s*\\{([^}]*)\\}`)).toContain(
      "--body-size: 17px",
    );
    expect(rule(`html\\[data-density="compact"\\]\\s*\\{([^}]*)\\}`)).toContain(
      "--gap: var(--space-2)",
    );
    expect(rule(`html\\[data-density="roomy"\\]\\s*\\{([^}]*)\\}`)).toContain(
      "--gap: var(--space-4)",
    );
  });

  it("routes component type through the scale tokens", () => {
    expect(rule(`\\.btn\\s*\\{([^}]*)\\}`)).toContain(
      "font-size: var(--text-base)",
    );
    expect(rule(`\\.faint\\s*\\{([^}]*)\\}`)).toContain(
      "font-size: var(--text-sm)",
    );
    expect(rule(`\\.field__label\\s*\\{([^}]*)\\}`)).toContain(
      "font-size: var(--text-sm)",
    );
  });
});

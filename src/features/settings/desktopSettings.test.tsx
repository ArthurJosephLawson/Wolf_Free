import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { DesktopSettings } from "./DesktopSettings";
import { DEFAULT_SETTINGS } from "./settingsStore";

function slider(): { min: string | null; max: string | null; step: string | null } {
  const html = renderToStaticMarkup(
    <DesktopSettings settings={DEFAULT_SETTINGS} set={() => undefined} onReset={() => undefined} />,
  );
  const doc = new DOMParser().parseFromString(html, "text/html");
  const input = doc.querySelector("#settings-companion-scale");
  return {
    min: input?.getAttribute("min") ?? null,
    max: input?.getAttribute("max") ?? null,
    step: input?.getAttribute("step") ?? null,
  };
}

describe("companion size slider", () => {
  it("offers only whole-number steps from 2 to 5", () => {
    const control = slider();
    expect(control.min).toBe("2");
    expect(control.max).toBe("5");
    expect(control.step).toBe("1");
  });

  it("defaults to an integer scale", () => {
    expect(DEFAULT_SETTINGS.companionScale).toBe(3);
  });
});

const SOURCE = readFileSync(
  join(import.meta.dirname, "DesktopSettings.tsx"),
  "utf8",
);

describe("reset confirmation", () => {
  it("asks before wiping every setting", () => {
    expect(SOURCE).toContain("Reset every setting?");
    expect(SOURCE).toContain("setConfirm(true)");
    const html = renderToStaticMarkup(
      <DesktopSettings
        settings={DEFAULT_SETTINGS}
        set={() => undefined}
        onReset={() => undefined}
      />,
    );
    expect(html).not.toContain("Reset every setting?");
  });
});

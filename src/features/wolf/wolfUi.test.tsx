import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { Companion } from "./Companion";
import { WolfWidget } from "./WolfWidget";
import { useWolfFrame } from "./useWolfFrames";
import { SPRITE_WIDTH } from "./WolfSprite";
import { useSettingsStore } from "../settings/settingsStore";

function markup(element: Parameters<typeof renderToStaticMarkup>[0]): string {
  return renderToStaticMarkup(element);
}

describe("companion speech", () => {
  it("renders no title attribute anywhere", () => {
    expect(markup(<Companion />)).not.toContain("title=");
  });

  it("has no speech bubble", () => {
    const html = markup(<Companion />);
    expect(html).not.toContain("companion-root__bubble");
  });

  it("keeps a static aria-label on the sprite", () => {
    expect(markup(<Companion />)).toContain("aria-label=");
  });
});

describe("today wolf panel is silent", () => {
  it("renders no state caption", () => {
    expect(markup(<WolfWidget scale={2} />)).not.toContain("wolf__status");
  });

  it("renders no title attribute", () => {
    expect(markup(<WolfWidget scale={2} />)).not.toContain("title=");
  });
});

describe("wolf frames carry no label strings", () => {
  it("returns only frame data for idle", () => {
    let captured: Record<string, unknown> = {};
    function Probe(): null {
      captured = useWolfFrame("idle") as unknown as Record<string, unknown>;
      return null;
    }
    markup(<Probe />);
    expect("label" in captured).toBe(false);
    expect(String(captured.frame).length).toBeGreaterThan(0);
  });
});

describe("sprite scale is an integer number of pixels", () => {
  it("companion renders at the integer settings scale", () => {
    const scale = useSettingsStore.getState().settings.companionScale;
    expect(Number.isInteger(scale)).toBe(true);
    const html = markup(<Companion />);
    expect(html).toContain(`width="${SPRITE_WIDTH * scale}"`);
    expect(html).not.toMatch(/(?<!stroke-)width="\d+\./);
  });

  it("today preview renders at an integer scale", () => {
    const html = markup(<WolfWidget scale={2} />);
    expect(html).toContain(`width="${SPRITE_WIDTH * 2}"`);
  });
});

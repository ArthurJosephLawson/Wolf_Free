import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { Icon, type IconName } from "./Icon";

const ALL: IconName[] = [
  "home",
  "tasks",
  "habits",
  "calendar",
  "focus",
  "progress",
  "review",
  "settings",
  "reload",
  "pin",
  "hide",
  "check",
  "plus",
  "close",
  "chevron-left",
  "chevron-right",
  "edit",
  "trash",
  "play",
  "pause",
  "skip",
  "reset",
];

function parseSvg(markup: string): SVGSVGElement {
  return new DOMParser().parseFromString(markup, "image/svg+xml")
    .documentElement as unknown as SVGSVGElement;
}

describe("Icon", () => {
  it("renders a 24 unit stroke svg at the requested size", () => {
    const svg = parseSvg(renderToStaticMarkup(<Icon name="home" size={20} />));
    expect(svg.getAttribute("viewBox")).toBe("0 0 24 24");
    expect(svg.getAttribute("width")).toBe("20");
    expect(svg.getAttribute("height")).toBe("20");
    expect(svg.getAttribute("stroke")).toBe("currentColor");
    expect(svg.getAttribute("fill")).toBe("none");
  });

  it("defaults to 18 px", () => {
    const svg = parseSvg(renderToStaticMarkup(<Icon name="home" />));
    expect(svg.getAttribute("width")).toBe("18");
  });

  it("draws path geometry for every icon and never a text glyph", () => {
    for (const name of ALL) {
      const svg = parseSvg(renderToStaticMarkup(<Icon name={name} />));
      const paths = svg.querySelectorAll("path");
      expect(paths.length).toBeGreaterThan(0);
      for (const path of paths) {
        expect(path.getAttribute("d")).toBeTruthy();
        expect(path.getAttribute("d")).toMatch(/[Mm]/);
      }
    }
  });

  it("keeps its glyphs decorative", () => {
    const svg = parseSvg(renderToStaticMarkup(<Icon name="home" />));
    expect(svg.getAttribute("aria-hidden")).toBe("true");
    expect(svg.getAttribute("focusable")).toBe("false");
  });
});

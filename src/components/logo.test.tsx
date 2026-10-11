import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { Logo } from "./Logo";

function parseSvg(markup: string): SVGSVGElement {
  return new DOMParser().parseFromString(markup, "image/svg+xml")
    .documentElement as unknown as SVGSVGElement;
}

describe("Logo", () => {
  it("renders the wolf mark on a 32 unit canvas", () => {
    const svg = parseSvg(renderToStaticMarkup(<Logo />));
    expect(svg.tagName).toBe("svg");
    expect(svg.getAttribute("viewBox")).toBe("0 0 32 32");
    expect(svg.getAttribute("width")).toBe("24");
    expect(svg.getAttribute("height")).toBe("24");
    expect(svg.getAttribute("aria-hidden")).toBe("true");
    expect(svg.getAttribute("focusable")).toBe("false");
  });

  it("honours an explicit size", () => {
    const svg = parseSvg(renderToStaticMarkup(<Logo size={40} />));
    expect(svg.getAttribute("width")).toBe("40");
    expect(svg.getAttribute("height")).toBe("40");
  });

  it("inherits colour instead of hard-coding a palette", () => {
    const svg = parseSvg(renderToStaticMarkup(<Logo />));
    expect(svg.getAttribute("fill")).toBe("currentColor");
    expect(svg.getAttribute("fill-rule")).toBe("evenodd");
  });

  it("draws a head silhouette with two cut-out eyes", () => {
    const svg = parseSvg(renderToStaticMarkup(<Logo />));
    const paths = [...svg.querySelectorAll("path")];
    expect(paths.length).toBeGreaterThanOrEqual(1);
    const d = paths.map((p) => p.getAttribute("d")).join(" ")!;
    expect((d.match(/M/g) ?? []).length).toBeGreaterThanOrEqual(3);
    for (const path of paths) {
      expect(path.getAttribute("d")).toMatch(/^M[\d.\s-]+/);
    }
  });

  it("keeps the title bar free of account chrome", () => {
    const app = readFileSync(
      join(process.cwd(), "src", "app", "App.tsx"),
      "utf8",
    );
    expect(app).not.toContain("titlebar__avatar");
    expect(app).not.toContain("titlebar__xp");
  });
});

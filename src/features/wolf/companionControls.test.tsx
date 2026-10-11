import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { Companion } from "./Companion";

const CSS = readFileSync(
  join(process.cwd(), "src", "styles", "globals.css"),
  "utf8",
);

const TOOL_RULE = /\.companion-tool\s*\{([^}]*)\}/.exec(CSS)?.[1] ?? "";

function declaration(name: string): string | null {
  return (
    new RegExp(`${name}:\\s*([^;]+);`).exec(TOOL_RULE)?.[1]?.trim() ?? null
  );
}

describe("companion control buttons", () => {
  it("are comfortably tappable", () => {
    expect(declaration("width")).toBe("26px");
    expect(declaration("height")).toBe("26px");
  });

  it("keep no text, sizing the icon instead", () => {
    expect(declaration("font-size")).toBeNull();
  });

  it("use drawn icons instead of glyph labels", () => {
    const html = renderToStaticMarkup(<Companion />);
    const tools = html.slice(html.indexOf("companion-root__tools"));
    expect((tools.match(/<svg/g) ?? []).length).toBe(3);
    expect(tools).not.toMatch(/[⌂▣▢×]/);
  });
});

const SOURCE = readFileSync(
  join(process.cwd(), "src", "features", "wolf", "Companion.tsx"),
  "utf8",
);

describe("companion drag visuals", () => {
  it("drives the sprite from the drag phase", () => {
    expect(SOURCE).toContain("useState<DragPhase>");
    expect(SOURCE).toContain("companionVisualState(phase, state)");
  });
});

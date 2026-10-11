import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { Segmented } from "./Segmented";

const SOURCE = readFileSync(
  join(process.cwd(), "src", "features", "tasks", "Segmented.tsx"),
  "utf8",
);

describe("segmented control", () => {
  it("puts a single option in the tab order", () => {
    const html = renderToStaticMarkup(
      <Segmented
        label="Filter"
        value="open"
        options={[
          { value: "open", label: "Open" },
          { value: "done", label: "Done" },
          { value: "all", label: "All" },
        ]}
        onChange={() => undefined}
      />,
    );
    const doc = new DOMParser().parseFromString(html, "text/html");
    const radios = [...doc.querySelectorAll('[role="radio"]')];
    expect(radios).toHaveLength(3);
    const tabbable = radios.filter(
      (radio) => radio.getAttribute("tabindex") === "0",
    );
    expect(tabbable).toHaveLength(1);
    expect(tabbable[0]!.getAttribute("aria-checked")).toBe("true");
  });

  it("moves with the arrow keys", () => {
    expect(SOURCE).toContain("ArrowRight");
    expect(SOURCE).toContain("ArrowLeft");
    expect(SOURCE).toContain("onKeyDown");
  });
});

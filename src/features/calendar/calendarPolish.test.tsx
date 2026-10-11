import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { CalendarPage } from "./CalendarPage";

describe("calendar grid semantics", () => {
  it("groups the 42 cells into a header row and six week rows", () => {
    const html = renderToStaticMarkup(<CalendarPage />);
    const doc = new DOMParser().parseFromString(html, "text/html");
    const grid = doc.querySelector('[role="grid"]');
    expect(grid).not.toBeNull();

    const rows = grid!.querySelectorAll('[role="row"]');
    expect(rows.length).toBe(7);

    const cells = grid!.querySelectorAll('[role="gridcell"]');
    expect(cells.length).toBe(42);
    for (const cell of cells) {
      expect(cell.closest('[role="row"]')).not.toBeNull();
    }
  });
});

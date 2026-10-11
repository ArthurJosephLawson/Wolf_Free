import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { QuickAdd } from "./QuickAdd";

function dateField(): HTMLInputElement | null {
  const html = renderToStaticMarkup(<QuickAdd />);
  const doc = new DOMParser().parseFromString(html, "text/html");
  return doc.querySelector('input[type="date"]');
}

describe("quick add date field", () => {
  it("is wide enough that the date cannot be clipped", () => {
    const field = dateField();
    expect(field).not.toBeNull();
    expect(field!.style.flexShrink).toBe("0");
    expect(Number.parseInt(field!.style.width, 10)).toBeGreaterThanOrEqual(150);
  });
});

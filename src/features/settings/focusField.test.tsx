import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { FocusField } from "./FocusField";

describe("focus minutes field", () => {
  it("associates the input with a space-free id", () => {
    const html = renderToStaticMarkup(
      <FocusField
        label="Focus length"
        value={25}
        presets={[15, 25, 50]}
        onChange={() => undefined}
      />,
    );
    const doc = new DOMParser().parseFromString(html, "text/html");
    const input = doc.querySelector("input");
    expect(input).not.toBeNull();
    expect(input!.id).not.toBe("");
    expect(/\s/.test(input!.id)).toBe(false);
    const label = doc.querySelector(`label[for="${input!.id}"]`);
    expect(label).not.toBeNull();
  });
});

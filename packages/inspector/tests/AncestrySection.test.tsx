import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { AncestrySection } from "../src/ui/AncestrySection";
import type { InspectedElement } from "../src/types";

afterEach(cleanup);

function fixture(overrides: Partial<InspectedElement> = {}): InspectedElement {
  const base = {
    tagName: "div",
    primitive: "Box",
    recipe: "Card" as string | undefined,
    variants: [],
    ancestry: [],
    tokens: [],
    interactionStates: [],
    externalHooks: { frameworkClasses: [], externalClasses: [] },
    unsafeCss: { count: 0, detected: [], uncertain: false },
    ...overrides,
  };

  // `describeElement` (used by AncestrySection) reads live DOM attributes,
  // not the model fields above - keep them in sync so overriding `recipe`
  // in the model actually changes what the selected row displays.
  const element = document.createElement("div");
  element.setAttribute("data-fw-primitive", base.primitive);
  if (base.recipe !== undefined) element.setAttribute("data-fw-recipe", base.recipe);

  return { element, ...base };
}

describe("AncestrySection", () => {
  it("includes the selected element itself as the final, marked row when there are no ancestors", () => {
    const { container } = render(<AncestrySection element={fixture()} />);
    const rows = container.querySelectorAll(".fw-inspector-ancestry-item");

    expect(rows).toHaveLength(1);
    expect(rows[0]?.classList.contains("selected")).toBe(true);
    expect(rows[0]?.textContent).toContain("Card · Box");
    expect(rows[0]?.textContent).toContain("selected");
  });

  it("lists ancestors outermost-first, ending in the selected element, in DOM order", () => {
    const inspected = fixture({
      ancestry: [
        // Nearest-first storage order, as `collectAncestry` returns it.
        { element: document.createElement("div"), primitive: "Grid", recipe: undefined },
        { element: document.createElement("div"), primitive: "ScrollArea", recipe: undefined },
        { element: document.createElement("div"), primitive: "Stack", recipe: undefined },
      ],
    });

    const { container } = render(<AncestrySection element={inspected} />);
    const rows = Array.from(container.querySelectorAll(".fw-inspector-ancestry-item"));

    expect(rows.map((row) => row.textContent?.replace("└", "").split("←")[0]?.trim())).toEqual([
      "Stack",
      "ScrollArea",
      "Grid",
      "Card · Box",
    ]);

    // Only the last row (the selected element) is marked.
    expect(rows.slice(0, 3).every((row) => !row.classList.contains("selected"))).toBe(true);
    expect(rows[3]?.classList.contains("selected")).toBe(true);
  });

  it("shows the bare primitive (no recipe badge text) when the selected element isn't a recipe instance", () => {
    const inspected = fixture({ recipe: undefined });
    const { container } = render(<AncestrySection element={inspected} />);
    const selectedRow = container.querySelector(".fw-inspector-ancestry-item.selected");

    expect(selectedRow?.textContent).toContain("Box");
    expect(selectedRow?.textContent).not.toContain("Card");
  });
});

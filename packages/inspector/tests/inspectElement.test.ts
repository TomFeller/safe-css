import { afterEach, describe, expect, it } from "vitest";
import { inspectElement } from "../src/inspection/inspectElement";

let container: HTMLElement | null = null;

afterEach(() => {
  container?.remove();
  container = null;
});

describe("inspectElement", () => {
  it("builds a full model from a realistic fixture tree", () => {
    container = document.createElement("div");

    // Simulates a ThemeProvider wrapper: defines the token chain a Card
    // recipe's border would resolve through.
    container.style.setProperty("--fw-color-border", "#333333");
    container.style.setProperty("--fw-border-subtle", "1px solid var(--fw-color-border)");
    container.style.setProperty("--fw-space-card", "16px");

    container.innerHTML += `<div data-fw-primitive="Stack" id="stack"></div>`;
    const stack = container.querySelector("#stack") as HTMLElement;
    stack.style.setProperty("padding", "var(--fw-space-card)");
    stack.setAttribute("data-fw-tokens", "space.card");

    const card = document.createElement("div");
    card.setAttribute("data-fw-primitive", "Box");
    card.setAttribute("data-fw-recipe", "Card");
    card.setAttribute("data-fw-variant", "tone:raised");
    card.setAttribute("data-fw-tokens", "space.card border.subtle");
    card.setAttribute("data-fw-unsafe-css", "1");
    card.style.setProperty("padding", "var(--fw-space-card)");
    card.style.setProperty("border", "var(--fw-border-subtle)");
    card.style.setProperty("font-style", "italic"); // stands in for an unsafeCss declaration
    stack.appendChild(card);

    document.body.appendChild(container);

    const inspected = inspectElement(card);

    expect(inspected.tagName).toBe("div");
    expect(inspected.primitive).toBe("Box");
    expect(inspected.recipe).toBe("Card");
    expect(inspected.variants).toEqual([{ name: "tone", value: "raised" }]);

    expect(inspected.ancestry).toHaveLength(1);
    expect(inspected.ancestry[0]).toMatchObject({ primitive: "Stack", recipe: undefined });

    expect(inspected.tokens).toHaveLength(2);

    const spaceToken = inspected.tokens.find((t) => t.token === "space.card")!;
    expect(spaceToken.cssVariable).toBe("--fw-space-card");
    expect(spaceToken.rawValue).toBe("16px");
    expect(spaceToken.resolvedValue).toBe("16px");
    expect(spaceToken.properties).toEqual(["padding"]);
    expect(spaceToken.dependencies).toEqual([]);

    const borderToken = inspected.tokens.find((t) => t.token === "border.subtle")!;
    expect(borderToken.cssVariable).toBe("--fw-border-subtle");
    expect(borderToken.rawValue).toBe("1px solid var(--fw-color-border)");
    expect(borderToken.resolvedValue).toBe("1px solid #333333");
    expect(borderToken.properties).toEqual(["border"]);
    expect(borderToken.dependencies).toEqual([
      { token: "colors.border", cssVariable: "--fw-color-border", cycle: false, children: [] },
    ]);

    expect(inspected.unsafeCss.count).toBe(1);
    expect(inspected.unsafeCss.detected).toEqual([{ property: "font-style", value: "italic" }]);
    expect(inspected.unsafeCss.uncertain).toBe(false);
  });

  it("reports 'Unknown' (an empty properties list) for a token no property references", () => {
    container = document.createElement("div");
    container.style.setProperty("--fw-space-card", "16px");
    container.setAttribute("data-fw-primitive", "Box");
    container.setAttribute("data-fw-tokens", "space.card");
    // Deliberately never applied to any style property - simulates a token
    // whose consuming CSS property this package's substring mapping missed.
    document.body.appendChild(container);

    const inspected = inspectElement(container);
    expect(inspected.tokens[0]?.properties).toEqual([]);
  });

  it("does not attribute a property to a token whose name is a prefix of another token's variable (exact matching, not substring)", () => {
    container = document.createElement("div");
    container.style.setProperty("--fw-space-card", "16px");
    container.style.setProperty("--fw-space-card-lg", "24px");
    container.setAttribute("data-fw-primitive", "Box");
    container.setAttribute("data-fw-tokens", "space.card space.card-lg");
    // Only the "-lg" variant is actually used on this element.
    container.style.setProperty("padding", "var(--fw-space-card-lg)");
    document.body.appendChild(container);

    const inspected = inspectElement(container);

    const card = inspected.tokens.find((t) => t.token === "space.card")!;
    const cardLg = inspected.tokens.find((t) => t.token === "space.card-lg")!;

    // The false positive this guards against: substring matching would have
    // wrongly attributed `padding` to `space.card` too, since "--fw-space-card"
    // is a text substring of "--fw-space-card-lg".
    expect(card.properties).toEqual([]);
    expect(cardLg.properties).toEqual(["padding"]);
  });

  it("identifies every exact variable reference inside a compound CSS value", () => {
    container = document.createElement("div");
    container.style.setProperty("--fw-size-card", "220px");
    container.setAttribute("data-fw-primitive", "Grid");
    container.setAttribute("data-fw-tokens", "size.card");
    container.style.setProperty(
      "grid-template-columns",
      "repeat(auto-fill, minmax(var(--fw-size-card), 1fr))",
    );
    document.body.appendChild(container);

    const inspected = inspectElement(container);
    expect(inspected.tokens[0]?.properties).toEqual(["grid-template-columns"]);
  });

  it("reports every CSS property when the same token is referenced by more than one", () => {
    container = document.createElement("div");
    container.style.setProperty("--fw-color-action", "#2563eb");
    container.setAttribute("data-fw-primitive", "Box");
    container.setAttribute("data-fw-tokens", "colors.action");
    container.style.setProperty("color", "var(--fw-color-action)");
    container.style.setProperty("border-color", "var(--fw-color-action)");
    document.body.appendChild(container);

    const inspected = inspectElement(container);
    expect(inspected.tokens[0]?.properties.sort()).toEqual(["border-color", "color"]);
  });

  it("handles an element with no data-fw-* metadata at all gracefully", () => {
    container = document.createElement("div");
    document.body.appendChild(container);

    const inspected = inspectElement(container);
    expect(inspected.primitive).toBe("");
    expect(inspected.recipe).toBeUndefined();
    expect(inspected.variants).toEqual([]);
    expect(inspected.ancestry).toEqual([]);
    expect(inspected.tokens).toEqual([]);
    expect(inspected.unsafeCss).toEqual({ count: 0, detected: [], uncertain: false });
  });
});

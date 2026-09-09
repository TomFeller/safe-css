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
    expect(inspected.interactionStates).toEqual([]);
    expect(inspected.unsafeCss).toEqual({ count: 0, detected: [], uncertain: false });
  });
});

describe("inspectElement: interaction states", () => {
  it("builds a token-backed hover.background declaration", () => {
    container = document.createElement("div");
    container.style.setProperty("--fw-color-surfaceRaised", "#f8fafc");
    container.setAttribute("data-fw-primitive", "Box");
    container.setAttribute("data-fw-state-tokens", "hover|background|colors.surfaceRaised");
    container.style.setProperty(
      "background-color",
      "var(--fw-state-hover-background, var(--fw-color-action))",
    );
    container.style.setProperty(
      "--fw-state-hover-background-value",
      "var(--fw-color-surfaceRaised)",
    );
    document.body.appendChild(container);

    const inspected = inspectElement(container);

    expect(inspected.interactionStates).toHaveLength(1);
    expect(inspected.interactionStates[0]?.state).toBe("hover");
    expect(inspected.interactionStates[0]?.label).toBe("hover");
    expect(inspected.interactionStates[0]?.declarations).toHaveLength(1);

    const declaration = inspected.interactionStates[0]!.declarations[0]!;
    expect(declaration.property).toBe("background");
    expect(declaration.literal).toBeUndefined();
    expect(declaration.token?.token).toBe("colors.surfaceRaised");
    expect(declaration.token?.rawValue).toBe("#f8fafc");
    expect(declaration.suppressedBy).toBeUndefined();
  });

  it("builds a token-backed focusVisible.border declaration, rendering the human label 'focus-visible'", () => {
    container = document.createElement("div");
    container.style.setProperty("--fw-border-strong", "1px solid #9ca3af");
    container.setAttribute("data-fw-primitive", "Box");
    container.setAttribute("data-fw-state-tokens", "focusVisible|border|border.strong");
    container.style.setProperty("--fw-state-focus-visible-border-value", "var(--fw-border-strong)");
    document.body.appendChild(container);

    const inspected = inspectElement(container);

    expect(inspected.interactionStates).toHaveLength(1);
    expect(inspected.interactionStates[0]?.state).toBe("focusVisible");
    expect(inspected.interactionStates[0]?.label).toBe("focus-visible");
    expect(inspected.interactionStates[0]?.declarations[0]?.property).toBe("border");
    expect(inspected.interactionStates[0]?.declarations[0]?.token?.token).toBe("border.strong");
    expect(inspected.interactionStates[0]?.declarations[0]?.token?.rawValue).toBe(
      "1px solid #9ca3af",
    );
  });

  it("builds a token-backed active.color declaration", () => {
    container = document.createElement("div");
    container.style.setProperty("--fw-color-surface", "#ffffff");
    container.setAttribute("data-fw-primitive", "Box");
    container.setAttribute("data-fw-state-tokens", "active|color|colors.surface");
    container.style.setProperty("--fw-state-active-color-value", "var(--fw-color-surface)");
    document.body.appendChild(container);

    const inspected = inspectElement(container);

    expect(inspected.interactionStates).toHaveLength(1);
    expect(inspected.interactionStates[0]?.state).toBe("active");
    expect(inspected.interactionStates[0]?.label).toBe("active");
    expect(inspected.interactionStates[0]?.declarations[0]?.property).toBe("color");
    expect(inspected.interactionStates[0]?.declarations[0]?.token?.token).toBe("colors.surface");
  });

  it("builds a literal declaration for border:'none' - no fake token, derived from the inline -value custom property alone", () => {
    container = document.createElement("div");
    container.setAttribute("data-fw-primitive", "Box");
    // Deliberately no data-fw-state-tokens entry at all - "none" is a
    // literal Core never records as a token dependency.
    container.style.setProperty("--fw-state-hover-border-value", "none");
    document.body.appendChild(container);

    const inspected = inspectElement(container);

    expect(inspected.interactionStates).toHaveLength(1);
    const declaration = inspected.interactionStates[0]!.declarations[0]!;
    expect(declaration.property).toBe("border");
    expect(declaration.literal).toBe("none");
    expect(declaration.token).toBeUndefined();
  });

  it("an unknown/undefined state token is still inspectable, reporting no raw value ('Not defined' at the UI level) rather than being dropped", () => {
    container = document.createElement("div");
    container.setAttribute("data-fw-primitive", "Box");
    container.setAttribute("data-fw-state-tokens", "hover|background|colors.typo");
    // No --fw-color-typo defined anywhere - simulates an unknown token.
    document.body.appendChild(container);

    const inspected = inspectElement(container);

    const declaration = inspected.interactionStates[0]!.declarations[0]!;
    expect(declaration.token?.token).toBe("colors.typo");
    expect(declaration.token?.rawValue).toBeUndefined();
    expect(declaration.token?.owner).toBeUndefined();
  });

  it("preserves a state token's own dependency tree (e.g. focusVisible.border -> border.subtle -> colors.border)", () => {
    container = document.createElement("div");
    container.style.setProperty("--fw-color-border", "#333333");
    container.style.setProperty("--fw-border-subtle", "1px solid var(--fw-color-border)");
    container.setAttribute("data-fw-primitive", "Box");
    container.setAttribute("data-fw-state-tokens", "focusVisible|border|border.subtle");
    container.style.setProperty("--fw-state-focus-visible-border-value", "var(--fw-border-subtle)");
    document.body.appendChild(container);

    const inspected = inspectElement(container);
    const declaration = inspected.interactionStates[0]!.declarations[0]!;

    expect(declaration.token?.resolvedValue).toBe("1px solid #333333");
    expect(declaration.token?.dependencies).toEqual([
      { token: "colors.border", cssVariable: "--fw-color-border", cycle: false, children: [] },
    ]);
  });

  it("resolves a state token's owner to the exact ancestor whose inline style defines it (its theme scope)", () => {
    container = document.createElement("div");
    container.style.setProperty("--fw-color-action", "#2563eb");
    container.innerHTML = `<div data-fw-primitive="Box" data-fw-state-tokens="hover|background|colors.action"></div>`;
    const child = container.querySelector("[data-fw-primitive]") as HTMLElement;
    child.style.setProperty("--fw-state-hover-background-value", "var(--fw-color-action)");
    document.body.appendChild(container);

    const inspected = inspectElement(child);
    expect(inspected.interactionStates[0]?.declarations[0]?.token?.owner).toBe(container);
  });

  it("parses data-fw-state-suppressed and surfaces it on the matching declaration", () => {
    container = document.createElement("div");
    container.style.setProperty("--fw-color-surfaceRaised", "#f8fafc");
    container.setAttribute("data-fw-primitive", "Box");
    container.setAttribute("data-fw-state-tokens", "hover|background|colors.surfaceRaised");
    container.setAttribute("data-fw-state-suppressed", "hover|background|backgroundColor");
    container.style.setProperty(
      "--fw-state-hover-background-value",
      "var(--fw-color-surfaceRaised)",
    );
    document.body.appendChild(container);

    const inspected = inspectElement(container);
    const declaration = inspected.interactionStates[0]!.declarations[0]!;

    expect(declaration.suppressedBy).toEqual({ unsafeCssKey: "backgroundColor" });
    // The declaration itself is untouched - suppression is informational,
    // not a reason to hide the token/dependency data.
    expect(declaration.token?.token).toBe("colors.surfaceRaised");
  });

  it("excludes a state-only token from the ordinary Tokens list entirely - it never shows an internal bridge custom property as its 'Used by'", () => {
    container = document.createElement("div");
    container.style.setProperty("--fw-color-surfaceRaised", "#f8fafc");
    container.setAttribute("data-fw-primitive", "Box");
    // colors.surfaceRaised is unioned into data-fw-tokens by Core (as it
    // always is for a state-only token), but has no ordinary CSS property
    // referencing it directly - only the internal -value custom property.
    container.setAttribute("data-fw-tokens", "colors.surfaceRaised");
    container.setAttribute("data-fw-state-tokens", "hover|background|colors.surfaceRaised");
    container.style.setProperty(
      "background-color",
      "var(--fw-state-hover-background, var(--fw-color-action))",
    );
    container.style.setProperty(
      "--fw-state-hover-background-value",
      "var(--fw-color-surfaceRaised)",
    );
    document.body.appendChild(container);

    const inspected = inspectElement(container);

    expect(inspected.tokens.find((t) => t.token === "colors.surfaceRaised")).toBeUndefined();
    // It's still fully inspectable - just exclusively under interactionStates.
    expect(inspected.interactionStates[0]?.declarations[0]?.token?.token).toBe(
      "colors.surfaceRaised",
    );
  });

  it("a token used both by resting styling and by a state appears in both places, each with its own correct explanation", () => {
    container = document.createElement("div");
    container.style.setProperty("--fw-color-action", "#2563eb");
    container.setAttribute("data-fw-primitive", "Box");
    // base.background = action (ordinary) and states.hover.color = action
    // (state) - the same token, two independent usages.
    container.setAttribute("data-fw-tokens", "colors.action");
    container.setAttribute("data-fw-state-tokens", "hover|color|colors.action");
    container.style.setProperty("background-color", "var(--fw-color-action)");
    container.style.setProperty("color", "var(--fw-state-hover-color, unset)");
    container.style.setProperty("--fw-state-hover-color-value", "var(--fw-color-action)");
    document.body.appendChild(container);

    const inspected = inspectElement(container);

    // Ordinary Tokens: real resting usage, attributed to background-color only.
    const ordinary = inspected.tokens.find((t) => t.token === "colors.action")!;
    expect(ordinary).toBeDefined();
    expect(ordinary.properties).toEqual(["background-color"]);

    // Interaction States: the same token, under hover.color.
    expect(inspected.interactionStates[0]?.state).toBe("hover");
    expect(inspected.interactionStates[0]?.declarations[0]?.property).toBe("color");
    expect(inspected.interactionStates[0]?.declarations[0]?.token?.token).toBe("colors.action");
  });
});

describe("inspectElement: external hooks", () => {
  it("a framework-only element (no consumer className/id) has no external classes and no id", () => {
    container = document.createElement("div");
    container.setAttribute("data-fw-primitive", "Box");
    container.setAttribute("data-fw-classes", "fw-Box");
    container.className = "fw-Box";
    document.body.appendChild(container);

    const inspected = inspectElement(container);
    expect(inspected.externalHooks).toEqual({ frameworkClasses: ["fw-Box"], externalClasses: [] });
  });

  it("subtracts data-fw-classes from the actual classList to find one external class", () => {
    container = document.createElement("div");
    container.setAttribute("data-fw-primitive", "Box");
    container.setAttribute("data-fw-classes", "fw-Box");
    container.className = "fw-Box navigation-item";
    document.body.appendChild(container);

    const inspected = inspectElement(container);
    expect(inspected.externalHooks.frameworkClasses).toEqual(["fw-Box"]);
    expect(inspected.externalHooks.externalClasses).toEqual(["navigation-item"]);
  });

  it("finds multiple external classes", () => {
    container = document.createElement("div");
    container.setAttribute("data-fw-primitive", "Box");
    container.setAttribute("data-fw-classes", "fw-Box fw-grow");
    container.className = "fw-Box fw-grow navigation-item active";
    document.body.appendChild(container);

    const inspected = inspectElement(container);
    expect(inspected.externalHooks.externalClasses).toEqual(["navigation-item", "active"]);
  });

  it("reports id only when there are no external classes", () => {
    container = document.createElement("div");
    container.setAttribute("data-fw-primitive", "Box");
    container.setAttribute("data-fw-classes", "fw-Box");
    container.className = "fw-Box";
    container.id = "primary-nav-home";
    document.body.appendChild(container);

    const inspected = inspectElement(container);
    expect(inspected.externalHooks.id).toBe("primary-nav-home");
    expect(inspected.externalHooks.externalClasses).toEqual([]);
  });

  it("reports both external classes and id together", () => {
    container = document.createElement("div");
    container.setAttribute("data-fw-primitive", "Box");
    container.setAttribute("data-fw-classes", "fw-Box");
    container.className = "fw-Box navigation-item";
    container.id = "primary-nav-home";
    document.body.appendChild(container);

    const inspected = inspectElement(container);
    expect(inspected.externalHooks).toEqual({
      frameworkClasses: ["fw-Box"],
      externalClasses: ["navigation-item"],
      id: "primary-nav-home",
    });
  });

  it("a recipe's own className is external; the recipe's underlying primitive's data-fw-classes is the only framework class", () => {
    container = document.createElement("div");
    container.setAttribute("data-fw-primitive", "Box");
    container.setAttribute("data-fw-recipe", "Card");
    container.setAttribute("data-fw-classes", "fw-Box");
    container.className = "fw-Box special-card";
    document.body.appendChild(container);

    const inspected = inspectElement(container);
    expect(inspected.externalHooks.frameworkClasses).toEqual(["fw-Box"]);
    expect(inspected.externalHooks.externalClasses).toEqual(["special-card"]);
  });

  it("a custom class that happens to start with 'fw-' is still external if Core did not list it in data-fw-classes", () => {
    // Prefix-matching (className.startsWith("fw-")) is exactly what this
    // model must NOT rely on - a consumer or third-party class using the
    // same prefix convention must not be silently swallowed as if it were
    // framework-owned.
    container = document.createElement("div");
    container.setAttribute("data-fw-primitive", "Box");
    container.setAttribute("data-fw-classes", "fw-Box");
    container.className = "fw-Box fw-not-actually-framework";
    document.body.appendChild(container);

    const inspected = inspectElement(container);
    expect(inspected.externalHooks.externalClasses).toEqual(["fw-not-actually-framework"]);
  });

  it("an empty id attribute is treated as absent, not as an empty-string id", () => {
    container = document.createElement("div");
    container.setAttribute("data-fw-primitive", "Box");
    container.id = "";
    document.body.appendChild(container);

    const inspected = inspectElement(container);
    expect(inspected.externalHooks.id).toBeUndefined();
  });
});

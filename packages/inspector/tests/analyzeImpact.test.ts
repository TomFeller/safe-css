import { afterEach, describe, expect, it } from "vitest";
import { analyzeImpact, buildImpactTarget } from "../src/impact/analyzeImpact";

let container: HTMLElement | null = null;

afterEach(() => {
  container?.remove();
  container = null;
});

function mount(build: (root: HTMLElement) => void): HTMLElement {
  container = document.createElement("div");
  build(container);
  document.body.appendChild(container);
  return container;
}

function box(
  parent: HTMLElement,
  attrs: Record<string, string>,
  style: Record<string, string> = {},
) {
  const el = document.createElement("div");
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  for (const [k, v] of Object.entries(style)) el.style.setProperty(k, v);
  parent.appendChild(el);
  return el;
}

describe("analyzeImpact - direct impact", () => {
  it("counts only rendered elements that directly use the token from the exact analyzed scope", () => {
    const root = mount((scope) => {
      scope.style.setProperty("--fw-radius-card", "12px");
      box(scope, {
        "data-fw-primitive": "Box",
        "data-fw-recipe": "Card",
        "data-fw-tokens": "radius.card",
      });
      box(scope, {
        "data-fw-primitive": "Box",
        "data-fw-recipe": "Card",
        "data-fw-tokens": "radius.card",
      });
      box(scope, { "data-fw-primitive": "Box", "data-fw-tokens": "space.card" }); // unrelated token
    });

    const target = buildImpactTarget(root, "radius.card")!;
    const result = analyzeImpact(target, root);

    expect(result.affected).toHaveLength(2);
    expect(result.affected.every((el) => el.kind === "direct")).toBe(true);
    expect(result.excludedByScope).toHaveLength(0);
    expect(result.currentValue).toBe("12px");
  });
});

describe("analyzeImpact - indirect impact", () => {
  it("finds elements that only use a dependent token, via border.subtle -> colors.border", () => {
    const root = mount((scope) => {
      scope.style.setProperty("--fw-color-border", "#e5e7eb");
      scope.style.setProperty("--fw-border-subtle", "1px solid var(--fw-color-border)");
      box(scope, {
        "data-fw-primitive": "Box",
        "data-fw-recipe": "Card",
        "data-fw-tokens": "border.subtle",
      });
      box(scope, {
        "data-fw-primitive": "Box",
        "data-fw-recipe": "Card",
        "data-fw-tokens": "border.subtle",
      });
      box(scope, {
        "data-fw-primitive": "Box",
        "data-fw-recipe": "Card",
        "data-fw-tokens": "border.subtle",
      });
    });

    const target = buildImpactTarget(root, "colors.border")!;
    const result = analyzeImpact(target, root);

    expect(result.affected).toHaveLength(3);
    expect(result.affected.every((el) => el.kind === "indirect")).toBe(true);
    expect(result.affected[0]?.paths).toEqual([
      { tokens: ["colors.border", "border.subtle"], kind: "indirect" },
    ]);
  });

  it("classifies an element that qualifies both directly and indirectly as direct, and never double-counts it", () => {
    const root = mount((scope) => {
      scope.style.setProperty("--fw-color-border", "#e5e7eb");
      scope.style.setProperty("--fw-border-subtle", "1px solid var(--fw-color-border)");
      // Directly uses colors.border AND border.subtle (which also depends on it).
      box(scope, {
        "data-fw-primitive": "Box",
        "data-fw-recipe": "Card",
        "data-fw-tokens": "colors.border border.subtle",
      });
    });

    const target = buildImpactTarget(root, "colors.border")!;
    const result = analyzeImpact(target, root);

    expect(result.affected).toHaveLength(1);
    expect(result.affected[0]?.kind).toBe("direct");

    // Direct wins for classification, but the *separate* indirect route
    // through border.subtle is real information and must not be discarded.
    expect(result.affected[0]?.paths).toEqual(
      expect.arrayContaining([
        { tokens: ["colors.border"], kind: "direct" },
        { tokens: ["colors.border", "border.subtle"], kind: "indirect" },
      ]),
    );
    expect(result.affected[0]?.paths).toHaveLength(2);
  });
});

describe("analyzeImpact - nested theme scopes", () => {
  it("excludes elements resolving the same token name from a different owner (required scenario)", () => {
    const root = mount((outer) => {
      outer.style.setProperty("--fw-radius-card", "12px");
      box(outer, {
        "data-fw-primitive": "Box",
        "data-fw-recipe": "Card",
        "data-fw-tokens": "radius.card",
      }); // Outer Card A
      box(outer, {
        "data-fw-primitive": "Box",
        "data-fw-recipe": "Card",
        "data-fw-tokens": "radius.card",
      }); // Outer Card B

      const inner = document.createElement("div");
      inner.style.setProperty("--fw-radius-card", "20px");
      outer.appendChild(inner);
      box(inner, {
        "data-fw-primitive": "Box",
        "data-fw-recipe": "Card",
        "data-fw-tokens": "radius.card",
      }); // Inner Card C
    });

    const outerTarget = buildImpactTarget(root, "radius.card")!;
    const outerResult = analyzeImpact(outerTarget, root);
    expect(outerResult.affected).toHaveLength(2);
    expect(outerResult.excludedByScope).toHaveLength(1);

    const innerCard = root.querySelectorAll("[data-fw-recipe]")[2] as HTMLElement;
    const innerTarget = buildImpactTarget(innerCard, "radius.card")!;
    const innerResult = analyzeImpact(innerTarget, root);
    expect(innerResult.affected).toHaveLength(1);
    expect(innerResult.excludedByScope).toHaveLength(2);
  });

  it("does not follow a dependency chain across scopes when an inner scope overrides the intermediate token (critical scenario)", () => {
    const root = mount((outer) => {
      outer.style.setProperty("--fw-color-border", "#e5e7eb");
      outer.style.setProperty("--fw-border-subtle", "1px solid var(--fw-color-border)");
      box(outer, {
        "data-fw-primitive": "Box",
        "data-fw-recipe": "Card",
        "data-fw-tokens": "border.subtle",
      }); // Outer Card

      const inner = document.createElement("div");
      // Inner scope overrides border.subtle with a value that no longer references colors.border at all.
      inner.style.setProperty("--fw-border-subtle", "2px dashed black");
      outer.appendChild(inner);
      box(inner, {
        "data-fw-primitive": "Box",
        "data-fw-recipe": "Card",
        "data-fw-tokens": "border.subtle",
      }); // Inner Card
    });

    const target = buildImpactTarget(root, "colors.border")!;
    const result = analyzeImpact(target, root);

    // Only the outer Card (whose border.subtle still references colors.border) is affected.
    expect(result.affected).toHaveLength(1);
    expect(result.excludedByScope).toHaveLength(0); // border.subtle isn't the target token name, so this isn't a "same-name-different-scope" case
  });

  it("reports an indirect consumer of a *different* scope's version of the same token relationship as excluded, not silently ignored (regression)", () => {
    const root = mount((outer) => {
      // Both scopes define the *same* relationship (border.subtle depends
      // on colors.border) - unlike the override scenario above, the
      // dependency itself isn't broken, it just resolves from a different
      // owner for the inner Card.
      outer.style.setProperty("--fw-color-border", "#e5e7eb");
      outer.style.setProperty("--fw-border-subtle", "1px solid var(--fw-color-border)");
      box(outer, {
        "data-fw-primitive": "Box",
        "data-fw-recipe": "Card",
        "data-fw-tokens": "border.subtle",
      }); // Outer Card

      const inner = document.createElement("div");
      inner.style.setProperty("--fw-color-border", "#111111");
      inner.style.setProperty("--fw-border-subtle", "1px solid var(--fw-color-border)");
      outer.appendChild(inner);
      box(inner, {
        "data-fw-primitive": "Box",
        "data-fw-recipe": "Card",
        "data-fw-tokens": "border.subtle",
      }); // Inner Card
    });

    const outerTarget = buildImpactTarget(root, "colors.border")!;
    const result = analyzeImpact(outerTarget, root);

    // Only the outer Card is affected; the inner Card resolves the same
    // border.subtle -> colors.border relationship from the inner scope.
    expect(result.affected).toHaveLength(1);
    expect(result.affected[0]?.recipe).toBe("Card");
    // The inner Card is reported as excluded-by-scope, not silently dropped.
    expect(result.excludedByScope).toHaveLength(1);
    expect(result.excludedByScope[0]?.token).toBe("colors.border");
    expect(result.excludedByScope[0]?.reason).toBe("different-theme-scope");
  });
});

describe("analyzeImpact - transitive dependencies and cycles", () => {
  it("supports an arbitrary-depth chain (A -> B -> C -> element)", () => {
    const root = mount((scope) => {
      scope.style.setProperty("--fw-color-a", "#111");
      scope.style.setProperty("--fw-color-b", "var(--fw-color-a)");
      scope.style.setProperty("--fw-color-c", "var(--fw-color-b)");
      box(scope, { "data-fw-primitive": "Box", "data-fw-tokens": "colors.c" });
    });

    const target = buildImpactTarget(root, "colors.a")!;
    const result = analyzeImpact(target, root);

    expect(result.affected).toHaveLength(1);
    expect(result.affected[0]?.paths).toEqual([
      { tokens: ["colors.a", "colors.b", "colors.c"], kind: "indirect" },
    ]);
  });

  it("never hangs or crashes on a dependency cycle, and still completes analysis", () => {
    const root = mount((scope) => {
      scope.style.setProperty("--fw-color-a", "var(--fw-color-b)");
      scope.style.setProperty("--fw-color-b", "var(--fw-color-a)");
      box(scope, { "data-fw-primitive": "Box", "data-fw-tokens": "colors.b" });
    });

    const target = buildImpactTarget(root, "colors.a")!;
    expect(() => analyzeImpact(target, root)).not.toThrow();
  });
});

describe("analyzeImpact - grouping and paths", () => {
  it("groups affected elements by recipe and primitive, sorted by count then name, including a 'No recipe' bucket", () => {
    const root = mount((scope) => {
      scope.style.setProperty("--fw-radius-card", "12px");
      box(scope, {
        "data-fw-primitive": "Box",
        "data-fw-recipe": "Card",
        "data-fw-tokens": "radius.card",
      });
      box(scope, {
        "data-fw-primitive": "Box",
        "data-fw-recipe": "Card",
        "data-fw-tokens": "radius.card",
      });
      box(scope, {
        "data-fw-primitive": "Box",
        "data-fw-recipe": "ProjectCard",
        "data-fw-tokens": "radius.card",
      });
      box(scope, { "data-fw-primitive": "Row", "data-fw-tokens": "radius.card" }); // no recipe
    });

    const target = buildImpactTarget(root, "radius.card")!;
    const result = analyzeImpact(target, root);

    expect(result.recipes).toEqual([
      { label: "Card", count: 2, direct: 2, indirect: 0 },
      { label: "No recipe", count: 1, direct: 1, indirect: 0 },
      { label: "ProjectCard", count: 1, direct: 1, indirect: 0 },
    ]);
    expect(result.primitives).toEqual([
      { label: "Box", count: 3, direct: 3, indirect: 0 },
      { label: "Row", count: 1, direct: 1, indirect: 0 },
    ]);
  });

  it("collapses identical paths into one row with a count instead of one row per element", () => {
    const root = mount((scope) => {
      scope.style.setProperty("--fw-color-border", "#e5e7eb");
      scope.style.setProperty("--fw-border-subtle", "1px solid var(--fw-color-border)");
      for (let i = 0; i < 5; i++) {
        box(scope, {
          "data-fw-primitive": "Box",
          "data-fw-recipe": "Card",
          "data-fw-tokens": "border.subtle",
        });
      }
    });

    const target = buildImpactTarget(root, "colors.border")!;
    const result = analyzeImpact(target, root);

    expect(result.paths).toEqual([
      {
        tokens: ["colors.border", "border.subtle"],
        kind: "indirect",
        consumerLabel: "Card",
        count: 5,
      },
    ]);
  });

  it("preserves both dependency paths when one element is reached through two distinct chains (regression)", () => {
    const root = mount((scope) => {
      scope.style.setProperty("--fw-color-border", "#e5e7eb");
      scope.style.setProperty("--fw-border-subtle", "1px solid var(--fw-color-border)");
      scope.style.setProperty("--fw-focus-border", "2px solid var(--fw-color-border)");
      // A single Card that uses BOTH border.subtle and focus.border, each
      // independently depending on colors.border.
      box(scope, {
        "data-fw-primitive": "Box",
        "data-fw-recipe": "Card",
        "data-fw-tokens": "border.subtle focus.border",
      });
    });

    const target = buildImpactTarget(root, "colors.border")!;
    const result = analyzeImpact(target, root);

    // Counted once as a rendered element...
    expect(result.affected).toHaveLength(1);
    expect(result.affected[0]?.kind).toBe("indirect");
    // ...but both distinct explanatory paths are preserved on it...
    expect(result.affected[0]?.paths).toEqual(
      expect.arrayContaining([
        { tokens: ["colors.border", "border.subtle"], kind: "indirect" },
        { tokens: ["colors.border", "focus.border"], kind: "indirect" },
      ]),
    );
    expect(result.affected[0]?.paths).toHaveLength(2);
    // ...and both show up as genuinely distinct rows in the collapsed
    // "Impact paths" section, not merged or dropped.
    expect(result.paths).toEqual(
      expect.arrayContaining([
        {
          tokens: ["colors.border", "border.subtle"],
          kind: "indirect",
          consumerLabel: "Card",
          count: 1,
        },
        {
          tokens: ["colors.border", "focus.border"],
          kind: "indirect",
          consumerLabel: "Card",
          count: 1,
        },
      ]),
    );
    expect(result.paths).toHaveLength(2);
  });

  it("preserves multiple target paths that branch inside a single consumed token dependency tree (regression)", () => {
    const root = mount((scope) => {
      scope.style.setProperty("--fw-color-border", "#e5e7eb");

      scope.style.setProperty("--fw-border-subtle", "1px solid var(--fw-color-border)");

      scope.style.setProperty("--fw-focus-border", "2px solid var(--fw-color-border)");

      // panel.border depends on TWO different tokens, and both of those
      // independently depend on colors.border.
      scope.style.setProperty(
        "--fw-panel-border",
        "var(--fw-border-subtle) var(--fw-focus-border)",
      );

      // Crucially, the element uses only ONE token.
      // The two impact paths branch *inside* panel.border's dependency tree.
      box(scope, {
        "data-fw-primitive": "Box",
        "data-fw-recipe": "Card",
        "data-fw-tokens": "panel.border",
      });
    });

    const target = buildImpactTarget(root, "colors.border")!;
    const result = analyzeImpact(target, root);

    // One rendered element, so it must only count once.
    expect(result.affected).toHaveLength(1);
    expect(result.affected[0]?.kind).toBe("indirect");

    // But there are two genuinely different explanations for why
    // panel.border depends on colors.border.
    expect(result.affected[0]?.paths).toEqual(
      expect.arrayContaining([
        {
          tokens: ["colors.border", "border.subtle", "panel.border"],
          kind: "indirect",
        },
        {
          tokens: ["colors.border", "focus.border", "panel.border"],
          kind: "indirect",
        },
      ]),
    );

    expect(result.affected[0]?.paths).toHaveLength(2);

    // And both explanations must survive the collapsing step shown
    // in the Impact Paths UI.
    expect(result.paths).toEqual(
      expect.arrayContaining([
        {
          tokens: ["colors.border", "border.subtle", "panel.border"],
          kind: "indirect",
          consumerLabel: "Card",
          count: 1,
        },
        {
          tokens: ["colors.border", "focus.border", "panel.border"],
          kind: "indirect",
          consumerLabel: "Card",
          count: 1,
        },
      ]),
    );

    expect(result.paths).toHaveLength(2);
  });
  it("collapses direct and indirect paths independently across several direct+indirect elements (regression)", () => {
    const root = mount((scope) => {
      scope.style.setProperty("--fw-color-border", "#e5e7eb");
      scope.style.setProperty("--fw-border-subtle", "1px solid var(--fw-color-border)");
      // Three Cards, each directly using colors.border AND border.subtle -
      // every one is "direct" overall, but each also has the same indirect
      // explanatory path, which must collapse into its own row.
      for (let i = 0; i < 3; i++) {
        box(scope, {
          "data-fw-primitive": "Box",
          "data-fw-recipe": "Card",
          "data-fw-tokens": "colors.border border.subtle",
        });
      }
    });

    const target = buildImpactTarget(root, "colors.border")!;
    const result = analyzeImpact(target, root);

    expect(result.affected).toHaveLength(3);
    expect(result.affected.every((el) => el.kind === "direct")).toBe(true);
    expect(result.recipes).toEqual([{ label: "Card", count: 3, direct: 3, indirect: 0 }]);

    // Two distinct rows - the direct one and the indirect explanatory one -
    // each correctly counted across all three Cards, not merged together.
    expect(result.paths).toEqual(
      expect.arrayContaining([
        { tokens: ["colors.border"], kind: "direct", consumerLabel: "Card", count: 3 },
        {
          tokens: ["colors.border", "border.subtle"],
          kind: "indirect",
          consumerLabel: "Card",
          count: 3,
        },
      ]),
    );
    expect(result.paths).toHaveLength(2);
  });
});

describe("analyzeImpact - empty and malformed input", () => {
  it("reports zero affected elements, not an error, when nothing depends on the token", () => {
    const root = mount((scope) => {
      scope.style.setProperty("--fw-radius-card", "12px");
      box(scope, { "data-fw-primitive": "Box", "data-fw-tokens": "space.card" });
    });

    const target = buildImpactTarget(root, "radius.card")!;
    const result = analyzeImpact(target, root);

    expect(result.affected).toEqual([]);
    expect(result.recipes).toEqual([]);
    expect(result.primitives).toEqual([]);
    expect(result.paths).toEqual([]);
  });

  it("skips an element with a malformed data-fw-tokens entry rather than crashing analysis", () => {
    const root = mount((scope) => {
      scope.style.setProperty("--fw-radius-card", "12px");
      box(scope, { "data-fw-primitive": "Box", "data-fw-tokens": "not-a-real-token !!" });
      box(scope, {
        "data-fw-primitive": "Box",
        "data-fw-recipe": "Card",
        "data-fw-tokens": "radius.card",
      });
    });

    const target = buildImpactTarget(root, "radius.card")!;
    expect(() => analyzeImpact(target, root)).not.toThrow();
    const result = analyzeImpact(target, root);
    expect(result.affected).toHaveLength(1);
  });
});

describe("buildImpactTarget", () => {
  it("returns null when no active definition can be found for the token", () => {
    const root = mount((scope) => {
      box(scope, { "data-fw-primitive": "Box", "data-fw-tokens": "radius.card" });
    });

    expect(buildImpactTarget(root, "radius.card")).toBeNull();
  });
});

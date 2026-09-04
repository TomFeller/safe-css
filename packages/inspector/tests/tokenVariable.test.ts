import { describe, expect, it } from "vitest";
import { cssVariableToTokenIdentity, tokenToCssVariable } from "../src/tokens/tokenVariable";

describe("tokenToCssVariable", () => {
  it("maps the 'colors' category to the singular 'color' segment", () => {
    expect(tokenToCssVariable({ category: "colors", name: "border" })).toBe("--fw-color-border");
  });

  it("leaves every other category unchanged", () => {
    expect(tokenToCssVariable({ category: "space", name: "card" })).toBe("--fw-space-card");
    expect(tokenToCssVariable({ category: "radius", name: "md" })).toBe("--fw-radius-md");
    expect(tokenToCssVariable({ category: "size", name: "lg" })).toBe("--fw-size-lg");
    expect(tokenToCssVariable({ category: "border", name: "subtle" })).toBe("--fw-border-subtle");
    expect(tokenToCssVariable({ category: "shadow", name: "raised" })).toBe("--fw-shadow-raised");
    expect(tokenToCssVariable({ category: "layer", name: "overlay" })).toBe("--fw-layer-overlay");
  });
});

describe("cssVariableToTokenIdentity", () => {
  it("is the exact reverse of tokenToCssVariable, including colors -> color", () => {
    expect(cssVariableToTokenIdentity("--fw-color-border")).toEqual({
      token: "colors.border",
      category: "colors",
      name: "border",
    });
    expect(cssVariableToTokenIdentity("--fw-space-card")).toEqual({
      token: "space.card",
      category: "space",
      name: "card",
    });
  });

  it("handles token names that themselves contain hyphens", () => {
    expect(cssVariableToTokenIdentity("--fw-space-card-lg")).toEqual({
      token: "space.card-lg",
      category: "space",
      name: "card-lg",
    });
  });

  it("returns null for anything outside the --fw-* namespace", () => {
    expect(cssVariableToTokenIdentity("--some-other-var")).toBeNull();
    expect(cssVariableToTokenIdentity("--fw-incomplete")).toBeNull();
    expect(cssVariableToTokenIdentity("color-border")).toBeNull();
  });
});

import { describe, expect, it } from "vitest";
import {
  describeElement,
  isInspectable,
  readPrimitive,
  readRecipe,
  readTokenList,
  readUnsafeCssCount,
  readVariants,
} from "../src/inspection/metadata";

function el(attributes: Record<string, string> = {}): HTMLElement {
  const element = document.createElement("div");
  for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, value);
  return element;
}

describe("isInspectable", () => {
  it("is true only when data-fw-primitive is present", () => {
    expect(isInspectable(el({ "data-fw-primitive": "Box" }))).toBe(true);
    expect(isInspectable(el())).toBe(false);
  });
});

describe("readPrimitive / readRecipe", () => {
  it("reads the raw attribute values", () => {
    const element = el({ "data-fw-primitive": "Box", "data-fw-recipe": "Card" });
    expect(readPrimitive(element)).toBe("Box");
    expect(readRecipe(element)).toBe("Card");
  });

  it("returns an empty string / undefined when absent", () => {
    const element = el();
    expect(readPrimitive(element)).toBe("");
    expect(readRecipe(element)).toBeUndefined();
  });
});

describe("readVariants", () => {
  it("parses Core's 'key:value key2:value2' format", () => {
    const element = el({ "data-fw-variant": "tone:raised density:compact" });
    expect(readVariants(element)).toEqual([
      { name: "tone", value: "raised" },
      { name: "density", value: "compact" },
    ]);
  });

  it("returns an empty array when the attribute is absent or empty", () => {
    expect(readVariants(el())).toEqual([]);
    expect(readVariants(el({ "data-fw-variant": "" }))).toEqual([]);
  });

  it("tolerates extra whitespace and a pair with no colon", () => {
    const element = el({ "data-fw-variant": "  tone:raised   solo  " });
    expect(readVariants(element)).toEqual([
      { name: "tone", value: "raised" },
      { name: "solo", value: "" },
    ]);
  });
});

describe("readTokenList", () => {
  it("parses Core's space-separated token list", () => {
    const element = el({ "data-fw-tokens": "space.card colors.surface" });
    expect(readTokenList(element)).toEqual(["space.card", "colors.surface"]);
  });

  it("returns an empty array when absent", () => {
    expect(readTokenList(el())).toEqual([]);
  });
});

describe("readUnsafeCssCount", () => {
  it("parses a positive integer", () => {
    expect(readUnsafeCssCount(el({ "data-fw-unsafe-css": "3" }))).toBe(3);
  });

  it("treats missing, non-numeric, zero, and negative values as 0", () => {
    expect(readUnsafeCssCount(el())).toBe(0);
    expect(readUnsafeCssCount(el({ "data-fw-unsafe-css": "not-a-number" }))).toBe(0);
    expect(readUnsafeCssCount(el({ "data-fw-unsafe-css": "0" }))).toBe(0);
    expect(readUnsafeCssCount(el({ "data-fw-unsafe-css": "-2" }))).toBe(0);
  });
});

describe("describeElement", () => {
  it("combines recipe and primitive when a recipe is present", () => {
    const element = el({ "data-fw-primitive": "Box", "data-fw-recipe": "Card" });
    expect(describeElement(element)).toBe("Card · Box");
  });

  it("falls back to the bare primitive otherwise", () => {
    const element = el({ "data-fw-primitive": "Box" });
    expect(describeElement(element)).toBe("Box");
  });
});

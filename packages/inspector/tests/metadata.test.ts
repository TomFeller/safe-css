import { describe, expect, it } from "vitest";
import {
  describeElement,
  isInspectable,
  readClasses,
  readPrimitive,
  readRecipe,
  readStateSuppressedList,
  readStateTokenList,
  readTokenList,
  readUnsafeCssCount,
  readVariants,
  stateLabel,
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

describe("readClasses", () => {
  it("parses Core's space-separated data-fw-classes list", () => {
    const element = el({ "data-fw-classes": "fw-Box fw-grow" });
    expect(readClasses(element)).toEqual(["fw-Box", "fw-grow"]);
  });

  it("returns an empty array when absent", () => {
    expect(readClasses(el())).toEqual([]);
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

describe("readStateTokenList", () => {
  it("parses Core's 'state|property|token' space-separated format", () => {
    const element = el({
      "data-fw-state-tokens": "hover|background|colors.action focusVisible|border|border.strong",
    });
    expect(readStateTokenList(element)).toEqual([
      { state: "hover", property: "background", token: "colors.action" },
      { state: "focusVisible", property: "border", token: "border.strong" },
    ]);
  });

  it("splits only on the first two '|' delimiters, keeping the rest as the token identity", () => {
    // A token identity can never actually contain "|" in practice, but the
    // parser's contract is to never split past the second delimiter
    // regardless - this proves it doesn't, rather than assuming it.
    const element = el({ "data-fw-state-tokens": "hover|background|colors.action|extra" });
    expect(readStateTokenList(element)).toEqual([
      { state: "hover", property: "background", token: "colors.action|extra" },
    ]);
  });

  it("returns an empty array when the attribute is absent or empty", () => {
    expect(readStateTokenList(el())).toEqual([]);
    expect(readStateTokenList(el({ "data-fw-state-tokens": "" }))).toEqual([]);
  });

  it("safely ignores malformed entries instead of throwing", () => {
    const cases = [
      "hover", // no delimiters at all
      "hover|background", // only one delimiter, no token
      "hover||", // empty token after the second delimiter
      "notAState|background|colors.action", // unrecognized state name
      "hover|notAProperty|colors.action", // unrecognized property name
    ];
    for (const entry of cases) {
      const element = el({ "data-fw-state-tokens": entry });
      expect(() => readStateTokenList(element)).not.toThrow();
      expect(readStateTokenList(element)).toEqual([]);
    }
  });

  it("keeps well-formed entries even when mixed with malformed ones, in DOM order", () => {
    const element = el({
      "data-fw-state-tokens": "garbage hover|background|colors.action also-garbage|x|y",
    });
    expect(readStateTokenList(element)).toEqual([
      { state: "hover", property: "background", token: "colors.action" },
    ]);
  });
});

describe("readStateSuppressedList", () => {
  it("parses Core's 'state|property|unsafeCssKey' space-separated format", () => {
    const element = el({
      "data-fw-state-suppressed":
        "hover|background|backgroundColor active|background|backgroundColor",
    });
    expect(readStateSuppressedList(element)).toEqual([
      { state: "hover", property: "background", unsafeCssKey: "backgroundColor" },
      { state: "active", property: "background", unsafeCssKey: "backgroundColor" },
    ]);
  });

  it("returns an empty array when the attribute is absent", () => {
    expect(readStateSuppressedList(el())).toEqual([]);
  });

  it("safely ignores malformed entries instead of throwing", () => {
    const element = el({ "data-fw-state-suppressed": "not-valid" });
    expect(() => readStateSuppressedList(element)).not.toThrow();
    expect(readStateSuppressedList(element)).toEqual([]);
  });
});

describe("stateLabel", () => {
  it("renders focusVisible as the human-facing 'focus-visible', never the implementation name", () => {
    expect(stateLabel("focusVisible")).toBe("focus-visible");
  });

  it("renders hover and active unchanged", () => {
    expect(stateLabel("hover")).toBe("hover");
    expect(stateLabel("active")).toBe("active");
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

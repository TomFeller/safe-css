import { afterEach, describe, expect, it } from "vitest";
import { detectUnsafeCss } from "../src/unsafe/detectUnsafeCss";

let element: HTMLElement | null = null;

afterEach(() => {
  element = null;
});

function elWithStyle(style: Record<string, string>): HTMLElement {
  element = document.createElement("div");
  for (const [property, value] of Object.entries(style)) {
    element.style.setProperty(property, value);
  }
  return element;
}

describe("detectUnsafeCss", () => {
  it("reports zero declarations and is not uncertain when there is nothing unusual", () => {
    const el = elWithStyle({ padding: "var(--fw-space-card)" });
    expect(detectUnsafeCss(el, 0)).toEqual({ count: 0, detected: [], uncertain: false });
  });

  it("ignores token-driven declarations (var(--fw-...))", () => {
    const el = elWithStyle({
      color: "var(--fw-color-text)",
      "background-color": "var(--fw-color-surface)",
    });
    const info = detectUnsafeCss(el, 0);
    expect(info.detected).toEqual([]);
  });

  it("ignores known structural literals authored by primitives themselves", () => {
    const el = elWithStyle({ border: "none", "box-shadow": "none", inset: "50%" });
    const info = detectUnsafeCss(el, 0);
    expect(info.detected).toEqual([]);
    expect(info.uncertain).toBe(false);
  });

  it("detects a declaration that is neither token-driven nor a known structural literal", () => {
    const el = elWithStyle({ "font-style": "italic" });
    const info = detectUnsafeCss(el, 1);
    expect(info.detected).toEqual([{ property: "font-style", value: "italic" }]);
    expect(info.uncertain).toBe(false);
  });

  it("is uncertain when the detected count disagrees with Core's reported count", () => {
    const el = elWithStyle({ padding: "var(--fw-space-card)" });
    // Core says there's 1 unsafeCss declaration, but nothing in the inline
    // style looks like one - the heuristic can't find it.
    const info = detectUnsafeCss(el, 1);
    expect(info.detected).toEqual([]);
    expect(info.uncertain).toBe(true);
  });

  it("is uncertain when more is detected than Core reported", () => {
    const el = elWithStyle({ "font-style": "italic", "letter-spacing": "2px" });
    const info = detectUnsafeCss(el, 1);
    expect(info.detected.length).toBe(2);
    expect(info.uncertain).toBe(true);
  });
});

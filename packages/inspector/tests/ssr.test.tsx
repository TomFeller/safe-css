/**
 * @vitest-environment node
 *
 * Runs with no DOM globals at all (no `document`, no `window`) - the only
 * way to actually prove `SafeCssInspector` never touches them outside a
 * `useEffect`. Every other test file in this package runs under jsdom,
 * which would silently hide a bug like `document.createElement()` called
 * directly in the component body.
 */
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { SafeCssInspector } from "../src/component/SafeCssInspector";

describe("SafeCssInspector (SSR)", () => {
  it("renders to an empty string without throwing when document/window don't exist", () => {
    expect(typeof document).toBe("undefined");
    expect(() => {
      const markup = renderToStaticMarkup(<SafeCssInspector />);
      expect(markup).toBe("");
    }).not.toThrow();
  });
});

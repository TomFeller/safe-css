import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Box, Stack } from "../src";
import { renderWithTheme } from "./test-utils";

const STYLES_CSS_PATH = join(import.meta.dirname, "../src/style/styles.css");

describe("scoped margin normalization", () => {
  it("every safe-css primitive class is covered by the shared margin:0 rule", () => {
    // A source-level assertion rather than a computed-style one: vitest runs
    // with `css: false` (jsdom never loads our real stylesheet), so this is
    // the reliable way to pin down exactly which selectors carry the reset -
    // see docs/architecture.md#scoped-normalization.
    const css = readFileSync(STYLES_CSS_PATH, "utf8");
    const resetRuleMatch = css.match(/\.fw-Box[\s\S]*?\{[^}]*margin:\s*0;[^}]*\}/);
    expect(resetRuleMatch).not.toBeNull();

    const resetRule = resetRuleMatch![0];
    for (const primitiveClass of [
      ".fw-Box",
      ".fw-Stack",
      ".fw-Row",
      ".fw-Grid",
      ".fw-ScrollArea",
      ".fw-Sticky",
      ".fw-Overlay",
      ".fw-OverlayItem",
    ]) {
      expect(resetRule).toContain(primitiveClass);
    }
  });

  it("does not reset margin via a bare element selector (no global reset)", () => {
    const css = readFileSync(STYLES_CSS_PATH, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    // No *rule* in this file (comments stripped above) may target a bare
    // HTML element name - every selector must be one of our own `.fw-*`
    // classes (or an attribute selector scoped to one, e.g. the Overlay RTL
    // rules). The negative lookbehind rules out matching inside a class name
    // like `.fw-Overlay`.
    const bareElementSelector = /(?<![.\w-])(h1|h2|h3|p|button|div|span|a)\s*\{/;
    expect(css).not.toMatch(bareElementSelector);
  });

  it("every primitive's root class list includes its own scoped-normalized class", () => {
    const box = renderWithTheme(<Box as="h1" data-testid="el" />);
    expect(box.getByTestId("el").className).toContain("fw-Box");
    box.unmount();

    const stack = renderWithTheme(<Stack as="p" data-testid="el" />);
    expect(stack.getByTestId("el").className).toContain("fw-Stack");
  });

  it("a heading rendered through Box needs no manual margin reset via unsafeCss", () => {
    // This is the exact pattern the demo used to need before this fix -
    // `<Box as="h1" unsafeCss={{ margin: 0 }}>` - and no longer does.
    const { getByTestId } = renderWithTheme(
      <Box as="h1" data-testid="el">
        Heading
      </Box>,
    );
    const el = getByTestId("el");
    expect(el.tagName).toBe("H1");
    // No unsafeCss was used, so there is nothing (and no warning) to report.
    expect(el.hasAttribute("data-fw-unsafe-css")).toBe(false);
  });
});

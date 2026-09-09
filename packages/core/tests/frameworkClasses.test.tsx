import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import {
  Box,
  Grid,
  Overlay,
  Row,
  ScrollArea,
  Stack,
  Sticky,
  ThemeProvider,
  createTheme,
  defineRecipe,
} from "../src";
import { renderWithTheme } from "./test-utils";

/**
 * `data-fw-classes` (v0.4 Phase 3 / External Hooks) lists exactly the CSS
 * classes a primitive itself generated - never the consumer's own
 * `className`, never a recipe-fabricated class (recipes never fabricate one
 * - `data-fw-recipe` is the recipe identity mechanism). This is what lets
 * Inspector subtract framework-owned classes from an element's actual
 * `classList` to find genuinely external hooks, without guessing via a
 * `fw-` prefix. See `primitives/internal/debugAttributes.ts`.
 */
describe("data-fw-classes: per-primitive framework class lists", () => {
  it("Box: static + conditional classes, excluding the consumer className", () => {
    const { getByTestId } = renderWithTheme(
      <Box data-testid="el" grow className="consumer-class" />,
    );
    const el = getByTestId("el");
    expect(el.getAttribute("data-fw-classes")).toBe("fw-Box fw-grow");
    expect(el.className).toContain("consumer-class");
    expect(el.className).toContain("fw-Box");
    expect(el.getAttribute("data-fw-classes")).not.toContain("consumer-class");
  });

  it("Stack: default align/justify classes are included even when not explicitly passed", () => {
    const { getByTestId } = renderWithTheme(<Stack data-testid="el" className="nav-list" />);
    const el = getByTestId("el");
    expect(el.getAttribute("data-fw-classes")).toBe("fw-Stack fw-align-stretch fw-justify-start");
    expect(el.getAttribute("data-fw-classes")).not.toContain("nav-list");
  });

  it("Row: default align/justify/wrap classes are included", () => {
    const { getByTestId } = renderWithTheme(<Row data-testid="el" />);
    expect(getByTestId("el").getAttribute("data-fw-classes")).toBe(
      "fw-Row fw-align-stretch fw-justify-start fw-Row--nowrap",
    );
  });

  it("Grid: only the base class by default; a dynamic class (align) is included when set", () => {
    const { getByTestId } = renderWithTheme(<Grid data-testid="el" align="center" />);
    expect(getByTestId("el").getAttribute("data-fw-classes")).toBe("fw-Grid fw-align-center");
  });

  it("ScrollArea: structural + dynamic classes, including the conditional 'fw-grow'", () => {
    const { getByTestId } = renderWithTheme(
      <ScrollArea data-testid="el" direction="horizontal" overscroll="contain" grow />,
    );
    expect(getByTestId("el").getAttribute("data-fw-classes")).toBe(
      "fw-ScrollArea fw-ScrollArea--horizontal fw-overscroll-contain fw-grow",
    );
  });

  it("Sticky: its one static class", () => {
    const { getByTestId } = renderWithTheme(<Sticky data-testid="el" />);
    expect(getByTestId("el").getAttribute("data-fw-classes")).toBe("fw-Sticky");
  });

  it("Overlay (root): its one static class", () => {
    const { getByTestId } = renderWithTheme(<Overlay data-testid="el" />);
    expect(getByTestId("el").getAttribute("data-fw-classes")).toBe("fw-Overlay");
  });

  it("Overlay.Item: base class plus the anchor+placement class", () => {
    const { getByTestId } = renderWithTheme(
      <Overlay>
        <Overlay.Item data-testid="el" anchor="top-end" placement="edge" />
      </Overlay>,
    );
    expect(getByTestId("el").getAttribute("data-fw-classes")).toBe(
      "fw-OverlayItem fw-anchor-top-end--edge",
    );
  });
});

describe("data-fw-classes: consumer className is always excluded, always still rendered", () => {
  it("a consumer className renders in the actual DOM class list but never in data-fw-classes", () => {
    const { getByTestId } = renderWithTheme(
      <Box data-testid="el" className="navigation-item active" />,
    );
    const el = getByTestId("el");
    expect(el.classList.contains("navigation-item")).toBe(true);
    expect(el.classList.contains("active")).toBe(true);
    const frameworkClasses = el.getAttribute("data-fw-classes")?.split(" ") ?? [];
    expect(frameworkClasses).not.toContain("navigation-item");
    expect(frameworkClasses).not.toContain("active");
  });
});

describe("data-fw-classes: recipes never fabricate a framework class", () => {
  it("a recipe's data-fw-classes equals only its underlying primitive's own classes; the recipe identity stays in data-fw-recipe", () => {
    const Card = defineRecipe(Box, { name: "Card", base: { padding: "card" } });
    const { getByTestId } = renderWithTheme(<Card data-testid="el" className="special-card" />);
    const el = getByTestId("el");
    expect(el.getAttribute("data-fw-classes")).toBe("fw-Box");
    expect(el.getAttribute("data-fw-recipe")).toBe("Card");
    expect(el.classList.contains("special-card")).toBe(true);
    expect(el.getAttribute("data-fw-classes")).not.toContain("special-card");
    expect(el.getAttribute("data-fw-classes")).not.toContain("Card");
  });
});

describe("data-fw-classes: reserved-attribute collision protection", () => {
  it("warns and the framework's own value wins when a consumer passes data-fw-classes directly", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { getByTestId } = renderWithTheme(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- deliberately bypassing the public prop type for this test
      (<Box data-testid="el" {...({ "data-fw-classes": "fake-class" } as any)} />) as never,
    );
    const el = getByTestId("el");
    expect(el.getAttribute("data-fw-classes")).toBe("fw-Box");
    expect(warn).toHaveBeenCalled();
    const message = warn.mock.calls.map((c) => c[0] as string).find((m) => m.includes("Box"));
    expect(message).toContain("data-fw-classes");
    warn.mockRestore();
  });
});

describe("data-fw-classes: production", () => {
  let originalEnv: string | undefined;

  beforeEach(() => {
    originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  it("is absent in production, and does not change the actual rendered classes", () => {
    const { getByTestId } = render(
      <ThemeProvider theme={createTheme()}>
        <Box data-testid="el" grow className="consumer-class" />
      </ThemeProvider>,
    );
    const el = getByTestId("el");
    expect(el.hasAttribute("data-fw-classes")).toBe(false);
    expect(el.className).toContain("fw-Box");
    expect(el.className).toContain("fw-grow");
    expect(el.className).toContain("consumer-class");
  });
});

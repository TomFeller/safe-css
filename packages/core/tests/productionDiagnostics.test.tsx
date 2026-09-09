import { createRef } from "react";
import { describe, expect, it, vi, afterEach, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { Box, ThemeProvider, createTheme, defineRecipe } from "../src";

/**
 * A focused, consolidated check that nothing in this package produces
 * console diagnostics under a production configuration by default. Each
 * individual feature already has its own `diagnostics="off"` coverage
 * elsewhere; this file specifically exercises the *default* (no explicit
 * `diagnostics` prop) path under a simulated production build, which is
 * what a real deployed app actually gets - see docs/architecture.md#diagnostics.
 *
 * `process.env.NODE_ENV` is what `isDevelopmentBuild()`/`defaultDiagnosticsMode()`
 * actually read (see `src/diagnostics/env.ts`); flipping it here is the
 * standard way to simulate "this is a production build" in a test.
 */
describe("production-mode diagnostics: silent by default", () => {
  let originalEnv: string | undefined;

  beforeEach(() => {
    originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  it("missing ThemeProvider produces no warning", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    render(<Box padding="card" />);
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it("an invalid token produces no warning", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    render(
      <ThemeProvider theme={createTheme()}>
        <Box padding={"not-a-real-token" as never} />
      </ThemeProvider>,
    );
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it("suspicious unsafeCss (margin, z-index) produces no warning", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    render(
      <ThemeProvider theme={createTheme()}>
        <Box unsafeCss={{ margin: 8, zIndex: 99999 }} />
      </ThemeProvider>,
    );
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it("a recipe variant collision produces no warning", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const Card = defineRecipe(Box, {
      name: "Card",
      variants: {
        size: { large: { padding: "section" } },
        density: { compact: { padding: "control" } },
      },
    });
    render(
      <ThemeProvider theme={createTheme()}>
        <Card size="large" density="compact" />
      </ThemeProvider>,
    );
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it("a consumer-supplied reserved data-fw-* attribute produces no warning in production", () => {
    // In production, safe-css doesn't compute its own data-fw-* metadata at
    // all (see debugAttributes' isDevelopmentBuild() early return) - so
    // there's nothing for a consumer-supplied `data-fw-primitive` to collide
    // with, and it passes through untouched, like any other custom data
    // attribute would. The "reserved namespace" guarantee (framework value
    // always wins) is specifically a *development* concern, matching where
    // the metadata itself exists - see docs/architecture.md#future-traceability.
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { getByTestId } = render(
      <ThemeProvider theme={createTheme()}>
        <Box data-testid="el" data-fw-primitive="Banana" />
      </ThemeProvider>,
    );
    expect(warn).not.toHaveBeenCalled();
    expect(getByTestId("el").getAttribute("data-fw-primitive")).toBe("Banana");
    warn.mockRestore();
  });

  it("does not strip genuine runtime correctness: framework metadata attributes are simply omitted, not broken", () => {
    // Diagnostics/metadata being off in production must never be confused
    // with breaking functional behavior - the element still renders exactly
    // as it would in development, just without the dev-only data-fw-* trace.
    const { getByTestId } = render(
      <ThemeProvider theme={createTheme()}>
        <Box data-testid="el" padding="card" background="surface" />
      </ThemeProvider>,
    );
    const el = getByTestId("el");
    expect(el.style.padding).toBe("var(--fw-space-card)");
    expect(el.style.backgroundColor).toBe("var(--fw-color-surface)");
  });

  it("an instance override suppressing a recipe's interactive state produces no warning", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const Button = defineRecipe(Box, {
      name: "Button",
      base: { background: "action" },
      states: { hover: { background: "surfaceRaised" } },
    });
    render(
      <ThemeProvider theme={createTheme()}>
        <Button background="danger" />
      </ThemeProvider>,
    );
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it("unsafeCss suppressing a recipe's interactive state produces no warning", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const Button = defineRecipe(Box, {
      name: "Button",
      base: { background: "action" },
      states: { hover: { background: "surfaceRaised" } },
    });
    render(
      <ThemeProvider theme={createTheme()}>
        <Button unsafeCss={{ backgroundColor: "red" }} />
      </ThemeProvider>,
    );
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it("an instance with an explicit ref still gets the full bridge and no warning, in production", () => {
    // A ref is not a styling decision - passing one must never change
    // whether interaction-state styling applies, in development or
    // production.
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const Button = defineRecipe(Box, {
      name: "Button",
      base: { background: "action" },
      states: { hover: { background: "surfaceRaised" } },
    });
    const ref = createRef<HTMLDivElement>();
    const { getByTestId } = render(
      <ThemeProvider theme={createTheme()}>
        <Button ref={ref} data-testid="el" />
      </ThemeProvider>,
    );
    expect(warn).not.toHaveBeenCalled();
    expect(ref.current).toBe(getByTestId("el"));
    expect(getByTestId("el").style.backgroundColor).toBe(
      "var(--fw-state-hover-background, var(--fw-color-action))",
    );
    expect(getByTestId("el").hasAttribute("data-fw-state-tokens")).toBe(false);
    warn.mockRestore();
  });

  it("an unknown state token produces no warning", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const Button = defineRecipe(Box, {
      name: "Button",
      states: { hover: { background: "typo" as never } },
    });
    render(
      <ThemeProvider theme={createTheme()}>
        <Button />
      </ThemeProvider>,
    );
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it("does not emit data-fw-state-tokens (or any other new dev metadata)", () => {
    const Button = defineRecipe(Box, {
      name: "Button",
      base: { background: "action" },
      states: {
        hover: { background: "surfaceRaised" },
        focusVisible: { border: "strong" },
        active: { background: "danger" },
      },
    });
    const { getByTestId } = render(
      <ThemeProvider theme={createTheme()}>
        <Button data-testid="el">Go</Button>
      </ThemeProvider>,
    );
    const el = getByTestId("el");
    expect(el.hasAttribute("data-fw-state-tokens")).toBe(false);
    expect(el.hasAttribute("data-fw-tokens")).toBe(false);
    expect(el.hasAttribute("data-fw-primitive")).toBe(false);
    expect(el.hasAttribute("data-fw-recipe")).toBe(false);
  });

  it("still renders the correct, fully functional bridge inline styles in production", () => {
    // Diagnostics/metadata are dev-only; the actual interactive-state CSS
    // output is real, functional behavior and must be identical in
    // production.
    const Button = defineRecipe(Box, {
      name: "Button",
      base: { background: "action" },
      states: { hover: { background: "surfaceRaised" } },
    });
    const { getByTestId } = render(
      <ThemeProvider theme={createTheme()}>
        <Button data-testid="el">Go</Button>
      </ThemeProvider>,
    );
    const el = getByTestId("el");
    expect(el.style.backgroundColor).toBe(
      "var(--fw-state-hover-background, var(--fw-color-action))",
    );
    expect(el.style.getPropertyValue("--fw-state-hover-background-value")).toBe(
      "var(--fw-color-surfaceRaised)",
    );
  });
});

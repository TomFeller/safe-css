import { describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import { Box, ThemeProvider, createTheme } from "../src";
import { themeToCssVariables } from "../src/theme/cssVariables";

// The built-in default theme isn't part of the public API - reach into the
// module directly so this test can assert against it.
import { defaultTheme as defaultThemeInternal } from "../src/theme/defaultTheme";

describe("createTheme", () => {
  it("returns the full built-in theme when called with no arguments", () => {
    const theme = createTheme();
    expect(theme).toEqual(defaultThemeInternal);
  });

  it("merges partial input over the defaults, per category", () => {
    const theme = createTheme({ colors: { action: "#ff0000" } });
    expect(theme.colors.action).toBe("#ff0000");
    // Sibling tokens in the same category are untouched.
    expect(theme.colors.danger).toBe(defaultThemeInternal.colors.danger);
    // Other categories are untouched entirely.
    expect(theme.space).toEqual(defaultThemeInternal.space);
  });

  it("does not mutate the built-in default theme", () => {
    createTheme({ colors: { action: "#000000" } });
    expect(defaultThemeInternal.colors.action).not.toBe("#000000");
  });
});

describe("themeToCssVariables", () => {
  it("produces --fw-<category>-<token> variables for every token", () => {
    const vars = themeToCssVariables(createTheme());
    expect(vars["--fw-space-card"]).toBe("16px");
    expect(vars["--fw-color-surface"]).toBe("#ffffff");
    expect(vars["--fw-radius-pill"]).toBe("999px");
    expect(vars["--fw-size-sidebar"]).toBe("280px");
    expect(vars["--fw-layer-modal"]).toBe("30");
  });

  it("maps the 'colors' category to the singular '--fw-color-*' prefix", () => {
    const vars = themeToCssVariables(createTheme());
    expect(vars).not.toHaveProperty("--fw-colors-surface");
    expect(vars).toHaveProperty("--fw-color-surface");
  });
});

describe("ThemeProvider", () => {
  it("publishes the theme as CSS custom properties on its wrapper element", () => {
    const theme = createTheme({ space: { card: "20px" } });
    const { container } = render(
      <ThemeProvider theme={theme}>
        <div>content</div>
      </ThemeProvider>,
    );
    const root = container.querySelector("[data-fw-theme-root]") as HTMLElement;
    expect(root).toBeTruthy();
    expect(root.style.getPropertyValue("--fw-space-card")).toBe("20px");
  });

  it("does not introduce a layout box (display: contents)", () => {
    const { container } = render(
      <ThemeProvider theme={createTheme()}>
        <div>content</div>
      </ThemeProvider>,
    );
    const root = container.querySelector("[data-fw-theme-root]") as HTMLElement;
    expect(root.style.display).toBe("contents");
  });

  it("propagates a theme change to every consumer via the CSS variable, not a hardcoded value", () => {
    const theme1 = createTheme({ radius: { card: "12px" } });
    const theme2 = createTheme({ radius: { card: "24px" } });

    const { rerender, getByTestId } = render(
      <ThemeProvider theme={theme1}>
        <Box data-testid="card" radius="card" />
      </ThemeProvider>,
    );

    const el = getByTestId("card");
    // The element only ever holds a var() reference - the actual value lives
    // on the ThemeProvider wrapper, so re-rendering with a new theme updates
    // every consumer without each consumer needing to know a theme changed.
    expect(el.style.borderRadius).toBe("var(--fw-radius-card)");

    rerender(
      <ThemeProvider theme={theme2}>
        <Box data-testid="card" radius="card" />
      </ThemeProvider>,
    );

    const root = getByTestId("card").closest("[data-fw-theme-root]") as HTMLElement;
    expect(root.style.getPropertyValue("--fw-radius-card")).toBe("24px");
  });
});

describe("invalid token handling", () => {
  it("warns once when an unknown space token is used, and still emits a var() reference", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { getByTestId } = render(
      <ThemeProvider theme={createTheme()} diagnostics="warn">
        <Box data-testid="el" padding={"foobar" as never} />
      </ThemeProvider>,
    );

    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0]?.[0]).toContain('Unknown space token "foobar"');
    // Fails safe: no invented pixel value, just an unresolved CSS variable reference.
    expect(getByTestId("el").style.padding).toBe("var(--fw-space-foobar)");

    warn.mockRestore();
  });

  it("does not warn when diagnostics is off", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    render(
      <ThemeProvider theme={createTheme()} diagnostics="off">
        <Box padding={"foobar" as never} />
      </ThemeProvider>,
    );
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it("warns at most once for the same invalid token + component + prop", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    render(
      <ThemeProvider theme={createTheme()} diagnostics="warn">
        <Box padding={"foobar" as never} />
        <Box padding={"foobar" as never} />
        <Box padding={"foobar" as never} />
      </ThemeProvider>,
    );
    expect(warn).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });
});

describe("missing ThemeProvider", () => {
  it("warns when a primitive renders without a ThemeProvider ancestor", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    render(<Box padding="card" />);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0]?.[0]).toContain("without a <ThemeProvider>");
    warn.mockRestore();
  });
});

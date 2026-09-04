import { describe, expect, it, vi } from "vitest";
import { memo } from "react";
import { render } from "@testing-library/react";
import { ThemeProvider, createTheme, type Theme } from "../src";
import { useTokenResolver } from "../src/style/useResolvedToken";
import { tokenNameSignature } from "../src/theme/tokenIndex";

/**
 * `Probe` takes no props, so `React.memo` bails out on a re-render unless a
 * context it actually subscribes to (via `useTokenResolver`) produces a new
 * value. This is the standard, reliable way to prove a context update was
 * skipped - not a fragile "count renders and hope" approach.
 */
function useProbe(renderSpy: () => void) {
  renderSpy();
  useTokenResolver("Probe");
}

describe("ThemeProvider render architecture", () => {
  it("a value-only theme change (same token names, different values) does not re-render a memoized descendant", () => {
    const renderSpy = vi.fn();
    const Probe = memo(function Probe() {
      useProbe(renderSpy);
      return <div data-testid="probe" />;
    });

    function Harness({ theme }: { theme: Theme }) {
      return (
        <ThemeProvider theme={theme}>
          <Probe />
        </ThemeProvider>
      );
    }

    const theme1 = createTheme({ space: { card: "16px" } });
    const theme2 = createTheme({ space: { card: "20px" } }); // same keys, different value

    const { rerender } = render(<Harness theme={theme1} />);
    expect(renderSpy).toHaveBeenCalledTimes(1);

    rerender(<Harness theme={theme2} />);
    expect(renderSpy).toHaveBeenCalledTimes(1); // still 1 - no extra render
  });

  it("a diagnostics mode change does re-render subscribed descendants", () => {
    const renderSpy = vi.fn();
    const Probe = memo(function Probe() {
      useProbe(renderSpy);
      return <div data-testid="probe" />;
    });

    function Harness({ diagnostics }: { diagnostics: "warn" | "off" }) {
      return (
        <ThemeProvider theme={createTheme()} diagnostics={diagnostics}>
          <Probe />
        </ThemeProvider>
      );
    }

    const { rerender } = render(<Harness diagnostics="warn" />);
    expect(renderSpy).toHaveBeenCalledTimes(1);

    rerender(<Harness diagnostics="off" />);
    expect(renderSpy).toHaveBeenCalledTimes(2);
  });

  it("adding/removing a token name (a real shape change) does re-render subscribed descendants", () => {
    const renderSpy = vi.fn();
    const Probe = memo(function Probe() {
      useProbe(renderSpy);
      return <div data-testid="probe" />;
    });

    function Harness({ theme }: { theme: Theme }) {
      return (
        <ThemeProvider theme={theme}>
          <Probe />
        </ThemeProvider>
      );
    }

    const theme1 = createTheme();
    // Simulates an augmented theme with an extra token name.
    const theme2: Theme = { ...theme1, space: { ...theme1.space, xl: "40px" } as Theme["space"] };

    const { rerender } = render(<Harness theme={theme1} />);
    expect(renderSpy).toHaveBeenCalledTimes(1);

    rerender(<Harness theme={theme2} />);
    expect(renderSpy).toHaveBeenCalledTimes(2);
  });
});

describe("tokenNameSignature: order independence", () => {
  it("produces the same signature for the same token names regardless of category insertion order", () => {
    const theme = createTheme();

    // Same categories, same tokens within each, but the *category* keys are
    // enumerated in reverse order - simulates a theme object built by a
    // different sequence of spreads than `defaultTheme`'s own declaration order.
    const reorderedCategories: Theme = {
      layer: theme.layer,
      shadow: theme.shadow,
      border: theme.border,
      size: theme.size,
      radius: theme.radius,
      space: theme.space,
      colors: theme.colors,
    };

    expect(tokenNameSignature(reorderedCategories)).toBe(tokenNameSignature(theme));
  });

  it("produces the same signature for the same token names regardless of within-category insertion order", () => {
    const theme = createTheme();

    const reorderedSpace: Theme = {
      ...theme,
      space: {
        page: theme.space.page,
        section: theme.space.section,
        card: theme.space.card,
        element: theme.space.element,
        control: theme.space.control,
        none: theme.space.none,
      },
    };

    expect(tokenNameSignature(reorderedSpace)).toBe(tokenNameSignature(theme));
  });

  it("still produces a different signature when the actual token names differ", () => {
    const theme1 = createTheme();
    const theme2: Theme = { ...theme1, space: { ...theme1.space, xl: "40px" } as Theme["space"] };

    expect(tokenNameSignature(theme1)).not.toBe(tokenNameSignature(theme2));
  });

  it("end-to-end: a theme with the same token names built in a different order does not re-render a subscribed descendant", () => {
    const renderSpy = vi.fn();
    const Probe = memo(function Probe() {
      useProbe(renderSpy);
      return <div data-testid="probe" />;
    });

    function Harness({ theme }: { theme: Theme }) {
      return (
        <ThemeProvider theme={theme}>
          <Probe />
        </ThemeProvider>
      );
    }

    const theme1 = createTheme();
    // Same token names as theme1, rebuilt with categories/keys in a
    // different order and (deliberately) different values too, to prove
    // this is about *names*, not values, matching the other tests above.
    const theme2: Theme = {
      layer: theme1.layer,
      shadow: theme1.shadow,
      border: theme1.border,
      size: theme1.size,
      radius: theme1.radius,
      colors: theme1.colors,
      space: {
        page: theme1.space.page,
        section: theme1.space.section,
        card: "999px",
        element: theme1.space.element,
        control: theme1.space.control,
        none: theme1.space.none,
      },
    };

    const { rerender } = render(<Harness theme={theme1} />);
    expect(renderSpy).toHaveBeenCalledTimes(1);

    rerender(<Harness theme={theme2} />);
    expect(renderSpy).toHaveBeenCalledTimes(1); // still 1 - same names, just reordered + revalued
  });
});

import { describe, expect, it, vi } from "vitest";
import { memo } from "react";
import { render } from "@testing-library/react";
import { ThemeProvider, createTheme, type Theme } from "../src";
import { useTokenResolver } from "../src/style/useResolvedToken";

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

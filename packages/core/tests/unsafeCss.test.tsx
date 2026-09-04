import { describe, expect, it, vi } from "vitest";
import { Box } from "../src";
import { renderWithTheme } from "./test-utils";

describe("unsafeCss", () => {
  it("has the highest precedence of any style source, overriding a token-driven value", () => {
    const { getByTestId } = renderWithTheme(
      <Box data-testid="el" background="surface" unsafeCss={{ background: "red" }} />,
    );
    expect(getByTestId("el").style.background).toBe("red");
  });

  it("does not affect properties it doesn't mention", () => {
    const { getByTestId } = renderWithTheme(
      <Box data-testid="el" padding="card" unsafeCss={{ transform: "rotate(2deg)" }} />,
    );
    const el = getByTestId("el");
    expect(el.style.padding).toBe("var(--fw-space-card)");
    expect(el.style.transform).toBe("rotate(2deg)");
  });

  it("is reported to dev diagnostics as untracked/custom CSS", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    renderWithTheme(<Box unsafeCss={{ padding: 13 }} />);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0]?.[0]).toContain("Custom CSS detected");
    expect(warn.mock.calls[0]?.[0]).toContain("padding: 13px");
    warn.mockRestore();
  });

  it("does not warn when diagnostics is off", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    renderWithTheme(<Box unsafeCss={{ padding: 13 }} />, { diagnostics: "off" });
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it("does not warn at all when unsafeCss is not used", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    renderWithTheme(<Box padding="card" background="surface" />);
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });
});

import { describe, expect, it, vi } from "vitest";
import { Box } from "../src";
import { renderWithTheme } from "./test-utils";

describe("unsafeCss precedence", () => {
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
});

describe("unsafeCss diagnostics: harmless usage stays silent", () => {
  it("does not warn at all when unsafeCss is not used", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    renderWithTheme(<Box padding="card" background="surface" />);
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it("does not warn for cursor/font - the spec's own 'good' example", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    renderWithTheme(<Box unsafeCss={{ cursor: "pointer", font: "inherit" }} />);
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it("does not warn for a decorative transform", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    renderWithTheme(<Box unsafeCss={{ transform: "rotate(2deg)" }} />);
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it("does not warn for fontSize/fontWeight/textTransform (no semantic token exists for them)", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    renderWithTheme(
      <Box unsafeCss={{ fontSize: 13, fontWeight: 600, textTransform: "uppercase" }} />,
    );
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it("does not warn when diagnostics is off, even for suspicious props", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    renderWithTheme(<Box unsafeCss={{ margin: 8, zIndex: 999 }} />, { diagnostics: "off" });
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });
});

describe("unsafeCss diagnostics: suspicious usage warns actionably", () => {
  it("warns on a margin property and points at `gap`", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    renderWithTheme(<Box unsafeCss={{ marginLeft: 17 }} />);
    expect(warn).toHaveBeenCalledTimes(1);
    const message = warn.mock.calls[0]?.[0] as string;
    expect(message).toContain("marginLeft");
    expect(message).toContain("gap");
    warn.mockRestore();
  });

  it("warns on a raw z-index and points at the `layer` token", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    renderWithTheme(<Box unsafeCss={{ zIndex: 99999 }} />);
    expect(warn).toHaveBeenCalledTimes(1);
    const message = warn.mock.calls[0]?.[0] as string;
    expect(message).toContain("zIndex");
    expect(message).toContain("layer");
    warn.mockRestore();
  });

  it("warns on a raw layout/positioning property and names a primitive alternative", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    renderWithTheme(<Box unsafeCss={{ position: "absolute" }} />);
    expect(warn).toHaveBeenCalledTimes(1);
    const message = warn.mock.calls[0]?.[0] as string;
    expect(message).toContain("position");
    expect(message).toContain("Sticky");
    warn.mockRestore();
  });

  it("warns on an arbitrary spacing magic number that has a token equivalent", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    renderWithTheme(<Box unsafeCss={{ padding: 13 }} />);
    expect(warn).toHaveBeenCalledTimes(1);
    const message = warn.mock.calls[0]?.[0] as string;
    expect(message).toContain("padding");
    expect(message).toContain("token");
    warn.mockRestore();
  });

  it("warns on an arbitrary theme-like value (raw color) but not on a safe keyword", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    renderWithTheme(<Box unsafeCss={{ color: "#ff0000" }} />);
    expect(warn).toHaveBeenCalledTimes(1);
    warn.mockClear();

    renderWithTheme(<Box unsafeCss={{ border: "none" }} />);
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it("does not warn on a var() reference for a theme-like property", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    renderWithTheme(<Box unsafeCss={{ color: "var(--fw-color-danger)" }} />);
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it("warns once per suspicious property, not once per unsafeCss object", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    renderWithTheme(<Box unsafeCss={{ margin: 8, zIndex: 5, cursor: "pointer" }} />);
    // margin + zIndex are suspicious, cursor is not
    expect(warn).toHaveBeenCalledTimes(2);
    warn.mockRestore();
  });

  it("does not spam: repeated identical suspicious usage warns only once", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    renderWithTheme(
      <>
        <Box unsafeCss={{ margin: 8 }} />
        <Box unsafeCss={{ margin: 8 }} />
        <Box unsafeCss={{ margin: 8 }} />
      </>,
    );
    expect(warn).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });
});

describe("unsafeCss numeric value formatting in diagnostics", () => {
  it("formats a pixel-like property with a px suffix", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    renderWithTheme(<Box unsafeCss={{ padding: 13 }} />);
    expect(warn.mock.calls[0]?.[0]).toContain("padding: 13px");
    warn.mockRestore();
  });

  it("does not append px to a unitless property (zIndex)", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    renderWithTheme(<Box unsafeCss={{ zIndex: 999 }} />);
    const message = warn.mock.calls[0]?.[0] as string;
    expect(message).toContain("zIndex: 999");
    expect(message).not.toContain("999px");
    warn.mockRestore();
  });
});

describe("unsafeCss dev metadata", () => {
  it("always records unsafeCss usage via data-fw-unsafe-css, regardless of whether it warned", () => {
    const { getByTestId } = renderWithTheme(
      <Box data-testid="el" unsafeCss={{ cursor: "pointer" }} />,
    );
    expect(getByTestId("el").getAttribute("data-fw-unsafe-css")).toBe("1");
  });

  it("counts every property passed via unsafeCss", () => {
    const { getByTestId } = renderWithTheme(
      <Box data-testid="el" unsafeCss={{ cursor: "pointer", font: "inherit", fontWeight: 600 }} />,
    );
    expect(getByTestId("el").getAttribute("data-fw-unsafe-css")).toBe("3");
  });

  it("omits the attribute entirely when unsafeCss is not used", () => {
    const { getByTestId } = renderWithTheme(<Box data-testid="el" padding="card" />);
    expect(getByTestId("el").hasAttribute("data-fw-unsafe-css")).toBe(false);
  });

  it("still records metadata even when diagnostics is off (metadata != warnings)", () => {
    const { getByTestId } = renderWithTheme(<Box data-testid="el" unsafeCss={{ margin: 8 }} />, {
      diagnostics: "off",
    });
    expect(getByTestId("el").getAttribute("data-fw-unsafe-css")).toBe("1");
  });
});

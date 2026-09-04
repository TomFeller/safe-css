import { describe, expect, it } from "vitest";
import { createRef } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Box, ThemeProvider } from "../src";
import { renderWithTheme, testTheme } from "./test-utils";

describe("Box", () => {
  it("resolves token props to CSS variable references", () => {
    const { getByTestId } = renderWithTheme(
      <Box data-testid="el" padding="card" background="surface" color="text" radius="card" />,
    );
    const el = getByTestId("el");
    expect(el.style.padding).toBe("var(--fw-space-card)");
    expect(el.style.backgroundColor).toBe("var(--fw-color-surface)");
    expect(el.style.color).toBe("var(--fw-color-text)");
    expect(el.style.borderRadius).toBe("var(--fw-radius-card)");
  });

  it("resolves paddingInline/paddingBlock independently of padding", () => {
    const { getByTestId } = renderWithTheme(
      <Box data-testid="el" paddingInline="page" paddingBlock="section" />,
    );
    const el = getByTestId("el");
    expect(el.style.paddingInline).toBe("var(--fw-space-page)");
    expect(el.style.paddingBlock).toBe("var(--fw-space-section)");
  });

  it("treats border/shadow 'none' as a literal, not a token lookup", () => {
    // jsdom's CSSOM (unlike real browsers) rejects `border: none` as an
    // invalid shorthand value and silently drops it, so this asserts on the
    // server-rendered markup - React's own string serialization of the style
    // object - rather than jsdom's incomplete style reflection.
    const html = renderToStaticMarkup(
      <ThemeProvider theme={testTheme}>
        <Box border="none" shadow="none" />
      </ThemeProvider>,
    );
    expect(html).toContain("border:none");
    expect(html).toContain("box-shadow:none");
  });

  it("resolves border/shadow tokens when not 'none'", () => {
    const { getByTestId } = renderWithTheme(
      <Box data-testid="el" border="subtle" shadow="raised" />,
    );
    const el = getByTestId("el");
    expect(el.style.border).toBe("var(--fw-border-subtle)");
    expect(el.style.boxShadow).toBe("var(--fw-shadow-raised)");
  });

  describe("width/height aliases", () => {
    it("'full' becomes a static 100% width/height class, not an inline var", () => {
      const { getByTestId } = renderWithTheme(<Box data-testid="el" width="full" height="full" />);
      const el = getByTestId("el");
      expect(el.className).toContain("fw-w-full");
      expect(el.className).toContain("fw-h-full");
      expect(el.style.width).toBe("");
    });

    it("'fit' becomes a static fit-content class", () => {
      const { getByTestId } = renderWithTheme(<Box data-testid="el" width="fit" />);
      expect(getByTestId("el").className).toContain("fw-w-fit");
    });

    it("a SizeToken resolves to a var() reference on width/height", () => {
      const { getByTestId } = renderWithTheme(
        <Box data-testid="el" width="sidebar" height="control" />,
      );
      const el = getByTestId("el");
      expect(el.style.width).toBe("var(--fw-size-sidebar)");
      expect(el.style.height).toBe("var(--fw-size-control)");
    });

    it("resolves min/max width/height as SizeToken references", () => {
      const { getByTestId } = renderWithTheme(
        <Box
          data-testid="el"
          minWidth="control"
          maxWidth="content"
          minHeight="control"
          maxHeight="content"
        />,
      );
      const el = getByTestId("el");
      expect(el.style.minWidth).toBe("var(--fw-size-control)");
      expect(el.style.maxWidth).toBe("var(--fw-size-content)");
      expect(el.style.minHeight).toBe("var(--fw-size-control)");
      expect(el.style.maxHeight).toBe("var(--fw-size-content)");
    });
  });

  describe("grow/shrink", () => {
    it("grow applies flex-grow and the min-width/min-height:0 safety net", () => {
      const { getByTestId } = renderWithTheme(<Box data-testid="el" grow />);
      expect(getByTestId("el").className).toContain("fw-grow");
    });

    it("shrink=true and shrink=false map to distinct, explicit classes", () => {
      const render1 = renderWithTheme(<Box data-testid="el" shrink />);
      expect(render1.getByTestId("el").className).toContain("fw-shrink");
      expect(render1.getByTestId("el").className).not.toContain("fw-shrink-none");
      render1.unmount();

      const render2 = renderWithTheme(<Box data-testid="el" shrink={false} />);
      expect(render2.getByTestId("el").className).toContain("fw-shrink-none");
    });
  });

  it("never sets a margin style, on any prop combination", () => {
    const { getByTestId } = renderWithTheme(
      <Box
        data-testid="el"
        padding="card"
        paddingInline="page"
        paddingBlock="section"
        width="full"
        height="fit"
        grow
        shrink
      />,
    );
    expect(getByTestId("el").style.margin).toBe("");
  });

  it("supports the `as` prop for polymorphic rendering", () => {
    const { getByTestId } = renderWithTheme(<Box as="main" data-testid="el" />);
    expect(getByTestId("el").tagName).toBe("MAIN");
  });

  it("forwards refs to the underlying DOM element", () => {
    const ref = createRef<HTMLDivElement>();
    renderWithTheme(<Box ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  it("merges a caller-provided className with the generated classes", () => {
    const { getByTestId } = renderWithTheme(
      <Box data-testid="el" className="legacy-dashboard-item" padding="card" />,
    );
    const el = getByTestId("el");
    expect(el.className).toContain("legacy-dashboard-item");
    expect(el.className).toContain("fw-Box");
  });
});

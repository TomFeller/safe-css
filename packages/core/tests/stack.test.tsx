import { describe, expect, it } from "vitest";
import { Stack } from "../src";
import { renderWithTheme } from "./test-utils";

describe("Stack", () => {
  it("renders a vertical flex container by default", () => {
    const { getByTestId } = renderWithTheme(<Stack data-testid="el" />);
    const el = getByTestId("el");
    expect(el.className).toContain("fw-Stack");
    expect(el.tagName).toBe("DIV");
  });

  it("defaults align to stretch and justify to start", () => {
    const { getByTestId } = renderWithTheme(<Stack data-testid="el" />);
    const el = getByTestId("el");
    expect(el.className).toContain("fw-align-stretch");
    expect(el.className).toContain("fw-justify-start");
  });

  it("resolves gap to a space token var()", () => {
    const { getByTestId } = renderWithTheme(<Stack data-testid="el" gap="section" />);
    expect(getByTestId("el").style.gap).toBe("var(--fw-space-section)");
  });

  it.each(["start", "center", "end", "stretch"] as const)(
    "applies align=%s as a class",
    (align) => {
      const { getByTestId } = renderWithTheme(<Stack data-testid="el" align={align} />);
      expect(getByTestId("el").className).toContain(`fw-align-${align}`);
    },
  );

  it.each(["start", "center", "end", "between"] as const)(
    "applies justify=%s as a class",
    (justify) => {
      const { getByTestId } = renderWithTheme(<Stack data-testid="el" justify={justify} />);
      const expectedClass = justify === "between" ? "fw-justify-between" : `fw-justify-${justify}`;
      expect(getByTestId("el").className).toContain(expectedClass);
    },
  );

  it("supports height='full' for the classic full-height shell pattern", () => {
    const { getByTestId } = renderWithTheme(<Stack data-testid="el" height="full" />);
    expect(getByTestId("el").className).toContain("fw-h-full");
  });

  it("supports the `as` prop, e.g. rendering as <nav>", () => {
    const { getByTestId } = renderWithTheme(<Stack as="nav" data-testid="el" />);
    expect(getByTestId("el").tagName).toBe("NAV");
  });

  it("applies grow", () => {
    const { getByTestId } = renderWithTheme(<Stack data-testid="el" grow />);
    expect(getByTestId("el").className).toContain("fw-grow");
  });
});

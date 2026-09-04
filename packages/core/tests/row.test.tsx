import { describe, expect, it } from "vitest";
import { Row } from "../src";
import { renderWithTheme } from "./test-utils";

describe("Row", () => {
  it("renders a horizontal flex container", () => {
    const { getByTestId } = renderWithTheme(<Row data-testid="el" />);
    expect(getByTestId("el").className).toContain("fw-Row");
  });

  it("defaults to wrap='never' (fw-Row--nowrap)", () => {
    const { getByTestId } = renderWithTheme(<Row data-testid="el" />);
    const el = getByTestId("el");
    expect(el.className).toContain("fw-Row--nowrap");
    expect(el.className).not.toContain("fw-Row--wrap");
  });

  it("wrap='when-needed' relies on intrinsic flex-wrap, no breakpoint involved", () => {
    const { getByTestId } = renderWithTheme(<Row data-testid="el" wrap="when-needed" />);
    const el = getByTestId("el");
    expect(el.className).toContain("fw-Row--wrap");
    expect(el.className).not.toContain("fw-Row--nowrap");
  });

  it.each(["start", "center", "end", "stretch", "baseline"] as const)(
    "applies align=%s as a class",
    (align) => {
      const { getByTestId } = renderWithTheme(<Row data-testid="el" align={align} />);
      expect(getByTestId("el").className).toContain(`fw-align-${align}`);
    },
  );

  it.each(["start", "center", "end", "between", "around", "evenly"] as const)(
    "applies justify=%s as a class",
    (justify) => {
      const { getByTestId } = renderWithTheme(<Row data-testid="el" justify={justify} />);
      expect(getByTestId("el").className).toContain(`fw-justify-${justify}`);
    },
  );

  it("resolves gap to a space token var()", () => {
    const { getByTestId } = renderWithTheme(<Row data-testid="el" gap="control" />);
    expect(getByTestId("el").style.gap).toBe("var(--fw-space-control)");
  });

  it("has no public height prop (width only)", () => {
    // Type-level guarantee lives in tests/type-tests.ts; this just documents
    // the runtime shape stays consistent with it.
    const { getByTestId } = renderWithTheme(<Row data-testid="el" width="full" />);
    expect(getByTestId("el").className).toContain("fw-w-full");
  });
});

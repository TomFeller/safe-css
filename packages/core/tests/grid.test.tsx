import { describe, expect, it, vi } from "vitest";
import { Grid } from "../src";
import { renderWithTheme } from "./test-utils";

describe("Grid", () => {
  it("adaptive mode produces an auto-fit minmax() template referencing the size token", () => {
    const { getByTestId } = renderWithTheme(<Grid data-testid="el" minItemWidth="card" />);
    expect(getByTestId("el").style.gridTemplateColumns).toBe(
      "repeat(auto-fit, minmax(min(var(--fw-size-card), 100%), 1fr))",
    );
  });

  it("fixed mode applies a static fw-grid-cols-N class instead of inline style", () => {
    const { getByTestId } = renderWithTheme(<Grid data-testid="el" columns={3} />);
    const el = getByTestId("el");
    expect(el.className).toContain("fw-grid-cols-3");
    expect(el.style.gridTemplateColumns).toBe("");
  });

  it.each([1, 2, 3, 4, 5, 6, 12] as const)("supports columns=%i", (columns) => {
    const { getByTestId } = renderWithTheme(<Grid data-testid="el" columns={columns} />);
    expect(getByTestId("el").className).toContain(`fw-grid-cols-${columns}`);
  });

  it("resolves gap, rowGap, columnGap independently", () => {
    const { getByTestId } = renderWithTheme(
      <Grid data-testid="el" gap="card" rowGap="section" columnGap="control" />,
    );
    const el = getByTestId("el");
    expect(el.style.gap).toBe("var(--fw-space-card)");
    expect(el.style.rowGap).toBe("var(--fw-space-section)");
    expect(el.style.columnGap).toBe("var(--fw-space-control)");
  });

  it("warns (in dev diagnostics) when both columns and minItemWidth are supplied", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    renderWithTheme(
      // @ts-expect-error - intentionally testing the runtime-bypass case
      <Grid data-testid="el" columns={3} minItemWidth="card" />,
    );
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0]?.[0]).toContain("cannot use both `columns` and `minItemWidth`");
    warn.mockRestore();
  });

  it("prefers adaptive layout deterministically when both are supplied", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { getByTestId } = renderWithTheme(
      // @ts-expect-error - intentionally testing the runtime-bypass case
      <Grid data-testid="el" columns={3} minItemWidth="card" />,
    );
    const el = getByTestId("el");
    expect(el.style.gridTemplateColumns).toContain("auto-fit");
    expect(el.className).not.toContain("fw-grid-cols-3");
    warn.mockRestore();
  });
});

import { describe, expect, it } from "vitest";
import { ScrollArea } from "../src";
import { renderWithTheme } from "./test-utils";

describe("ScrollArea", () => {
  it("defaults to vertical scrolling with hidden horizontal overflow", () => {
    const { getByTestId } = renderWithTheme(<ScrollArea data-testid="el" />);
    const el = getByTestId("el");
    expect(el.className).toContain("fw-ScrollArea--vertical");
  });

  it("horizontal direction hides vertical overflow and allows horizontal", () => {
    const { getByTestId } = renderWithTheme(<ScrollArea data-testid="el" direction="horizontal" />);
    expect(getByTestId("el").className).toContain("fw-ScrollArea--horizontal");
  });

  it("'both' allows overflow in both axes", () => {
    const { getByTestId } = renderWithTheme(<ScrollArea data-testid="el" direction="both" />);
    expect(getByTestId("el").className).toContain("fw-ScrollArea--both");
  });

  it("always carries the min-width/min-height:0 safety net class, regardless of direction", () => {
    for (const direction of ["vertical", "horizontal", "both"] as const) {
      const { getByTestId, unmount } = renderWithTheme(
        <ScrollArea data-testid="el" direction={direction} />,
      );
      expect(getByTestId("el").className).toContain("fw-ScrollArea");
      unmount();
    }
  });

  it("overscroll='contain' applies the containment class", () => {
    const { getByTestId } = renderWithTheme(<ScrollArea data-testid="el" overscroll="contain" />);
    expect(getByTestId("el").className).toContain("fw-overscroll-contain");
  });

  it("grow lets it fill the remaining space of a flex/grid ancestor", () => {
    const { getByTestId } = renderWithTheme(<ScrollArea data-testid="el" grow />);
    // `fw-grow` sets flex-grow:1 *and* min-width/min-height:0 - the actual
    // fix for the classic "flex child won't scroll" bug.
    expect(getByTestId("el").className).toContain("fw-grow");
  });
});

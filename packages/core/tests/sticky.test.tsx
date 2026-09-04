import { describe, expect, it } from "vitest";
import { Sticky } from "../src";
import { renderWithTheme } from "./test-utils";

describe("Sticky", () => {
  it("defaults to edge='top' with offset='none' and layer='sticky'", () => {
    const { getByTestId } = renderWithTheme(<Sticky data-testid="el" />);
    const el = getByTestId("el");
    expect(el.className).toContain("fw-Sticky");
    expect(el.style.insetBlockStart).toBe("var(--fw-space-none)");
    expect(el.style.insetBlockEnd).toBe("");
    expect(el.style.zIndex).toBe("var(--fw-layer-sticky)");
  });

  it("edge='bottom' sets insetBlockEnd instead of insetBlockStart", () => {
    const { getByTestId } = renderWithTheme(<Sticky data-testid="el" edge="bottom" />);
    const el = getByTestId("el");
    expect(el.style.insetBlockEnd).toBe("var(--fw-space-none)");
    expect(el.style.insetBlockStart).toBe("");
  });

  it("resolves a custom offset token", () => {
    const { getByTestId } = renderWithTheme(<Sticky data-testid="el" offset="control" />);
    expect(getByTestId("el").style.insetBlockStart).toBe("var(--fw-space-control)");
  });

  it("resolves a custom layer token to z-index", () => {
    const { getByTestId } = renderWithTheme(<Sticky data-testid="el" layer="modal" />);
    expect(getByTestId("el").style.zIndex).toBe("var(--fw-layer-modal)");
  });
});

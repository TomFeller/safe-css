import { describe, expect, it } from "vitest";
import { Overlay } from "../src";
import { renderWithTheme } from "./test-utils";

describe("Overlay", () => {
  it("the root establishes the positioning context via a class, not an exposed `position` prop", () => {
    const { getByTestId } = renderWithTheme(<Overlay data-testid="root" />);
    expect(getByTestId("root").className).toContain("fw-Overlay");
  });

  it("Overlay.Item is absolutely positioned via a class", () => {
    const { getByTestId } = renderWithTheme(
      <Overlay>
        <Overlay.Item data-testid="item" anchor="top-end" />
      </Overlay>,
    );
    expect(getByTestId("item").className).toContain("fw-OverlayItem");
  });

  describe("anchor -> inset mapping (inside placement)", () => {
    it("top-start sets both inset-block-start and inset-inline-start", () => {
      const { getByTestId } = renderWithTheme(
        <Overlay>
          <Overlay.Item data-testid="item" anchor="top-start" />
        </Overlay>,
      );
      const el = getByTestId("item");
      expect(el.style.insetBlockStart).toBe("var(--fw-space-none)");
      expect(el.style.insetInlineStart).toBe("var(--fw-space-none)");
    });

    it("top-end uses inset-inline-end (logical, RTL-aware), not a physical 'right'", () => {
      const { getByTestId } = renderWithTheme(
        <Overlay>
          <Overlay.Item data-testid="item" anchor="top-end" />
        </Overlay>,
      );
      const el = getByTestId("item");
      expect(el.style.insetInlineEnd).toBe("var(--fw-space-none)");
      expect(el.style.insetInlineStart).toBe("");
    });

    it("center-anchors use a 50% inset on the centered axis", () => {
      const { getByTestId } = renderWithTheme(
        <Overlay>
          <Overlay.Item data-testid="item" anchor="center" />
        </Overlay>,
      );
      const el = getByTestId("item");
      expect(el.style.insetInlineStart).toBe("50%");
      expect(el.style.insetBlockStart).toBe("50%");
    });

    it("applies the anchor+placement class used for the (writing-direction-aware) transform", () => {
      const { getByTestId } = renderWithTheme(
        <Overlay>
          <Overlay.Item data-testid="item" anchor="top-end" placement="inside" />
        </Overlay>,
      );
      expect(getByTestId("item").className).toContain("fw-anchor-top-end--inside");
    });

    it("placement='edge' selects the edge-straddling class instead of the inside one", () => {
      const { getByTestId } = renderWithTheme(
        <Overlay>
          <Overlay.Item data-testid="item" anchor="top-end" placement="edge" />
        </Overlay>,
      );
      const el = getByTestId("item");
      expect(el.className).toContain("fw-anchor-top-end--edge");
      expect(el.className).not.toContain("fw-anchor-top-end--inside");
    });
  });

  it("resolves offset and layer tokens", () => {
    const { getByTestId } = renderWithTheme(
      <Overlay>
        <Overlay.Item data-testid="item" anchor="top-end" offset="control" layer="toast" />
      </Overlay>,
    );
    const el = getByTestId("item");
    expect(el.style.insetBlockStart).toBe("var(--fw-space-control)");
    expect(el.style.insetInlineEnd).toBe("var(--fw-space-control)");
    expect(el.style.zIndex).toBe("var(--fw-layer-toast)");
  });

  it("defaults to placement='inside', offset='none', layer='overlay'", () => {
    const { getByTestId } = renderWithTheme(
      <Overlay>
        <Overlay.Item data-testid="item" anchor="bottom-start" />
      </Overlay>,
    );
    const el = getByTestId("item");
    expect(el.className).toContain("fw-anchor-bottom-start--inside");
    expect(el.style.zIndex).toBe("var(--fw-layer-overlay)");
  });

  it("RTL correctness is delegated to CSS ([dir=rtl] attribute selectors), not JS direction detection", () => {
    // The component itself never reads document direction - it always emits
    // the same logical inset properties and the same class name regardless
    // of `dir`. The actual mirroring happens natively via the browser's
    // handling of `inset-inline-*` plus the `[dir="rtl"] .fw-anchor-*--edge`
    // rules in style/styles.css. This test documents that contract: the
    // class name for a given anchor+placement never changes with `dir`.
    const ltr = renderWithTheme(
      <div dir="ltr">
        <Overlay>
          <Overlay.Item data-testid="item" anchor="top-end" placement="edge" />
        </Overlay>
      </div>,
    );
    const ltrClass = ltr.getByTestId("item").className;
    ltr.unmount();

    const rtl = renderWithTheme(
      <div dir="rtl">
        <Overlay>
          <Overlay.Item data-testid="item" anchor="top-end" placement="edge" />
        </Overlay>
      </div>,
    );
    const rtlClass = rtl.getByTestId("item").className;

    expect(rtlClass).toBe(ltrClass);
    expect(rtlClass).toContain("fw-anchor-top-end--edge");
  });
});

import { createRef } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import { Overlay, ThemeProvider, createTheme } from "../src";
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

describe("Overlay.Item: independent axis offsets", () => {
  it("old behavior is unchanged: `offset` alone still applies to both non-centered axes", () => {
    const { getByTestId } = renderWithTheme(
      <Overlay>
        <Overlay.Item data-testid="item" anchor="top-end" offset="control" />
      </Overlay>,
    );
    const el = getByTestId("item");
    expect(el.style.insetBlockStart).toBe("var(--fw-space-control)");
    expect(el.style.insetInlineEnd).toBe("var(--fw-space-control)");
    expect(el.getAttribute("data-fw-tokens")).toBe("space.control layer.overlay");
  });

  it("inlineOffset alone: inline axis uses it, block axis falls back to the 'none' default", () => {
    const { getByTestId } = renderWithTheme(
      <Overlay>
        <Overlay.Item data-testid="item" anchor="top-end" inlineOffset="card" />
      </Overlay>,
    );
    const el = getByTestId("item");
    expect(el.style.insetInlineEnd).toBe("var(--fw-space-card)");
    expect(el.style.insetBlockStart).toBe("var(--fw-space-none)");
  });

  it("blockOffset alone: block axis uses it, inline axis falls back to the 'none' default", () => {
    const { getByTestId } = renderWithTheme(
      <Overlay>
        <Overlay.Item data-testid="item" anchor="top-end" blockOffset="section" />
      </Overlay>,
    );
    const el = getByTestId("item");
    expect(el.style.insetBlockStart).toBe("var(--fw-space-section)");
    expect(el.style.insetInlineEnd).toBe("var(--fw-space-none)");
  });

  it("offset + inlineOffset: inlineOffset overrides only the inline axis", () => {
    const { getByTestId } = renderWithTheme(
      <Overlay>
        <Overlay.Item data-testid="item" anchor="top-end" offset="control" inlineOffset="card" />
      </Overlay>,
    );
    const el = getByTestId("item");
    expect(el.style.insetInlineEnd).toBe("var(--fw-space-card)");
    expect(el.style.insetBlockStart).toBe("var(--fw-space-control)");
  });

  it("offset + blockOffset: blockOffset overrides only the block axis", () => {
    const { getByTestId } = renderWithTheme(
      <Overlay>
        <Overlay.Item data-testid="item" anchor="top-end" offset="control" blockOffset="element" />
      </Overlay>,
    );
    const el = getByTestId("item");
    expect(el.style.insetBlockStart).toBe("var(--fw-space-element)");
    expect(el.style.insetInlineEnd).toBe("var(--fw-space-control)");
  });

  it("offset + both axis-specific props: both axis props win, offset is entirely overridden", () => {
    const { getByTestId } = renderWithTheme(
      <Overlay>
        <Overlay.Item
          data-testid="item"
          anchor="top-end"
          offset="control"
          inlineOffset="card"
          blockOffset="element"
        />
      </Overlay>,
    );
    const el = getByTestId("item");
    expect(el.style.insetInlineEnd).toBe("var(--fw-space-card)");
    expect(el.style.insetBlockStart).toBe("var(--fw-space-element)");
  });

  it("two different axis-specific tokens both appear in data-fw-tokens", () => {
    const { getByTestId } = renderWithTheme(
      <Overlay>
        <Overlay.Item
          data-testid="item"
          anchor="top-end"
          inlineOffset="card"
          blockOffset="element"
        />
      </Overlay>,
    );
    const tokens = getByTestId("item").getAttribute("data-fw-tokens")?.split(" ");
    expect(tokens).toEqual(expect.arrayContaining(["space.card", "space.element"]));
  });

  it("the same token resolved on both axes is not duplicated in data-fw-tokens", () => {
    const { getByTestId } = renderWithTheme(
      <Overlay>
        <Overlay.Item data-testid="item" anchor="top-end" offset="control" />
      </Overlay>,
    );
    const el = getByTestId("item");
    const tokens = el.getAttribute("data-fw-tokens")?.split(" ") ?? [];
    expect(tokens.filter((t) => t === "space.control")).toHaveLength(1);
  });

  describe("centered axes", () => {
    it("top-center: blockOffset applies, inline axis stays centered at 50% with no offset dependency recorded", () => {
      const { getByTestId } = renderWithTheme(
        <Overlay>
          <Overlay.Item data-testid="item" anchor="top-center" blockOffset="card" />
        </Overlay>,
      );
      const el = getByTestId("item");
      expect(el.style.insetInlineStart).toBe("50%");
      expect(el.style.insetBlockStart).toBe("var(--fw-space-card)");
      expect(el.getAttribute("data-fw-tokens")).toBe("space.card layer.overlay");
    });

    it("center-end: inlineOffset applies, block axis stays centered at 50% with no offset dependency recorded", () => {
      const { getByTestId } = renderWithTheme(
        <Overlay>
          <Overlay.Item data-testid="item" anchor="center-end" inlineOffset="card" />
        </Overlay>,
      );
      const el = getByTestId("item");
      expect(el.style.insetBlockStart).toBe("50%");
      expect(el.style.insetInlineEnd).toBe("var(--fw-space-card)");
      expect(el.getAttribute("data-fw-tokens")).toBe("space.card layer.overlay");
    });

    it("center: both axes stay at 50%, and offset/inlineOffset/blockOffset never contribute a positioning dependency", () => {
      const { getByTestId } = renderWithTheme(
        <Overlay>
          <Overlay.Item
            data-testid="item"
            anchor="center"
            offset="control"
            inlineOffset="card"
            blockOffset="element"
          />
        </Overlay>,
      );
      const el = getByTestId("item");
      expect(el.style.insetInlineStart).toBe("50%");
      expect(el.style.insetBlockStart).toBe("50%");
      // Only layer.overlay - no space.* token, since both axes are centered.
      expect(el.getAttribute("data-fw-tokens")).toBe("layer.overlay");
    });
  });

  describe("centered-axis diagnostics", () => {
    it("warns once when inlineOffset is given on an anchor that centers the inline axis", () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      renderWithTheme(
        <Overlay>
          <Overlay.Item anchor="top-center" inlineOffset="card" />
        </Overlay>,
      );
      const message = warn.mock.calls
        .map((c) => c[0] as string)
        .find((m) => m.includes("inlineOffset"));
      expect(message).toBeDefined();
      expect(message).toContain("top-center");
      warn.mockRestore();
    });

    it("warns once when blockOffset is given on an anchor that centers the block axis", () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      renderWithTheme(
        <Overlay>
          <Overlay.Item anchor="center-start" blockOffset="card" />
        </Overlay>,
      );
      const message = warn.mock.calls
        .map((c) => c[0] as string)
        .find((m) => m.includes("blockOffset"));
      expect(message).toBeDefined();
      expect(message).toContain("center-start");
      warn.mockRestore();
    });

    it("does not warn for the general `offset` shorthand merely because one axis happens to be centered", () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      renderWithTheme(
        <Overlay>
          <Overlay.Item anchor="top-center" offset="card" />
        </Overlay>,
      );
      expect(warn).not.toHaveBeenCalled();
      warn.mockRestore();
    });

    it("does not warn when an axis-specific prop targets a non-centered axis", () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      renderWithTheme(
        <Overlay>
          <Overlay.Item anchor="top-end" inlineOffset="card" blockOffset="element" />
        </Overlay>,
      );
      expect(warn).not.toHaveBeenCalled();
      warn.mockRestore();
    });

    it("diagnostics='off' suppresses the centered-axis warning", () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      renderWithTheme(
        <Overlay>
          <Overlay.Item anchor="center" inlineOffset="card" />
        </Overlay>,
        { diagnostics: "off" },
      );
      expect(warn).not.toHaveBeenCalled();
      warn.mockRestore();
    });

    describe("production", () => {
      let originalEnv: string | undefined;

      beforeEach(() => {
        originalEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = "production";
      });

      afterEach(() => {
        process.env.NODE_ENV = originalEnv;
      });

      it("emits no warning in production for a centered-axis offset", () => {
        // `renderWithTheme` force-defaults `diagnostics="warn"` regardless of
        // NODE_ENV (a deliberate test-helper convenience), so a genuine
        // production check must go through a plain <ThemeProvider> instead,
        // whose own default (`defaultDiagnosticsMode()`) is production-aware -
        // matching the convention in productionDiagnostics.test.tsx.
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
        render(
          <ThemeProvider theme={createTheme()}>
            <Overlay>
              <Overlay.Item anchor="top-center" inlineOffset="card" />
            </Overlay>
          </ThemeProvider>,
        );
        expect(warn).not.toHaveBeenCalled();
        warn.mockRestore();
      });
    });
  });

  it("RTL: inlineOffset/blockOffset stay logical - the same anchor+placement class and computed inset values regardless of `dir`", () => {
    const ltr = renderWithTheme(
      <div dir="ltr">
        <Overlay>
          <Overlay.Item
            data-testid="item"
            anchor="top-end"
            placement="edge"
            inlineOffset="card"
            blockOffset="element"
          />
        </Overlay>
      </div>,
    );
    const ltrEl = ltr.getByTestId("item");
    const ltrClass = ltrEl.className;
    const ltrInlineEnd = ltrEl.style.insetInlineEnd;
    const ltrBlockStart = ltrEl.style.insetBlockStart;
    ltr.unmount();

    const rtl = renderWithTheme(
      <div dir="rtl">
        <Overlay>
          <Overlay.Item
            data-testid="item"
            anchor="top-end"
            placement="edge"
            inlineOffset="card"
            blockOffset="element"
          />
        </Overlay>
      </div>,
    );
    const rtlEl = rtl.getByTestId("item");

    expect(rtlEl.className).toBe(ltrClass);
    expect(rtlEl.style.insetInlineEnd).toBe(ltrInlineEnd);
    expect(rtlEl.style.insetBlockStart).toBe(ltrBlockStart);
  });

  it("polymorphic `as` and ref typing are unaffected by the new axis-specific props", () => {
    // A real `as="button"` swap plus a real ref, both alongside the new
    // inlineOffset/blockOffset props on the same instance - this is a
    // compile-time check as much as a runtime one: it would fail to build
    // if adding inlineOffset/blockOffset had narrowed or broken
    // OverlayItemProps' polymorphic/ref inference.
    const ref = createRef<HTMLButtonElement>();
    const { getByTestId } = renderWithTheme(
      <Overlay>
        <Overlay.Item
          as="button"
          ref={ref}
          data-testid="item"
          anchor="top-end"
          inlineOffset="card"
          blockOffset="element"
        />
      </Overlay>,
    );
    const el = getByTestId("item");
    expect(el.tagName).toBe("BUTTON");
    expect(ref.current).toBe(el);
  });
});

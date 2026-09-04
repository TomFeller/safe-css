import { afterEach, describe, expect, it } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { HighlightOverlay } from "../src/picker/HighlightOverlay";

let created: HTMLElement[] = [];

afterEach(() => {
  created.forEach((el) => el.remove());
  created = [];
});

function elAt(x: number, y: number, width = 10, height = 10): HTMLElement {
  const el = document.createElement("div");
  el.getBoundingClientRect = () => ({
    x,
    y,
    width,
    height,
    top: y,
    left: x,
    right: x + width,
    bottom: y + height,
    toJSON() {
      return this;
    },
  });
  document.body.appendChild(el);
  created.push(el);
  return el;
}

describe("HighlightOverlay", () => {
  it("renders nothing when there is no element", () => {
    const { container } = render(<HighlightOverlay element={null} label="" />);
    expect(container.innerHTML).toBe("");
  });

  it("eventually renders a box positioned at the element's measured rect", async () => {
    const el = elAt(10, 20, 100, 50);
    const { container } = render(<HighlightOverlay element={el} label="Box" />);

    await waitFor(() => {
      expect(container.querySelector(".fw-inspector-highlight")).not.toBeNull();
    });

    const box = container.querySelector(".fw-inspector-highlight") as HTMLElement;
    expect(box.style.top).toBe("20px");
    expect(box.style.left).toBe("10px");
    expect(box.style.width).toBe("100px");
    expect(box.style.height).toBe("50px");
  });

  it(
    "still renders the FINAL element's box after several rapid element changes, none of " +
      "which get a chance to fire their scheduled frame before the next change cancels it " +
      "(regression: cancelling a frame must also reset the pending-frame ref, or every " +
      "later schedule() silently no-ops, wedging the highlight in place forever)",
    async () => {
      const elA = elAt(0, 0);
      const elB = elAt(50, 50);
      const elC = elAt(100, 100, 30, 30);

      const { container, rerender } = render(<HighlightOverlay element={elA} label="A" />);
      // Same-tick re-renders, matching several pointermove events landing on
      // different elements faster than a single animation frame - the real
      // scenario that exposed this bug against the live demo app.
      rerender(<HighlightOverlay element={elB} label="B" />);
      rerender(<HighlightOverlay element={elC} label="C" />);

      await waitFor(() => {
        const box = container.querySelector(".fw-inspector-highlight");
        expect(box).not.toBeNull();
        expect((box as HTMLElement).style.left).toBe("100px");
      });

      expect(container.querySelector(".fw-inspector-highlight-label")?.textContent).toBe("C");
    },
  );

  it("clears the highlight once element becomes null again", async () => {
    const el = elAt(1, 1);
    const { container, rerender } = render(<HighlightOverlay element={el} label="X" />);

    await waitFor(() => {
      expect(container.querySelector(".fw-inspector-highlight")).not.toBeNull();
    });

    rerender(<HighlightOverlay element={null} label="X" />);
    expect(container.querySelector(".fw-inspector-highlight")).toBeNull();
  });
});

import { useEffect, useRef, useState } from "react";

export interface HighlightOverlayProps {
  element: HTMLElement | null;
  label: string;
  /**
   * `"hover"` (default) is the transient box shown while picking; `"selected"`
   * is the persistent box shown for as long as that element's panel stays
   * open. Purely a styling distinction (see `ui/styles.ts`) - the tracking
   * logic below is identical for both, and callers may render one of each
   * simultaneously (`component/SafeCssInspector.tsx` does, during re-pick).
   */
  variant?: "hover" | "selected";
}

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

function measure(element: HTMLElement): Rect {
  const rect = element.getBoundingClientRect();
  return { top: rect.top, left: rect.left, width: rect.width, height: rect.height };
}

/**
 * The hover highlight box + label shown while picking. Tracks `element`'s
 * position via `getBoundingClientRect()` rather than CSS layout, since the
 * highlight itself lives in the Inspector's own fixed overlay layer, not
 * in the app's own layout flow.
 *
 * Position updates are rAF-throttled and driven by a capture-phase
 * `scroll` listener (so scrolling *any* ancestor, not just the window,
 * is caught - e.g. an app's own `ScrollArea`), plus `resize` and a
 * `ResizeObserver` on the element itself. No polling, no `MutationObserver`
 * - deliberately, per the Inspector's lifecycle constraints.
 */
export function HighlightOverlay({ element, label, variant = "hover" }: HighlightOverlayProps) {
  const [rect, setRect] = useState<Rect | null>(null);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    // No need to clear `rect` here: the render below already returns `null`
    // whenever `element` is null, regardless of what `rect` still holds.
    if (!element) return;

    const update = () => {
      frameRef.current = null;
      setRect(measure(element));
    };

    const schedule = () => {
      if (frameRef.current !== null) return;
      frameRef.current = requestAnimationFrame(update);
    };

    schedule();

    window.addEventListener("scroll", schedule, { capture: true, passive: true });
    window.addEventListener("resize", schedule);

    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(schedule) : null;
    observer?.observe(element);

    return () => {
      // Resetting to `null` (not just cancelling) matters: `element` can
      // change again - e.g. rapidly, while the pointer sweeps across
      // several elements before settling - well before this pending frame
      // would have fired. Leaving a stale, already-cancelled id here would
      // make the next `schedule()` believe a frame is still in flight and
      // silently skip scheduling a new one, wedging the highlight in place
      // forever.
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
      window.removeEventListener("scroll", schedule, { capture: true });
      window.removeEventListener("resize", schedule);
      observer?.disconnect();
    };
  }, [element]);

  if (!element || !rect) return null;

  const labelAbove = rect.top > 24;

  const selected = variant === "selected";

  return (
    <div
      className={`fw-inspector-highlight${selected ? " selected" : ""}`}
      style={{ top: rect.top, left: rect.left, width: rect.width, height: rect.height }}
    >
      <span
        className={`fw-inspector-highlight-label ${labelAbove ? "above" : "below"}${selected ? " selected" : ""}`}
      >
        {label}
      </span>
    </div>
  );
}

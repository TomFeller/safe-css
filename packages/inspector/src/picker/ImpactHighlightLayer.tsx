import { useEffect, useRef, useState } from "react";
import type { ImpactKind } from "../impact/types";

export interface ImpactHighlightTarget {
  element: HTMLElement;
  kind: ImpactKind;
}

interface VisibleRect {
  key: number;
  kind: ImpactKind;
  top: number;
  left: number;
  width: number;
  height: number;
}

const VIEWPORT_MARGIN = 200;

function isNearViewport(rect: DOMRect): boolean {
  return (
    rect.bottom >= -VIEWPORT_MARGIN &&
    rect.right >= -VIEWPORT_MARGIN &&
    rect.top <= window.innerHeight + VIEWPORT_MARGIN &&
    rect.left <= window.innerWidth + VIEWPORT_MARGIN
  );
}

/**
 * A single centralized overlay layer for "Highlight affected" - not one
 * `HighlightOverlay` instance per affected element. A token can affect
 * hundreds or thousands of rendered elements; mounting that many
 * independently-measuring components would mean that many rAF callbacks
 * and effect subscriptions for elements the user can't even see. Instead
 * this measures every *candidate* element once per scroll/resize/mount,
 * culls anything not near the current viewport, and renders only the
 * overlays actually worth drawing - counts and analysis correctness are
 * entirely unaffected by this, since culling only changes what's *drawn*,
 * never what `analyzeImpact` counted.
 *
 * Same rAF-throttled, capture-phase scroll + resize update strategy as
 * `HighlightOverlay` - no polling, no `MutationObserver`.
 */
export function ImpactHighlightLayer({ targets }: { targets: ImpactHighlightTarget[] }) {
  const [rects, setRects] = useState<VisibleRect[]>([]);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    const measure = () => {
      frameRef.current = null;
      const next: VisibleRect[] = [];

      targets.forEach((target, index) => {
        if (!target.element.isConnected) return;
        const rect = target.element.getBoundingClientRect();
        if (!isNearViewport(rect)) return;
        next.push({
          key: index,
          kind: target.kind,
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
        });
      });

      setRects(next);
    };

    const schedule = () => {
      if (frameRef.current !== null) return;
      frameRef.current = requestAnimationFrame(measure);
    };

    schedule();

    window.addEventListener("scroll", schedule, { capture: true, passive: true });
    window.addEventListener("resize", schedule);

    return () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
      window.removeEventListener("scroll", schedule, { capture: true });
      window.removeEventListener("resize", schedule);
    };
  }, [targets]);

  return (
    <>
      {rects.map((rect) => (
        <div
          key={rect.key}
          className={`fw-inspector-impact-highlight ${rect.kind}`}
          style={{ top: rect.top, left: rect.left, width: rect.width, height: rect.height }}
        />
      ))}
    </>
  );
}

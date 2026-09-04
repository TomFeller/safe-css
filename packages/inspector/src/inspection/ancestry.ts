import { readPrimitive, readRecipe } from "./metadata";
import type { InspectorAncestor } from "../types";

/**
 * `Element.closest()` from a pointer event's target - this is the whole
 * picker-hit-testing story. No DOM scan, no traversal of the app's tree
 * ahead of time; a single native call per pointer move.
 */
export function findNearestInspectable(start: Element): HTMLElement | null {
  const found = start.closest("[data-fw-primitive]");
  return found instanceof HTMLElement ? found : null;
}

/**
 * Walks upward from `element`'s parent, collecting every DOM ancestor that
 * carries `data-fw-primitive`. Pure DOM ancestry, not React ownership - two
 * elements can be React-unrelated but DOM-nested (e.g. through `children`
 * passed down several component boundaries) and this still finds them,
 * which is exactly what "parents control relationships between children"
 * needs to be inspectable.
 *
 * Returned nearest-first (immediate safe-css parent at index 0); reverse it
 * for an outermost-first display, as the panel does.
 */
export function collectAncestry(element: HTMLElement): InspectorAncestor[] {
  const ancestry: InspectorAncestor[] = [];
  let current = element.parentElement;

  while (current) {
    if (current.hasAttribute("data-fw-primitive")) {
      ancestry.push({
        element: current,
        primitive: readPrimitive(current),
        recipe: readRecipe(current),
      });
    }
    current = current.parentElement;
  }

  return ancestry;
}

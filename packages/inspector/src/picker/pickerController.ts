import { findNearestInspectable } from "../inspection/ancestry";
import { isInspectorOwnNode } from "../internal/inspectorRoot";

export interface PickerCallbacks {
  onHover: (element: HTMLElement | null) => void;
  onSelect: (element: HTMLElement) => void;
  onCancel: () => void;
}

export interface PickerController {
  start: () => void;
  stop: () => void;
}

/**
 * A framework-agnostic, capture-phase DOM event controller for the picker.
 * Matches DevTools' own element-picker technique: listening on `document`
 * during the *capture* phase, ahead of any of the app's own listeners, so
 * `stopImmediatePropagation()` on click can reliably block the app from
 * reacting to what is really a picker interaction, regardless of how deep
 * in the tree the app's own handler is attached.
 *
 * Pure DOM + callbacks, no React - `picker/HighlightOverlay.tsx` and
 * `component/SafeCssInspector.tsx` own all rendering; this only decides
 * *what* is being hovered/selected/cancelled, and *when*.
 */
export function createPickerController(
  host: HTMLElement,
  callbacks: PickerCallbacks,
): PickerController {
  let active = false;
  let hovered: HTMLElement | null = null;

  function updateHover(next: HTMLElement | null): void {
    if (next === hovered) return;
    hovered = next;
    callbacks.onHover(next);
  }

  function targetFor(event: Event): HTMLElement | null {
    if (isInspectorOwnNode(event.target, host)) return null;
    if (!(event.target instanceof Element)) return null;
    return findNearestInspectable(event.target);
  }

  function handlePointerMove(event: PointerEvent): void {
    updateHover(targetFor(event));
  }

  function handleClick(event: MouseEvent): void {
    // Clicks landing inside the Inspector's own shadow tree (the launcher,
    // the Cancel affordance) are retargeted to `host` here - let them
    // proceed untouched so the Inspector's own UI keeps working.
    if (isInspectorOwnNode(event.target, host)) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    const target = targetFor(event);
    if (target) {
      callbacks.onSelect(target);
    } else {
      callbacks.onCancel();
    }
  }

  function handleKeyDown(event: KeyboardEvent): void {
    if (event.key === "Escape") {
      event.preventDefault();
      callbacks.onCancel();
    }
  }

  return {
    start() {
      if (active) return;
      active = true;
      document.addEventListener("pointermove", handlePointerMove, { capture: true });
      document.addEventListener("click", handleClick, { capture: true });
      document.addEventListener("keydown", handleKeyDown, { capture: true });
    },
    stop() {
      if (!active) return;
      active = false;
      document.removeEventListener("pointermove", handlePointerMove, { capture: true });
      document.removeEventListener("click", handleClick, { capture: true });
      document.removeEventListener("keydown", handleKeyDown, { capture: true });
      updateHover(null);
    },
  };
}

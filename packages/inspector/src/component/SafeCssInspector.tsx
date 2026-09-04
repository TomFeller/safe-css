import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { isDevelopmentBuild } from "../internal/env";
import {
  createInspectorRoot,
  destroyInspectorRoot,
  type InspectorRoot,
} from "../internal/inspectorRoot";
import { createPickerController } from "../picker/pickerController";
import { HighlightOverlay } from "../picker/HighlightOverlay";
import { describeElement } from "../inspection/metadata";
import { inspectElement } from "../inspection/inspectElement";
import { InspectorPanel } from "../ui/InspectorPanel";
import { INSPECTOR_STYLES } from "../ui/styles";
import type { InspectedElement } from "../types";

type InspectorState = "idle" | "picking" | "selected";

interface InspectorAppProps {
  host: HTMLElement;
}

function InspectorApp({ host }: InspectorAppProps) {
  const [state, setState] = useState<InspectorState>("idle");
  const [hovered, setHovered] = useState<HTMLElement | null>(null);
  // Deliberately the *only* record of "the current/previous selection" -
  // re-pick does not duplicate it into a second "previousSelection" slot.
  // It is preserved (not cleared) across a "picking" excursion, and only
  // ever cleared by Close - see `cancelPicking` and `handleLauncherClick`.
  const [inspected, setInspected] = useState<InspectedElement | null>(null);

  // Kept in sync (in its own effect, not during render - React forbids
  // writing a ref's `.current` while rendering) so the picking effect below
  // can read the *current* selection without needing `inspected` in its own
  // dependency array, which would tear down and recreate the picker
  // controller - and its listeners - on every selection change instead of
  // only on real state transitions.
  const inspectedRef = useRef(inspected);
  useEffect(() => {
    inspectedRef.current = inspected;
  }, [inspected]);

  function cancelPicking() {
    // Escape, and clicking somewhere with no inspectable element, both
    // route here (via the effect's `onCancel` below) - as does explicitly
    // clicking "Cancel" on the launcher. Cancelling a re-pick must restore
    // the selection that was active before it started, not drop back to
    // idle: `inspected`/`inspectedRef` is never cleared when picking
    // begins, so "was there already a selection" is just "is it non-null".
    setState(inspectedRef.current ? "selected" : "idle");
  }

  useEffect(() => {
    if (state !== "picking") return;

    const controller = createPickerController(host, {
      onHover: setHovered,
      onSelect: (element) => {
        setInspected(inspectElement(element));
        setState("selected");
      },
      onCancel: cancelPicking,
    });

    controller.start();
    return () => controller.stop();
  }, [state, host]);

  function handleLauncherClick() {
    if (state === "idle") setState("picking");
    else if (state === "picking") cancelPicking();
    else setState("picking"); // selected -> re-pick; `inspected` stays as-is
  }

  function handleClosePanel() {
    setState("idle");
    setInspected(null);
  }

  function handleRefresh() {
    if (!inspected) return;

    if (!inspected.element.isConnected) {
      // A detached element's last-known snapshot is more useful than a
      // degraded re-inspection: its ancestry and raw token values are only
      // discoverable by walking `parentElement`, which is already gone.
      // Re-running `inspectElement` here would silently wipe out good data
      // with empty ancestry / missing raw values. Still force a re-render
      // (a shallow copy, not a re-inspection) so the stale note below
      // reflects the *current* truth even if this is the first render since
      // the element left the document - the data itself is untouched.
      setInspected((prev) => (prev ? { ...prev } : prev));
      return;
    }

    setInspected(inspectElement(inspected.element));
  }

  const picking = state === "picking";
  const showPanel = state === "selected" && inspected !== null;

  return (
    <div className="fw-inspector-root">
      <button
        type="button"
        className={`fw-inspector-launcher${picking ? " picking" : ""}`}
        onClick={handleLauncherClick}
      >
        <span className="fw-inspector-launcher-dot" />
        {picking ? "Cancel (Esc)" : "Inspect"}
      </button>

      {picking && (
        <div className="fw-inspector-banner">
          Click a safe-css element to inspect it - <kbd>Esc</kbd> to cancel
        </div>
      )}

      {/* Rendered before the hover highlight below so hover visually
          supersedes it when the two coincide (e.g. re-hovering the already-
          selected element during re-pick). Persists across picking/selected
          alike - only Close clears `inspected` and hides it. */}
      {inspected && inspected.element.isConnected && (
        <HighlightOverlay
          element={inspected.element}
          label={describeElement(inspected.element)}
          variant="selected"
        />
      )}

      {picking && hovered && (
        <HighlightOverlay element={hovered} label={describeElement(hovered)} />
      )}

      {showPanel && inspected && (
        <InspectorPanel
          inspected={inspected}
          stale={!inspected.element.isConnected}
          onRefresh={handleRefresh}
          onClose={handleClosePanel}
        />
      )}
    </div>
  );
}

export interface SafeCssInspectorProps {
  /** Whether the Inspector is active. Defaults to `true`; the Inspector already renders nothing in production regardless of this prop - use it to additionally gate it behind your own dev-only condition if desired. */
  enabled?: boolean;
}

/**
 * A read-only, development-only visual DOM inspector for safe-css. Renders
 * nothing itself in production, or when `enabled={false}`: see
 * `internal/env.ts`. Everything it shows is derived purely from
 * `@safe-css/core`'s rendered `data-fw-*` attributes and `--fw-*` CSS
 * custom properties - it never imports from Core, and never touches React
 * context. See docs/architecture.md#inspector for the full contract.
 *
 * Renders into its own Shadow DOM root (created only inside `useEffect`,
 * so this is SSR-safe: nothing DOM-related ever runs during render or on
 * the server), which keeps its UI - built without any safe-css primitive -
 * fully isolated from the app's own styles, and vice versa.
 */
export function SafeCssInspector({ enabled = true }: SafeCssInspectorProps) {
  const [root, setRoot] = useState<InspectorRoot | null>(null);

  useEffect(() => {
    if (!enabled || !isDevelopmentBuild()) return;

    const created = createInspectorRoot();
    const styleElement = document.createElement("style");
    styleElement.textContent = INSPECTOR_STYLES;
    created.shadowRoot.insertBefore(styleElement, created.mount);

    // The Shadow DOM host is an external system (the real document) that
    // must not be touched during render - both for SSR-safety and because
    // React forbids side effects in the render phase. This setState exists
    // solely to hand the already-created host/mount to render() so it can
    // portal into it; it does not derive from or duplicate any prop/state
    // render already had.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRoot(created);

    return () => {
      destroyInspectorRoot(created);
      setRoot(null);
    };
  }, [enabled]);

  if (!enabled || !isDevelopmentBuild() || !root) return null;

  return createPortal(<InspectorApp host={root.host} />, root.mount);
}

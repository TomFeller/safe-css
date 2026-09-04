/**
 * The DOM attribute stamped on the Inspector's own Shadow DOM host element,
 * so its lifecycle-cleanup and self-exclusion logic can recognize it
 * without any global registry. Also the exact selector `tests/setup.ts`
 * uses to sweep up any host left behind between tests.
 */
export const INSPECTOR_HOST_ATTRIBUTE = "data-safe-css-inspector-host";

export interface InspectorRoot {
  host: HTMLElement;
  shadowRoot: ShadowRoot;
  mount: HTMLElement;
}

/**
 * Creates the single `<div>` the entire Inspector UI lives inside, isolated
 * from the host page via Shadow DOM (`mode: "open"` only so this package's
 * own tests can reach in - nothing about the picker or panel relies on
 * closed-mode isolation for correctness).
 *
 * The host itself is a fixed, full-viewport, `pointer-events: none` layer
 * so it never intercepts clicks on the app underneath; `mount` - the actual
 * root React renders into - re-enables `pointer-events: auto` for its own
 * subtree (launcher button, highlight overlay, panel), each of which is
 * separately positioned by the stylesheet in `ui/styles.ts`.
 *
 * Deliberately created imperatively rather than as JSX: this host must
 * exist before React ever renders into it, and must never be built from
 * safe-css primitives - the tool has to remain independent of the
 * framework it inspects. See docs/architecture.md#inspector.
 */
export function createInspectorRoot(container: ParentNode = document.body): InspectorRoot {
  const host = document.createElement("div");
  host.setAttribute(INSPECTOR_HOST_ATTRIBUTE, "");
  host.style.position = "fixed";
  host.style.inset = "0";
  host.style.zIndex = "2147483647";
  host.style.pointerEvents = "none";

  const shadowRoot = host.attachShadow({ mode: "open" });

  const mount = document.createElement("div");
  mount.style.pointerEvents = "auto";
  shadowRoot.appendChild(mount);

  container.appendChild(host);

  return { host, shadowRoot, mount };
}

export function destroyInspectorRoot(root: InspectorRoot): void {
  root.host.remove();
}

/**
 * True when `node` is inside the Inspector's own Shadow DOM subtree - used
 * by the picker to ignore pointer/click events that originate from the
 * Inspector's own UI (the launcher, the panel) rather than the app being
 * inspected.
 *
 * This relies on native shadow-DOM event retargeting rather than
 * `Node.contains()`: a `document`-level *capture-phase* listener sees
 * `event.target` already retargeted to the shadow host itself for anything
 * that happened inside a shadow tree attached to it (composed event
 * retargeting, per the DOM spec), so comparing `event.target === host` is
 * both correct and cheap - no need to walk into the shadow tree, which
 * `Node.contains()` cannot do across a shadow boundary anyway.
 */
export function isInspectorOwnNode(target: EventTarget | null, host: HTMLElement): boolean {
  return target === host;
}

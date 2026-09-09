/**
 * The Inspector's plain, serializable data model. Every piece of DOM
 * inspection logic (picker, metadata parsing, token resolution, dependency
 * analysis, unsafeCss detection) produces one of these; the UI layer only
 * ever renders a model, never performs DOM discovery itself. Keeping this
 * boundary explicit is what will let a future v0.3 (Impact Analysis) reuse
 * this same inspection layer without touching the UI - see
 * docs/architecture.md#inspector in the workspace root for the full story.
 */

export interface InspectorVariant {
  name: string;
  value: string;
}

export interface InspectorAncestor {
  element: HTMLElement;
  primitive: string;
  recipe?: string;
}

/** A parsed `"category.name"` token identity, e.g. `"space.card"` -> `{ category: "space", name: "card" }`. */
export interface TokenIdentity {
  token: string;
  category: string;
  name: string;
}

/**
 * One node in a token's dependency tree - just enough to render the tree
 * shown in the "Token dependencies" panel section. `cycle: true` means this
 * node re-visits a `cssVariable` already seen higher up the same branch;
 * traversal stops there rather than recursing forever.
 */
export interface DependencyTreeNode {
  token: string;
  cssVariable: string;
  cycle: boolean;
  children: DependencyTreeNode[];
}

export interface InspectedToken extends TokenIdentity {
  cssVariable: string;
  /** CSS properties on the selected element whose value references this token's variable. Empty means "Unknown". */
  properties: string[];
  /** The token's own authored value, e.g. `"1px solid var(--fw-color-border)"`. Undefined if no definition was found. */
  rawValue?: string;
  /** `rawValue` with any nested `var(--fw-...)` references substituted in, recursively. */
  resolvedValue?: string;
  /** This token's own dependencies (i.e. `buildDependencyTree(...).children`). */
  dependencies: DependencyTreeNode[];
  /** The DOM node where this token's `--fw-*` variable is actually defined (its "theme scope") - the same node `rawValue` was read from. Undefined if no definition was found. Powers Impact Analysis (v0.3): analyzing a token targets this exact owner, not just the token name - see docs/architecture.md#impact-analysis. */
  owner?: HTMLElement;
}

export interface UnsafeCssProperty {
  property: string;
  value: string;
}

export interface UnsafeCssInfo {
  /** The count Core actually reported via `data-fw-unsafe-css` - the source of truth. */
  count: number;
  /** Best-effort detected properties; see `unsafe/detectUnsafeCss.ts` for the heuristic. */
  detected: UnsafeCssProperty[];
  /** True when `detected.length` doesn't match `count` - some custom properties couldn't be confidently identified. */
  uncertain: boolean;
}

/**
 * The fixed, closed set of interactive states Core supports (v0.4), and the
 * fixed set of visual properties a state declaration can target. Defined
 * here, independently of `@safe-css/core`'s own `RecipeStateName`/
 * `StateBridgeProperty` types, on purpose: this package owns its own
 * understanding of the documented DOM contract (`data-fw-state-tokens`,
 * `data-fw-state-suppressed`, `--fw-state-*` custom properties) rather than
 * importing Core's implementation types - see `inspection/metadata.ts`.
 */
export type InteractionStateName = "hover" | "focusVisible" | "active";
export type InteractionStateProperty = "background" | "color" | "border";

/** One parsed `data-fw-state-tokens` entry: `"hover|background|colors.action"` -> `{ state: "hover", property: "background", token: "colors.action" }`. */
export interface InspectorStateTokenRef {
  state: InteractionStateName;
  property: InteractionStateProperty;
  token: string;
}

/** One parsed `data-fw-state-suppressed` entry: `"hover|background|backgroundColor"` -> `{ state: "hover", property: "background", unsafeCssKey: "backgroundColor" }`. */
export interface InspectorStateSuppressionRef {
  state: InteractionStateName;
  property: InteractionStateProperty;
  unsafeCssKey: string;
}

/**
 * One declared property within one interactive state - either token-backed
 * (`token` is set, reusing the exact same `InspectedToken` shape/machinery
 * as the ordinary Tokens section: raw/resolved value, dependency tree,
 * owner, "Analyze impact") or a literal Core supports without a token (only
 * `border: "none"` today - `literal` is set instead, and there is
 * deliberately no fabricated token to analyze impact on).
 */
export interface InteractionStateDeclaration {
  property: InteractionStateProperty;
  token?: InspectedToken;
  literal?: string;
  /** Set when `data-fw-state-suppressed` marks this exact declaration as ineffective on this instance - see `Box.tsx`'s `STATE_BRIDGE_UNSAFE_CSS_KEYS` detection in Core. The declaration is still real; it just isn't currently visually effective here. */
  suppressedBy?: { unsafeCssKey: string };
}

/** One interactive state and everything it declares on the selected element. */
export interface InteractionState {
  state: InteractionStateName;
  /** Human-facing label: `"hover"` / `"focus-visible"` / `"active"` - never the implementation name `focusVisible`. */
  label: string;
  declarations: InteractionStateDeclaration[];
}

/**
 * What's on the selected element that safe-css itself didn't put there -
 * "does this rendered element expose hooks something outside safe-css may
 * be using" (v0.4 Phase 3). `frameworkClasses` is Core's own authoritative
 * `data-fw-classes` list (never guessed via a `fw-` prefix check, which a
 * custom `as` component or a future non-`fw-`-prefixed class could defeat);
 * `externalClasses` is the element's actual `classList` minus that set.
 * This is deliberately *not* a claim that any of these actually style the
 * element - a class can exist for CSS, JS querying, testing, or a
 * third-party library - see `inspection/inspectElement.ts`'s
 * `buildExternalHooks`.
 */
export interface ExternalHooksInfo {
  /** Core's own `data-fw-classes`, parsed - every class this element's primitive itself generated. */
  frameworkClasses: string[];
  /** The element's actual `classList` minus `frameworkClasses` - classes something outside safe-css put there. */
  externalClasses: string[];
  /** The element's `id` attribute, if any non-empty value is set. Never sourced from Core metadata - read directly from the DOM, since Core never records `id`. */
  id?: string;
}

export interface InspectedElement {
  element: HTMLElement;
  tagName: string;
  primitive: string;
  recipe?: string;
  variants: InspectorVariant[];
  /** Nearest-first: `ancestry[0]` is the immediate safe-css parent, the last entry is the outermost. */
  ancestry: InspectorAncestor[];
  /**
   * Every token this element depends on through its resting/current
   * styling. A token used *only* by an interactive state (no resting
   * usage at all) is deliberately excluded here - it appears exclusively
   * under `interactionStates` instead, so this list never shows framework
   * bridge plumbing (`--fw-state-*-value`) as a real "Used by" CSS
   * property. A token used both ways still appears in both places - see
   * `inspection/inspectElement.ts`.
   */
  tokens: InspectedToken[];
  /** Ordered `hover` -> `focusVisible` -> `active`; a state with no declarations at all on this element is omitted. */
  interactionStates: InteractionState[];
  externalHooks: ExternalHooksInfo;
  unsafeCss: UnsafeCssInfo;
}

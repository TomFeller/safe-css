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

export interface InspectedElement {
  element: HTMLElement;
  tagName: string;
  primitive: string;
  recipe?: string;
  variants: InspectorVariant[];
  /** Nearest-first: `ancestry[0]` is the immediate safe-css parent, the last entry is the outermost. */
  ancestry: InspectorAncestor[];
  tokens: InspectedToken[];
  unsafeCss: UnsafeCssInfo;
}

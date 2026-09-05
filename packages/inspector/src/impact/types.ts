import type { TokenIdentity } from "../types";

/**
 * What Impact Analysis actually targets: not just a token *name*, but that
 * name plus the exact DOM node where its `--fw-<category>-<name>` variable
 * is defined (its "theme scope"). Two rendered elements can both use
 * `radius.card` while resolving it from two different `ThemeProvider`s;
 * changing one does not affect the other. See
 * docs/architecture.md#impact-analysis.
 */
export interface ImpactTarget {
  token: TokenIdentity;
  cssVariable: string;
  owner: HTMLElement;
}

export type ImpactKind = "direct" | "indirect";

/**
 * One distinct explanatory path from the target down to a token this
 * element directly uses - target-first, inclusive of both ends. `kind` is
 * this *specific path's* own nature (`"direct"` only for the trivial
 * length-1 "the element uses the target itself" path; every path found by
 * walking a dependency chain through some *other* token is `"indirect"`,
 * regardless of the element's overall classification below).
 */
export interface ImpactPathRef {
  tokens: string[];
  kind: ImpactKind;
}

export interface ImpactedElement {
  element: HTMLElement;
  /**
   * The element's overall classification - direct wins over indirect (see
   * docs/architecture.md#impact-analysis) whenever the element both uses
   * the target directly *and* reaches it indirectly through another token.
   * Drives the headline Direct/Indirect counts and the per-group
   * direct/indirect breakdown; each element appears exactly once here
   * regardless of how many distinct paths it has.
   */
  kind: ImpactKind;
  primitive: string;
  recipe?: string;
  /** Every distinct explanatory path found for this element - at least one. An element using both `border.subtle` and `focus.border` (both depending on the target) carries both paths, not just the first found. */
  paths: ImpactPathRef[];
}

/** A rendered element that uses the target's token *name* but resolves it from a different owner - not affected, but worth surfacing as a count. */
export interface ExcludedElement {
  element: HTMLElement;
  token: string;
  reason: "different-theme-scope";
}

export interface ImpactGroup {
  label: string;
  count: number;
  direct: number;
  indirect: number;
}

/** One collapsed, deduplicated explanation row for the "Impact paths" section - many elements can share one path. */
export interface ImpactPath {
  tokens: string[];
  kind: ImpactKind;
  consumerLabel: string;
  count: number;
}

export interface ImpactAnalysis {
  target: ImpactTarget;
  currentValue?: string;
  affected: ImpactedElement[];
  excludedByScope: ExcludedElement[];
  recipes: ImpactGroup[];
  primitives: ImpactGroup[];
  paths: ImpactPath[];
  /** True if a dependency cycle was encountered anywhere during traversal - analysis still completes safely either way. */
  hasCycle: boolean;
  createdAt: number;
}

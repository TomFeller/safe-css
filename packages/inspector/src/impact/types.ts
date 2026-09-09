import type { InteractionStateName, InteractionStateProperty, TokenIdentity } from "../types";

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
 * Marks a path as existing through a recipe's interactive-state declaration
 * (`states.hover`/`focusVisible`/`active` in Core) rather than the
 * element's ordinary/resting styling. `state`/`property` name exactly which
 * declaration the path runs through - e.g. `{ state: "hover", property:
 * "background" }` for a path that exists because `states.hover.background`
 * depends on the target. Absent entirely (`via: undefined`) means ordinary
 * usage - see `ImpactPathRef`.
 */
export interface ImpactStateVia {
  state: InteractionStateName;
  property: InteractionStateProperty;
}

/**
 * One distinct explanatory path from the target down to a token this
 * element directly uses - target-first, inclusive of both ends. `kind` is
 * this *specific path's* own nature (`"direct"` only for the trivial
 * length-1 "the element uses the target itself" path; every path found by
 * walking a dependency chain through some *other* token is `"indirect"`,
 * regardless of the element's overall classification below).
 *
 * `via` is present only when this path exists through an interactive-state
 * declaration rather than the element's ordinary/resting styling - two
 * paths with identical `tokens`/`kind` but a different `via` (or one with
 * `via` and one without) are genuinely different explanations and must
 * never collapse into one (see `impact/impactPaths.ts`).
 */
export interface ImpactPathRef {
  tokens: string[];
  kind: ImpactKind;
  via?: ImpactStateVia;
}

export interface ImpactedElement {
  element: HTMLElement;
  /**
   * The element's overall classification - direct wins over indirect (see
   * docs/architecture.md#impact-analysis) whenever the element both uses
   * the target directly *and* reaches it indirectly through another token.
   * This is unaffected by `via`: a state-only direct path still counts as
   * `"direct"` for this classification, exactly like an ordinary one.
   * Drives the headline Direct/Indirect counts and the per-group
   * direct/indirect breakdown; each element appears exactly once here
   * regardless of how many distinct paths it has.
   */
  kind: ImpactKind;
  primitive: string;
  recipe?: string;
  /**
   * Every distinct, *effective* explanatory path found for this element -
   * at least one. An element using both `border.subtle` and `focus.border`
   * (both depending on the target) carries both paths, not just the first
   * found; an element using the target both through its resting styling and
   * through a `states.hover` declaration carries both a plain path and a
   * `via`-tagged one. A path a recipe declares but Core marks suppressed on
   * this instance (`data-fw-state-suppressed`) is never included here - see
   * `analyzeImpact.ts`.
   */
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

/**
 * One collapsed, deduplicated explanation row for the "Impact paths"
 * section - many elements can share one path. `via` participates in this
 * row's identity exactly like `tokens`/`kind`/`consumerLabel` do (see
 * `impact/impactPaths.ts`): `colors.action` via `hover.background` and
 * `colors.action` via `active.background` are different rows even though
 * their token chains are identical.
 */
export interface ImpactPath {
  tokens: string[];
  kind: ImpactKind;
  via?: ImpactStateVia;
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
  /**
   * Count of affected elements whose *every* effective path to the target
   * runs through an interactive-state declaration (`via` set on all of
   * them) - none of their ordinary/resting styling depends on this token.
   * An additional, orthogonal characteristic of an already-affected
   * element, not a third `ImpactKind`: an interaction-only element is still
   * either `"direct"` or `"indirect"` overall. An element with even one
   * plain (non-`via`) path is never counted here, regardless of how many
   * state paths it also has - see `analyzeImpact.ts`.
   */
  interactionOnlyCount: number;
  /** True if a dependency cycle was encountered anywhere during traversal - analysis still completes safely either way. */
  hasCycle: boolean;
  createdAt: number;
}

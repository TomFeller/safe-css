import { findNearestVariableDefinition } from "../tokens/tokenValue";
import { parseTokenIdentity } from "../tokens/parseToken";
import { tokenToCssVariable } from "../tokens/tokenVariable";
import { readStateSuppressedList, readStateTokenList } from "../inspection/metadata";
import { findPropertiesUsingVariable } from "../inspection/inspectElement";
import { scanRenderedElements } from "./scanRenderedElements";
import { buildOwnedDependencyTree, searchForTarget, treeHasCycle } from "./reverseDependencies";
import { groupByPrimitive, groupByRecipe } from "./groupImpact";
import { buildImpactPaths } from "./impactPaths";
import type {
  ExcludedElement,
  ImpactAnalysis,
  ImpactedElement,
  ImpactKind,
  ImpactPathRef,
  ImpactStateVia,
  ImpactTarget,
} from "./types";
import type { InspectorStateTokenRef } from "../types";

/**
 * Every non-suppressed `via` this element's own `data-fw-state-tokens`
 * declares for `token` - a token can legitimately be declared by more than
 * one state on the same element (e.g. both `hover.background` and
 * `active.background` pointing at the same token), and every one of those
 * is a distinct, effective path unless `data-fw-state-suppressed` marks
 * that exact (state, property) pair ineffective on this instance (see
 * Core's `STATE_BRIDGE_UNSAFE_CSS_KEYS` detection). A suppressed
 * declaration is real - the Inspector element panel still shows it - but it
 * never counts as an effective Impact path: the product rule is that
 * Impact must not claim changing a token would affect an instance where
 * `unsafeCss` already wins for that exact property.
 */
function effectiveViaRefs(
  refsByToken: Map<string, InspectorStateTokenRef[]>,
  suppressed: ReadonlySet<string>,
  token: string,
): ImpactStateVia[] {
  return (refsByToken.get(token) ?? [])
    .filter((ref) => !suppressed.has(`${ref.state}|${ref.property}`))
    .map((ref) => ({ state: ref.state, property: ref.property }));
}

/**
 * Whether `token` deserves a plain (non-`via`) path on `element` - i.e.
 * whether `data-fw-tokens` listing it reflects genuine ordinary/resting
 * usage, not *only* an interaction-state declaration.
 *
 * A token never declared by any state on this element (`refsByToken` has no
 * entry for it) is unambiguously ordinary - `data-fw-tokens` is Core's own
 * authoritative dependency list, so this is trusted directly without also
 * requiring `findPropertiesUsingVariable` to independently re-derive the
 * same fact via inline-style scanning. That extra check is only needed to
 * disambiguate the genuinely ambiguous case: a token that *is*
 * state-declared here might be exclusively state-only (its only reason for
 * appearing in `data-fw-tokens` at all is the state declaration) or
 * genuinely mixed (also used by the element's own resting styling) - the
 * same disambiguation the Element Inspector's ordinary Tokens section makes
 * (see `inspection/inspectElement.ts`).
 */
function hasOrdinaryUsage(
  element: HTMLElement,
  cssVariable: string,
  refsByToken: Map<string, InspectorStateTokenRef[]>,
  token: string,
): boolean {
  if (!refsByToken.has(token)) return true;
  return findPropertiesUsingVariable(element, cssVariable).length > 0;
}

/**
 * The single entry point for Impact Analysis: "if I change this token
 * definition, what currently rendered safe-css UI - including interaction
 * behavior - will be affected?" Scans every rendered safe-css element once
 * (`scanRenderedElements`) and classifies each one relative to `target` - a
 * specific token *and* the exact DOM node its `--fw-*` variable is defined
 * on (its theme scope), never just a token name. See
 * docs/architecture.md#impact-analysis for the full direct/indirect/
 * excluded-by-scope model this implements.
 *
 * `candidate.tokens` (`data-fw-tokens`) already unions ordinary and
 * interaction-state token dependencies (Core's own doing - see
 * `debugAttributes.ts`), so the direct/indirect *detection* below needs no
 * separate state-aware traversal: the same token-presence check and the
 * same owned-dependency-tree search already find state-only usages too.
 * What v0.4 Phase 2 adds is entirely about *explaining* and *filtering*
 * what's found: tagging which paths run through a `states.hover`/
 * `focusVisible`/`active` declaration (`via`, resolved per-candidate from
 * `data-fw-state-tokens`) versus the element's ordinary/resting styling
 * (`findPropertiesUsingVariable`, the same "does this element's own inline
 * style genuinely reference this variable" check the Element Inspector's
 * Tokens section uses - see `inspection/inspectElement.ts`), and excluding
 * a path entirely when Core's `data-fw-state-suppressed` marks it
 * ineffective on this instance (`effectiveViaRefs` above). A token used
 * both ways on the same element produces both an ordinary and a `via`
 * path, and the element still appears exactly once in `affected`.
 *
 * Pure with respect to its inputs: given the same DOM and the same
 * `target`, produces an equivalent result every time. Deliberately not
 * cached or kept as a running index - this is a snapshot, re-run via
 * `analyzeImpact` again (the panel's "Refresh impact") rather than
 * maintained incrementally.
 */
export function analyzeImpact(target: ImpactTarget, root: ParentNode = document): ImpactAnalysis {
  const rendered = scanRenderedElements(root);
  const affected: ImpactedElement[] = [];
  const excludedByScope: ExcludedElement[] = [];
  let hasCycle = false;

  for (const candidate of rendered) {
    const paths: ImpactPathRef[] = [];
    let kind: ImpactKind | null = null;
    let excludedHere = false;

    const stateRefsByToken = new Map<string, InspectorStateTokenRef[]>();
    for (const ref of readStateTokenList(candidate.element)) {
      const list = stateRefsByToken.get(ref.token);
      if (list) list.push(ref);
      else stateRefsByToken.set(ref.token, [ref]);
    }
    const suppressedStateKeys = new Set(
      readStateSuppressedList(candidate.element).map((ref) => `${ref.state}|${ref.property}`),
    );

    if (candidate.tokens.includes(target.token.token)) {
      const definition = findNearestVariableDefinition(candidate.element, target.cssVariable);

      if (definition && definition.owner === target.owner) {
        const directPaths: ImpactPathRef[] = [];

        if (
          hasOrdinaryUsage(
            candidate.element,
            target.cssVariable,
            stateRefsByToken,
            target.token.token,
          )
        ) {
          directPaths.push({ tokens: [target.token.token], kind: "direct" });
        }
        for (const via of effectiveViaRefs(
          stateRefsByToken,
          suppressedStateKeys,
          target.token.token,
        )) {
          directPaths.push({ tokens: [target.token.token], kind: "direct", via });
        }

        // Only classified "direct" (and only once real paths exist) - a
        // token that's declared here but whose only declaration(s) are all
        // suppressed produces zero paths and must not count as affected
        // through this route at all (see `effectiveViaRefs`'s doc comment).
        if (directPaths.length > 0) {
          kind = "direct";
          paths.push(...directPaths);
        }
      } else if (definition) {
        // Same token name, different theme scope: not affected via this
        // token - but the element is still checked below for every *other*
        // token it uses, both for a genuinely separate indirect route to
        // the target (kind stays "indirect", not overridden by this) and
        // for the same different-scope situation reached transitively.
        excludedHere = true;
      }
    }

    // Deliberately runs for every candidate, even one already classified
    // "direct" above: an element can both use the target itself *and* use
    // another token that also (indirectly) depends on it - direct still
    // wins for `kind`, but that indirect explanatory path is real
    // information and must not be discarded just because a shorter, more
    // obvious path already exists (see docs/architecture.md#impact-analysis).
    for (const otherToken of candidate.tokens) {
      if (otherToken === target.token.token) continue; // already handled above

      const cssVariable = tokenToCssVariable(parseTokenIdentity(otherToken));
      const tree = buildOwnedDependencyTree(candidate.element, cssVariable);
      if (!tree) continue;
      if (treeHasCycle(tree)) hasCycle = true;

      const result = searchForTarget(tree, target);

      if (result.paths.length > 0) {
        const otherHasOrdinaryUsage = hasOrdinaryUsage(
          candidate.element,
          cssVariable,
          stateRefsByToken,
          otherToken,
        );
        const viaRefs = effectiveViaRefs(stateRefsByToken, suppressedStateKeys, otherToken);

        for (const path of result.paths) {
          const tokens = [...path].reverse();
          if (otherHasOrdinaryUsage) {
            paths.push({ tokens, kind: "indirect" });
          }
          for (const via of viaRefs) {
            paths.push({ tokens, kind: "indirect", via });
          }
        }

        // Same rule as the direct case: this otherToken only contributes to
        // the element's overall classification if it actually produced at
        // least one effective (non-suppressed) path above.
        if (kind === null && (otherHasOrdinaryUsage || viaRefs.length > 0)) {
          kind = "indirect";
        }
      } else if (result.differentScopeMatch) {
        excludedHere = true;
      }
    }

    if (kind) {
      affected.push({
        element: candidate.element,
        kind,
        primitive: candidate.primitive,
        recipe: candidate.recipe,
        paths,
      });
    } else if (excludedHere) {
      // Collected as at most one entry per element regardless of how many
      // separate tokens/branches flagged it, and only when the element
      // isn't *also* affected through some other, correctly-scoped path.
      excludedByScope.push({
        element: candidate.element,
        token: target.token.token,
        reason: "different-theme-scope",
      });
    }
  }

  // An affected element is "interaction-only" when every one of its
  // effective paths is `via`-tagged - none of its ordinary/resting styling
  // depends on the target at all. See `ImpactAnalysis.interactionOnlyCount`.
  const interactionOnlyCount = affected.filter((el) =>
    el.paths.every((path) => path.via !== undefined),
  ).length;

  return {
    target,
    currentValue: findNearestVariableDefinition(target.owner, target.cssVariable)?.rawValue,
    affected,
    excludedByScope,
    recipes: groupByRecipe(affected),
    primitives: groupByPrimitive(affected),
    paths: buildImpactPaths(affected),
    interactionOnlyCount,
    hasCycle,
    createdAt: Date.now(),
  };
}

/** Builds an `ImpactTarget` for `token` as resolved from `element` - `null` if no active definition could be found (the "Impact unavailable" case). */
export function buildImpactTarget(element: HTMLElement, token: string): ImpactTarget | null {
  const identity = parseTokenIdentity(token);
  const cssVariable = tokenToCssVariable(identity);
  const definition = findNearestVariableDefinition(element, cssVariable);
  if (!definition) return null;
  return { token: identity, cssVariable, owner: definition.owner };
}

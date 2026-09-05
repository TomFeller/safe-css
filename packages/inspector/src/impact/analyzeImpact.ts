import { findNearestVariableDefinition } from "../tokens/tokenValue";
import { parseTokenIdentity } from "../tokens/parseToken";
import { tokenToCssVariable } from "../tokens/tokenVariable";
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
  ImpactTarget,
} from "./types";

/**
 * The single entry point for Impact Analysis: "if I change this token
 * definition, what currently rendered safe-css UI will be affected?"
 * Scans every rendered safe-css element once (`scanRenderedElements`) and
 * classifies each one relative to `target` - a specific token *and* the
 * exact DOM node its `--fw-*` variable is defined on (its theme scope),
 * never just a token name. See docs/architecture.md#impact-analysis for
 * the full direct/indirect/excluded-by-scope model this implements.
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

    if (candidate.tokens.includes(target.token.token)) {
      const definition = findNearestVariableDefinition(candidate.element, target.cssVariable);

      if (definition && definition.owner === target.owner) {
        kind = "direct";
        paths.push({ tokens: [target.token.token], kind: "direct" });
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
        for (const path of result.paths) {
          paths.push({
            tokens: [...path].reverse(),
            kind: "indirect",
          });
        }

        if (kind === null) {
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

  return {
    target,
    currentValue: findNearestVariableDefinition(target.owner, target.cssVariable)?.rawValue,
    affected,
    excludedByScope,
    recipes: groupByRecipe(affected),
    primitives: groupByPrimitive(affected),
    paths: buildImpactPaths(affected),
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

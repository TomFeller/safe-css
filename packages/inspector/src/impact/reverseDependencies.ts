import { findNearestVariableDefinition } from "../tokens/tokenValue";
import { extractFwVariableReferences } from "../tokens/dependencies";
import { cssVariableToTokenIdentity } from "../tokens/tokenVariable";
import type { ImpactTarget } from "./types";

export interface OwnedDependencyNode {
  token: string;
  cssVariable: string;
  owner: HTMLElement;
  cycle: boolean;
  children: OwnedDependencyNode[];
}

/**
 * Builds the *owned* dependency tree for `cssVariable`, starting the
 * resolution at `startElement` - then, critically, resolving every `var()`
 * reference found in a definition's value relative to *that definition's
 * own owner*, not relative to `startElement`.
 *
 * This mirrors real CSS custom-property semantics: a `var()` inside a
 * declaration is resolved using the environment of the element the
 * declaration itself lives on, not the element that eventually inherits
 * the computed result. Getting this right is what makes an inner
 * `ThemeProvider` overriding an *intermediate* token (say `border.subtle`)
 * correctly exclude its consumers from an *outer* target's impact
 * (`colors.border`) - a nested override that no longer references the
 * outer token simply produces a tree with no matching node, with zero
 * special-casing required. See docs/architecture.md#impact-analysis.
 *
 * Reuses `findNearestVariableDefinition` (the same nearest-ancestor walk
 * the Element Inspector's own token resolution already uses) rather than
 * a second, incompatible notion of "theme scope."
 *
 * Cycle-safe via a `seen` set of variable *names*, matching
 * `buildDependencyTree`'s existing convention: a variable revisited within
 * the same branch stops there instead of recursing forever, and the node
 * is marked `cycle: true` for that branch.
 */
export function buildOwnedDependencyTree(
  startElement: HTMLElement,
  cssVariable: string,
  seen: ReadonlySet<string> = new Set(),
): OwnedDependencyNode | null {
  const identity = cssVariableToTokenIdentity(cssVariable);
  if (!identity) return null;

  if (seen.has(cssVariable)) {
    return { token: identity.token, cssVariable, owner: startElement, cycle: true, children: [] };
  }

  const definition = findNearestVariableDefinition(startElement, cssVariable);
  if (!definition) return null;

  const nextSeen = new Set(seen);
  nextSeen.add(cssVariable);

  const children = extractFwVariableReferences(definition.rawValue)
    .map((ref) => buildOwnedDependencyTree(definition.owner, ref, nextSeen))
    .filter((node): node is OwnedDependencyNode => node !== null);

  return { token: identity.token, cssVariable, owner: definition.owner, cycle: false, children };
}

function hasCycleAnywhere(node: OwnedDependencyNode): boolean {
  return node.cycle || node.children.some(hasCycleAnywhere);
}

/** True if `tree` (or anything beneath it) hit a dependency cycle during traversal. */
export function treeHasCycle(tree: OwnedDependencyNode | null): boolean {
  return tree !== null && hasCycleAnywhere(tree);
}

export interface TargetSearchResult {
  /**
   * Token-name paths from `tree`'s root down to every exact
   * `(cssVariable, owner)` match.
   *
   * Example:
   * [
   *   ["panel.border", "border.subtle", "colors.border"],
   *   ["panel.border", "focus.border", "colors.border"]
   * ]
   *
   * Empty when no exact match exists.
   */
  paths: string[][];
  /**
   * True when the target's token *name* was found somewhere in the tree
   * but defined at a *different* owner - the indirect equivalent of
   * "same token name, different theme scope." Only meaningful when `path`
   * is `null`: a genuine match (correct owner) always takes priority over
   * a same-name-wrong-owner one, exactly like the direct case does.
   */
  differentScopeMatch: boolean;
}

/**
 * Searches `tree` for a node whose `(cssVariable, owner)` pair exactly
 * matches `target` - not just the variable name, since the whole point of
 * an `ImpactTarget` is that the same token name from a different theme
 * scope must not match. Also reports (`differentScopeMatch`) when the
 * target's token *name* appears somewhere in the tree but resolves from a
 * different owner - the transitive counterpart of the direct
 * same-name-different-scope check in `analyzeImpact.ts`, needed so an
 * indirect consumer of a *different* theme scope's version of the same
 * token relationship is reported as excluded rather than silently ignored.
 *
 * Once a node's own token name matches the target's, its subtree is never
 * descended into further: that declaration's value was already resolved
 * relative to *this* node's owner (see `buildOwnedDependencyTree`), so
 * whatever is nested beneath it belongs to whichever scope's definition
 * this is, not the target's - there is nothing to gain by looking deeper on
 * a name match, whether it's the right owner or not.
 */
export function searchForTarget(
  node: OwnedDependencyNode,
  target: ImpactTarget,
): TargetSearchResult {
  if (node.cycle) {
    return {
      paths: [],
      differentScopeMatch: false,
    };
  }

  if (node.cssVariable === target.cssVariable) {
    if (node.owner === target.owner) {
      return {
        paths: [[node.token]],
        differentScopeMatch: false,
      };
    }

    return {
      paths: [],
      differentScopeMatch: true,
    };
  }

  const paths: string[][] = [];
  let differentScopeMatch = false;

  for (const child of node.children) {
    const result = searchForTarget(child, target);

    for (const path of result.paths) {
      paths.push([node.token, ...path]);
    }

    if (result.differentScopeMatch) {
      differentScopeMatch = true;
    }
  }

  return {
    paths,
    differentScopeMatch,
  };
}

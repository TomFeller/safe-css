import { cssVariableToTokenIdentity } from "./tokenVariable";
import type { VariableLookup } from "./tokenValue";
import type { DependencyTreeNode } from "../types";

const FW_VAR_NAME = /var\(\s*(--fw-[a-zA-Z0-9-]+)/g;

/** Every distinct `--fw-*` variable referenced in `value`, in first-seen order. */
export function extractFwVariableReferences(value: string): string[] {
  const refs: string[] = [];
  const seen = new Set<string>();
  FW_VAR_NAME.lastIndex = 0;

  let match: RegExpExecArray | null;
  while ((match = FW_VAR_NAME.exec(value))) {
    const name = match[1] as string;
    if (!seen.has(name)) {
      seen.add(name);
      refs.push(name);
    }
  }

  return refs;
}

/**
 * Builds the small dependency tree shown in the panel (e.g.
 * `border.subtle └── colors.border`), starting from `cssVariable`. Supports
 * direct, transitive, and multiple dependencies through plain recursion; a
 * `cssVariable` already present earlier in the *current branch* is reported
 * as `cycle: true` and traversal of that branch stops there, so a malformed
 * theme (`A -> B -> A`) can never hang or crash the Inspector.
 *
 * Returns `null` only when `cssVariable` isn't a safe-css `--fw-*` variable
 * at all - reverse/global usage analysis (v0.3's job, not this one) is
 * explicitly out of scope; this only ever answers "what does this token
 * depend on", never "what depends on this token".
 */
export function buildDependencyTree(
  cssVariable: string,
  lookup: VariableLookup,
  seen: ReadonlySet<string> = new Set(),
): DependencyTreeNode | null {
  const identity = cssVariableToTokenIdentity(cssVariable);
  if (!identity) return null;

  if (seen.has(cssVariable)) {
    return { token: identity.token, cssVariable, cycle: true, children: [] };
  }

  const rawValue = lookup(cssVariable);
  const nextSeen = new Set(seen);
  nextSeen.add(cssVariable);

  const children = rawValue
    ? extractFwVariableReferences(rawValue)
        .map((ref) => buildDependencyTree(ref, lookup, nextSeen))
        .filter((node): node is DependencyTreeNode => node !== null)
    : [];

  return { token: identity.token, cssVariable, cycle: false, children };
}

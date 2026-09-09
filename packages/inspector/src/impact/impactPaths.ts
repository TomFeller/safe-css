import type { ImpactedElement, ImpactPath } from "./types";

/**
 * Collapses per-element paths into the deduplicated rows the "Impact
 * paths" panel section shows - many elements sharing one path (e.g. 18
 * `Card`s all reached via `colors.border -> border.subtle`) become one row
 * with a count, not 18 identical lines. A path's identity is its full
 * token chain plus its consumer label (recipe if the element has one,
 * otherwise primitive) plus its own kind plus its `via` (v0.4 Phase 2) -
 * two paths with the same tokens but a different `via` (or one with `via`
 * and one without) are genuinely different explanations and must not
 * collapse into one row: `colors.action` via `hover.background` and
 * `colors.action` via `active.background` stay separate, and both stay
 * separate from a plain (non-`via`) `colors.action` row.
 *
 * Iterates every element's *own* `paths` list, not just one representative
 * path - an element reached through two distinct dependency chains (e.g.
 * both `border.subtle` and `focus.border` depending on the target)
 * contributes one row to each, and an element that's both a direct
 * consumer and an indirect one through another token contributes to both
 * the direct row and the indirect explanatory row. `affected.length`
 * (unique elements) and the total across all path rows can therefore
 * legitimately differ - that's the point, not a bug.
 */
export function buildImpactPaths(affected: ImpactedElement[]): ImpactPath[] {
  const byKey = new Map<string, ImpactPath>();

  for (const el of affected) {
    const consumerLabel = el.recipe ?? el.primitive;

    for (const pathRef of el.paths) {
      const key = JSON.stringify([
        pathRef.tokens,
        consumerLabel,
        pathRef.kind,
        pathRef.via ?? null,
      ]);
      const existing = byKey.get(key);

      if (existing) {
        existing.count += 1;
      } else {
        byKey.set(key, {
          tokens: pathRef.tokens,
          kind: pathRef.kind,
          via: pathRef.via,
          consumerLabel,
          count: 1,
        });
      }
    }
  }

  return Array.from(byKey.values()).sort(
    (a, b) =>
      b.count - a.count ||
      (a.kind === b.kind ? 0 : a.kind === "direct" ? -1 : 1) ||
      a.consumerLabel.localeCompare(b.consumerLabel),
  );
}

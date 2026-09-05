import type { ImpactedElement, ImpactGroup } from "./types";

function sortGroups(groups: ImpactGroup[]): ImpactGroup[] {
  return [...groups].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

function groupBy(
  affected: ImpactedElement[],
  labelOf: (el: ImpactedElement) => string,
): ImpactGroup[] {
  const byLabel = new Map<string, ImpactGroup>();

  for (const el of affected) {
    const label = labelOf(el);
    const group = byLabel.get(label) ?? { label, count: 0, direct: 0, indirect: 0 };
    group.count += 1;
    if (el.kind === "direct") group.direct += 1;
    else group.indirect += 1;
    byLabel.set(label, group);
  }

  return sortGroups(Array.from(byLabel.values()));
}

/** Groups affected elements by recipe, falling back to "No recipe" rather than dropping unrecipe'd elements - sorted by descending count, then alphabetically for ties. */
export function groupByRecipe(affected: ImpactedElement[]): ImpactGroup[] {
  return groupBy(affected, (el) => el.recipe ?? "No recipe");
}

/** Groups affected elements by primitive - every safe-css element has one, so there's no "unknown" fallback needed here. */
export function groupByPrimitive(affected: ImpactedElement[]): ImpactGroup[] {
  return groupBy(affected, (el) => el.primitive);
}

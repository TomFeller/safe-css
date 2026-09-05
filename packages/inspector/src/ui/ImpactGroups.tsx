import type { ImpactGroup } from "../impact/types";

function GroupList({ groups }: { groups: ImpactGroup[] }) {
  return (
    <>
      {groups.map((group) => (
        <div key={group.label} className="fw-inspector-row">
          <span className="fw-inspector-row-label">{group.label}</span>
          <span className="fw-inspector-row-value">
            {group.count}
            {group.direct > 0 && group.indirect > 0 && (
              <span className="fw-inspector-impact-breakdown">
                {" "}
                ({group.direct} direct, {group.indirect} indirect)
              </span>
            )}
          </span>
        </div>
      ))}
    </>
  );
}

/** "Affected recipes" and "Affected primitives" - grouped and sorted by `groupByRecipe`/`groupByPrimitive`, rendered as-is. */
export function ImpactGroups({
  recipes,
  primitives,
}: {
  recipes: ImpactGroup[];
  primitives: ImpactGroup[];
}) {
  return (
    <section className="fw-inspector-section">
      <h3 className="fw-inspector-section-title">Affected recipes</h3>
      {recipes.length === 0 ? (
        <p className="fw-inspector-empty">No affected elements use a recipe.</p>
      ) : (
        <GroupList groups={recipes} />
      )}

      <h3 className="fw-inspector-section-title fw-inspector-impact-subheading">
        Affected primitives
      </h3>
      {primitives.length === 0 ? (
        <p className="fw-inspector-empty">No rendered elements are affected.</p>
      ) : (
        <GroupList groups={primitives} />
      )}
    </section>
  );
}

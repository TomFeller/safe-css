import { describeElement } from "../inspection/metadata";
import type { InspectedElement } from "../types";

/**
 * Renders `element.ancestry` outermost-first (reversed from its
 * nearest-first storage order) so the tree reads top-to-bottom the way the
 * DOM itself nests, followed by the selected element itself as the final,
 * visibly-distinguished row - so the panel shows the *whole* chain the
 * selected element sits in, not just what's above it. Still pure DOM
 * ancestry (`collectAncestry`); no React-tree inference.
 */
export function AncestrySection({ element }: { element: InspectedElement }) {
  const outermostFirst = [...element.ancestry].reverse();
  const selectedLabel = describeElement(element.element);

  return (
    <section className="fw-inspector-section">
      <h3 className="fw-inspector-section-title">Safe CSS ancestry</h3>

      {outermostFirst.map((ancestor, index) => (
        <div key={index} className="fw-inspector-ancestry-item" style={{ paddingLeft: index * 12 }}>
          <span className="fw-inspector-depth">{"└"}</span>
          <span className="fw-inspector-code">{ancestor.primitive}</span>
          {ancestor.recipe !== undefined && (
            <span className="fw-inspector-badge">{ancestor.recipe}</span>
          )}
        </div>
      ))}

      <div
        className="fw-inspector-ancestry-item selected"
        style={{ paddingLeft: outermostFirst.length * 12 }}
      >
        <span className="fw-inspector-depth">{"└"}</span>
        <span className="fw-inspector-code">{selectedLabel}</span>
        <span className="fw-inspector-selected-marker">← selected</span>
      </div>
    </section>
  );
}

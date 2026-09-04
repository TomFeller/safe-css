import type { InspectedElement } from "../types";

export function ElementSection({ element }: { element: InspectedElement }) {
  return (
    <section className="fw-inspector-section">
      <h3 className="fw-inspector-section-title">Element</h3>

      <div className="fw-inspector-row">
        <span className="fw-inspector-row-label">Tag</span>
        <span className="fw-inspector-row-value fw-inspector-code">{`<${element.tagName}>`}</span>
      </div>

      <div className="fw-inspector-row">
        <span className="fw-inspector-row-label">Primitive</span>
        <span className="fw-inspector-row-value fw-inspector-code">
          {element.primitive || <span className="fw-inspector-empty">Unknown</span>}
        </span>
      </div>

      {element.recipe !== undefined && (
        <div className="fw-inspector-row">
          <span className="fw-inspector-row-label">Recipe</span>
          <span className="fw-inspector-row-value fw-inspector-code">{element.recipe}</span>
        </div>
      )}

      {element.variants.length > 0 && (
        <div className="fw-inspector-row" style={{ alignItems: "flex-start" }}>
          <span className="fw-inspector-row-label">Variants</span>
          <span
            className="fw-inspector-row-value"
            style={{ display: "flex", flexWrap: "wrap", gap: 4, justifyContent: "flex-end" }}
          >
            {element.variants.map((variant) => (
              <span key={variant.name} className="fw-inspector-badge">
                {variant.name}: {variant.value}
              </span>
            ))}
          </span>
        </div>
      )}
    </section>
  );
}

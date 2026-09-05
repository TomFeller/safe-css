import type { ImpactAnalysis } from "../impact/types";

/**
 * The top of Impact mode: which token, its current value, an explicit
 * statement that this is a *rendered-DOM* snapshot (not source code or
 * routes - see docs/architecture.md#impact-analysis), and the headline
 * counts. Kept as one component since these numbers are read together.
 */
export function ImpactSummary({ analysis }: { analysis: ImpactAnalysis }) {
  const { target, currentValue, affected, excludedByScope, recipes, primitives } = analysis;
  const direct = affected.filter((el) => el.kind === "direct").length;
  const indirect = affected.length - direct;

  return (
    <section className="fw-inspector-section">
      <h3 className="fw-inspector-section-title">Impact Analysis</h3>

      <div className="fw-inspector-row">
        <span className="fw-inspector-row-label">Token</span>
        <span className="fw-inspector-row-value fw-inspector-code">{target.token.token}</span>
      </div>
      <div className="fw-inspector-row">
        <span className="fw-inspector-row-label">Current value</span>
        <span className="fw-inspector-row-value fw-inspector-code">
          {currentValue ?? <span className="fw-inspector-empty">Not defined</span>}
        </span>
      </div>
      <div className="fw-inspector-row">
        <span className="fw-inspector-row-label">Theme scope</span>
        <span className="fw-inspector-row-value">Current theme scope</span>
      </div>

      <p className="fw-inspector-impact-note">
        Impact Analysis includes safe-css elements currently rendered in the document. Unmounted
        routes, screens, and source-code usages are not included.
      </p>

      <div className="fw-inspector-impact-headline">
        <div className="fw-inspector-impact-headline-count">{affected.length}</div>
        <div className="fw-inspector-impact-headline-label">
          Rendered impact - affected elements
        </div>
      </div>

      <div className="fw-inspector-impact-stats">
        <div>
          <span className="fw-inspector-row-label">Direct</span>
          <span className="fw-inspector-code">{direct}</span>
        </div>
        <div>
          <span className="fw-inspector-row-label">Indirect</span>
          <span className="fw-inspector-code">{indirect}</span>
        </div>
        <div>
          <span className="fw-inspector-row-label">Affected recipes</span>
          <span className="fw-inspector-code">{recipes.length}</span>
        </div>
        <div>
          <span className="fw-inspector-row-label">Affected primitives</span>
          <span className="fw-inspector-code">{primitives.length}</span>
        </div>
      </div>

      {excludedByScope.length > 0 && (
        <div className="fw-inspector-row">
          <span className="fw-inspector-row-label">Other theme scopes</span>
          <span className="fw-inspector-row-value">{excludedByScope.length} excluded</span>
        </div>
      )}

      {analysis.hasCycle && (
        <p className="fw-inspector-note">
          Dependency cycle detected - affected traversal stopped safely.
        </p>
      )}
    </section>
  );
}

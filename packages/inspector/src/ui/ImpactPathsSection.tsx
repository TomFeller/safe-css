import type { ImpactPath } from "../impact/types";

/**
 * One path, rendered as nested `└──` rows: the target token first, then
 * every intermediate dependent token, ending in the consumer
 * (recipe/primitive) and how many rendered elements share this exact
 * path - e.g. `colors.border └── border.subtle └── Card ×18`. Direct paths
 * are a single token long, so they render as just `radius.card └── Card ×18`.
 */
function PathRow({ path }: { path: ImpactPath }) {
  return (
    <div className="fw-inspector-token">
      {path.tokens.map((token, index) => (
        <div key={token} className="fw-inspector-ancestry-item" style={{ paddingLeft: index * 12 }}>
          {index > 0 && <span className="fw-inspector-depth">{"└"}</span>}
          <span className="fw-inspector-code">{token}</span>
        </div>
      ))}
      <div className="fw-inspector-ancestry-item" style={{ paddingLeft: path.tokens.length * 12 }}>
        <span className="fw-inspector-depth">{"└"}</span>
        <span className="fw-inspector-code">
          {path.consumerLabel} ×{path.count}
        </span>
      </div>
    </div>
  );
}

/** "Impact paths": collapsed, deduplicated explanations of *why* each group of rendered elements is affected - see `impact/impactPaths.ts`. */
export function ImpactPathsSection({ paths }: { paths: ImpactPath[] }) {
  return (
    <section className="fw-inspector-section">
      <h3 className="fw-inspector-section-title">Impact paths</h3>
      {paths.length === 0 ? (
        <p className="fw-inspector-empty">
          No rendered safe-css elements currently depend on this token.
        </p>
      ) : (
        paths.map((path, index) => (
          <PathRow key={`${path.tokens.join(">")}:${path.consumerLabel}:${index}`} path={path} />
        ))
      )}
    </section>
  );
}

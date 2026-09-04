import type { DependencyTreeNode, InspectedToken } from "../types";

function DependencyTree({ nodes, top = false }: { nodes: DependencyTreeNode[]; top?: boolean }) {
  if (nodes.length === 0) return null;

  return (
    <ul className={`fw-inspector-tree${top ? " top" : ""}`}>
      {nodes.map((node) => (
        <li key={node.cssVariable}>
          <span className="fw-inspector-code">{node.token}</span>
          {node.cycle && (
            <span className="fw-inspector-tree-cycle"> (cycle detected - stopped here)</span>
          )}
          <DependencyTree nodes={node.children} />
        </li>
      ))}
    </ul>
  );
}

/** The "Tokens" section: every token the selected element consumes, its raw and resolved values, and which CSS properties (best-effort) use it. */
export function TokensSection({ tokens }: { tokens: InspectedToken[] }) {
  return (
    <section className="fw-inspector-section">
      <h3 className="fw-inspector-section-title">Tokens</h3>
      {tokens.length === 0 ? (
        <p className="fw-inspector-empty">This element doesn't use any tokens.</p>
      ) : (
        tokens.map((token) => (
          <div key={token.token} className="fw-inspector-token">
            <div className="fw-inspector-token-name fw-inspector-code">{token.token}</div>

            <div className="fw-inspector-row">
              <span className="fw-inspector-row-label">Used by</span>
              <span className="fw-inspector-row-value">
                {token.properties.length > 0 ? (
                  token.properties.join(", ")
                ) : (
                  <span className="fw-inspector-empty">Unknown</span>
                )}
              </span>
            </div>

            <div className="fw-inspector-row">
              <span className="fw-inspector-row-label">Raw value</span>
              <span className="fw-inspector-row-value fw-inspector-code">
                {token.rawValue ?? <span className="fw-inspector-empty">Not defined</span>}
              </span>
            </div>

            {token.resolvedValue !== undefined && token.resolvedValue !== token.rawValue && (
              <div className="fw-inspector-row">
                <span className="fw-inspector-row-label">Resolved</span>
                <span className="fw-inspector-row-value fw-inspector-code">
                  {token.resolvedValue}
                </span>
              </div>
            )}
          </div>
        ))
      )}
    </section>
  );
}

/**
 * The "Token dependencies" section: for every token that itself references
 * other `--fw-*` tokens (e.g. `border.subtle` referencing `colors.border`),
 * renders that dependency tree. Tokens with no dependencies are omitted
 * here entirely - they already appear in the "Tokens" section above.
 */
export function TokenDependenciesSection({ tokens }: { tokens: InspectedToken[] }) {
  const withDependencies = tokens.filter((token) => token.dependencies.length > 0);

  return (
    <section className="fw-inspector-section">
      <h3 className="fw-inspector-section-title">Token dependencies</h3>
      {withDependencies.length === 0 ? (
        <p className="fw-inspector-empty">None of this element's tokens depend on other tokens.</p>
      ) : (
        withDependencies.map((token) => (
          <div key={token.token} className="fw-inspector-token">
            <div className="fw-inspector-token-name fw-inspector-code">{token.token}</div>
            <DependencyTree nodes={token.dependencies} top />
          </div>
        ))
      )}
    </section>
  );
}

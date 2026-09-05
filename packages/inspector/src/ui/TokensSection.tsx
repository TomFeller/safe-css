import type { DependencyTreeNode, InspectedToken } from "../types";

interface DependencyTreeProps {
  nodes: DependencyTreeNode[];
  top?: boolean;
  onAnalyzeImpact?: (token: string) => void;
}

/**
 * A dependency node like `colors.border` is never directly settable on any
 * element (there's no "border color" prop - only the semantic `border`
 * prop pointing at `border.*` tokens), so it can only ever be reached
 * through a tree like this one, not through the flat "Tokens" list above.
 * "Analyze impact" is offered here too (v0.3) for exactly that reason -
 * `buildImpactTarget` resolves any `--fw-*` variable from the selected
 * element's DOM position regardless of whether that element's own
 * `data-fw-tokens` happens to list it.
 */
function DependencyTree({ nodes, top = false, onAnalyzeImpact }: DependencyTreeProps) {
  if (nodes.length === 0) return null;

  return (
    <ul className={`fw-inspector-tree${top ? " top" : ""}`}>
      {nodes.map((node) => (
        <li key={node.cssVariable}>
          <span className="fw-inspector-code">{node.token}</span>
          {node.cycle && (
            <span className="fw-inspector-tree-cycle"> (cycle detected - stopped here)</span>
          )}
          {!node.cycle && onAnalyzeImpact && (
            <button
              type="button"
              className="fw-inspector-link-button fw-inspector-dependency-impact-button"
              onClick={() => onAnalyzeImpact(node.token)}
            >
              Analyze impact
            </button>
          )}
          <DependencyTree nodes={node.children} onAnalyzeImpact={onAnalyzeImpact} />
        </li>
      ))}
    </ul>
  );
}

export interface TokensSectionProps {
  tokens: InspectedToken[];
  /** Present (v0.3) whenever Impact Analysis can be launched from this panel - omitted entirely disables the affordance rather than rendering it inert. */
  onAnalyzeImpact?: (token: string) => void;
}

/** The "Tokens" section: every token the selected element consumes, its raw and resolved values, and which CSS properties (best-effort) use it. */
export function TokensSection({ tokens, onAnalyzeImpact }: TokensSectionProps) {
  return (
    <section className="fw-inspector-section">
      <h3 className="fw-inspector-section-title">Tokens</h3>
      {tokens.length === 0 ? (
        <p className="fw-inspector-empty">This element doesn't use any tokens.</p>
      ) : (
        tokens.map((token) => (
          <div key={token.token} className="fw-inspector-token">
            <div className="fw-inspector-token-name-row">
              <span className="fw-inspector-token-name fw-inspector-code">{token.token}</span>
              {onAnalyzeImpact && token.owner && (
                <button
                  type="button"
                  className="fw-inspector-link-button"
                  onClick={() => onAnalyzeImpact(token.token)}
                >
                  Analyze impact
                </button>
              )}
            </div>

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
export interface TokenDependenciesSectionProps {
  tokens: InspectedToken[];
  onAnalyzeImpact?: (token: string) => void;
}

export function TokenDependenciesSection({
  tokens,
  onAnalyzeImpact,
}: TokenDependenciesSectionProps) {
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
            <DependencyTree nodes={token.dependencies} top onAnalyzeImpact={onAnalyzeImpact} />
          </div>
        ))
      )}
    </section>
  );
}

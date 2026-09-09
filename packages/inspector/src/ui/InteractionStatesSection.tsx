import { DependencyTree } from "./TokensSection";
import type { InteractionState } from "../types";

export interface InteractionStatesSectionProps {
  interactionStates: InteractionState[];
  /** Same affordance as `TokensSection`/`TokenDependenciesSection` - launches Impact Analysis on a state declaration's own token, or one of its dependency-tree nodes. Omit to disable the affordance entirely. */
  onAnalyzeImpact?: (token: string) => void;
}

/**
 * "Interaction states": what hover/focus-visible/active styling the
 * selected element's recipe declares - describing the *rules* available on
 * this rendered element, not a live event debugger (no hover simulation,
 * no JS mouse/focus listeners here - see docs/architecture.md#inspector).
 *
 * A token-backed declaration reuses `InspectedToken`'s full shape (raw/
 * resolved value, dependency tree, "Analyze impact") exactly like the
 * ordinary Tokens section does; a literal declaration (`border: "none"`
 * today - the only value Core supports without a token) renders the
 * literal plainly and never offers "Analyze impact", since there is no
 * token to analyze.
 */
export function InteractionStatesSection({
  interactionStates,
  onAnalyzeImpact,
}: InteractionStatesSectionProps) {
  return (
    <section className="fw-inspector-section">
      <h3 className="fw-inspector-section-title">Interaction states</h3>
      {interactionStates.length === 0 ? (
        <p className="fw-inspector-empty">
          This element's recipe declares no hover/focus-visible/active styling.
        </p>
      ) : (
        interactionStates.map((state) => (
          <div key={state.state} className="fw-inspector-state-group">
            <div className="fw-inspector-state-name">{state.label}</div>
            {state.declarations.map((declaration) => (
              <div
                key={declaration.property}
                className="fw-inspector-token fw-inspector-state-declaration"
              >
                <div className="fw-inspector-token-name-row">
                  <span className="fw-inspector-token-name fw-inspector-code">
                    {declaration.property}
                  </span>
                  {declaration.token && onAnalyzeImpact && declaration.token.owner && (
                    <button
                      type="button"
                      className="fw-inspector-link-button"
                      onClick={() => onAnalyzeImpact(declaration.token!.token)}
                    >
                      Analyze impact
                    </button>
                  )}
                </div>

                {declaration.token ? (
                  <>
                    <div className="fw-inspector-row">
                      <span className="fw-inspector-row-label">Token</span>
                      <span className="fw-inspector-row-value fw-inspector-code">
                        {declaration.token.token}
                      </span>
                    </div>
                    <div className="fw-inspector-row">
                      <span className="fw-inspector-row-label">Raw value</span>
                      <span className="fw-inspector-row-value fw-inspector-code">
                        {declaration.token.rawValue ?? (
                          <span className="fw-inspector-empty">Not defined</span>
                        )}
                      </span>
                    </div>
                    {declaration.token.resolvedValue !== undefined &&
                      declaration.token.resolvedValue !== declaration.token.rawValue && (
                        <div className="fw-inspector-row">
                          <span className="fw-inspector-row-label">Resolved</span>
                          <span className="fw-inspector-row-value fw-inspector-code">
                            {declaration.token.resolvedValue}
                          </span>
                        </div>
                      )}
                    {declaration.token.dependencies.length > 0 && (
                      <DependencyTree
                        nodes={declaration.token.dependencies}
                        top
                        onAnalyzeImpact={onAnalyzeImpact}
                      />
                    )}
                  </>
                ) : (
                  <div className="fw-inspector-row">
                    <span className="fw-inspector-row-label">Literal</span>
                    <span className="fw-inspector-row-value fw-inspector-code">
                      {declaration.literal}
                    </span>
                  </div>
                )}

                {declaration.suppressedBy && (
                  <p className="fw-inspector-note fw-inspector-state-suppressed">
                    Suppressed by unsafeCss.{declaration.suppressedBy.unsafeCssKey} on this instance
                  </p>
                )}
              </div>
            ))}
          </div>
        ))
      )}
    </section>
  );
}

import { ImpactSummary } from "./ImpactSummary";
import { ImpactGroups } from "./ImpactGroups";
import { ImpactPathsSection } from "./ImpactPathsSection";
import type { ImpactAnalysis } from "../impact/types";

export interface ImpactPanelProps {
  analysis: ImpactAnalysis | null;
  error: string | null;
  highlightAffected: boolean;
  onToggleHighlight: () => void;
  onRefresh: () => void;
  onBackToElement: () => void;
  onClose: () => void;
}

/**
 * Impact mode's entire panel body - reuses the existing Inspector panel
 * chrome (header/close), it's just a different `panelMode` for the same
 * panel, never a second floating window. See
 * docs/architecture.md#impact-analysis.
 */
export function ImpactPanel({
  analysis,
  error,
  highlightAffected,
  onToggleHighlight,
  onRefresh,
  onBackToElement,
  onClose,
}: ImpactPanelProps) {
  return (
    <div className="fw-inspector-panel">
      <div className="fw-inspector-panel-header">
        <span className="fw-inspector-panel-title">safe-css Inspector</span>
        <div className="fw-inspector-panel-actions">
          <button type="button" className="fw-inspector-icon-button" onClick={onRefresh}>
            Refresh impact
          </button>
          <button type="button" className="fw-inspector-icon-button" onClick={onClose}>
            Close
          </button>
        </div>
      </div>

      <div className="fw-inspector-panel-body">
        <div className="fw-inspector-impact-actions">
          <button type="button" className="fw-inspector-icon-button" onClick={onBackToElement}>
            Back to element
          </button>
          {analysis && (
            <button type="button" className="fw-inspector-icon-button" onClick={onToggleHighlight}>
              {highlightAffected ? "Hide highlights" : "Highlight affected"}
            </button>
          )}
        </div>

        {error && (
          <section className="fw-inspector-section">
            <h3 className="fw-inspector-section-title">Impact unavailable</h3>
            <p className="fw-inspector-empty">{error}</p>
          </section>
        )}

        {!error && analysis && (
          <>
            <ImpactSummary analysis={analysis} />
            <ImpactGroups recipes={analysis.recipes} primitives={analysis.primitives} />
            <ImpactPathsSection paths={analysis.paths} />
          </>
        )}
      </div>
    </div>
  );
}

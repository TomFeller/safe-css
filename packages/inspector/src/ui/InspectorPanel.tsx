import { ElementSection } from "./ElementSection";
import { AncestrySection } from "./AncestrySection";
import { TokensSection, TokenDependenciesSection } from "./TokensSection";
import { UnsafeCssSection } from "./UnsafeCssSection";
import type { InspectedElement } from "../types";

export interface InspectorPanelProps {
  inspected: InspectedElement;
  stale: boolean;
  onRefresh: () => void;
  onClose: () => void;
  /** Wires up each token's "Analyze impact" action (v0.3). Omit to disable the affordance entirely. */
  onAnalyzeImpact?: (token: string) => void;
}

/**
 * The read-only floating panel: docked to the right edge, fixed width,
 * overlaying the page (via the Inspector's own fixed Shadow DOM host)
 * rather than resizing it. Composes the five panel sections in the order
 * the spec calls for: Element, Safe CSS ancestry, Tokens, Token
 * dependencies, Custom CSS.
 */
export function InspectorPanel({
  inspected,
  stale,
  onRefresh,
  onClose,
  onAnalyzeImpact,
}: InspectorPanelProps) {
  return (
    <div className="fw-inspector-panel">
      <div className="fw-inspector-panel-header">
        <span className="fw-inspector-panel-title">safe-css Inspector</span>
        <div className="fw-inspector-panel-actions">
          <button type="button" className="fw-inspector-icon-button" onClick={onRefresh}>
            Refresh
          </button>
          <button type="button" className="fw-inspector-icon-button" onClick={onClose}>
            Close
          </button>
        </div>
      </div>

      <div className="fw-inspector-panel-body">
        {stale && (
          <p className="fw-inspector-note">
            This element is no longer in the document. Showing its last known inspection data -
            select a new element to inspect.
          </p>
        )}
        <ElementSection element={inspected} />
        <AncestrySection element={inspected} />
        <TokensSection tokens={inspected.tokens} onAnalyzeImpact={onAnalyzeImpact} />
        <TokenDependenciesSection tokens={inspected.tokens} onAnalyzeImpact={onAnalyzeImpact} />
        <UnsafeCssSection unsafeCss={inspected.unsafeCss} />
      </div>
    </div>
  );
}

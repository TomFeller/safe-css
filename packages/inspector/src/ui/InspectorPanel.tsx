import { ElementSection } from "./ElementSection";
import { ExternalHooksSection } from "./ExternalHooksSection";
import { AncestrySection } from "./AncestrySection";
import { TokensSection, TokenDependenciesSection } from "./TokensSection";
import { InteractionStatesSection } from "./InteractionStatesSection";
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
 * rather than resizing it. Composes the panel sections in order: Element,
 * External hooks (v0.4 Phase 3 - directly after Element, since both
 * describe the selected element's own identity, before any styling/token
 * analysis begins; omits itself entirely when there's nothing to show),
 * Safe CSS ancestry, Tokens, Interaction states (v0.4 Phase 2 - right after
 * Tokens and before Token dependencies, since a state declaration's own
 * dependency tree is rendered inline within it rather than folded into the
 * ordinary Token dependencies section), Token dependencies, Custom CSS.
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
        <ExternalHooksSection element={inspected} />
        <AncestrySection element={inspected} />
        <TokensSection tokens={inspected.tokens} onAnalyzeImpact={onAnalyzeImpact} />
        <InteractionStatesSection
          interactionStates={inspected.interactionStates}
          onAnalyzeImpact={onAnalyzeImpact}
        />
        <TokenDependenciesSection tokens={inspected.tokens} onAnalyzeImpact={onAnalyzeImpact} />
        <UnsafeCssSection unsafeCss={inspected.unsafeCss} />
      </div>
    </div>
  );
}

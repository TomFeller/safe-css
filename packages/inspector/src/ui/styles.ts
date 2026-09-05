/**
 * The Inspector's entire stylesheet, as a plain string injected into its
 * own Shadow DOM (`<style>` appended to the shadow root in
 * `component/SafeCssInspector.tsx`). Deliberately not safe-css itself - the
 * tool must stay independent of the framework it inspects - and
 * deliberately not a build-time CSS import, so the package can ship as a
 * single JS bundle with no separate stylesheet asset to remember to load.
 */
export const INSPECTOR_STYLES = `
:host, * {
  box-sizing: border-box;
}

.fw-inspector-root {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  font-size: 13px;
  line-height: 1.4;
  color: #e8e8e8;
}

/* ---------- launcher ---------- */

.fw-inspector-launcher {
  position: fixed;
  right: 20px;
  bottom: 20px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  border: 1px solid #3a3a3a;
  border-radius: 999px;
  background: #1e1e1e;
  color: #e8e8e8;
  font: inherit;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.35);
  pointer-events: auto;
}

.fw-inspector-launcher:hover {
  border-color: #4da3ff;
}

.fw-inspector-launcher.picking {
  background: #4da3ff;
  border-color: #4da3ff;
  color: #0a0a0a;
}

.fw-inspector-launcher-dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: #4da3ff;
}

.fw-inspector-launcher.picking .fw-inspector-launcher-dot {
  background: #0a0a0a;
}

/* ---------- picking banner ---------- */

.fw-inspector-banner {
  position: fixed;
  top: 16px;
  left: 50%;
  transform: translateX(-50%);
  padding: 8px 14px;
  border-radius: 8px;
  background: #1e1e1e;
  border: 1px solid #3a3a3a;
  color: #e8e8e8;
  font-size: 12px;
  pointer-events: none;
}

.fw-inspector-banner kbd {
  padding: 1px 5px;
  border-radius: 4px;
  border: 1px solid #4a4a4a;
  background: #2a2a2a;
  font-family: inherit;
}

/* ---------- highlight overlay ---------- */

.fw-inspector-highlight {
  position: fixed;
  border: 2px solid #4da3ff;
  background: rgba(77, 163, 255, 0.15);
  pointer-events: none;
}

.fw-inspector-highlight-label {
  position: absolute;
  left: 0;
  padding: 3px 8px;
  border-radius: 4px;
  background: #4da3ff;
  color: #0a0a0a;
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
}

.fw-inspector-highlight-label.above {
  bottom: calc(100% + 4px);
}

.fw-inspector-highlight-label.below {
  top: calc(100% + 4px);
}

/* The persistent "selected" highlight uses a distinct color from the
   transient hover box so the two remain visually distinguishable when both
   are visible at once during re-pick (hovering a new candidate while the
   previous selection is still shown elsewhere on the page). */
.fw-inspector-highlight.selected {
  border-color: #22c55e;
  background: rgba(34, 197, 94, 0.12);
}

.fw-inspector-highlight-label.selected {
  background: #22c55e;
  color: #06210f;
}

/* ---------- panel ---------- */

.fw-inspector-panel {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  width: 380px;
  max-width: 100vw;
  display: flex;
  flex-direction: column;
  background: #1a1a1a;
  border-left: 1px solid #3a3a3a;
  box-shadow: -4px 0 24px rgba(0, 0, 0, 0.4);
  pointer-events: auto;
  overflow: hidden;
}

.fw-inspector-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid #2e2e2e;
  flex-shrink: 0;
}

.fw-inspector-panel-title {
  font-weight: 700;
  font-size: 13px;
}

.fw-inspector-panel-actions {
  display: flex;
  gap: 6px;
}

.fw-inspector-icon-button {
  border: 1px solid #3a3a3a;
  border-radius: 6px;
  background: #232323;
  color: #e8e8e8;
  font: inherit;
  padding: 4px 9px;
  cursor: pointer;
}

.fw-inspector-icon-button:hover {
  border-color: #4da3ff;
}

.fw-inspector-panel-body {
  flex: 1;
  overflow-y: auto;
  padding: 4px 16px 24px;
}

.fw-inspector-section {
  padding: 14px 0;
  border-bottom: 1px solid #262626;
}

.fw-inspector-section:last-child {
  border-bottom: none;
}

.fw-inspector-section-title {
  margin: 0 0 8px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #9a9a9a;
}

.fw-inspector-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  padding: 3px 0;
}

.fw-inspector-row-label {
  color: #9a9a9a;
  flex-shrink: 0;
}

.fw-inspector-row-value {
  text-align: right;
  overflow-wrap: anywhere;
}

.fw-inspector-code {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 12px;
}

.fw-inspector-badge {
  display: inline-block;
  padding: 1px 7px;
  border-radius: 999px;
  background: #232323;
  border: 1px solid #3a3a3a;
  font-size: 11px;
}

.fw-inspector-empty {
  color: #7a7a7a;
  font-style: italic;
}

.fw-inspector-ancestry-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 0;
}

.fw-inspector-ancestry-item .fw-inspector-depth {
  color: #5a5a5a;
}

.fw-inspector-ancestry-item.selected .fw-inspector-code {
  color: #22c55e;
  font-weight: 700;
}

.fw-inspector-selected-marker {
  color: #22c55e;
  font-size: 11px;
}

.fw-inspector-token {
  padding: 8px 10px;
  margin-bottom: 8px;
  border: 1px solid #262626;
  border-radius: 8px;
  background: #1f1f1f;
}

.fw-inspector-token:last-child {
  margin-bottom: 0;
}

.fw-inspector-token-name {
  font-weight: 600;
}

.fw-inspector-token-name-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 2px;
}

.fw-inspector-link-button {
  border: none;
  background: none;
  padding: 0;
  font: inherit;
  font-size: 11px;
  font-weight: 600;
  color: #a855f7;
  cursor: pointer;
  white-space: nowrap;
}

.fw-inspector-link-button:hover {
  text-decoration: underline;
}

.fw-inspector-dependency-impact-button {
  margin-left: 8px;
}

.fw-inspector-tree {
  list-style: none;
  margin: 4px 0 0;
  padding-left: 14px;
  border-left: 1px solid #2e2e2e;
}

.fw-inspector-tree.top {
  padding-left: 0;
  border-left: none;
}

.fw-inspector-tree-cycle {
  color: #ff9d4d;
}

.fw-inspector-note {
  margin-top: 6px;
  font-size: 11px;
  color: #d9a441;
}

/* ---------- impact analysis ---------- */

.fw-inspector-impact-note {
  margin: 8px 0;
  padding: 8px 10px;
  border-radius: 6px;
  background: #201a2e;
  border: 1px solid #3a2e52;
  font-size: 11px;
  color: #c9b8e8;
}

.fw-inspector-impact-headline {
  margin: 12px 0;
  text-align: center;
}

.fw-inspector-impact-headline-count {
  font-size: 32px;
  font-weight: 700;
  color: #a855f7;
  line-height: 1;
}

.fw-inspector-impact-headline-label {
  margin-top: 4px;
  font-size: 11px;
  color: #9a9a9a;
}

.fw-inspector-impact-stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-top: 8px;
}

.fw-inspector-impact-stats > div {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 6px 8px;
  border-radius: 6px;
  background: #1f1f1f;
  border: 1px solid #262626;
}

.fw-inspector-impact-subheading {
  margin-top: 16px;
}

.fw-inspector-impact-breakdown {
  color: #9a9a9a;
  font-size: 11px;
}

.fw-inspector-impact-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 4px;
}

.fw-inspector-impact-highlight {
  position: fixed;
  pointer-events: none;
}

.fw-inspector-impact-highlight.direct {
  border: 2px solid #a855f7;
  background: rgba(168, 85, 247, 0.14);
}

.fw-inspector-impact-highlight.indirect {
  border: 2px dashed #a855f7;
  background: rgba(168, 85, 247, 0.06);
}
`;

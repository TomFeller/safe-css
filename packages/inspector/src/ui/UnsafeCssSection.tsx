import type { UnsafeCssInfo } from "../types";

/**
 * The "Custom CSS" section: reports how many `unsafeCss` declarations Core
 * itself counted (`info.count`, from `data-fw-unsafe-css` - always the
 * source of truth) alongside this package's own best-effort guess at
 * *which* inline declarations they are (`info.detected`). The two can
 * disagree - a token-driven-looking value could still be user-authored, or
 * a structural literal this package doesn't yet recognize could be
 * mistaken for one - so a mismatch is surfaced plainly rather than hidden.
 */
export function UnsafeCssSection({ unsafeCss }: { unsafeCss: UnsafeCssInfo }) {
  return (
    <section className="fw-inspector-section">
      <h3 className="fw-inspector-section-title">Custom CSS</h3>

      <div className="fw-inspector-row">
        <span className="fw-inspector-row-label">unsafeCss declarations</span>
        <span className="fw-inspector-row-value fw-inspector-code">{unsafeCss.count}</span>
      </div>

      {unsafeCss.count === 0 ? (
        <p className="fw-inspector-empty">This element has no unsafeCss.</p>
      ) : unsafeCss.detected.length === 0 ? (
        <p className="fw-inspector-empty">
          Core reports {unsafeCss.count}, but none could be identified from this element's inline
          style.
        </p>
      ) : (
        unsafeCss.detected.map((property) => (
          <div key={property.property} className="fw-inspector-row">
            <span className="fw-inspector-row-label fw-inspector-code">{property.property}</span>
            <span className="fw-inspector-row-value fw-inspector-code">{property.value}</span>
          </div>
        ))
      )}

      {unsafeCss.uncertain && (
        <p className="fw-inspector-note">
          This list is best-effort and may be incomplete - it can't always distinguish unsafeCss
          from a primitive's own structural styles.
        </p>
      )}
    </section>
  );
}

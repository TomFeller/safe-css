import type { InspectedElement } from "../types";

/**
 * "External hooks": classes and an `id` on the selected element that
 * safe-css itself did not put there - i.e. that something *outside*
 * safe-css (CSS, JS querying, testing, a third-party library) may be
 * relying on. Deliberately not named "External styling" - Inspector has no
 * way to know whether any of these actually style anything; this section
 * only reports their existence, never claims a CSS effect. See
 * `inspection/inspectElement.ts`'s `buildExternalHooks`.
 *
 * Omitted entirely (returns `null`) when the element has neither an
 * external class nor an `id`, to keep the panel free of empty-state noise
 * for the common case - most safe-css elements have neither.
 */
export function ExternalHooksSection({ element }: { element: InspectedElement }) {
  const { externalClasses, id } = element.externalHooks;

  if (externalClasses.length === 0 && id === undefined) return null;

  return (
    <section className="fw-inspector-section">
      <h3 className="fw-inspector-section-title">External hooks</h3>

      {externalClasses.length > 0 && (
        <div className="fw-inspector-row" style={{ alignItems: "flex-start" }}>
          <span className="fw-inspector-row-label">className</span>
          <span
            className="fw-inspector-row-value"
            style={{ display: "flex", flexWrap: "wrap", gap: 4, justifyContent: "flex-end" }}
          >
            {externalClasses.map((className) => (
              <span key={className} className="fw-inspector-badge">
                {className}
              </span>
            ))}
          </span>
        </div>
      )}

      {id !== undefined && (
        <div className="fw-inspector-row">
          <span className="fw-inspector-row-label">id</span>
          <span className="fw-inspector-row-value fw-inspector-code">{id}</span>
        </div>
      )}
    </section>
  );
}

import type { UnsafeCssInfo, UnsafeCssProperty } from "../types";

/**
 * Literal values primitives themselves author directly onto `style` (not
 * through a `var(--fw-...)` token reference) as part of ordinary structural
 * layout - never as user-supplied `unsafeCss`. Kept intentionally small and
 * literal (no pattern matching) so it only suppresses exact, known-safe
 * false positives such as Box's `border="none"` / `shadow="none"` and
 * Overlay's center-anchor `inset: 50%` / centering `transform`, rather than
 * guessing at what "looks structural".
 */
const KNOWN_STRUCTURAL_LITERALS = new Set([
  "none",
  "50%",
  "0",
  "0px",
  "translate(-50%, -50%)",
  "translate(-50%, 0)",
  "translate(0, -50%)",
]);

function isTokenDriven(value: string): boolean {
  return value.includes("var(--fw-");
}

function isKnownStructuralLiteral(value: string): boolean {
  return KNOWN_STRUCTURAL_LITERALS.has(value.trim());
}

/**
 * Best-effort scan of `element`'s inline `style` for declarations that look
 * like they came from `unsafeCss` rather than from a primitive's own
 * token-driven or structural output. This can never be exact from the
 * outside: the Inspector only ever sees the DOM's *resulting* inline style,
 * never which layer authored a given declaration, so `count` (read from
 * `data-fw-unsafe-css`) is always the source of truth - see
 * docs/architecture.md#inspector. `detected` is only a best-effort
 * explanation of which declarations plausibly contributed to that count,
 * and `uncertain` is set whenever the two disagree, so the panel can say so
 * plainly instead of implying a complete list.
 */
export function detectUnsafeCss(element: HTMLElement, count: number): UnsafeCssInfo {
  const detected: UnsafeCssProperty[] = [];
  const style = element.style;

  for (let i = 0; i < style.length; i++) {
    const property = style.item(i);
    if (!property) continue;

    const value = style.getPropertyValue(property).trim();
    if (!value) continue;
    if (isTokenDriven(value)) continue;
    if (isKnownStructuralLiteral(value)) continue;

    detected.push({ property, value });
  }

  return { count, detected, uncertain: detected.length !== count };
}

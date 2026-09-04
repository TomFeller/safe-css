/**
 * Finds the nearest inline definition of `cssVariable`, starting at
 * `element` itself and walking up through `parentElement`. This is exactly
 * how CSS custom property inheritance itself works, so it naturally
 * respects nested `ThemeProvider`s: whichever provider's wrapper `<div>` is
 * closest in the DOM (not necessarily the outermost one) owns the active
 * value, because `ThemeProvider` always writes every token as an inline
 * style on that wrapper - see docs/architecture.md#inspector.
 */
export function findNearestVariableDefinition(
  element: HTMLElement,
  cssVariable: string,
): { owner: HTMLElement; rawValue: string } | null {
  let current: HTMLElement | null = element;

  while (current) {
    const value = current.style.getPropertyValue(cssVariable);
    if (value) {
      return { owner: current, rawValue: value.trim() };
    }
    current = current.parentElement;
  }

  return null;
}

/** A lookup from CSS variable name to its raw (unresolved) authored value, or `null` if undefined. */
export type VariableLookup = (cssVariable: string) => string | null;

const FW_VAR_REFERENCE = /var\(\s*(--fw-[a-zA-Z0-9-]+)\s*(?:,\s*([^)]*))?\)/g;

/**
 * Substitutes every `var(--fw-...)` reference in `rawValue` with that
 * variable's own (recursively resolved) value, via `lookup`. Only ever
 * touches the safe-css `--fw-*` namespace - this is not a general CSS
 * `var()` resolver, and doesn't need to be one, since safe-css's own token
 * dependency model (see docs/architecture.md#token-dependencies in Core)
 * never references anything outside it.
 *
 * This is the primary resolution mechanism, not a fallback: relying on
 * `getComputedStyle` for custom-property substitution is inconsistent
 * across environments (notably jsdom, which the test suite runs under), so
 * resolving safe-css's own small, well-defined reference syntax directly is
 * both simpler and reliably testable. A reference to an undefined variable
 * falls back to its `var(..., fallback)` value if one was authored, or is
 * left as the literal `var(...)` text otherwise - never invented.
 *
 * Cycle-safe: a variable already being resolved higher up the current
 * substitution chain is left as its literal `var(...)` text rather than
 * recursing forever.
 */
export function resolveTokenValue(
  rawValue: string,
  lookup: VariableLookup,
  seen: ReadonlySet<string> = new Set(),
): string {
  return rawValue.replace(FW_VAR_REFERENCE, (whole, cssVariable: string, fallback?: string) => {
    if (seen.has(cssVariable)) return whole;

    const nested = lookup(cssVariable);
    if (nested == null) return fallback !== undefined ? fallback.trim() : whole;

    const nextSeen = new Set(seen);
    nextSeen.add(cssVariable);
    return resolveTokenValue(nested, lookup, nextSeen);
  });
}

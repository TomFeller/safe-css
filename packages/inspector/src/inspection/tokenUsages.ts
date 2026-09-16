import { hasTokenUsageMetadata, readTokenUsages } from "./metadata";
import { extractFwVariableReferences } from "../tokens/dependencies";

/**
 * Legacy/fallback: every inline-style CSS property on `element` whose value
 * references `cssVariable` - as an exact `var(--fw-...)` reference, not a
 * text substring. Most tokens appear as a property's entire value
 * (`color: var(--fw-color-text)`), but some are embedded inside a compound
 * value (Grid's `minItemWidth` token lives inside `grid-template-columns:
 * repeat(auto-fill, minmax(var(--fw-size-...), 1fr))`), and a property can
 * reference more than one token at once (a `box-shadow` list, say) - so
 * this parses every `var(--fw-...)` reference out of the value (reusing
 * `extractFwVariableReferences`, the same parser dependency-tree building
 * uses) and checks for an exact match among them.
 *
 * Substring matching here previously caused false positives: `--fw-space-card`
 * would match inside `--fw-space-card-lg`'s own reference text, wrongly
 * attributing an unrelated token's property to `space.card`. Reusing the
 * real reference parser instead of ad hoc string matching is what rules
 * that out categorically, not just for this one case.
 *
 * This is no longer the primary source of "used by" attribution - Core's
 * explicit `data-fw-token-usages` metadata is (see
 * {@link resolveTokenUsageProperties}), since reconstructing a shorthand
 * property (`padding`, `border`, ...) from `element.style` this way is not
 * reliable in a real browser: a shorthand set via a `var()` reference can
 * serialize as its expanded longhands, or vice versa, depending on the
 * engine, which caused real "Used by: Unknown" false negatives. This scan
 * remains as the fallback for elements an older Core build (predating
 * `data-fw-token-usages`) rendered.
 */
export function findPropertiesUsingVariable(element: HTMLElement, cssVariable: string): string[] {
  const properties: string[] = [];
  const style = element.style;

  for (let i = 0; i < style.length; i++) {
    const property = style.item(i);
    if (!property) continue;
    // Core's interactive-state bridge always writes an inline
    // `--fw-state-<state>-<property>-value` custom property for every
    // declared state x property, regardless of whether that state is
    // currently active - that's real, but it's framework plumbing, not a
    // genuine "used by" CSS property, and must never be shown as one in the
    // ordinary Tokens section (it's covered separately by
    // `interactionStates` - see `inspection/inspectElement.ts`'s
    // `buildInteractionStates`).
    if (property.startsWith("--fw-state-")) continue;
    if (extractFwVariableReferences(style.getPropertyValue(property)).includes(cssVariable)) {
      properties.push(property);
    }
  }

  return properties;
}

/**
 * `token`'s CSS property usages on `element`'s own ordinary/resting styling,
 * grouped once per element from `data-fw-token-usages` (see
 * `inspection/metadata.ts`) - `null` when Core didn't emit that attribute at
 * all (an older Core build), signaling every lookup should fall back to
 * {@link findPropertiesUsingVariable} instead.
 */
export type TokenUsageLookup = Map<string, string[]> | null;

/**
 * Builds {@link TokenUsageLookup} for `element`. Callers that need to
 * resolve more than one token on the same element (the Tokens section's
 * full token list, or Impact Analysis walking every one of a candidate's
 * `data-fw-tokens`) should call this once per element and reuse the result,
 * rather than re-reading/re-parsing `data-fw-token-usages` per token.
 */
export function buildTokenUsageLookup(element: HTMLElement): TokenUsageLookup {
  if (!hasTokenUsageMetadata(element)) return null;

  const byToken = new Map<string, string[]>();
  for (const { token, property } of readTokenUsages(element)) {
    const properties = byToken.get(token);
    if (properties) properties.push(property);
    else byToken.set(token, [property]);
  }
  return byToken;
}

/**
 * The single "which CSS properties does `token` genuinely, ordinarily use
 * here" check - shared by the Element Inspector's Tokens section
 * (`inspection/inspectElement.ts`) and Impact Analysis
 * (`impact/analyzeImpact.ts`), so the two can never disagree about what
 * counts as ordinary usage. Core's explicit `data-fw-token-usages` metadata
 * is authoritative when `lookup` is non-`null` (trusted even when it says
 * zero properties, since a modern Core build only omits an entry for a
 * token that has no ordinary usage at all, e.g. a state-only token),
 * falling back to the legacy `element.style` reverse scan
 * ({@link findPropertiesUsingVariable}) only for an element an older Core
 * build rendered.
 */
export function resolveTokenUsageProperties(
  element: HTMLElement,
  token: string,
  cssVariable: string,
  lookup: TokenUsageLookup,
): string[] {
  if (lookup) return lookup.get(token) ?? [];
  return findPropertiesUsingVariable(element, cssVariable);
}

/**
 * Whether `token` has at least one genuine ordinary/resting CSS-property
 * usage on `element` - the boolean Impact Analysis needs when deciding
 * whether a token that's also state-declared deserves a plain (non-`via`)
 * path, via the exact same resolution {@link resolveTokenUsageProperties}
 * uses. A token that isn't state-declared at all never needs this check -
 * `data-fw-tokens` already answers it unambiguously - see
 * `impact/analyzeImpact.ts`'s `hasOrdinaryUsage`.
 */
export function hasOrdinaryTokenUsage(
  element: HTMLElement,
  token: string,
  cssVariable: string,
  lookup: TokenUsageLookup,
): boolean {
  return resolveTokenUsageProperties(element, token, cssVariable, lookup).length > 0;
}

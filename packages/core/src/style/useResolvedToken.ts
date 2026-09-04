import { useThemeMeta } from "../theme/ThemeContext";
import { tokenVarRef } from "../theme/cssVariables";
import { warnInvalidToken, warnMissingThemeProvider } from "../diagnostics/warn";
import type { ThemeCategory } from "../theme/types";

/**
 * Gives primitives a single, consistent way to turn a token prop into a
 * `var(--fw-...)` reference while getting development diagnostics for free:
 * unknown tokens are warned about, and a missing `ThemeProvider` is warned
 * about once per component type.
 *
 * Subscribes only to token *names* (via `useThemeMeta`), not theme values -
 * building a `var()` reference is pure string concatenation from a category
 * and a token name, so it never needs the resolved value. This is what lets
 * a theme value change (`space.card: "16px" -> "20px"`) avoid re-rendering
 * every primitive in the tree; see docs/architecture.md#render-architecture.
 *
 * Resolution never falls back to a hardcoded value - an invalid or missing
 * token always produces a `var()` reference that simply won't resolve, so
 * invalid input fails safely (the property is left at its initial value)
 * instead of silently inventing a design value. See docs/architecture.md.
 */
export function useTokenResolver(componentName: string) {
  const { tokenNames, diagnostics, isProvided } = useThemeMeta();

  if (!isProvided) {
    warnMissingThemeProvider(componentName);
  }

  function resolveToken<C extends ThemeCategory>(
    category: C,
    token: string | undefined,
    propName: string,
  ): string | undefined {
    if (token === undefined) return undefined;

    if (!tokenNames[category].has(token)) {
      warnInvalidToken(diagnostics, category, token, componentName, propName);
    }

    return tokenVarRef(category, token);
  }

  return { diagnostics, resolveToken };
}

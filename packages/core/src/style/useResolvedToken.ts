import { useThemeContext } from "../theme/ThemeContext";
import { tokenVarRef } from "../theme/cssVariables";
import { warnInvalidToken, warnMissingThemeProvider } from "../diagnostics/warn";
import type { ThemeCategory } from "../theme/types";

/**
 * Gives primitives a single, consistent way to turn a token prop into a
 * `var(--fw-...)` reference while getting development diagnostics for free:
 * unknown tokens are warned about, and a missing `ThemeProvider` is warned
 * about once per component type.
 *
 * Resolution never falls back to a hardcoded value - an invalid or missing
 * token always produces a `var()` reference that simply won't resolve, so
 * invalid input fails safely (the property is left at its initial value)
 * instead of silently inventing a design value. See docs/architecture.md.
 */
export function useTokenResolver(componentName: string) {
  const { theme, diagnostics, isProvided } = useThemeContext();

  if (!isProvided) {
    warnMissingThemeProvider(componentName);
  }

  function resolveToken<C extends ThemeCategory>(
    category: C,
    token: (keyof (typeof theme)[C] & string) | (string & {}) | undefined,
    propName: string,
  ): string | undefined {
    if (token === undefined) return undefined;

    const categoryTokens = theme[category] as unknown as Record<string, unknown>;
    if (!(token in categoryTokens)) {
      warnInvalidToken(diagnostics, category, token, componentName, propName);
    }

    return tokenVarRef(category, token);
  }

  return { theme, diagnostics, resolveToken };
}

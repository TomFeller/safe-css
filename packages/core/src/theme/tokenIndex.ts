import type { Theme, ThemeCategory } from "./types";

/** For each theme category, the set of valid token *names* - not their values. */
export type TokenNameIndex = Record<ThemeCategory, ReadonlySet<string>>;

/**
 * A cheap, order-independent signature of a theme's token *names* (never its
 * values). Two themes with the same token names but different values -
 * exactly what happens when an app swaps `theme.space.card` from `"16px"`
 * to `"20px"` - produce the same signature.
 *
 * This is what lets {@link buildTokenNameIndex}'s result stay referentially
 * stable across a value-only theme change: `ThemeProvider` recomputes this
 * string on every render (cheap - a few dozen key lookups) and only rebuilds
 * the index, and therefore only produces a new context value, when the
 * signature actually changes. See docs/architecture.md#render-architecture.
 */
export function tokenNameSignature(theme: Theme): string {
  return (Object.keys(theme) as ThemeCategory[])
    .map((category) => `${category}:${Object.keys(theme[category]).join(",")}`)
    .join("|");
}

export function buildTokenNameIndex(theme: Theme): TokenNameIndex {
  const index = {} as Record<ThemeCategory, ReadonlySet<string>>;
  for (const category of Object.keys(theme) as ThemeCategory[]) {
    index[category] = new Set(Object.keys(theme[category]));
  }
  return index;
}

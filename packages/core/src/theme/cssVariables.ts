import type { Theme, ThemeCategory } from "./types";

/**
 * Maps a theme category to the CSS custom property segment used for it.
 * `colors` intentionally maps to the singular `color` to read naturally as
 * `--fw-color-surface`.
 */
const CATEGORY_PREFIX: Record<ThemeCategory, string> = {
  colors: "color",
  space: "space",
  radius: "radius",
  size: "size",
  border: "border",
  shadow: "shadow",
  layer: "layer",
};

/** Builds the CSS custom property name for a token, e.g. `--fw-space-card`. */
export function tokenVarName(category: ThemeCategory, token: string): string {
  return `--fw-${CATEGORY_PREFIX[category]}-${token}`;
}

/** Builds a `var(--fw-...)` reference for a token, for use in inline styles. */
export function tokenVarRef(category: ThemeCategory, token: string): string {
  return `var(${tokenVarName(category, token)})`;
}

/**
 * Flattens a {@link Theme} into a plain map of CSS custom properties, ready
 * to be applied as an inline `style` object by `ThemeProvider`. This is the
 * only place theme values are ever turned into literal CSS - every primitive
 * downstream only ever emits `var(--fw-...)` references, so a theme change
 * propagates without any component re-render being required.
 */
export function themeToCssVariables(theme: Theme): Record<string, string> {
  const vars: Record<string, string> = {};

  for (const category of Object.keys(theme) as ThemeCategory[]) {
    const tokens = theme[category] as unknown as Record<string, string | number>;
    for (const token of Object.keys(tokens)) {
      vars[tokenVarName(category, token)] = String(tokens[token]);
    }
  }

  return vars;
}

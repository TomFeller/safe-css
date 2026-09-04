import { defaultTheme } from "./defaultTheme";
import type { Theme, ThemeInput } from "./types";

/**
 * Builds a complete {@link Theme} by merging the given tokens over the
 * built-in defaults, category by category. Callers only need to specify the
 * tokens they want to change; everything else falls back to
 * {@link defaultTheme} so the theme is always fully populated (no partial
 * runtime theme ever reaches a component).
 */
export function createTheme(input: ThemeInput = {}): Theme {
  return {
    colors: { ...defaultTheme.colors, ...input.colors },
    space: { ...defaultTheme.space, ...input.space },
    radius: { ...defaultTheme.radius, ...input.radius },
    size: { ...defaultTheme.size, ...input.size },
    border: { ...defaultTheme.border, ...input.border },
    shadow: { ...defaultTheme.shadow, ...input.shadow },
    layer: { ...defaultTheme.layer, ...input.layer },
  };
}

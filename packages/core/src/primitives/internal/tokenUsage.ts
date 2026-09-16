/**
 * Converts a primitive's own JS `CSSProperties` style key to the rendered
 * kebab-case CSS property name it corresponds to (e.g. `borderRadius` ->
 * `border-radius`, `padding` -> `padding`). Every style key a safe-css
 * primitive sets is a plain, unprefixed longhand or shorthand CSS property
 * spelled in ordinary camelCase, so this single, uniform conversion is exact
 * for all of them - never a per-property lookup table to keep in sync by
 * hand as primitives grow new props.
 *
 * Used to build `data-fw-token-usages` entries (`token|property`) at the
 * exact call site each token resolves a style value - see
 * `internal/debugAttributes.ts`. Recording the mapping here, at the source,
 * is what lets the Inspector's Tokens section show an accurate "Used by"
 * CSS property without reverse-engineering it from `element.style`, which is
 * unreliable for shorthand properties in a real browser (see
 * `inspection/inspectElement.ts` in `@safe-css/inspector`).
 */
export function cssPropertyName(styleKey: string): string {
  return styleKey.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
}

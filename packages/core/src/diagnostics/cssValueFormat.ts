/**
 * CSS properties React (and browsers) treat as plain numbers, never `px`.
 * Mirrors the well-known "unitless" property list browsers/React use when
 * applying a numeric inline style value (see React's own `CSSProperty.js`) -
 * reproduced here because that list isn't part of any public API we can
 * import. Used only for *diagnostics formatting*: showing a developer what a
 * numeric `unsafeCss` value actually means, e.g. `fontWeight: 600` (not
 * `600px`) but `padding: 13px` (not bare `13`).
 */
const UNITLESS_PROPERTIES = new Set([
  "animationIterationCount",
  "aspectRatio",
  "borderImageOutset",
  "borderImageSlice",
  "borderImageWidth",
  "boxFlex",
  "boxFlexGroup",
  "boxOrdinalGroup",
  "columnCount",
  "columns",
  "flex",
  "flexGrow",
  "flexPositive",
  "flexShrink",
  "flexNegative",
  "flexOrder",
  "fontWeight",
  "gridArea",
  "gridColumn",
  "gridColumnEnd",
  "gridColumnSpan",
  "gridColumnStart",
  "gridRow",
  "gridRowEnd",
  "gridRowSpan",
  "gridRowStart",
  "lineClamp",
  "lineHeight",
  "opacity",
  "order",
  "orphans",
  "scale",
  "tabSize",
  "widows",
  "zIndex",
  "zoom",
  // SVG
  "fillOpacity",
  "floodOpacity",
  "stopOpacity",
  "strokeDasharray",
  "strokeDashoffset",
  "strokeMiterlimit",
  "strokeOpacity",
  "strokeWidth",
]);

export function isUnitlessCssProperty(prop: string): boolean {
  return UNITLESS_PROPERTIES.has(prop);
}

/**
 * Formats a CSS-in-JS value the way it will actually be applied to the DOM,
 * for use in diagnostic messages. A bare number becomes `<n>px` unless the
 * property is unitless (`fontWeight`, `zIndex`, `opacity`, `lineHeight`,
 * `flexGrow`/`flexShrink`, `order`, ...), in which case it's left bare -
 * inventing a unit for those would misrepresent what the browser does with
 * them entirely.
 */
export function formatCssValue(prop: string, value: unknown): string {
  if (typeof value === "number") {
    return isUnitlessCssProperty(prop) ? String(value) : `${value}px`;
  }
  return String(value);
}

/**
 * A small, first-pass heuristic for `unsafeCss`: most uses (cursor, font
 * resets, decorative transforms, ...) are legitimate and shouldn't produce
 * console noise, but some reach for exactly the concerns the framework
 * already has a safer answer for. This module only *classifies* a
 * prop/value pair - see `warnSuspiciousUnsafeCss` in `warn.ts` for how a
 * classification becomes a console warning.
 *
 * This is deliberately not a CSS linter: it's a fixed, small table of known
 * patterns, not a general analysis. See docs/architecture.md#unsafecss.
 */

const MARGIN_PROPERTY = /^margin/i;

/** Properties Box/Stack/Row/Grid already expose as semantic space tokens. */
const SPACING_PROPERTIES = new Set([
  "padding",
  "paddingTop",
  "paddingRight",
  "paddingBottom",
  "paddingLeft",
  "paddingInline",
  "paddingInlineStart",
  "paddingInlineEnd",
  "paddingBlock",
  "paddingBlockStart",
  "paddingBlockEnd",
  "gap",
  "rowGap",
  "columnGap",
]);

/** Raw layout/positioning properties a dedicated primitive already solves. */
const LAYOUT_BYPASS_ALTERNATIVE: Record<string, string> = {
  display: "`Stack`, `Row`, or `Grid`",
  position: "`Sticky` or `Overlay`",
  top: "`Sticky` or `Overlay`",
  right: "`Sticky` or `Overlay`",
  bottom: "`Sticky` or `Overlay`",
  left: "`Sticky` or `Overlay`",
  inset: "`Sticky` or `Overlay`",
  insetInline: "`Sticky` or `Overlay`",
  insetInlineStart: "`Sticky` or `Overlay`",
  insetInlineEnd: "`Sticky` or `Overlay`",
  insetBlock: "`Sticky` or `Overlay`",
  insetBlockStart: "`Sticky` or `Overlay`",
  insetBlockEnd: "`Sticky` or `Overlay`",
  overflow: "`ScrollArea`",
  overflowX: "`ScrollArea`",
  overflowY: "`ScrollArea`",
  float: "`Row` or `Grid`",
  clear: "`Row` or `Grid`",
  flexDirection: "`Stack` or `Row`",
  justifyContent: "`Stack`/`Row`/`Grid`'s `justify` prop",
  alignItems: "`Stack`/`Row`/`Grid`'s `align` prop",
  alignContent: "`Stack`, `Row`, or `Grid`",
  gridTemplateColumns: "`Grid`'s `columns`/`minItemWidth` props",
  gridTemplateRows: "`Grid`",
  gridAutoFlow: "`Grid`",
};

/** Theme-backed visual properties Box already exposes as tokens. */
const THEME_LIKE_ALTERNATIVE: Record<string, string> = {
  color: "Box's `color` prop",
  backgroundColor: "Box's `background` prop",
  background: "Box's `background` prop",
  borderColor: "Box's `border` prop",
  borderRadius: "Box's `radius` prop",
  boxShadow: "Box's `shadow` prop",
  border: "Box's `border` prop",
};

const SAFE_KEYWORDS = new Set([
  "none",
  "inherit",
  "initial",
  "unset",
  "transparent",
  "currentcolor",
]);

/** A raw number, or a string that isn't a safe keyword or a `var()` reference. */
function isArbitraryValue(value: unknown): boolean {
  if (typeof value === "number") return true;
  if (typeof value !== "string") return false;
  const normalized = value.trim().toLowerCase();
  if (SAFE_KEYWORDS.has(normalized)) return false;
  if (normalized.startsWith("var(")) return false;
  return true;
}

export interface UnsafeCssSuspicion {
  prop: string;
  value: unknown;
  /** Why this is flagged, and what to reach for instead - shown verbatim in the warning. */
  reason: string;
}

/** Returns a suspicion if `prop: value` matches a known risky pattern, otherwise `undefined`. */
export function classifySuspiciousUnsafeCssProp(
  prop: string,
  value: unknown,
): UnsafeCssSuspicion | undefined {
  if (MARGIN_PROPERTY.test(prop)) {
    return {
      prop,
      value,
      reason:
        "Spacing between siblings should normally be controlled by the parent layout using `gap`, not a child's own margin.",
    };
  }

  if (prop === "zIndex") {
    return {
      prop,
      value,
      reason:
        "Consider a `layer` token via `Sticky`'s or `Overlay.Item`'s `layer` prop instead of a raw z-index value.",
    };
  }

  const layoutAlternative = LAYOUT_BYPASS_ALTERNATIVE[prop];
  if (layoutAlternative) {
    return {
      prop,
      value,
      reason: `This bypasses the framework's layout primitives - consider ${layoutAlternative} instead.`,
    };
  }

  if (SPACING_PROPERTIES.has(prop) && isArbitraryValue(value)) {
    return {
      prop,
      value,
      reason:
        "This already has a semantic space-token equivalent on Box/Stack/Row/Grid - consider a token instead of an arbitrary value.",
    };
  }

  const themeAlternative = THEME_LIKE_ALTERNATIVE[prop];
  if (themeAlternative && isArbitraryValue(value)) {
    return {
      prop,
      value,
      reason: `This already has a semantic token equivalent (${themeAlternative}) - consider a token instead of an arbitrary value.`,
    };
  }

  return undefined;
}

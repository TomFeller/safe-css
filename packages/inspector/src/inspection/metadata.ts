import type {
  InspectorStateSuppressionRef,
  InspectorStateTokenRef,
  InspectorVariant,
  InteractionStateName,
  InteractionStateProperty,
} from "../types";

/**
 * The entire Core communication contract this package relies on:
 * `data-fw-primitive` / `data-fw-recipe` / `data-fw-variant` / `data-fw-tokens`
 * / `data-fw-state-tokens` / `data-fw-state-suppressed` / `data-fw-classes`
 * / `data-fw-unsafe-css` attributes, and `--fw-*` CSS custom properties
 * (handled in `../tokens/tokenVariable.ts`), including the interactive-state
 * bridge's inline `--fw-state-<state>-<property>-value` custom properties
 * (v0.4 Phase 2 - read directly via `element.style`, not through a named
 * constant here, since their names are generated per state/property rather
 * than fixed). No React context, no imports from `@safe-css/core`'s
 * implementation - see docs/architecture.md#inspector.
 *
 * v0.4 Phase 3's "External Hooks" model additionally reads the selected
 * element's own `classList`/`id` directly (see `inspection/inspectElement.ts`'s
 * `buildExternalHooks`) - still just the live DOM element itself, not
 * anything heuristic or Context-coupled, but worth noting as a kind of input
 * beyond `data-fw-*` attributes/`--fw-*` custom properties: `data-fw-classes`
 * is what makes that diff exact (framework-owned classes, authoritatively
 * reported by Core) rather than a guess.
 */
export const PRIMITIVE_ATTRIBUTE = "data-fw-primitive";
export const RECIPE_ATTRIBUTE = "data-fw-recipe";
export const VARIANT_ATTRIBUTE = "data-fw-variant";
export const TOKENS_ATTRIBUTE = "data-fw-tokens";
export const STATE_TOKENS_ATTRIBUTE = "data-fw-state-tokens";
export const STATE_SUPPRESSED_ATTRIBUTE = "data-fw-state-suppressed";
export const CLASSES_ATTRIBUTE = "data-fw-classes";
export const UNSAFE_CSS_ATTRIBUTE = "data-fw-unsafe-css";

/** The fixed, closed set of interactive-state names Core's `data-fw-state-*` attributes can name - owned by this package, not imported from Core (see the file-level contract comment above). */
const STATE_NAMES: ReadonlySet<string> = new Set<InteractionStateName>([
  "hover",
  "focusVisible",
  "active",
]);

/** The fixed, closed set of visual properties a state declaration can target - same rationale as {@link STATE_NAMES}. */
const STATE_PROPERTIES: ReadonlySet<string> = new Set<InteractionStateProperty>([
  "background",
  "color",
  "border",
]);

/**
 * Splits one `data-fw-state-tokens`/`data-fw-state-suppressed` entry on
 * only its first two `|` delimiters - Core's documented format is
 * `state|property|<rest>`, where `<rest>` (a token identity like
 * `"colors.action"`, or an unsafeCss key like `"backgroundColor"`) is never
 * itself split further, even if it happened to contain a `|`. Returns
 * `null` for anything that doesn't have both delimiters, or whose `state`/
 * `property` segment isn't one of the fixed, known values - malformed
 * entries are always ignored safely, never thrown on, per the documented
 * contract.
 */
function parseStatePipeEntry(
  entry: string,
): [InteractionStateName, InteractionStateProperty, string] | null {
  const first = entry.indexOf("|");
  if (first === -1) return null;
  const second = entry.indexOf("|", first + 1);
  if (second === -1) return null;

  const state = entry.slice(0, first);
  const property = entry.slice(first + 1, second);
  const rest = entry.slice(second + 1);

  if (!STATE_NAMES.has(state) || !STATE_PROPERTIES.has(property) || rest.length === 0) return null;

  return [state as InteractionStateName, property as InteractionStateProperty, rest];
}

/** The selector used everywhere the picker/ancestry logic needs to find "any safe-css element". */
export const INSPECTABLE_SELECTOR = `[${PRIMITIVE_ATTRIBUTE}]`;

export function isInspectable(element: Element): boolean {
  return element.hasAttribute(PRIMITIVE_ATTRIBUTE);
}

export function readPrimitive(element: Element): string {
  return element.getAttribute(PRIMITIVE_ATTRIBUTE) ?? "";
}

export function readRecipe(element: Element): string | undefined {
  return element.getAttribute(RECIPE_ATTRIBUTE) ?? undefined;
}

/** Parses Core's `"tone:raised density:compact"` format into readable rows. */
export function readVariants(element: Element): InspectorVariant[] {
  const raw = element.getAttribute(VARIANT_ATTRIBUTE);
  if (!raw) return [];

  return raw
    .split(/\s+/)
    .filter(Boolean)
    .map((pair) => {
      const separator = pair.indexOf(":");
      if (separator === -1) return { name: pair, value: "" };
      return { name: pair.slice(0, separator), value: pair.slice(separator + 1) };
    });
}

/** Parses Core's space-separated `"space.card colors.surface"` token list. */
export function readTokenList(element: Element): string[] {
  const raw = element.getAttribute(TOKENS_ATTRIBUTE);
  if (!raw) return [];
  return raw.split(/\s+/).filter(Boolean);
}

/** Parses Core's space-separated `data-fw-classes` list - the exact CSS classes a primitive itself generated for this element, never the consumer's own `className`. */
export function readClasses(element: Element): string[] {
  const raw = element.getAttribute(CLASSES_ATTRIBUTE);
  if (!raw) return [];
  return raw.split(/\s+/).filter(Boolean);
}

/**
 * Parses Core's space-separated `data-fw-state-tokens` list, e.g.
 * `"hover|background|colors.action focusVisible|border|border.strong"`,
 * into structured refs, preserving DOM order. Each entry is split on only
 * its first two `|`s (see {@link parseStatePipeEntry}); a malformed or
 * unrecognized entry is silently skipped rather than thrown on, since this
 * is external, framework-authored but still untrusted-at-the-type-level DOM
 * text.
 */
export function readStateTokenList(element: Element): InspectorStateTokenRef[] {
  const raw = element.getAttribute(STATE_TOKENS_ATTRIBUTE);
  if (!raw) return [];

  const refs: InspectorStateTokenRef[] = [];
  for (const entry of raw.split(/\s+/).filter(Boolean)) {
    const parsed = parseStatePipeEntry(entry);
    if (!parsed) continue;
    const [state, property, token] = parsed;
    refs.push({ state, property, token });
  }
  return refs;
}

/**
 * Parses Core's space-separated `data-fw-state-suppressed` list, e.g.
 * `"hover|background|backgroundColor active|background|backgroundColor"`,
 * into structured refs - same format and parsing rules as
 * {@link readStateTokenList}, just with an unsafeCss key as the third
 * segment instead of a token identity.
 */
export function readStateSuppressedList(element: Element): InspectorStateSuppressionRef[] {
  const raw = element.getAttribute(STATE_SUPPRESSED_ATTRIBUTE);
  if (!raw) return [];

  const refs: InspectorStateSuppressionRef[] = [];
  for (const entry of raw.split(/\s+/).filter(Boolean)) {
    const parsed = parseStatePipeEntry(entry);
    if (!parsed) continue;
    const [state, property, unsafeCssKey] = parsed;
    refs.push({ state, property, unsafeCssKey });
  }
  return refs;
}

/** Human-facing labels for interactive states - never the implementation name (`focusVisible` reads as `focus-visible`, matching the CSS pseudo-class a reader would recognize). */
const STATE_LABELS: Record<InteractionStateName, string> = {
  hover: "hover",
  focusVisible: "focus-visible",
  active: "active",
};

export function stateLabel(state: InteractionStateName): string {
  return STATE_LABELS[state];
}

export function readUnsafeCssCount(element: Element): number {
  const raw = element.getAttribute(UNSAFE_CSS_ATTRIBUTE);
  if (!raw) return 0;
  const count = Number.parseInt(raw, 10);
  return Number.isFinite(count) && count > 0 ? count : 0;
}

/** A concise "Recipe · Primitive" (or just "Primitive") label for the picker's hover tooltip. */
export function describeElement(element: Element): string {
  const primitive = readPrimitive(element);
  const recipe = readRecipe(element);
  return recipe ? `${recipe} · ${primitive}` : primitive;
}

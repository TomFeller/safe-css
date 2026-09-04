import type { InspectorVariant } from "../types";

/**
 * The entire Core communication contract this package relies on:
 * `data-fw-primitive` / `data-fw-recipe` / `data-fw-variant` / `data-fw-tokens`
 * / `data-fw-unsafe-css` attributes, and `--fw-*` CSS custom properties
 * (handled in `../tokens/tokenVariable.ts`). No React context, no imports
 * from `@safe-css/core`'s implementation - see docs/architecture.md#inspector.
 */
export const PRIMITIVE_ATTRIBUTE = "data-fw-primitive";
export const RECIPE_ATTRIBUTE = "data-fw-recipe";
export const VARIANT_ATTRIBUTE = "data-fw-variant";
export const TOKENS_ATTRIBUTE = "data-fw-tokens";
export const UNSAFE_CSS_ATTRIBUTE = "data-fw-unsafe-css";

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

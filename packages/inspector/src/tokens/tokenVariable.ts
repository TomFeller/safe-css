import type { TokenIdentity } from "../types";

/**
 * Mirrors `@safe-css/core`'s own `tokenVarName` category → CSS-variable-
 * segment mapping exactly (`colors` → the singular `color`, everything else
 * unchanged) - see `packages/core/src/theme/cssVariables.ts`. Duplicated
 * rather than imported for the same reason as `internal/env.ts`: this
 * package only ever talks to Core through its rendered DOM/CSS output, and
 * this convention is small, stable, and part of that public contract
 * (`--fw-<category>-<token>`), not a private implementation detail.
 */
const CATEGORY_TO_CSS_PREFIX: Record<string, string> = {
  colors: "color",
  space: "space",
  radius: "radius",
  size: "size",
  border: "border",
  shadow: "shadow",
  layer: "layer",
};

const CSS_PREFIX_TO_CATEGORY: Record<string, string> = Object.fromEntries(
  Object.entries(CATEGORY_TO_CSS_PREFIX).map(([category, prefix]) => [prefix, category]),
);

/** `{ category: "space", name: "card" }` -> `"--fw-space-card"`. */
export function tokenToCssVariable(identity: Pick<TokenIdentity, "category" | "name">): string {
  const prefix = CATEGORY_TO_CSS_PREFIX[identity.category] ?? identity.category;
  return `--fw-${prefix}-${identity.name}`;
}

const FW_VARIABLE_PATTERN = /^--fw-([a-z]+)-(.+)$/;

/**
 * The reverse of {@link tokenToCssVariable}: `"--fw-color-border"` ->
 * `{ token: "colors.border", category: "colors", name: "border" }`. Returns
 * `null` for anything outside the `--fw-*` namespace - dependency analysis
 * (`tokens/dependencies.ts`) uses this to deliberately ignore any custom
 * property that isn't part of safe-css's own convention, per
 * docs/architecture.md#inspector.
 */
export function cssVariableToTokenIdentity(cssVariable: string): TokenIdentity | null {
  const match = FW_VARIABLE_PATTERN.exec(cssVariable);
  if (!match) return null;
  const [, prefix, name] = match as unknown as [string, string, string];
  const category = CSS_PREFIX_TO_CATEGORY[prefix] ?? prefix;
  return { token: `${category}.${name}`, category, name };
}

import type { CSSProperties } from "react";
import type { SizeToken } from "../../theme/types";

export type BoxDimension = "full" | "fit" | SizeToken;

export interface SizeResolutionContext {
  classes: string[];
  style: CSSProperties;
  tokens: string[];
  resolveToken: (
    category: "size",
    token: string | undefined,
    propName: string,
  ) => string | undefined;
}

const FULL_CLASS: Record<"width" | "height", string> = { width: "fw-w-full", height: "fw-h-full" };
const FIT_CLASS: Record<"width" | "height", string> = { width: "fw-w-fit", height: "fw-h-fit" };

/**
 * Shared resolution for the `width`/`height` props Box, Stack, Row and Grid
 * all expose: the two structural keywords (`full`, `fit`) become a static
 * class, and anything else is treated as a `SizeToken` resolved to a CSS
 * variable reference.
 */
export function applyDimension(
  ctx: SizeResolutionContext,
  dimension: "width" | "height",
  value: BoxDimension | undefined,
): void {
  if (value === undefined) return;

  if (value === "full") {
    ctx.classes.push(FULL_CLASS[dimension]);
    return;
  }
  if (value === "fit") {
    ctx.classes.push(FIT_CLASS[dimension]);
    return;
  }

  ctx.style[dimension] = ctx.resolveToken("size", value, dimension);
  ctx.tokens.push(`size.${value}`);
}

/** Shared resolution for Box's min/max width/height, which are always SizeToken (no `full`/`fit`). */
export function applyBoundDimension(
  ctx: SizeResolutionContext,
  prop: "minWidth" | "maxWidth" | "minHeight" | "maxHeight",
  value: SizeToken | undefined,
): void {
  if (value === undefined) return;
  ctx.style[prop] = ctx.resolveToken("size", value, prop);
  ctx.tokens.push(`size.${value}`);
}

import type { CSSProperties } from "react";
import { warnSuspiciousUnsafeCss } from "../diagnostics/warn";
import type { DiagnosticsMode } from "../theme/types";

export interface MergedStyle {
  style: CSSProperties;
  /** Number of properties set via `unsafeCss`, for dev traceability metadata (see `debugAttributes`). */
  unsafeCssCount: number;
}

/**
 * Applies `unsafeCss` last, giving it the highest precedence of any style
 * source (see docs/architecture.md#precedence). Only *suspicious* properties
 * (margin, raw z-index, layout properties a primitive already solves,
 * arbitrary values where a token exists) produce a console warning -
 * `unsafeCss` is a supported escape hatch, not automatically a mistake, so
 * using it for something like `cursor` or `font` stays silent. Its presence
 * is still always recorded in dev metadata via the returned count,
 * regardless of whether anything warned. See docs/architecture.md#unsafecss.
 */
export function mergeUnsafeCss(
  style: CSSProperties,
  unsafeCss: CSSProperties | undefined,
  diagnostics: DiagnosticsMode,
  componentName: string,
): MergedStyle {
  if (!unsafeCss) return { style, unsafeCssCount: 0 };

  warnSuspiciousUnsafeCss(diagnostics, componentName, unsafeCss as Record<string, unknown>);

  return {
    style: { ...style, ...unsafeCss },
    unsafeCssCount: Object.keys(unsafeCss).length,
  };
}

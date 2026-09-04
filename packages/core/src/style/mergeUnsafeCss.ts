import type { CSSProperties } from "react";
import { warnUnsafeCss } from "../diagnostics/warn";
import type { DiagnosticsMode } from "../theme/types";

/**
 * Applies `unsafeCss` last, giving it the highest precedence of any style
 * source (see docs/architecture.md#precedence), and reports it to
 * diagnostics so it stays discoverable during development even though it's
 * fully supported.
 */
export function mergeUnsafeCss(
  style: CSSProperties,
  unsafeCss: CSSProperties | undefined,
  diagnostics: DiagnosticsMode,
  componentName: string,
): CSSProperties {
  if (!unsafeCss) return style;
  warnUnsafeCss(diagnostics, componentName, unsafeCss as Record<string, unknown>);
  return { ...style, ...unsafeCss };
}

import { isDevelopmentBuild } from "../../diagnostics/env";

export interface DebugMeta {
  primitive: string;
  recipe?: string;
  variant?: string;
  tokens?: string[];
}

/**
 * Dev-only `data-fw-*` attributes describing which primitive, recipe,
 * variant, and theme tokens produced an element. This is intentionally the
 * entire "traceability" surface for v0.1: it costs nothing at runtime in
 * production (the attributes are simply omitted) and is enough to inspect an
 * element's styling provenance in devtools today, while giving a future
 * "blast radius" tool (see docs/architecture.md) a real data source to read
 * without any redesign.
 */
export function debugAttributes(meta: DebugMeta): Record<string, string> {
  if (!isDevelopmentBuild()) return {};

  const attrs: Record<string, string> = {
    "data-fw-primitive": meta.primitive,
  };
  if (meta.recipe) attrs["data-fw-recipe"] = meta.recipe;
  if (meta.variant) attrs["data-fw-variant"] = meta.variant;
  if (meta.tokens && meta.tokens.length > 0) {
    attrs["data-fw-tokens"] = meta.tokens.join(" ");
  }
  return attrs;
}

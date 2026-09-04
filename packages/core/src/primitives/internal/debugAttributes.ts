import { isDevelopmentBuild } from "../../diagnostics/env";
import { warnReservedAttribute } from "../../diagnostics/warn";
import type { DiagnosticsMode } from "../../theme/types";

export interface DebugMeta {
  primitive: string;
  tokens?: string[];
  /** Number of properties set via `unsafeCss` on this element, if any. */
  unsafeCssCount?: number;
}

/**
 * The attributes a *primitive* itself computes and owns. Checked against a
 * primitive's own leftover DOM props (`rest`) before render - see
 * {@link debugAttributes}.
 */
export const PRIMITIVE_RESERVED_ATTRIBUTES = [
  "data-fw-primitive",
  "data-fw-tokens",
  "data-fw-unsafe-css",
] as const;

/**
 * The attributes `defineRecipe` itself computes and owns. Checked against a
 * recipe's *instance* props (what its caller passed) before those get
 * merged and forwarded to the underlying primitive - see
 * `recipes/defineRecipe.ts`.
 *
 * Deliberately not merged into {@link PRIMITIVE_RESERVED_ATTRIBUTES}: a
 * recipe's `data-fw-recipe`/`data-fw-variant` are legitimately passed down
 * as ordinary props to its underlying primitive on every single render, so
 * if a primitive checked for them too it would warn about its own
 * framework-internal plumbing on every recipe use. Each layer only guards
 * the attributes *it* is responsible for setting.
 */
export const RECIPE_RESERVED_ATTRIBUTES = ["data-fw-recipe", "data-fw-variant"] as const;

/** The full reserved `data-fw-*` namespace, for documentation/reference only - see the README. */
export const RESERVED_DATA_ATTRIBUTES = [
  ...PRIMITIVE_RESERVED_ATTRIBUTES,
  ...RECIPE_RESERVED_ATTRIBUTES,
] as const;

/**
 * Dev-only `data-fw-*` attributes describing which primitive, theme tokens,
 * and `unsafeCss` usage produced an element. This is intentionally the
 * entire per-primitive "traceability" surface for v0.1 (recipes add their
 * own `data-fw-recipe`/`data-fw-variant` separately - see
 * `recipes/defineRecipe.ts`): it costs nothing at runtime in production (the
 * attributes are simply omitted) and is enough to inspect an element's
 * styling provenance in devtools today, while giving a future "blast
 * radius" tool (see docs/architecture.md) a real data source to read
 * without any redesign.
 *
 * Centralized here rather than reimplemented per primitive, so the metadata
 * model (which attributes exist, when they're included) has exactly one
 * definition. Every primitive calls this the same way, right before render,
 * passing its own leftover DOM props (`consumerProps`) so this can warn if
 * they collide with the reserved namespace.
 *
 * `data-fw-*` is reserved: a consumer-supplied `data-fw-primitive="..."`
 * must never silently win over the framework's own value, since a future
 * Inspector/blast-radius tool will trust these attributes unconditionally.
 * Correctness is guaranteed by *call-site spread order*, not by anything
 * here - every primitive spreads `{...rest}` before `{...debugAttributes(...)}`,
 * so the framework's own attributes are always applied last. This function's
 * job is narrower: notice when that would have mattered, and say so.
 */
export function debugAttributes(
  meta: DebugMeta,
  consumerProps: Record<string, unknown>,
  diagnostics: DiagnosticsMode,
): Record<string, string> {
  if (!isDevelopmentBuild()) return {};

  const collisions = PRIMITIVE_RESERVED_ATTRIBUTES.filter((key) => key in consumerProps);
  if (collisions.length > 0) {
    warnReservedAttribute(diagnostics, meta.primitive, collisions);
  }

  const attrs: Record<string, string> = {
    "data-fw-primitive": meta.primitive,
  };
  if (meta.tokens && meta.tokens.length > 0) {
    attrs["data-fw-tokens"] = meta.tokens.join(" ");
  }
  if (meta.unsafeCssCount) {
    attrs["data-fw-unsafe-css"] = String(meta.unsafeCssCount);
  }
  return attrs;
}

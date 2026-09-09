import { isDevelopmentBuild } from "../../diagnostics/env";
import { warnReservedAttribute } from "../../diagnostics/warn";
import type { DiagnosticsMode } from "../../theme/types";

export interface DebugMeta {
  primitive: string;
  /**
   * Every CSS class *this primitive itself* generated for the rendered
   * element (e.g. `["fw-Box", "fw-grow"]`) - never the consumer's own
   * `className`, and never a recipe-fabricated class (a recipe never
   * generates its own CSS class at all; `data-fw-recipe` is the recipe
   * identity mechanism - see `recipes/defineRecipe.ts`). This is what lets a
   * consumer (the Inspector's "External Hooks") reliably subtract
   * framework-owned classes from an element's actual `classList` to find
   * classes something *outside* safe-css is relying on, without resorting to
   * prefix-matching (`className.startsWith("fw-")`), which a custom `as`
   * component or a future non-`fw-`-prefixed class could defeat.
   */
  classes?: string[];
  /**
   * Every theme token this element depends on - both its resting/current
   * styling AND its recipe's interactive-state styling (`states.hover`/
   * `focusVisible`/`active`), unioned and deduplicated. `data-fw-tokens` is
   * deliberately not scoped to "only what's visually active right now": a
   * token a hover state depends on is a real dependency of this element even
   * while it's resting, which is exactly what a "what would changing this
   * token affect" tool (Impact Analysis) needs to see. `stateTokens` below
   * exists alongside this, not instead of it, so a consumer can additionally
   * tell *which* of these came from a state and which property/state it
   * belongs to - see `primitives/internal/stateBridge.ts`.
   */
  tokens?: string[];
  /** Token usages declared by a recipe's interactive-state styling (see `primitives/internal/stateBridge.ts`), formatted as `state|property|token` - reported separately from `tokens` (which already includes these too, since the same token can legitimately also be used by the element's resting styling) so a consumer can tell exactly which state/property each state-declared usage belongs to. */
  stateTokens?: string[];
  /**
   * Declared interactive-state properties whose bridge is present but
   * currently ineffective on this instance because `unsafeCss` sets the same
   * rendered CSS property (see `Box.tsx`'s use of `STATE_BRIDGE_UNSAFE_CSS_KEYS`
   * and `warnRecipeStateSuppressedByUnsafeCss`), formatted as
   * `state|property|unsafeCssKey` - one entry per affected state. This is
   * strictly additive to `stateTokens`: a suppressed declaration still
   * appears there (the dependency is real; it's just not visually effective
   * here), so a consumer can explain both facts at once.
   */
  stateSuppressed?: string[];
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
  "data-fw-classes",
  "data-fw-tokens",
  "data-fw-state-tokens",
  "data-fw-state-suppressed",
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
  if (meta.classes && meta.classes.length > 0) {
    attrs["data-fw-classes"] = meta.classes.join(" ");
  }
  if (meta.tokens && meta.tokens.length > 0) {
    // Deduplicated: a resting value and one of its own interactive states
    // can legitimately reference the same token (e.g. `base.background` and
    // `states.hover.background` both set to the same token name), which
    // would otherwise double-list it here.
    attrs["data-fw-tokens"] = [...new Set(meta.tokens)].join(" ");
  }
  if (meta.stateTokens && meta.stateTokens.length > 0) {
    attrs["data-fw-state-tokens"] = meta.stateTokens.join(" ");
  }
  if (meta.stateSuppressed && meta.stateSuppressed.length > 0) {
    attrs["data-fw-state-suppressed"] = meta.stateSuppressed.join(" ");
  }
  if (meta.unsafeCssCount) {
    attrs["data-fw-unsafe-css"] = String(meta.unsafeCssCount);
  }
  return attrs;
}

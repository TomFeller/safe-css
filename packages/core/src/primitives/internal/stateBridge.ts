import type { BorderToken, ColorToken } from "../../theme/types";

/**
 * Private channel a recipe uses to hand its interactive-state configuration
 * to the primitive it wraps, without expanding any primitive's public prop
 * surface. Deliberately an ordinary string-keyed prop, not a `Symbol`: a
 * `Symbol`-keyed prop is silently dropped by React-DOM's own reconciler
 * whenever a `forwardRef` component's incoming props object also carries a
 * `ref` key (its internal props rebuild only ever visits string keys), which
 * broke this exact bridge on any recipe instance that was also given a
 * `ref` - see the recipe engine's tests for the regression this guards
 * against. A collision-resistant name plus `Box` explicitly destructuring
 * this key out before spreading its remaining props onto the underlying DOM
 * element (see `Box.tsx`) is what keeps it both reliable across the
 * `ref`/no-`ref` split and invisible on the rendered element - not secrecy
 * of the mechanism itself. Never exported from the package's public index;
 * never part of `BoxProps`/`CommonProps`.
 */
export const RECIPE_STATE_BRIDGE = "__safeCssInternalRecipeStateBridge";

/** The fixed, closed set of interactive states supported in this phase. */
export type RecipeStateName = "hover" | "focusVisible" | "active";

/**
 * Lowest to highest priority when more than one state is simultaneously true
 * for the same property (e.g. holding a keyboard-focused button down also
 * makes it `:hover`ed on a mouse-capable device). This is *only* ever
 * consumed as the nesting order of the generated `var()` fallback
 * expression (see `applyStateBridge`) - never as CSS selector specificity or
 * stylesheet source order - so an application developer never needs to
 * reason about either. Fixed by the framework, not configurable per recipe.
 */
export const RECIPE_STATE_PRIORITY: readonly RecipeStateName[] = [
  "hover",
  "focusVisible",
  "active",
];

/** The fixed, closed set of Box visual props eligible for interactive-state styling in this phase. */
export type StateBridgeProperty = "background" | "color" | "border";

/**
 * Per bridged property, the token (or, for `border`, the `"none"` literal)
 * each declared state contributes - populated by `defineRecipe` only for
 * properties an instance override did *not* also set (an instance override
 * suppresses every state for that property, by design), so a primitive can
 * treat presence here as "safe to bridge" without re-checking instance
 * props itself.
 */
export interface RecipeStateBridge {
  /** The recipe's `name`, carried along so a primitive can name it in a development diagnostic without a second lookup. */
  recipeName: string;
  background?: Partial<Record<RecipeStateName, ColorToken>>;
  color?: Partial<Record<RecipeStateName, ColorToken>>;
  border?: Partial<Record<RecipeStateName, BorderToken | "none">>;
}

const STATE_CSS_SEGMENT: Record<RecipeStateName, string> = {
  hover: "hover",
  focusVisible: "focus-visible",
  active: "active",
};

/** The CSS custom property a static `:hover`/`:focus-visible`/`:active` rule in styles.css writes into. */
export function stateBridgeVarName(property: StateBridgeProperty, state: RecipeStateName): string {
  return `--fw-state-${STATE_CSS_SEGMENT[state]}-${property}`;
}

/**
 * The CSS custom property a bridged element always carries inline, holding
 * the state's *potential* value regardless of whether that state is
 * currently active. This is what keeps a state-only token dependency
 * statically visible (to the Inspector, and to Impact Analysis via
 * `data-fw-tokens`) before any interaction ever happens.
 */
export function stateBridgeValueVarName(
  property: StateBridgeProperty,
  state: RecipeStateName,
): string {
  return `${stateBridgeVarName(property, state)}-value`;
}

/**
 * `unsafeCss` keys that would render the same CSS property a given bridged
 * prop owns, and therefore silently suppress its state styling the same way
 * an instance override does (see `Box.tsx`'s use of this). Deliberately a
 * small, fixed, exact-match table, not a CSS parser: `background`'s
 * longhand (`backgroundColor`) and its own shorthand key are both included
 * since either one overwrites the same rendered property, but `border`'s
 * longhand components (`borderColor`, `borderWidth`, `borderStyle`, ...)
 * are deliberately NOT included - whether one of those actually suppresses
 * the `border` shorthand's visual effect depends on declaration order in a
 * way this table cannot reliably determine, so that case is left
 * undetected rather than guessed at.
 */
export const STATE_BRIDGE_UNSAFE_CSS_KEYS: Record<StateBridgeProperty, readonly string[]> = {
  background: ["backgroundColor", "background"],
  color: ["color"],
  border: ["border"],
};

export interface StateBridgeContext {
  style: Record<string, unknown>;
  tokens: string[];
  stateTokens: string[];
  resolveToken: (
    category: "colors" | "border",
    token: string,
    propName: string,
  ) => string | undefined;
}

/**
 * Resolves one visual, CSS-emitting property that may carry an interactive-
 * state bridge. Always sets `styleKey` to `restingValue` first - identical
 * to a primitive's normal, non-bridged behavior, and still the only thing
 * that happens when `statesForProperty` is absent. When states are declared
 * for this property, rewrites `styleKey` into the nested `var()` fallback
 * expression that lets the static `:hover`/`:focus-visible`/`:active` rules
 * in styles.css override it (highest-priority state outermost, per
 * `RECIPE_STATE_PRIORITY`), and resolves each declared state's own token
 * through the exact same `resolveToken` every other token prop uses - so an
 * unknown state token warns exactly like an unknown base/variant/instance
 * token does, and its dependency is recorded in `ctx.tokens` /
 * `ctx.stateTokens` the same way. A state value of the `border="none"`
 * literal is passed through as-is and never treated as a token dependency.
 *
 * When there is no safe-css resting value at all (no base/variant/instance
 * value for this property), the innermost fallback of the `var()` chain is
 * the CSS-wide keyword `unset`, not `initial`. This matters for inherited
 * properties like `color`: `initial` would reset a child element's resting
 * color to the CSS-spec initial color (typically black), overriding
 * whatever it would otherwise have inherited from an ancestor, even though
 * this recipe never asked for a resting color at all - only a hover one.
 * `unset` resolves to `inherit` for inherited properties and to `initial`
 * for non-inherited ones (`background-color`, `border`), so a state-only
 * property behaves like "no opinion at rest" rather than "force the
 * property to its CSS default at rest," which is what an application
 * author actually means by declaring only `states.hover.color` and no
 * resting `color`. This is a distinct mechanism from the `initial` values
 * on the static bridge-slot custom-property resets in styles.css (e.g.
 * `--fw-state-hover-color: initial`) - those exist purely to stop one
 * Box's active bridge slot from inheriting into an unrelated, non-hovered
 * descendant Box, and are unaffected by this.
 */
export function applyStateBridge(
  ctx: StateBridgeContext,
  styleKey: string,
  property: StateBridgeProperty,
  category: "colors" | "border",
  propName: string,
  statesForProperty: Partial<Record<RecipeStateName, string>> | undefined,
  restingValue: string | undefined,
): void {
  if (restingValue !== undefined) {
    ctx.style[styleKey] = restingValue;
  }

  if (!statesForProperty) return;

  const declared = RECIPE_STATE_PRIORITY.filter((state) => statesForProperty[state] !== undefined);
  if (declared.length === 0) return;

  let expression = restingValue ?? "unset";

  for (const state of declared) {
    const rawValue = statesForProperty[state] as string;
    const isNoneLiteral = property === "border" && rawValue === "none";
    const resolvedValue = isNoneLiteral
      ? "none"
      : ctx.resolveToken(category, rawValue, `states.${state}.${propName}`);

    ctx.style[stateBridgeValueVarName(property, state)] = resolvedValue;

    if (!isNoneLiteral) {
      const tokenIdentity = `${category}.${rawValue}`;
      ctx.tokens.push(tokenIdentity);
      ctx.stateTokens.push(`${state}|${property}|${tokenIdentity}`);
    }

    expression = `var(${stateBridgeVarName(property, state)}, ${expression})`;
  }

  ctx.style[styleKey] = expression;
}

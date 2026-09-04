import {
  createElement,
  forwardRef,
  type ComponentType,
  type ElementType,
  type ForwardRefExoticComponent,
  type RefAttributes,
} from "react";
import { isDevelopmentBuild } from "../diagnostics/env";

/**
 * A component shape a recipe can be built on: any of the framework's
 * primitives. Typed as `ComponentType` (rather than a plain function) since
 * primitives are `forwardRef` exotic components under the hood, not callable
 * functions - they must be invoked through `createElement`, not called directly.
 */
export type RecipePrimitive<P> = ComponentType<P>;

export type RecipeVariantMap<P> = Record<string, Record<string, Partial<P>>>;

/**
 * A same-shape overlay on `V` used only to *suggest* that each variant's
 * values are `Partial<P>` (so editors autocomplete real primitive props
 * while authoring a recipe's variants). It is intentionally not `V`'s own
 * generic constraint: making `V`'s bound reference `P` (i.e.
 * `V extends RecipeVariantMap<P>`) causes TypeScript to widen `keyof V` to
 * `string` when both are inferred from the same call, which silently erases
 * every other prop (including DOM props like `onClick`) from the resulting
 * recipe's type. See the recipe engine's tests for the regression this
 * guards against, and docs/architecture.md#recipes for the full story. One
 * consequence: an unsupported prop inside a variant is not always rejected
 * at compile time the way an unsupported prop in `base` is - see the v0.1
 * limitations in the README.
 */
type VariantHint<P, V> = { [K in keyof V]?: { [J in keyof V[K]]?: Partial<P> } };

export interface RecipeConfig<
  P extends { as?: ElementType },
  V extends Record<string, Record<string, object>>,
> {
  /** Used only for dev diagnostics (`data-fw-recipe`) and the component's displayName. */
  name?: string;
  /**
   * `as` is widened to `ElementType` here (rather than inheriting the
   * primitive's own, narrower inferred `as` type) specifically so a recipe
   * can pin its element, e.g. `defineRecipe(Box, { base: { as: "button" } })`
   * - see docs/architecture.md#recipes for why the primitive's inferred
   * props are pinned to their default tag in the first place.
   */
  base?: Partial<Omit<P, "as">> & { as?: ElementType };
  variants?: V & VariantHint<P, V>;
  defaultVariants?: { [K in keyof V]?: keyof V[K] & string };
}

export type RecipeVariantProps<V> = { [K in keyof V]?: keyof V[K] & string };

export type RecipeProps<P, V> = Omit<P, keyof RecipeVariantProps<V>> & RecipeVariantProps<V>;

/**
 * Builds a reusable component from a primitive plus a fixed set of semantic
 * variants, without introducing arbitrary CSS. A recipe may only set props
 * the underlying primitive already supports - it cannot reach for selectors
 * like `"& div span"`, and there is no compound-variant engine in v0.1 (see
 * docs/architecture.md#recipes for why).
 *
 * Precedence is a single, deterministic chain, applied as a plain object
 * merge with no CSS specificity involved:
 * primitive defaults < recipe `base` < recipe variant < instance props.
 */
export function defineRecipe<
  P extends { as?: ElementType },
  // `Record<never, never>` (not `Record<string, never>`) so that `keyof V`
  // stays `never` - not `string` - when a recipe defines no variants at all.
  // `Record<string, never>` carries a `[x: string]` index signature, which
  // widens `keyof RecipeVariantProps<V>` to `string` and, via `Omit<P,
  // string>`, silently strips every prop (including `ref`/`onClick`) from a
  // variant-less recipe's type. Same family of issue as the P/V inference
  // interaction documented above.
  V extends Record<string, Record<string, object>> = Record<never, never>,
>(
  Primitive: RecipePrimitive<P>,
  // `NoInfer` keeps `config`'s shape from feeding back into inferring P: P
  // must be inferred solely from `Primitive`, or a wide `base`/`variants`
  // object silently narrows the primitive's real prop type (losing DOM
  // props like `onClick` in the process). See the recipe engine's tests.
  config: RecipeConfig<NoInfer<P>, V>,
): ForwardRefExoticComponent<RecipeProps<P, V> & RefAttributes<unknown>> {
  const variants = config.variants ?? ({} as V);
  const variantKeys = Object.keys(variants) as (keyof V & string)[];

  const Recipe = forwardRef(function Recipe(props: Record<string, unknown>, ref: unknown) {
    const selections: Record<string, string | undefined> = {};
    const instanceProps: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(props)) {
      if (variantKeys.includes(key)) {
        selections[key] = value as string | undefined;
      } else {
        instanceProps[key] = value;
      }
    }

    let merged: Record<string, unknown> = { ...(config.base as Record<string, unknown>) };
    const activeVariants: string[] = [];

    for (const key of variantKeys) {
      const chosen = selections[key] ?? config.defaultVariants?.[key];
      if (chosen === undefined) continue;
      const variantProps = variants[key]?.[chosen];
      if (variantProps) merged = { ...merged, ...(variantProps as Record<string, unknown>) };
      activeVariants.push(`${key}:${chosen}`);
    }

    merged = { ...merged, ...instanceProps, ref };

    if (isDevelopmentBuild()) {
      if (config.name) merged["data-fw-recipe"] = config.name;
      if (activeVariants.length > 0) merged["data-fw-variant"] = activeVariants.join(" ");
    }

    return createElement(Primitive, merged as P & RefAttributes<unknown>);
  });

  Recipe.displayName = config.name ? `Recipe(${config.name})` : "Recipe";

  return Recipe as unknown as ForwardRefExoticComponent<RecipeProps<P, V> & RefAttributes<unknown>>;
}

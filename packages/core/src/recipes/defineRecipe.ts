import {
  createElement,
  forwardRef,
  type ComponentType,
  type ElementType,
  type ForwardRefExoticComponent,
  type RefAttributes,
} from "react";
import { isDevelopmentBuild } from "../diagnostics/env";
import { warnRecipeVariantCollision } from "../diagnostics/warn";
import { useThemeMeta } from "../theme/ThemeContext";
import type { PolymorphicProps } from "../primitives/internal/polymorphic";

/**
 * A component shape a recipe can be built on: any of the framework's
 * primitives. Typed as `ComponentType` (rather than a plain function) since
 * primitives are `forwardRef` exotic components under the hood, not callable
 * functions - they must be invoked through `createElement`, not called
 * directly. The `__ownProps` phantom marker is how `OwnPropsOf` recovers the
 * primitive's own semantic props - see `internal/polymorphic.ts`.
 *
 * `ComponentType<any>` (not `<unknown>`) is required here: the real prop
 * type is recovered separately via `__ownProps`, and function parameters are
 * contravariant, so `ComponentType<unknown>` would reject nearly every real
 * component's prop type instead of accepting it loosely as intended.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- see comment above
export type RecipePrimitive<Own> = ComponentType<any> & { readonly __ownProps?: Own };

type OwnPropsOf<C> = C extends { readonly __ownProps?: infer Own } ? Own : never;

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
 * at compile time the way an unsupported prop in `base` is - see the v0.1.1
 * limitations in the README. Callers who want that guarantee back can opt
 * in explicitly: `variants: {...} satisfies RecipeVariantMap<BoxProps>`.
 */
type VariantHint<P, V> = { [K in keyof V]?: { [J in keyof V[K]]?: Partial<P> } };

export interface RecipeConfig<
  Own,
  E extends ElementType,
  V extends Record<string, Record<string, object>>,
> {
  /**
   * A stable, developer-facing identifier for this recipe. Required (not
   * optional) as of v0.1.1: a recipe with no name is untraceable - it can't
   * show up in dev metadata (`data-fw-recipe`) or, later, in blast-radius
   * analysis ("which recipes does this token change affect"). Pick a name
   * you'd be comfortable seeing in devtools or a future impact report.
   */
  name: string;
  /**
   * `as` here drives `E` (the element this recipe renders by default) via
   * inference - e.g. `base: { as: "button" }` makes the whole recipe
   * button-shaped: instance props accept `type`, `disabled`, a
   * `MouseEventHandler<HTMLButtonElement>` for `onClick`, and so on. Leaving
   * `as` out of `base` keeps the primitive's own default tag (`"div"` for
   * every current primitive).
   */
  base?: Partial<Omit<PolymorphicProps<E, Own>, "as">> & { as?: E };
  variants?: V & VariantHint<PolymorphicProps<E, Own>, V>;
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
 *
 * When two *different* variant groups both set the same underlying prop
 * (e.g. a `size` variant and a `density` variant both set `padding`) and are
 * both active at once, resolution follows the order the variant groups were
 * declared in `variants: {...}` - later-declared groups win over
 * earlier-declared ones, the same left-to-right "last one wins" rule as any
 * other object spread in this engine. Development builds warn about this
 * (see `warnRecipeVariantCollision`) since it's rarely intentional and easy
 * to get backwards by accident; it never changes production behavior.
 */
export function defineRecipe<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- `Own` here is a free variable recovered per-call via `OwnPropsOf<C>`, not fixed by this bound
  C extends RecipePrimitive<any>,
  E extends ElementType = "div",
  V extends Record<string, Record<string, object>> = Record<never, never>,
>(
  Primitive: C,
  // `NoInfer` keeps `config`'s shape from feeding back into inferring `Own`:
  // it must come solely from `Primitive` (via its `__ownProps` marker), or a
  // wide `base`/`variants` object silently narrows the primitive's real prop
  // type (losing DOM props like `onClick` in the process). `E`, in
  // contrast, is deliberately inferred from `config.base.as` - that's the
  // whole point of this generic parameter. See the recipe engine's tests.
  config: RecipeConfig<NoInfer<OwnPropsOf<C>>, E, V>,
): ForwardRefExoticComponent<
  RecipeProps<PolymorphicProps<E, OwnPropsOf<C>>, V> & RefAttributes<unknown>
> {
  const variants = config.variants ?? ({} as V);
  const variantKeys = Object.keys(variants) as (keyof V & string)[];

  const Recipe = forwardRef(function Recipe(props: Record<string, unknown>, ref: unknown) {
    const { diagnostics } = useThemeMeta();

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
    // Tracks which variant group last set each prop, so a second group
    // setting the same prop to a *different* value can be reported as a
    // collision rather than silently resolved.
    const propOwner: Record<string, { group: string; option: string; value: unknown }> = {};
    const collisions: Parameters<typeof warnRecipeVariantCollision>[3] = [];

    for (const key of variantKeys) {
      const chosen = selections[key] ?? config.defaultVariants?.[key];
      if (chosen === undefined) continue;
      activeVariants.push(`${key}:${chosen}`);

      const variantProps = variants[key]?.[chosen];
      if (!variantProps) continue;

      for (const [prop, value] of Object.entries(variantProps)) {
        const prior = propOwner[prop];
        if (prior && prior.group !== key && !Object.is(prior.value, value)) {
          collisions.push({
            prop,
            loser: prior,
            winner: { group: key, option: chosen, value },
          });
        }
        propOwner[prop] = { group: key, option: chosen, value };
      }

      merged = { ...merged, ...(variantProps as Record<string, unknown>) };
    }

    if (collisions.length > 0) {
      warnRecipeVariantCollision(diagnostics, config.name, activeVariants, collisions);
    }

    merged = { ...merged, ...instanceProps, ref };

    if (isDevelopmentBuild()) {
      merged["data-fw-recipe"] = config.name;
      if (activeVariants.length > 0) merged["data-fw-variant"] = activeVariants.join(" ");
    }

    return createElement(Primitive, merged);
  });

  Recipe.displayName = `Recipe(${config.name})`;

  return Recipe as unknown as ForwardRefExoticComponent<
    RecipeProps<PolymorphicProps<E, OwnPropsOf<C>>, V> & RefAttributes<unknown>
  >;
}

import {
  createElement,
  forwardRef,
  type ComponentType,
  type ElementType,
  type ForwardRefExoticComponent,
} from "react";
import { isDevelopmentBuild } from "../diagnostics/env";
import {
  warnRecipeStateSuppressedByInstance,
  warnRecipeVariantCollision,
  warnReservedAttribute,
} from "../diagnostics/warn";
import { useThemeMeta } from "../theme/ThemeContext";
import { RECIPE_RESERVED_ATTRIBUTES } from "../primitives/internal/debugAttributes";
import type { PolymorphicProps, PolymorphicRef } from "../primitives/internal/polymorphic";
import {
  RECIPE_STATE_BRIDGE,
  RECIPE_STATE_PRIORITY,
  type RecipeStateBridge,
  type RecipeStateName,
} from "../primitives/internal/stateBridge";

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

/**
 * The fixed, closed set of visual props eligible for interactive-state
 * styling in this phase - see `primitives/internal/stateBridge.ts` for why
 * this list is small and framework-controlled rather than open.
 */
type StateEligiblePropName = "background" | "color" | "border";

/**
 * For a primitive's own props `Own`, the subset eligible for `states` -
 * typed each key explicitly rather than via `Pick<Own, Extract<...>>`:
 * `Pick` over an empty key set collapses to `{}`, and TypeScript's `{}`
 * accepts *any* object (it isn't "no properties allowed", just "no
 * properties required"), so a `Stack`-based recipe's `states` would have
 * silently accepted an arbitrary object with no compile error at all. Every
 * eligible key is mapped to `never` instead for a primitive that doesn't
 * support it (e.g. every key here for `StackOwnProps`, which has no
 * `background`/`color`/`border`) - no value except `undefined` is
 * assignable to `never`, so any attempt to set one is a real compile
 * error, not a silently-ignored no-op. See the recipe engine's tests for
 * the regression this guards against.
 */
type RecipeStateProps<Own> = Partial<{
  [K in StateEligiblePropName]: K extends keyof Own ? Own[K] : never;
}>;

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
  /**
   * Native browser interaction states - `hover`, `focusVisible`, `active` in
   * this phase - for the fixed, small set of visual props listed in
   * {@link RecipeStateProps}. Resolves through the exact same token
   * validation every other prop uses, and is suppressed for a given
   * property on any instance that also sets that property directly (an
   * instance override always wins - see
   * `primitives/internal/stateBridge.ts`). Only meaningful for a primitive
   * that actually exposes the relevant props; for one that doesn't (e.g.
   * `Stack`, `Row`), `RecipeStateProps<Own>` resolves to an empty object
   * type, so any key here is a compile error rather than a silently-ignored
   * no-op.
   */
  states?: Partial<Record<RecipeStateName, Partial<RecipeStateProps<Own>>>>;
}

export type RecipeVariantProps<V> = { [K in keyof V]?: keyof V[K] & string };

export type RecipeProps<P, V> = Omit<P, keyof RecipeVariantProps<V>> & RecipeVariantProps<V>;

/**
 * A recipe's `ref` prop, built the same way every primitive already builds
 * its own (`PolymorphicRef<E>` - see `internal/polymorphic.ts`) rather than
 * via React's `RefAttributes<T>`. `RefAttributes<unknown>` was the v0.1.1
 * bug here: it type-checked (a `Ref<unknown>` accepts *any* concrete ref
 * object, since every element type is assignable to `unknown`), so a
 * `Ref<HTMLAnchorElement>` passed to a button-shaped recipe compiled without
 * complaint despite being wrong at runtime. Keying the ref type off `E` -
 * the same type parameter that already drives DOM prop inference - fixes
 * both together instead of independently.
 */
type RecipeRefProp<E extends ElementType> = { ref?: PolymorphicRef<E> };

/**
 * Builds a reusable component from a primitive plus a fixed set of semantic
 * variants, without introducing arbitrary CSS. A recipe may only set props
 * the underlying primitive already supports - it cannot reach for selectors
 * like `"& div span"`, and there is no compound-variant engine in v0.1 (see
 * docs/architecture.md#recipes for why).
 *
 * Precedence is a single, deterministic chain:
 * primitive defaults < recipe `base` < recipe variants < interactive state
 * < instance props < `unsafeCss`. `base`/variants/instance props are a
 * plain object merge with no CSS specificity involved, exactly as before;
 * `states` is layered in separately by the underlying primitive (see
 * `primitives/internal/stateBridge.ts`) since a native `:hover`/
 * `:focus-visible`/`:active` rule cannot be expressed as a JS object merge -
 * but an instance prop or `unsafeCss` for the same property still always
 * wins over it, by construction: this function excludes any property an
 * instance override touches from the state bridge entirely, rather than
 * relying on any CSS-side precedence to sort it out.
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
  RecipeProps<PolymorphicProps<E, OwnPropsOf<C>>, V> & RecipeRefProp<E>
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
      const reservedCollisions = RECIPE_RESERVED_ATTRIBUTES.filter((key) => key in instanceProps);
      if (reservedCollisions.length > 0) {
        warnReservedAttribute(diagnostics, config.name, reservedCollisions);
      }

      merged["data-fw-recipe"] = config.name;
      if (activeVariants.length > 0) merged["data-fw-variant"] = activeVariants.join(" ");
    }

    if (config.states) {
      const bridge: Record<string, Record<string, unknown>> = {};
      // Property -> which declared states got suppressed by an instance
      // override, for the diagnostic below.
      const suppressed: Record<string, RecipeStateName[]> = {};

      for (const stateName of RECIPE_STATE_PRIORITY) {
        const stateProps = (
          config.states as Partial<Record<RecipeStateName, Record<string, unknown>>>
        )[stateName];
        if (!stateProps) continue;

        for (const [prop, value] of Object.entries(stateProps)) {
          if (prop in instanceProps) {
            (suppressed[prop] ??= []).push(stateName);
            continue;
          }
          (bridge[prop] ??= {})[stateName] = value;
        }
      }

      if (Object.keys(bridge).length > 0) {
        // An ordinary string-keyed prop, so it survives being passed through
        // a `forwardRef` component regardless of whether `ref` is also set -
        // see the comment on `RECIPE_STATE_BRIDGE` in stateBridge.ts for why
        // that matters. `Box` strips this key back out before it ever
        // reaches a DOM element (see Box.tsx).
        merged[RECIPE_STATE_BRIDGE] = {
          recipeName: config.name,
          ...bridge,
        } as unknown as RecipeStateBridge;
      }

      if (isDevelopmentBuild()) {
        for (const [prop, states] of Object.entries(suppressed)) {
          warnRecipeStateSuppressedByInstance(diagnostics, config.name, prop, states);
        }
      }
    }

    return createElement(Primitive, merged);
  });

  Recipe.displayName = `Recipe(${config.name})`;

  return Recipe as unknown as ForwardRefExoticComponent<
    RecipeProps<PolymorphicProps<E, OwnPropsOf<C>>, V> & RecipeRefProp<E>
  >;
}

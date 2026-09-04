import type { ComponentPropsWithRef, ElementType, ReactElement, ReactNode } from "react";

/**
 * Props every primitive accepts regardless of its semantic API: identity,
 * DOM escape hatches, and the `as` polymorphism. Note there is deliberately
 * no `style` prop here - `unsafeCss` is the one documented way to reach past
 * the semantic API, see docs/architecture.md#precedence.
 */
export interface CommonProps {
  as?: ElementType;
  id?: string;
  className?: string;
  children?: ReactNode;
  /**
   * A true escape hatch: raw CSS applied after every other framework style,
   * for the cases the semantic API doesn't cover yet. Using it means the
   * framework can no longer guarantee predictability for that element -
   * hence the explicit, slightly uncomfortable name.
   */
  unsafeCss?: React.CSSProperties;
}

/** Props owned by the primitive itself - never allow `as` or `children` to be re-declared by callers of this type. */
export type OwnProps<P> = P & CommonProps;

/**
 * Combines a primitive's own semantic props with the DOM props of whatever
 * element `as` resolves to, following the standard polymorphic-component
 * pattern for React + TypeScript. Own props always win over same-named DOM
 * props, and `style`/`children` are taken from `OwnProps` only.
 */
export type PolymorphicProps<E extends ElementType, P> = OwnProps<P> & {
  as?: E;
} & Omit<ComponentPropsWithRef<E>, keyof OwnProps<P> | "as" | "style">;

export type PolymorphicRef<E extends ElementType> = ComponentPropsWithRef<E>["ref"];

export const DEFAULT_TAG = "div" as const;

/**
 * The public type of every polymorphic primitive (`Box`, `Stack`, ...).
 *
 * This is an intersection of two call signatures - a generic one (for
 * `as={...}` usage) and a concrete one pinned to `Default` - rather than a
 * single generic signature. That's not just style: when a primitive's type
 * is a *single* generic call signature, passing the primitive itself as a
 * value into another generic function (as `defineRecipe` does) makes
 * TypeScript's inference leave the element-type parameter unresolved, which
 * collapses the inferred DOM props down to `any` and silently breaks prop
 * checking on the resulting recipe. Adding the concrete last signature gives
 * inference something non-generic to resolve against, which TypeScript
 * prefers - see the recipe engine's tests for the regression this guards.
 */
export type PolymorphicComponent<Own, Default extends ElementType = typeof DEFAULT_TAG> = (<
  E extends ElementType = Default,
>(
  props: PolymorphicProps<E, Own> & { ref?: PolymorphicRef<E> },
) => ReactElement | null) &
  ((
    props: PolymorphicProps<Default, Own> & { ref?: PolymorphicRef<Default> },
  ) => ReactElement | null);

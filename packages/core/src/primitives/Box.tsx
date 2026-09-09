import { forwardRef, type CSSProperties, type ElementType } from "react";
import { cx } from "../style/cx";
import { mergeUnsafeCss } from "../style/mergeUnsafeCss";
import { useTokenResolver } from "../style/useResolvedToken";
import { isDevelopmentBuild } from "../diagnostics/env";
import { warnRecipeStateSuppressedByUnsafeCss } from "../diagnostics/warn";
import { debugAttributes } from "./internal/debugAttributes";
import { applyBoundDimension, applyDimension, type BoxDimension } from "./internal/sizing";
import {
  applyStateBridge,
  RECIPE_STATE_BRIDGE,
  STATE_BRIDGE_UNSAFE_CSS_KEYS,
  type RecipeStateBridge,
  type RecipeStateName,
  type StateBridgeContext,
} from "./internal/stateBridge";
import {
  DEFAULT_TAG,
  type PolymorphicComponent,
  type PolymorphicProps,
  type PolymorphicRef,
} from "./internal/polymorphic";
import type {
  BorderToken,
  ColorToken,
  RadiusToken,
  ShadowToken,
  SizeToken,
  SpaceToken,
} from "../theme/types";

export interface BoxOwnProps {
  padding?: SpaceToken;
  paddingInline?: SpaceToken;
  paddingBlock?: SpaceToken;

  background?: ColorToken;
  color?: ColorToken;

  radius?: RadiusToken;

  border?: BorderToken | "none";
  shadow?: ShadowToken | "none";

  width?: BoxDimension;
  height?: BoxDimension;

  minWidth?: SizeToken;
  maxWidth?: SizeToken;
  minHeight?: SizeToken;
  maxHeight?: SizeToken;

  grow?: boolean;
  shrink?: boolean;
}

export type BoxProps<E extends ElementType = typeof DEFAULT_TAG> = PolymorphicProps<E, BoxOwnProps>;

type BoxComponent = PolymorphicComponent<BoxOwnProps>;

/**
 * `Box` is the general-purpose surface/container primitive: padding,
 * background, radius, border, shadow, and sizing. It deliberately has no
 * `display`, `position`, or `overflow` props - those are behaviors, and
 * behaviors get their own primitive (`Stack`, `Row`, `Grid`, `ScrollArea`,
 * `Sticky`, `Overlay`). See docs/architecture.md#box.
 *
 * `Box` is also the only primitive whose `background`/`color`/`border` can
 * carry a recipe's interactive-state styling (`states.hover`/`focusVisible`/
 * `active` - see `defineRecipe`'s `RecipeConfig`), via the private
 * `RECIPE_STATE_BRIDGE` channel and the static bridge rules in styles.css.
 */
export const Box = forwardRef(function Box(props: BoxProps, ref: PolymorphicRef<ElementType>) {
  const {
    as,
    className,
    unsafeCss,
    padding,
    paddingInline,
    paddingBlock,
    background,
    color,
    radius,
    border,
    shadow,
    width,
    height,
    minWidth,
    maxWidth,
    minHeight,
    maxHeight,
    grow,
    shrink,
    children,
    [RECIPE_STATE_BRIDGE]: stateBridge,
    ...rest
  } = props as BoxProps & { [RECIPE_STATE_BRIDGE]?: RecipeStateBridge };

  const Component = as || DEFAULT_TAG;
  const { diagnostics, resolveToken } = useTokenResolver("Box");

  const classes: string[] = ["fw-Box"];
  const style: CSSProperties = {};
  const tokens: string[] = [];
  const stateTokens: string[] = [];
  const bridgeCtx: StateBridgeContext = {
    style: style as unknown as Record<string, unknown>,
    tokens,
    stateTokens,
    resolveToken,
  };

  if (padding !== undefined) {
    style.padding = resolveToken("space", padding, "padding");
    tokens.push(`space.${padding}`);
  }
  if (paddingInline !== undefined) {
    style.paddingInline = resolveToken("space", paddingInline, "paddingInline");
    tokens.push(`space.${paddingInline}`);
  }
  if (paddingBlock !== undefined) {
    style.paddingBlock = resolveToken("space", paddingBlock, "paddingBlock");
    tokens.push(`space.${paddingBlock}`);
  }

  if (background !== undefined || stateBridge?.background) {
    if (background !== undefined) tokens.push(`colors.${background}`);
    applyStateBridge(
      bridgeCtx,
      "backgroundColor",
      "background",
      "colors",
      "background",
      stateBridge?.background,
      background !== undefined ? resolveToken("colors", background, "background") : undefined,
    );
  }
  if (color !== undefined || stateBridge?.color) {
    if (color !== undefined) tokens.push(`colors.${color}`);
    applyStateBridge(
      bridgeCtx,
      "color",
      "color",
      "colors",
      "color",
      stateBridge?.color,
      color !== undefined ? resolveToken("colors", color, "color") : undefined,
    );
  }

  if (radius !== undefined) {
    style.borderRadius = resolveToken("radius", radius, "radius");
    tokens.push(`radius.${radius}`);
  }

  if (border === "none" || border !== undefined || stateBridge?.border) {
    let restingBorder: string | undefined;
    if (border === "none") {
      restingBorder = "none";
    } else if (border !== undefined) {
      restingBorder = resolveToken("border", border, "border");
      tokens.push(`border.${border}`);
    }
    applyStateBridge(
      bridgeCtx,
      "border",
      "border",
      "border",
      "border",
      stateBridge?.border,
      restingBorder,
    );
  }

  if (shadow === "none") {
    style.boxShadow = "none";
  } else if (shadow !== undefined) {
    style.boxShadow = resolveToken("shadow", shadow, "shadow");
    tokens.push(`shadow.${shadow}`);
  }

  const sizeCtx = { classes, style, tokens, resolveToken };
  applyDimension(sizeCtx, "width", width);
  applyDimension(sizeCtx, "height", height);
  applyBoundDimension(sizeCtx, "minWidth", minWidth);
  applyBoundDimension(sizeCtx, "maxWidth", maxWidth);
  applyBoundDimension(sizeCtx, "minHeight", minHeight);
  applyBoundDimension(sizeCtx, "maxHeight", maxHeight);

  if (grow) classes.push("fw-grow");
  if (shrink === true) classes.push("fw-shrink");
  if (shrink === false) classes.push("fw-shrink-none");

  if (isDevelopmentBuild() && stateBridge && unsafeCss) {
    for (const property of ["background", "color", "border"] as const) {
      const statesForProperty = stateBridge[property];
      if (!statesForProperty) continue;

      const collidingKey = STATE_BRIDGE_UNSAFE_CSS_KEYS[property].find(
        (key) => key in (unsafeCss as Record<string, unknown>),
      );
      if (collidingKey) {
        warnRecipeStateSuppressedByUnsafeCss(
          diagnostics,
          stateBridge.recipeName,
          property,
          collidingKey,
          Object.keys(statesForProperty) as RecipeStateName[],
        );
      }
    }
  }

  const { style: finalStyle, unsafeCssCount } = mergeUnsafeCss(
    style,
    unsafeCss,
    diagnostics,
    "Box",
  );

  return (
    <Component
      ref={ref}
      className={cx(...classes, className)}
      style={finalStyle}
      {...rest}
      {...debugAttributes(
        { primitive: "Box", tokens, stateTokens, unsafeCssCount },
        rest,
        diagnostics,
      )}
    >
      {children}
    </Component>
  );
}) as unknown as BoxComponent;

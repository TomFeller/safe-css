import { forwardRef, type CSSProperties, type ElementType } from "react";
import { cx } from "../style/cx";
import { mergeUnsafeCss } from "../style/mergeUnsafeCss";
import { useTokenResolver } from "../style/useResolvedToken";
import { debugAttributes } from "./internal/debugAttributes";
import { applyBoundDimension, applyDimension, type BoxDimension } from "./internal/sizing";
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
    ...rest
  } = props;

  const Component = as || DEFAULT_TAG;
  const { diagnostics, resolveToken } = useTokenResolver("Box");

  const classes: string[] = ["fw-Box"];
  const style: CSSProperties = {};
  const tokens: string[] = [];

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

  if (background !== undefined) {
    style.backgroundColor = resolveToken("colors", background, "background");
    tokens.push(`colors.${background}`);
  }
  if (color !== undefined) {
    style.color = resolveToken("colors", color, "color");
    tokens.push(`colors.${color}`);
  }

  if (radius !== undefined) {
    style.borderRadius = resolveToken("radius", radius, "radius");
    tokens.push(`radius.${radius}`);
  }

  if (border === "none") {
    style.border = "none";
  } else if (border !== undefined) {
    style.border = resolveToken("border", border, "border");
    tokens.push(`border.${border}`);
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

  const finalStyle = mergeUnsafeCss(style, unsafeCss, diagnostics, "Box");

  return (
    <Component
      ref={ref}
      className={cx(...classes, className)}
      style={finalStyle}
      {...debugAttributes({ primitive: "Box", tokens })}
      {...rest}
    >
      {children}
    </Component>
  );
}) as unknown as BoxComponent;

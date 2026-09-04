import { forwardRef, type CSSProperties, type ElementType } from "react";
import { cx } from "../style/cx";
import { mergeUnsafeCss } from "../style/mergeUnsafeCss";
import { useTokenResolver } from "../style/useResolvedToken";
import { debugAttributes } from "./internal/debugAttributes";
import { applyDimension, type BoxDimension } from "./internal/sizing";
import {
  DEFAULT_TAG,
  type PolymorphicComponent,
  type PolymorphicProps,
  type PolymorphicRef,
} from "./internal/polymorphic";
import type { SpaceToken } from "../theme/types";

export type RowAlign = "start" | "center" | "end" | "stretch" | "baseline";
export type RowJustify = "start" | "center" | "end" | "between" | "around" | "evenly";
export type RowWrap = "never" | "when-needed";

export interface RowOwnProps {
  gap?: SpaceToken;
  align?: RowAlign;
  justify?: RowJustify;
  wrap?: RowWrap;
  width?: BoxDimension;
  grow?: boolean;
}

export type RowProps<E extends ElementType = typeof DEFAULT_TAG> = PolymorphicProps<E, RowOwnProps>;

type RowComponent = PolymorphicComponent<RowOwnProps>;

const JUSTIFY_CLASS: Record<RowJustify, string> = {
  start: "fw-justify-start",
  center: "fw-justify-center",
  end: "fw-justify-end",
  between: "fw-justify-between",
  around: "fw-justify-around",
  evenly: "fw-justify-evenly",
};

const WRAP_CLASS: Record<RowWrap, string> = {
  never: "fw-Row--nowrap",
  "when-needed": "fw-Row--wrap",
};

/**
 * `Row` means horizontal flow. `wrap="when-needed"` relies on intrinsic flex
 * wrapping - there is no breakpoint prop, following the framework's
 * "describe what happens when space runs out, not at what width" philosophy.
 * See docs/architecture.md#responsive-philosophy.
 */
export const Row = forwardRef(function Row(props: RowProps, ref: PolymorphicRef<ElementType>) {
  const {
    as,
    className,
    unsafeCss,
    gap,
    align = "stretch",
    justify = "start",
    wrap = "never",
    width,
    grow,
    children,
    ...rest
  } = props;

  const Component = as || DEFAULT_TAG;
  const { diagnostics, resolveToken } = useTokenResolver("Row");

  const classes: string[] = [
    "fw-Row",
    `fw-align-${align}`,
    JUSTIFY_CLASS[justify],
    WRAP_CLASS[wrap],
  ];
  const style: CSSProperties = {};
  const tokens: string[] = [];

  if (gap !== undefined) {
    style.gap = resolveToken("space", gap, "gap");
    tokens.push(`space.${gap}`);
  }

  const sizeCtx = { classes, style, tokens, resolveToken };
  applyDimension(sizeCtx, "width", width);

  if (grow) classes.push("fw-grow");

  const { style: finalStyle, unsafeCssCount } = mergeUnsafeCss(
    style,
    unsafeCss,
    diagnostics,
    "Row",
  );

  return (
    <Component
      ref={ref}
      className={cx(...classes, className)}
      style={finalStyle}
      {...rest}
      {...debugAttributes({ primitive: "Row", tokens, unsafeCssCount }, rest, diagnostics)}
    >
      {children}
    </Component>
  );
}) as unknown as RowComponent;

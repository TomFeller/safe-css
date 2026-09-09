import { forwardRef, type CSSProperties, type ElementType } from "react";
import { cx } from "../style/cx";
import { mergeUnsafeCss } from "../style/mergeUnsafeCss";
import { useTokenResolver } from "../style/useResolvedToken";
import { warnGridConflict } from "../diagnostics/warn";
import { debugAttributes } from "./internal/debugAttributes";
import {
  DEFAULT_TAG,
  type PolymorphicComponent,
  type PolymorphicProps,
  type PolymorphicRef,
} from "./internal/polymorphic";
import type { SizeToken, SpaceToken } from "../theme/types";

export type GridAlign = "start" | "center" | "end" | "stretch";
export type GridColumns = 1 | 2 | 3 | 4 | 5 | 6 | 12;

/**
 * Fixed and adaptive layout are mutually exclusive by construction: this
 * discriminated union makes `<Grid columns={3} minItemWidth="card" />` a
 * compile error, backed by a runtime warning (`warnGridConflict`) for the
 * rare case a consumer bypasses the type (e.g. via `as any` or plain JS).
 */
export type GridLayoutProps =
  { minItemWidth?: SizeToken; columns?: never } | { columns?: GridColumns; minItemWidth?: never };

export type GridOwnProps = GridLayoutProps & {
  gap?: SpaceToken;
  rowGap?: SpaceToken;
  columnGap?: SpaceToken;
  align?: GridAlign;
};

export type GridProps<E extends ElementType = typeof DEFAULT_TAG> = PolymorphicProps<
  E,
  GridOwnProps
>;

type GridComponent = PolymorphicComponent<GridOwnProps>;

/**
 * `Grid` is for collections of items. Adaptive mode (`minItemWidth`) uses
 * `repeat(auto-fit, minmax(min(token, 100%), 1fr))`, which naturally
 * produces as many columns as fit - no breakpoint is involved. See
 * docs/architecture.md#responsive-philosophy.
 */
export const Grid = forwardRef(function Grid(props: GridProps, ref: PolymorphicRef<ElementType>) {
  const {
    as,
    className,
    unsafeCss,
    gap,
    rowGap,
    columnGap,
    minItemWidth,
    columns,
    align,
    children,
    ...rest
  } = props;

  const Component = as || DEFAULT_TAG;
  const { diagnostics, resolveToken } = useTokenResolver("Grid");

  if (minItemWidth !== undefined && columns !== undefined) {
    warnGridConflict(diagnostics);
  }

  const classes: string[] = ["fw-Grid"];
  const style: CSSProperties = {};
  const tokens: string[] = [];

  if (align !== undefined) classes.push(`fw-align-${align}`);

  if (gap !== undefined) {
    style.gap = resolveToken("space", gap, "gap");
    tokens.push(`space.${gap}`);
  }
  if (rowGap !== undefined) {
    style.rowGap = resolveToken("space", rowGap, "rowGap");
    tokens.push(`space.${rowGap}`);
  }
  if (columnGap !== undefined) {
    style.columnGap = resolveToken("space", columnGap, "columnGap");
    tokens.push(`space.${columnGap}`);
  }

  if (minItemWidth !== undefined) {
    const sizeVar = resolveToken("size", minItemWidth, "minItemWidth");
    style.gridTemplateColumns = `repeat(auto-fit, minmax(min(${sizeVar}, 100%), 1fr))`;
    tokens.push(`size.${minItemWidth}`);
  } else if (columns !== undefined) {
    classes.push(`fw-grid-cols-${columns}`);
  }

  const { style: finalStyle, unsafeCssCount } = mergeUnsafeCss(
    style,
    unsafeCss,
    diagnostics,
    "Grid",
  );

  return (
    <Component
      ref={ref}
      className={cx(...classes, className)}
      style={finalStyle}
      {...rest}
      {...debugAttributes(
        { primitive: "Grid", classes, tokens, unsafeCssCount },
        rest,
        diagnostics,
      )}
    >
      {children}
    </Component>
  );
}) as unknown as GridComponent;

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

export type StackAlign = "start" | "center" | "end" | "stretch";
export type StackJustify = "start" | "center" | "end" | "between";

export interface StackOwnProps {
  gap?: SpaceToken;
  align?: StackAlign;
  justify?: StackJustify;
  width?: BoxDimension;
  height?: BoxDimension;
  grow?: boolean;
}

export type StackProps<E extends ElementType = typeof DEFAULT_TAG> = PolymorphicProps<
  E,
  StackOwnProps
>;

type StackComponent = PolymorphicComponent<StackOwnProps>;

const JUSTIFY_CLASS: Record<StackJustify, string> = {
  start: "fw-justify-start",
  center: "fw-justify-center",
  end: "fw-justify-end",
  between: "fw-justify-between",
};

/**
 * `Stack` means vertical layout: `display: flex; flex-direction: column`
 * plus a gap. There is intentionally no `direction` prop - horizontal intent
 * is `Row`, not `<Stack direction="horizontal">`. See docs/architecture.md#stack.
 */
export const Stack = forwardRef(function Stack(
  props: StackProps,
  ref: PolymorphicRef<ElementType>,
) {
  const {
    as,
    className,
    unsafeCss,
    gap,
    align = "stretch",
    justify = "start",
    width,
    height,
    grow,
    children,
    ...rest
  } = props;

  const Component = as || DEFAULT_TAG;
  const { diagnostics, resolveToken } = useTokenResolver("Stack");

  const classes: string[] = ["fw-Stack", `fw-align-${align}`, JUSTIFY_CLASS[justify]];
  const style: CSSProperties = {};
  const tokens: string[] = [];

  if (gap !== undefined) {
    style.gap = resolveToken("space", gap, "gap");
    tokens.push(`space.${gap}`);
  }

  const sizeCtx = { classes, style, tokens, resolveToken };
  applyDimension(sizeCtx, "width", width);
  applyDimension(sizeCtx, "height", height);

  if (grow) classes.push("fw-grow");

  const finalStyle = mergeUnsafeCss(style, unsafeCss, diagnostics, "Stack");

  return (
    <Component
      ref={ref}
      className={cx(...classes, className)}
      style={finalStyle}
      {...debugAttributes({ primitive: "Stack", tokens })}
      {...rest}
    >
      {children}
    </Component>
  );
}) as unknown as StackComponent;

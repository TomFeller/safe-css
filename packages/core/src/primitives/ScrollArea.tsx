import { forwardRef, type ElementType } from "react";
import { cx } from "../style/cx";
import { mergeUnsafeCss } from "../style/mergeUnsafeCss";
import { useTokenResolver } from "../style/useResolvedToken";
import { debugAttributes } from "./internal/debugAttributes";
import {
  DEFAULT_TAG,
  type PolymorphicComponent,
  type PolymorphicProps,
  type PolymorphicRef,
} from "./internal/polymorphic";

export type ScrollDirection = "vertical" | "horizontal" | "both";
export type Overscroll = "auto" | "contain";

export interface ScrollAreaOwnProps {
  direction?: ScrollDirection;
  overscroll?: Overscroll;
  grow?: boolean;
}

export type ScrollAreaProps<E extends ElementType = typeof DEFAULT_TAG> = PolymorphicProps<
  E,
  ScrollAreaOwnProps
>;

type ScrollAreaComponent = PolymorphicComponent<ScrollAreaOwnProps>;

const DIRECTION_CLASS: Record<ScrollDirection, string> = {
  vertical: "fw-ScrollArea--vertical",
  horizontal: "fw-ScrollArea--horizontal",
  both: "fw-ScrollArea--both",
};

const OVERSCROLL_CLASS: Record<Overscroll, string> = {
  auto: "fw-overscroll-auto",
  contain: "fw-overscroll-contain",
};

/**
 * `ScrollArea` replaces `overflow-y: auto; min-height: 0` (and the
 * equivalent horizontal/both variants). The `min-width`/`min-height: 0` pair
 * is what actually makes scrolling work inside a flex or grid ancestor -
 * without it, a flex/grid child's automatic minimum size prevents overflow
 * from ever triggering. See docs/architecture.md#scrollarea.
 */
export const ScrollArea = forwardRef(function ScrollArea(
  props: ScrollAreaProps,
  ref: PolymorphicRef<ElementType>,
) {
  const {
    as,
    className,
    unsafeCss,
    direction = "vertical",
    overscroll = "auto",
    grow,
    children,
    ...rest
  } = props;

  const Component = as || DEFAULT_TAG;
  const { diagnostics } = useTokenResolver("ScrollArea");

  const classes = [
    "fw-ScrollArea",
    DIRECTION_CLASS[direction],
    OVERSCROLL_CLASS[overscroll],
    grow && "fw-grow",
  ];

  const { style: finalStyle, unsafeCssCount } = mergeUnsafeCss(
    {},
    unsafeCss,
    diagnostics,
    "ScrollArea",
  );

  return (
    <Component
      ref={ref}
      className={cx(...classes, className)}
      style={finalStyle}
      {...rest}
      {...debugAttributes({ primitive: "ScrollArea", unsafeCssCount }, rest, diagnostics)}
    >
      {children}
    </Component>
  );
}) as unknown as ScrollAreaComponent;

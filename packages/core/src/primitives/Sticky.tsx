import { forwardRef, type CSSProperties, type ElementType } from "react";
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
import type { LayerToken, SpaceToken } from "../theme/types";

export type StickyEdge = "top" | "bottom";

export interface StickyOwnProps {
  edge?: StickyEdge;
  offset?: SpaceToken;
  layer?: LayerToken;
}

export type StickyProps<E extends ElementType = typeof DEFAULT_TAG> = PolymorphicProps<
  E,
  StickyOwnProps
>;

type StickyComponent = PolymorphicComponent<StickyOwnProps>;

/**
 * `Sticky` replaces `position: sticky; top: 0; z-index: ...`. The offset and
 * layer are theme tokens rather than raw pixels/numbers so a sticky
 * toolbar's offset and stacking position stay consistent with the rest of
 * the app and update if the tokens change. See docs/architecture.md#sticky.
 */
export const Sticky = forwardRef(function Sticky(
  props: StickyProps,
  ref: PolymorphicRef<ElementType>,
) {
  const {
    as,
    className,
    unsafeCss,
    edge = "top",
    offset = "none",
    layer = "sticky",
    children,
    ...rest
  } = props;

  const Component = as || DEFAULT_TAG;
  const { diagnostics, resolveToken } = useTokenResolver("Sticky");

  const style: CSSProperties = {};
  const tokens: string[] = [];

  const offsetVar = resolveToken("space", offset, "offset");
  if (edge === "top") {
    style.insetBlockStart = offsetVar;
  } else {
    style.insetBlockEnd = offsetVar;
  }
  tokens.push(`space.${offset}`);

  style.zIndex = resolveToken("layer", layer, "layer");
  tokens.push(`layer.${layer}`);

  const { style: finalStyle, unsafeCssCount } = mergeUnsafeCss(
    style,
    unsafeCss,
    diagnostics,
    "Sticky",
  );

  return (
    <Component
      ref={ref}
      className={cx("fw-Sticky", className)}
      style={finalStyle}
      {...debugAttributes({ primitive: "Sticky", tokens, unsafeCssCount })}
      {...rest}
    >
      {children}
    </Component>
  );
}) as unknown as StickyComponent;

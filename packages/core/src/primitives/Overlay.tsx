import { forwardRef, type CSSProperties, type ElementType } from "react";
import { cx } from "../style/cx";
import { mergeUnsafeCss } from "../style/mergeUnsafeCss";
import { useTokenResolver } from "../style/useResolvedToken";
import { debugAttributes } from "./internal/debugAttributes";
import {
  OVERLAY_ANCHOR_GEOMETRY,
  overlayAnchorClassName,
  type OverlayAnchor,
  type OverlayPlacement,
} from "./internal/overlayAnchors";
import {
  DEFAULT_TAG,
  type PolymorphicComponent,
  type PolymorphicProps,
  type PolymorphicRef,
} from "./internal/polymorphic";
import type { LayerToken, SpaceToken } from "../theme/types";

export type { OverlayAnchor, OverlayPlacement } from "./internal/overlayAnchors";

// ---------------------------------------------------------------------------
// Overlay (root): establishes the positioning context. Consumers never write
// `position: relative` themselves - see docs/architecture.md#overlay.
// ---------------------------------------------------------------------------

export type OverlayOwnProps = Record<never, never>;

export type OverlayProps<E extends ElementType = typeof DEFAULT_TAG> = PolymorphicProps<
  E,
  OverlayOwnProps
>;

type OverlayRootComponent = PolymorphicComponent<OverlayOwnProps>;

const OverlayRoot = forwardRef(function Overlay(
  props: OverlayProps,
  ref: PolymorphicRef<ElementType>,
) {
  const { as, className, unsafeCss, children, ...rest } = props;
  const Component = as || DEFAULT_TAG;
  const { diagnostics } = useTokenResolver("Overlay");

  const finalStyle = mergeUnsafeCss({}, unsafeCss, diagnostics, "Overlay");

  return (
    <Component
      ref={ref}
      className={cx("fw-Overlay", className)}
      style={finalStyle}
      {...debugAttributes({ primitive: "Overlay" })}
      {...rest}
    >
      {children}
    </Component>
  );
}) as unknown as OverlayRootComponent;

// ---------------------------------------------------------------------------
// Overlay.Item: positioned relative to the Overlay root by anchor, not by
// raw top/left/right/bottom.
// ---------------------------------------------------------------------------

export interface OverlayItemOwnProps {
  anchor: OverlayAnchor;
  placement?: OverlayPlacement;
  offset?: SpaceToken;
  layer?: LayerToken;
}

export type OverlayItemProps<E extends ElementType = typeof DEFAULT_TAG> = PolymorphicProps<
  E,
  OverlayItemOwnProps
>;

type OverlayItemComponent = PolymorphicComponent<OverlayItemOwnProps>;

const OverlayItem = forwardRef(function OverlayItem(
  props: OverlayItemProps,
  ref: PolymorphicRef<ElementType>,
) {
  const {
    as,
    className,
    unsafeCss,
    anchor,
    placement = "inside",
    offset = "none",
    layer = "overlay",
    children,
    ...rest
  } = props;

  const Component = as || DEFAULT_TAG;
  const { diagnostics, resolveToken } = useTokenResolver("Overlay.Item");

  const style: CSSProperties = {};
  const tokens: string[] = [];

  const offsetVar = resolveToken("space", offset, "offset");
  tokens.push(`space.${offset}`);

  const geometry = OVERLAY_ANCHOR_GEOMETRY[anchor];

  if (geometry.inline === "start") style.insetInlineStart = offsetVar;
  else if (geometry.inline === "end") style.insetInlineEnd = offsetVar;
  else style.insetInlineStart = "50%";

  if (geometry.block === "start") style.insetBlockStart = offsetVar;
  else if (geometry.block === "end") style.insetBlockEnd = offsetVar;
  else style.insetBlockStart = "50%";

  style.zIndex = resolveToken("layer", layer, "layer");
  tokens.push(`layer.${layer}`);

  const finalStyle = mergeUnsafeCss(style, unsafeCss, diagnostics, "Overlay.Item");

  return (
    <Component
      ref={ref}
      className={cx("fw-OverlayItem", overlayAnchorClassName(anchor, placement), className)}
      style={finalStyle}
      {...debugAttributes({ primitive: "Overlay.Item", tokens })}
      {...rest}
    >
      {children}
    </Component>
  );
}) as unknown as OverlayItemComponent;

export const Overlay = Object.assign(OverlayRoot, { Item: OverlayItem });

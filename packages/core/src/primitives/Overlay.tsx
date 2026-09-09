import { forwardRef, type CSSProperties, type ElementType } from "react";
import { cx } from "../style/cx";
import { mergeUnsafeCss } from "../style/mergeUnsafeCss";
import { useTokenResolver } from "../style/useResolvedToken";
import { warnOverlayCenteredAxisOffset } from "../diagnostics/warn";
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

  const classes = ["fw-Overlay"];

  const { style: finalStyle, unsafeCssCount } = mergeUnsafeCss(
    {},
    unsafeCss,
    diagnostics,
    "Overlay",
  );

  return (
    <Component
      ref={ref}
      className={cx(...classes, className)}
      style={finalStyle}
      {...rest}
      {...debugAttributes({ primitive: "Overlay", classes, unsafeCssCount }, rest, diagnostics)}
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
  /**
   * Shorthand/fallback offset for both non-centered logical axes at once -
   * see `inlineOffset`/`blockOffset` for independent per-axis control.
   * Effective precedence per axis: the axis-specific prop, then `offset`,
   * then `"none"`. Never warns merely because one axis happens to be
   * centered for the chosen `anchor` (unlike its axis-specific
   * counterparts) - this shorthand stays fully ergonomic on every anchor.
   */
  offset?: SpaceToken;
  /** Overrides `offset` for the inline axis only. Has no effect (and warns in development) on an anchor that centers the inline axis (`top-center`, `bottom-center`, `center`). */
  inlineOffset?: SpaceToken;
  /** Overrides `offset` for the block axis only. Has no effect (and warns in development) on an anchor that centers the block axis (`center-start`, `center-end`, `center`). */
  blockOffset?: SpaceToken;
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
    offset,
    inlineOffset,
    blockOffset,
    layer = "overlay",
    children,
    ...rest
  } = props;

  const Component = as || DEFAULT_TAG;
  const { diagnostics, resolveToken } = useTokenResolver("Overlay.Item");

  const style: CSSProperties = {};
  const tokens: string[] = [];

  const geometry = OVERLAY_ANCHOR_GEOMETRY[anchor];

  // Each axis is resolved fully independently: `axis-specific offset >
  // offset shorthand > "none"`. A centered axis is always a fixed 50% -
  // per the approved design, it never resolves or records a token
  // dependency at all (not even for the `offset` shorthand), so
  // `data-fw-tokens` only ever reflects axes that actually consume an
  // offset. An axis-specific prop explicitly given for a centered axis
  // warns (once) rather than silently doing nothing; the general `offset`
  // shorthand never warns for this, since it legitimately targets both
  // axes and must stay ergonomic even when one happens to be centered.
  if (geometry.inline === "center") {
    if (inlineOffset !== undefined) {
      warnOverlayCenteredAxisOffset(diagnostics, "inlineOffset", anchor);
    }
    style.insetInlineStart = "50%";
  } else {
    const effectiveInlineOffset = inlineOffset ?? offset ?? "none";
    const inlineOffsetVar = resolveToken(
      "space",
      effectiveInlineOffset,
      inlineOffset !== undefined ? "inlineOffset" : "offset",
    );
    tokens.push(`space.${effectiveInlineOffset}`);
    if (geometry.inline === "start") style.insetInlineStart = inlineOffsetVar;
    else style.insetInlineEnd = inlineOffsetVar;
  }

  if (geometry.block === "center") {
    if (blockOffset !== undefined) {
      warnOverlayCenteredAxisOffset(diagnostics, "blockOffset", anchor);
    }
    style.insetBlockStart = "50%";
  } else {
    const effectiveBlockOffset = blockOffset ?? offset ?? "none";
    const blockOffsetVar = resolveToken(
      "space",
      effectiveBlockOffset,
      blockOffset !== undefined ? "blockOffset" : "offset",
    );
    tokens.push(`space.${effectiveBlockOffset}`);
    if (geometry.block === "start") style.insetBlockStart = blockOffsetVar;
    else style.insetBlockEnd = blockOffsetVar;
  }

  style.zIndex = resolveToken("layer", layer, "layer");
  tokens.push(`layer.${layer}`);

  const classes = ["fw-OverlayItem", overlayAnchorClassName(anchor, placement)];

  const { style: finalStyle, unsafeCssCount } = mergeUnsafeCss(
    style,
    unsafeCss,
    diagnostics,
    "Overlay.Item",
  );

  return (
    <Component
      ref={ref}
      className={cx(...classes, className)}
      style={finalStyle}
      {...rest}
      {...debugAttributes(
        { primitive: "Overlay.Item", tokens, classes, unsafeCssCount },
        rest,
        diagnostics,
      )}
    >
      {children}
    </Component>
  );
}) as unknown as OverlayItemComponent;

export const Overlay = Object.assign(OverlayRoot, { Item: OverlayItem });

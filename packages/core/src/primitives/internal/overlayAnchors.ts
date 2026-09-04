export type OverlayAnchor =
  | "top-start"
  | "top-center"
  | "top-end"
  | "center-start"
  | "center"
  | "center-end"
  | "bottom-start"
  | "bottom-center"
  | "bottom-end";

export type OverlayPlacement = "inside" | "edge";

type AxisSide = "start" | "center" | "end";

interface AnchorGeometry {
  inline: AxisSide;
  block: AxisSide;
}

/**
 * Describes each anchor purely in logical (writing-direction-independent)
 * terms. The corresponding physical inset properties and, for `edge`
 * placement, the writing-direction-aware transform sign live in
 * `style/styles.css` (`.fw-anchor-*`) - see that file's header comment.
 */
export const OVERLAY_ANCHOR_GEOMETRY: Record<OverlayAnchor, AnchorGeometry> = {
  "top-start": { inline: "start", block: "start" },
  "top-center": { inline: "center", block: "start" },
  "top-end": { inline: "end", block: "start" },
  "center-start": { inline: "start", block: "center" },
  center: { inline: "center", block: "center" },
  "center-end": { inline: "end", block: "center" },
  "bottom-start": { inline: "start", block: "end" },
  "bottom-center": { inline: "center", block: "end" },
  "bottom-end": { inline: "end", block: "end" },
};

export function overlayAnchorClassName(anchor: OverlayAnchor, placement: OverlayPlacement): string {
  return `fw-anchor-${anchor}--${placement}`;
}

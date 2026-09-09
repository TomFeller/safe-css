import { Box, defineRecipe } from "@safe-css/core";

/**
 * Not part of the safe-css package (a button *library* is an explicit v0.1
 * non-goal - see docs/architecture.md#non-goals) - this is what an
 * application is expected to build for itself: a recipe on top of `Box`,
 * with `as: "button"` baked into the base so every instance renders a real
 * `<button>` element.
 *
 * `cursor` and `font` have no semantic meaning in the token system, so
 * they're a legitimate, narrow use of `unsafeCss` rather than something the
 * framework should grow a prop for.
 *
 * `states` declares real `:hover`/`:focus-visible`/`:active` styling (v0.4)
 * - try it: hover this button with a mouse, then tab to it with a keyboard.
 * Both work with zero JavaScript event handling. The three tokens
 * (`surfaceRaised`, `strong`, `danger`) are chosen to be obviously different
 * from each other and from the resting state, so the effect is easy to spot
 * and easy to verify token-by-token in the Inspector's "Interaction states"
 * section - see docs/api-reference.md#interactive-states.
 */
export const Button = defineRecipe(Box, {
  name: "Button",
  base: {
    as: "button",
    paddingInline: "element",
    paddingBlock: "control",
    radius: "control",
    border: "subtle",
    background: "surface",
    color: "text",
    unsafeCss: {
      cursor: "pointer",
      font: "inherit",
      fontWeight: 600,
    },
  },
  variants: {
    tone: {
      neutral: {},
      action: {
        background: "action",
        color: "surface",
        border: "none",
      },
    },
  },
  defaultVariants: { tone: "neutral" },
  states: {
    hover: {
      background: "surfaceRaised",
    },
    focusVisible: {
      border: "strong",
    },
    active: {
      background: "danger",
    },
  },
});

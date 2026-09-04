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
});

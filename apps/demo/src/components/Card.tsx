import { Box, defineRecipe } from "@safe-css/core";

/**
 * The canonical `defineRecipe` example from the spec: a `Card` built purely
 * from `Box` props. `tone="raised"` swaps a border for a shadow; nothing
 * here reaches for arbitrary CSS.
 */
export const Card = defineRecipe(Box, {
  name: "Card",
  base: {
    padding: "card",
    radius: "card",
    background: "surface",
  },
  variants: {
    tone: {
      default: { border: "subtle" },
      raised: { shadow: "raised" },
    },
  },
  defaultVariants: { tone: "default" },
});

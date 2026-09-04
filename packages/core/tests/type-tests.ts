/**
 * Compile-time-only type tests. Nothing here executes - `npm run typecheck`
 * is what verifies this file: every `@ts-expect-error` line must actually be
 * a type error (an unused directive fails the build), and every non-error
 * line must actually type-check. There is no test runner involved, which is
 * why this file is named `type-tests.ts` rather than `*.test.ts` - vitest's
 * include glob deliberately does not match it.
 */
import type { ComponentProps } from "react";
import { Box, defineRecipe } from "../src";
import type { BoxProps, GridProps, RecipeVariantMap, Theme } from "../src";

// --- Box: only theme tokens are accepted, not arbitrary strings ---

// @ts-expect-error - "not-a-theme-token" is not a valid SpaceToken
export const invalidPadding: BoxProps["padding"] = "not-a-theme-token";

export const validPadding: BoxProps["padding"] = "card";

// --- Box: no raw CSS escape props ---

// @ts-expect-error - Box has no public `margin` prop
export const invalidMargin: BoxProps = { margin: "16px" };

// @ts-expect-error - Box has no public `display` prop
export const invalidDisplay: BoxProps = { display: "flex" };

// @ts-expect-error - Box has no public `position` prop
export const invalidPosition: BoxProps = { position: "absolute" };

// @ts-expect-error - Box has no public `overflow` prop (that's ScrollArea's job)
export const invalidOverflow: BoxProps = { overflow: "auto" };

export const validBox: BoxProps = {
  padding: "card",
  radius: "card",
  background: "surface",
  border: "subtle",
  shadow: "none",
  width: "full",
  grow: true,
};

// --- Grid: fixed vs. adaptive layout is a discriminated union ---

// @ts-expect-error - Grid cannot use both `columns` and `minItemWidth`
export const invalidGrid: GridProps = { columns: 3, minItemWidth: "card" };

export const validAdaptiveGrid: GridProps = { minItemWidth: "card" };
export const validFixedGrid: GridProps = { columns: 3 };

// --- RecipeVariantMap: an opt-in helper for callers who want variants
// checked strictly against a primitive's own props (see defineRecipe.ts for
// why this isn't enforced by default). ---

export const validVariantMap = {
  tone: {
    default: { border: "subtle" },
    raised: { shadow: "raised" },
  },
} satisfies RecipeVariantMap<BoxProps>;

// A variant leaf using a prop the primitive doesn't have is *not* rejected by
// `defineRecipe` itself by default (see the module doc in defineRecipe.ts for
// why), but callers who want that guarantee can opt in with `satisfies`:
export const invalidVariantMapOptIn = {
  tone: {
    // @ts-expect-error - `definitelyNotABoxProp` is not a real Box prop
    raised: { definitelyNotABoxProp: "foo" },
  },
} satisfies RecipeVariantMap<BoxProps>;

// --- Theme: a full custom theme is checked for completeness when assigned
// directly to `Theme` (unlike the partial `ThemeInput` `createTheme` takes),
// which is what keeps a custom/augmented token from compiling without a
// runtime value - see docs/architecture.md#custom-tokens. Declaration
// merging itself isn't exercised here (augmenting `Theme` in a file that's
// part of this package's own compilation would affect every other file's
// type-checking too) - this demonstrates the same completeness-checking
// mechanism a real augmented category would go through. ---

// @ts-expect-error - missing every other required category (colors, radius, ...)
export const incompleteCustomTheme: Theme = {
  space: { none: "0", control: "0", element: "0", card: "0", section: "0", page: "0" },
};

export const completeCustomTheme: Theme = {
  colors: {
    text: "#000",
    textMuted: "#000",
    surface: "#fff",
    surfaceRaised: "#fff",
    border: "#000",
    action: "#000",
    danger: "#000",
  },
  space: { none: "0", control: "0", element: "0", card: "0", section: "0", page: "0" },
  radius: { none: "0", control: "0", card: "0", modal: "0", pill: "0" },
  size: { sidebar: "0", card: "0", content: "0", control: "0" },
  border: { subtle: "0", strong: "0" },
  shadow: { raised: "0", overlay: "0" },
  layer: { base: 0, sticky: 10, overlay: 20, modal: 30, toast: 40 },
};

// --- defineRecipe: `name` is required (v0.1.1) ---

// @ts-expect-error - `name` is required
export const recipeWithoutName = defineRecipe(Box, { base: { padding: "card" } });

export const recipeWithName = defineRecipe(Box, { name: "Card", base: { padding: "card" } });

// --- defineRecipe: `base.as` drives element-specific DOM prop typing ---

export const ButtonLikeRecipe = defineRecipe(Box, {
  name: "ButtonLike",
  base: { as: "button", padding: "control" },
});

type ButtonLikeProps = ComponentProps<typeof ButtonLikeRecipe>;

// Real <button> DOM props/events are available, not just div's:
export const validButtonLikeUsage: ButtonLikeProps = {
  type: "submit",
  disabled: true,
  onClick: () => {},
};

// @ts-expect-error - `href` is an anchor attribute, not a button attribute
export const invalidButtonLikeUsage: ButtonLikeProps = { href: "/nope" };

// The default (no `base.as`) recipe stays div-shaped:
export const PlainCardRecipe = defineRecipe(Box, { name: "Card", base: { padding: "card" } });
type PlainCardRecipeProps = ComponentProps<typeof PlainCardRecipe>;
// @ts-expect-error - `type`/`disabled` are button-only, this recipe is a div
export const invalidCardButtonProp: PlainCardRecipeProps = { type: "submit" };

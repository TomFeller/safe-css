/**
 * Compile-time-only type tests. Nothing here executes - `npm run typecheck`
 * is what verifies this file: every `@ts-expect-error` line must actually be
 * a type error (an unused directive fails the build), and every non-error
 * line must actually type-check. There is no test runner involved, which is
 * why this file is named `type-tests.ts` rather than `*.test.ts` - vitest's
 * include glob deliberately does not match it.
 */
import type { BoxProps, GridProps, RecipeVariantMap } from "../src";

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

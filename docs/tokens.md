# Tokens

This is an exhaustive reference for every built-in design token shipped by `@safe-css/core`, derived directly from `packages/core/src/theme/defaultTheme.ts` and `theme/types.ts`. For how tokens are used inside primitive props, see the [API Reference](api-reference.md). For the reasoning behind tokens as a concept, see [Core Concepts](core-concepts.md).

---

## How tokens become CSS variables

`createTheme(input?)` merges `input` over the built-in default theme, category by category, and always returns a _complete_ `Theme` — every token in every category has a value, even if you customized none of them.

`<ThemeProvider theme={theme}>` flattens that `Theme` into CSS custom properties and publishes them as inline styles on a wrapper element. The naming rule is fixed:

```text
--fw-<category>-<token>
```

with one exception: the `colors` category maps to the singular `color` (so `colors.surface` becomes `--fw-color-surface`, not `--fw-colors-surface`). Every other category keeps its name as-is (`space`, `radius`, `size`, `border`, `shadow`, `layer`).

Every primitive prop that takes a token resolves to a `var(--fw-...)` reference in inline `style` — never a literal value. Because of that, a primitive never needs a newly computed literal style value when a theme's token _values_ change (only its rendered `var(--fw-...)` reference matters, and that string doesn't change) — the browser resolves the new value and repaints on its own. React components can still re-render for their own, ordinary reasons (state changes, a parent re-rendering, a token _name_ changing, ...); a theme value change specifically just isn't one of those reasons for a primitive that only consumes token names.

An unknown/invalid token name still produces a `var(--fw-...)` reference — one that simply won't resolve, leaving the property at its browser-initial value — rather than falling back to an invented value. A development-mode console warning fires once per unique `(category, token, component, prop)` combination.

---

## Token dependencies

A token's value can itself reference another token's CSS variable, rather than duplicating a literal value. Today there is exactly one such dependency in the built-in theme:

```text
border.subtle → colors.border
```

`border.subtle`'s built-in value is the literal string `1px solid var(--fw-color-border)` — so changing `colors.border` also changes what `border.subtle` resolves to, everywhere it's used, without `border.subtle` itself needing to change. `border.strong` currently uses an independent literal value (`1px solid #9ca3af`) and does not reference `colors.border`.

This dependency exists purely as a literal `var()` reference inside a token's own string value — there's no separate "dependency graph" data structure in Core itself. (`@safe-css/inspector`'s Impact Analysis parses these `var()` references at runtime to show direct vs. indirect impact — see `docs/core-concepts.md`.)

**A token doesn't know or care whether it's consumed by ordinary resting styling or by a recipe's `states.hover`/`focusVisible`/`active` declaration** (see [API Reference: Interactive states](api-reference.md#interactive-states)) — it's the same token, the same category, the same value. Both kinds of usage are visible to the Inspector and to Impact Analysis; a token used both ways on the same element shows up in both places.

---

## Custom tokens via declaration merging

Each token category (`ThemeColorTokens`, `ThemeSpaceTokens`, etc.) is its own exported TypeScript interface specifically so you can extend it:

```ts
declare module "@safe-css/core" {
  interface ThemeSpaceTokens {
    xl: string;
  }
}
```

**This only changes what TypeScript accepts** — `padding="xl"` will now typecheck. It does **not** create the token at runtime: types don't exist once the code is compiled, so nothing mechanically guarantees the active theme actually defines `space.xl`. If `xl` is used but the active theme never set it, the same "Unknown token" development warning fires as for any other invalid token, and the property resolves to nothing.

To close that gap, define your theme as one object checked with `satisfies Theme` (instead of the partial `createTheme({...})` shortcut) — this makes TypeScript require every augmented token to actually have a value:

```ts
import { createTheme, type Theme } from "@safe-css/core";

const myTheme = {
  colors: {
    text: "#202124",
    textMuted: "#6b7280",
    surface: "#ffffff",
    surfaceRaised: "#f8fafc",
    border: "#e5e7eb",
    action: "#2563eb",
    danger: "#dc2626",
  },
  space: {
    none: "0px",
    control: "8px",
    element: "12px",
    card: "16px",
    section: "24px",
    page: "clamp(16px, 3vw, 32px)",
    xl: "40px", // the custom token declared above — required here, satisfies checks completeness
  },
  radius: { none: "0px", control: "6px", card: "12px", modal: "16px", pill: "999px" },
  size: { sidebar: "280px", card: "260px", content: "1200px", control: "40px" },
  border: { subtle: "1px solid var(--fw-color-border)", strong: "1px solid #9ca3af" },
  shadow: { raised: "0 2px 8px rgba(0,0,0,.08)", overlay: "0 12px 40px rgba(0,0,0,.16)" },
  layer: { base: 0, sticky: 10, overlay: 20, modal: 30, toast: 40 },
} satisfies Theme;

const theme = createTheme(myTheme);
```

(This example repeats the built-in defaults in full, since `satisfies Theme` requires every token to be present — that repetition is exactly what it buys you: omit one and TypeScript will not compile.)

A practical place for both the `declare module` augmentation and this object is `src/theme.ts`, so there's exactly one place to update when adding a token.

---

## Nested `ThemeProvider` scope

`ThemeProvider` can be nested, but **a nested provider is a full theme replacement for its subtree, not a partial override**. `createTheme(partialInput)` always merges over the _built-in default_ theme, never over whatever theme happens to be active higher up the tree — so an inner `ThemeProvider` that only customizes `colors.action` still resets every _other_ category to the built-in default for its subtree; it does not inherit the outer provider's customizations.

To give a nested subtree only a few different values while keeping everything else from the outer theme, construct the inner theme explicitly from the outer one's overrides:

```tsx
const outerOverrides = { colors: { action: "#2563eb" } };
const outerTheme = createTheme(outerOverrides);
const innerTheme = createTheme({
  ...outerOverrides,
  colors: { ...outerOverrides.colors, action: "#7c3aed" },
});
```

There is currently no mechanism for a nested provider to inherit an individual token's value from an ancestor `ThemeProvider` automatically.

---

## Colors

| Token                  | Default value | Intent                                                                                                                                          |
| ---------------------- | ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `colors.text`          | `#202124`     | Primary text color. Not applied automatically by any primitive — apply via `color="text"` on a `Box`.                                           |
| `colors.textMuted`     | `#6b7280`     | Secondary/de-emphasized text color (e.g. supporting text under a heading).                                                                      |
| `colors.surface`       | `#ffffff`     | Default background color for a surface/container (e.g. a card).                                                                                 |
| `colors.surfaceRaised` | `#f8fafc`     | Background color for a raised/elevated section of the page, distinct from `surface` (e.g. the page background behind cards that use `surface`). |
| `colors.border`        | `#e5e7eb`     | Default border color. Also the source token for `border.subtle` — see [Token dependencies](#token-dependencies).                                |
| `colors.action`        | `#2563eb`     | Primary interactive/action color (e.g. primary buttons, links).                                                                                 |
| `colors.danger`        | `#dc2626`     | Color for destructive or error states.                                                                                                          |

## Space

| Token           | Default value            | Intent                                                                                                                                                                                            |
| --------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `space.none`    | `0px`                    | Zero spacing — an explicit way to say "no gap/padding" with a token rather than omitting the prop.                                                                                                |
| `space.control` | `8px`                    | Compact spacing appropriate for small interactive controls (e.g. gap between buttons in a toolbar).                                                                                               |
| `space.element` | `12px`                   | Spacing between related but distinct elements (e.g. a heading and its supporting text).                                                                                                           |
| `space.card`    | `16px`                   | Internal spacing appropriate for card-like surfaces, and spacing at that scale generally.                                                                                                         |
| `space.section` | `24px`                   | Spacing between larger structural sections of a page.                                                                                                                                             |
| `space.page`    | `clamp(16px, 3vw, 32px)` | Outer padding for a page-level container. Unlike every other space token, this is a fluid CSS `clamp()` value, not a fixed pixel value — it scales between 16px and 32px based on viewport width. |

## Radius

| Token            | Default value | Intent                                                                                                                                                                                                                |
| ---------------- | ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `radius.none`    | `0px`         | No corner rounding.                                                                                                                                                                                                   |
| `radius.control` | `6px`         | Corner rounding for small interactive controls (e.g. buttons, inputs).                                                                                                                                                |
| `radius.card`    | `12px`        | Corner rounding for card-like surfaces.                                                                                                                                                                               |
| `radius.modal`   | `16px`        | Larger corner rounding, intended for modal/dialog-scale surfaces. safe-css does not currently ship a `Modal` primitive, so no primitive applies this by default — it's available for applications building their own. |
| `radius.pill`    | `999px`       | Fully rounded corners (pill/capsule shape).                                                                                                                                                                           |

## Size

| Token          | Default value | Intent                                                                             |
| -------------- | ------------- | ---------------------------------------------------------------------------------- |
| `size.sidebar` | `280px`       | Width appropriate for a sidebar-scale layout region.                               |
| `size.card`    | `260px`       | Minimum width for a card-like item, most commonly used as `Grid`'s `minItemWidth`. |
| `size.content` | `1200px`      | Maximum width appropriate for a main content/reading column.                       |
| `size.control` | `40px`        | Width or height appropriate for a small interactive control (e.g. a button).       |

## Border

| Token           | Default value                      | Intent                                                                                                                                                                                                       |
| --------------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `border.subtle` | `1px solid var(--fw-color-border)` | A low-contrast border for ordinary surfaces. References `colors.border` (see [Token dependencies](#token-dependencies)) — changing `colors.border` changes this token's resolved value everywhere it's used. |
| `border.strong` | `1px solid #9ca3af`                | A visibly stronger border for emphasis. Currently an independent literal value — does not reference `colors.border`.                                                                                         |

## Shadow

| Token            | Default value                 | Intent                                                                                                                                                                                                                                                                                                   |
| ---------------- | ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `shadow.raised`  | `0 2px 8px rgba(0,0,0,.08)`   | A subtle elevation shadow for surfaces that sit above the page background (e.g. a raised card — see the `raised` variant pattern in `defineRecipe` examples).                                                                                                                                            |
| `shadow.overlay` | `0 12px 40px rgba(0,0,0,.16)` | A stronger elevation shadow for surfaces that float above other content (e.g. a dropdown or popover). Not automatically applied by the `Overlay` primitive — despite the shared name, `Overlay`/`Overlay.Item` set no `shadow`; apply this token explicitly via `shadow="overlay"` on a `Box` if wanted. |

## Layer

| Token           | Default value | Intent                                                                                                                                                                     |
| --------------- | ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `layer.base`    | `0`           | The default stacking layer (no elevation).                                                                                                                                 |
| `layer.sticky`  | `10`          | Stacking layer for stuck content. This is `Sticky`'s own default `layer` value.                                                                                            |
| `layer.overlay` | `20`          | Stacking layer for overlaid content. This is `Overlay.Item`'s own default `layer` value.                                                                                   |
| `layer.modal`   | `30`          | Stacking layer intended for modal/dialog-scale content, above overlays. Not automatically applied by any primitive (safe-css does not currently ship a `Modal` primitive). |
| `layer.toast`   | `40`          | Stacking layer intended for toast/notification-scale content, above modals. Not automatically applied by any primitive.                                                    |

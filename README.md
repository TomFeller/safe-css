# safe-css

**CSS you can safely change.**

A React + TypeScript styling and layout framework built around one idea: developers describe UI _intent_, and the framework translates it into safe, predictable, scoped CSS. It is not a utility-CSS framework and not a wrapper around the whole CSS property list — its public API is intentionally small, semantic, and closed.

> Express intent. Keep changes predictable. Let the framework handle the CSS.

---

## 1. What problem this solves

Most styling systems eventually let a developer write anything: `position: absolute`, a stray `margin-bottom`, an ad-hoc `z-index`. Each one is individually reasonable and collectively becomes spaghetti — nobody can look at a change and know whether it's local or global, safe or risky.

safe-css removes that choice at the API level. There is no `display`, `position`, `overflow`, `margin`, or raw color/spacing prop. Instead there are primitives for _behaviors_ (`Stack` for vertical layout, `ScrollArea` for scrolling, `Sticky` for sticky positioning, `Overlay` for anchored badges) and a theme made of _semantic tokens_, not arbitrary values. A developer who is not strong at CSS can build a real dashboard without ever fighting flexbox, and a strong CSS developer inspecting the generated output should think "yes, that's the correct CSS."

## 2. What makes it different

- **No margin props, anywhere.** Spacing between siblings is the parent's job (`<Stack gap="section">`), never the child's. See [Core rules](#core-rules).
- **No generic CSS props.** `display`, `position`, `overflow`, `zIndex`, `transform` etc. are not part of the public API. Positioning and scrolling are behaviors (`Sticky`, `Overlay`, `ScrollArea`), not raw CSS.
- **Tokens, not values.** `padding="card"`, not `padding="17px"`. Invalid tokens warn in development and fail safe (no invented fallback) rather than silently rendering something.
- **Intrinsic responsiveness.** `Grid` adapts with `auto-fit`/`minmax()`, `Row` wraps with real flex-wrap. No breakpoint props, no `sm`/`md`/`lg`.
- **Deterministic precedence, no specificity.** `primitive defaults < recipe base < recipe variant < instance props < unsafeCss` is a plain object merge in JavaScript — never a CSS specificity fight.
- **A named escape hatch.** `unsafeCss` exists and is fully supported; it just says out loud that the framework can no longer guarantee its safety properties for that element.

## 3. Installation

This is a monorepo. The published package is `@safe-css/core`.

```bash
npm install @safe-css/core react react-dom
```

Import the stylesheet once, anywhere near your app's entry point:

```ts
import "@safe-css/core/styles.css";
```

## 4. Quick start

```tsx
import {
  ThemeProvider,
  createTheme,
  Stack,
  Row,
  Grid,
  ScrollArea,
  Sticky,
  Box,
  defineRecipe,
} from "@safe-css/core";

const theme = createTheme(); // built-in defaults; see "Theme" below to customize

const Card = defineRecipe(Box, {
  base: { padding: "card", radius: "card", background: "surface" },
  variants: { tone: { default: { border: "subtle" }, raised: { shadow: "raised" } } },
  defaultVariants: { tone: "default" },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <Stack height="full">
        <Sticky edge="top">
          <Box padding="card" background="surface" border="subtle">
            Header
          </Box>
        </Sticky>

        <ScrollArea grow>
          <Box padding="page">
            <Stack gap="section">
              <Row gap="control" align="center" justify="between" wrap="when-needed">
                <strong>Projects</strong>
              </Row>

              <Grid minItemWidth="card" gap="card">
                <Card>One</Card>
                <Card tone="raised">Two</Card>
              </Grid>
            </Stack>
          </Box>
        </ScrollArea>
      </Stack>
    </ThemeProvider>
  );
}
```

A larger, realistic example (sidebar shell, sticky header, theme switcher, RTL toggle, Overlay badges) lives in [`apps/demo`](apps/demo).

## 5. Theme

```ts
import { createTheme } from "@safe-css/core";

const theme = createTheme({
  colors: { action: "#2563eb", danger: "#dc2626" },
  space: { card: "16px", section: "24px" },
  radius: { control: "6px", card: "12px" },
});
```

`createTheme` deep-merges its input over a complete built-in default, so you only ever specify what you want to change. There are seven token categories: `colors`, `space`, `radius`, `size`, `border`, `shadow`, `layer`. Every category becomes CSS custom properties (`--fw-color-surface`, `--fw-space-card`, ...) published by `<ThemeProvider theme={theme}>`; primitives only ever reference those variables (`padding: var(--fw-space-card)`), so changing the theme updates every consumer without any component needing to know a change happened.

Passing a token name that doesn't exist in the theme (`padding="typo"`) does **not** silently fall back to a default value — it warns in development (`diagnostics="warn"`, the default outside production) and resolves to an unset CSS variable, which fails safe rather than inventing a pixel value.

Want more tokens than the built-in set? Extend the categories via TypeScript declaration merging:

```ts
declare module "@safe-css/core" {
  interface ThemeSpaceTokens {
    xl: string;
  }
}
```

## 6. Box

The general-purpose surface/container primitive — padding, background, radius, border, shadow, sizing. No `display`, `position`, or `overflow`.

```tsx
<Box padding="card" background="surface" radius="card" border="subtle" />
<Box paddingInline="page" paddingBlock="section" />
<Box width="full" />       {/* width: 100% */}
<Box width="fit" />        {/* width: fit-content */}
<Box width="sidebar" />    {/* width: var(--fw-size-sidebar) */}
<Box grow />                {/* flex-grow: 1, with the min-width/min-height:0 flex-child safety net */}
```

## 7. Stack

Vertical layout: `display: flex; flex-direction: column` plus a `gap`. There is no `direction` prop — horizontal intent is `Row`.

```tsx
<Stack gap="section" align="stretch" justify="start" height="full">
  <Header />
  <Content />
</Stack>
```

## 8. Row

Horizontal flow, with intrinsic wrapping instead of breakpoints.

```tsx
<Row gap="control" align="center" justify="between" wrap="when-needed">
  <Title />
  <Actions />
</Row>
```

## 9. Grid

Collections of items — adaptive (`minItemWidth`) or fixed (`columns`), never both.

```tsx
<Grid minItemWidth="card" gap="card">      {/* repeat(auto-fit, minmax(min(token,100%),1fr)) */}
  <Card />
  <Card />
</Grid>

<Grid columns={3} gap="card">              {/* repeat(3, 1fr) */}
  ...
</Grid>
```

`<Grid columns={3} minItemWidth="card" />` is a compile error (the two are a discriminated union) and, if bypassed at runtime, a development warning.

## 10. ScrollArea

Replaces `overflow-y: auto; min-height: 0` — and solves the classic "flex/grid child won't scroll" problem, where a flex/grid child's automatic minimum size otherwise prevents overflow from ever kicking in.

```tsx
<Stack height="full">
  <Header />
  <ScrollArea grow>
    <Content />
  </ScrollArea>
</Stack>
```

`direction`: `"vertical"` (default) | `"horizontal"` | `"both"`. `overscroll`: `"auto"` (default) | `"contain"`.

## 11. Sticky

Replaces `position: sticky; top: 0; z-index: ...`, with the offset and stacking layer expressed as theme tokens instead of raw numbers.

```tsx
<Sticky edge="top" offset="control" layer="sticky">
  <Toolbar />
</Sticky>
```

## 12. Overlay

Positioning relative to another element, without ever writing `position: relative` or `position: absolute` yourself.

```tsx
<Overlay>
  <Avatar />
  <Overlay.Item anchor="top-end" placement="edge">
    <StatusBadge />
  </Overlay.Item>
</Overlay>
```

`anchor` is one of the 9 grid positions (`top-start` … `bottom-end`, plus `center`). `placement="inside"` (default) keeps the item flush inside the corner/edge; `placement="edge"` centers it on the corner/edge itself (the classic notification-dot look). Anchors use CSS logical properties (`inset-inline-start/end`) and the writing-direction-dependent transform lives in CSS behind a `[dir="rtl"]` selector — Overlay is correct under both LTR and RTL without any JavaScript direction detection.

## 13. Recipes

`defineRecipe` builds a reusable component from a primitive plus a fixed set of variants — without ever exposing arbitrary CSS or selectors.

```ts
const Card = defineRecipe(Box, {
  base: { padding: "card", radius: "card", background: "surface" },
  variants: {
    tone: {
      default: { border: "subtle" },
      raised: { shadow: "raised" },
    },
  },
  defaultVariants: { tone: "default" },
});

<Card />
<Card tone="raised" padding="section" />  // instance props still win
```

A recipe may only set props the underlying primitive already supports, cannot introduce selectors (`"& > *"`, `".foo"`, etc. are not part of this API), and there is no compound-variant engine in v0.1. See [`docs/architecture.md`](docs/architecture.md#recipes) for the one narrow TypeScript limitation this design has (variant _values_ aren't always compile-time-checked against the primitive's props the way `base` is — a documented, deliberate trade-off, not an oversight).

## 14. unsafeCss

The escape hatch, and it's a real one:

```tsx
<Box background="surface" unsafeCss={{ background: "red" }} /> // unsafeCss wins
```

It's named `unsafeCss`, not `css`, on purpose: past this point the framework can no longer guarantee scoping, token traceability, or predictability for that element. It's always available, always fully supported, and always flagged in development diagnostics so it stays visible during code review rather than hiding inside a component.

## 15. Core rules

1. **No public margin props.** Spacing between siblings belongs to the parent (`gap`), never the child (`margin*`).
2. **No generic CSS props.** No `display`, `position`, `overflow`, `zIndex`, `transform`, `flexDirection`, etc. Those are behaviors with their own primitive, or `unsafeCss`.
3. **Tokens, not values.** Every spacing/color/radius/size/border/shadow/layer prop takes a theme token name.
4. **Deterministic precedence.** `primitive defaults < recipe base < recipe variant < instance props < unsafeCss`, always — never CSS specificity.
5. **Scoped by construction.** Generated styles never use descendant selectors, never style siblings, never depend on DOM location.
6. **No global reset.** Importing safe-css does not restyle `body`, `button`, `h1`, or anything else you didn't render through it.

## 16. v0.1 limitations

- **Fixed default token categories.** `colors`, `space`, `radius`, `size`, `border`, `shadow`, `layer` are the built-in shape; extra tokens need a small TypeScript declaration-merge (see [Theme](#5-theme)), not a fully generic per-app token schema.
- **Recipe variant values aren't always compile-time-validated** against the underlying primitive's props (only `base` reliably is) — a deliberate trade-off documented in [`docs/architecture.md`](docs/architecture.md#recipes).
- **No compound variants** in `defineRecipe`.
- **No blast-radius UI.** The metadata to build one (`data-fw-primitive`, `data-fw-recipe`, `data-fw-variant`, `data-fw-tokens`, dev-only) is there; the analysis/visualization tool is not — see [`docs/architecture.md`](docs/architecture.md#future-traceability).
- **No component libraries.** Buttons, inputs, selects, modals, tabs, tooltips, forms, tables, animation, icons are explicitly out of scope — safe-css is a layout/theming layer, not a UI kit.

---

## Repository structure

```text
packages/core/     the published @safe-css/core library
apps/demo/          a realistic dashboard app consuming @safe-css/core
docs/architecture.md   engine internals, precedence, SSR, diagnostics, future work
```

## Documentation

- [`docs/architecture.md`](docs/architecture.md) — styling engine, theme token model, precedence, SSR strategy, diagnostics, future traceability.
- [`apps/demo`](apps/demo) — a full dashboard screen: shell, sidebar, sticky header, responsive card grid, Overlay badges, theme switching, RTL toggle.

## Development

```bash
npm install
npm run build       # build @safe-css/core, then the demo
npm test            # run the core package's test suite
npm run typecheck   # typecheck core + demo
npm run lint         # eslint across the whole workspace
npm run dev          # start the demo app
```

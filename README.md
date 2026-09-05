# safe-css

**CSS you can safely change.**

A React + TypeScript styling and layout framework built around one idea: developers describe UI _intent_, and the framework translates it into safe, predictable, scoped CSS. It is not a utility-CSS framework and not a wrapper around the whole CSS property list — its public API is intentionally small, semantic, and closed.

> Express intent. Keep changes predictable. Let the framework handle the CSS.

---

## Start here

New to safe-css?

- [Introduction](docs/introduction.md) — understand why safe-css exists and the problem it is designed to solve.
- [Getting Started](docs/getting-started.md) — build, inspect, and analyze your first safe-css interface.

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

This is a monorepo with two published packages:

- `@safe-css/core` — the styling and layout framework.
- `@safe-css/inspector` — development-only tooling for inspecting rendered safe-css UI and running Impact Analysis.

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
  name: "Card", // required - see "Recipes" below
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

`<ThemeProvider>` can be nested, but **a nested provider is a full theme replacement for its subtree, not a partial override**: `createTheme(partialInput)` always merges over the built-in defaults, never over whatever theme is active higher up the tree, so an inner provider that only sets `colors.action` still resets every _other_ category to the built-in default for its subtree - it does not inherit the outer provider's customizations. Give a nested provider a complete theme for what its subtree needs (e.g. `createTheme({ ...parentOverrides, colors: { action: "red" } })`). See [`docs/architecture.md#nested-themes`](docs/architecture.md#nested-themes).

Passing a token name that doesn't exist in the theme (`padding="typo"`) does **not** silently fall back to a default value — it warns in development (`diagnostics="warn"`, the default outside production) and resolves to an unset CSS variable, which fails safe rather than inventing a pixel value.

Want more tokens than the built-in set? Extend the categories via TypeScript declaration merging:

```ts
declare module "@safe-css/core" {
  interface ThemeSpaceTokens {
    xl: string;
  }
}
```

Declaration merging only changes what TypeScript _accepts_ — it can't guarantee the _runtime_ theme actually defines `xl` (types don't exist at runtime, so nothing can mechanically check that for you; see [`docs/architecture.md#custom-tokens`](docs/architecture.md#custom-tokens) for exactly why). Two things keep this safe in practice:

1. **A runtime safety net that's always on.** If `xl` is ever used but not actually present in the active theme, development builds warn with the same "Unknown token" message as any other invalid token — this isn't a special case, it's the same check every token goes through.
2. **A stricter, opt-in authoring pattern for teams that add real custom tokens.** Define your full theme as one object checked with `satisfies Theme` (not the partial `createTheme({...})` shortcut) and TypeScript _will_ require every augmented token to have a value:
   ```ts
   const myTheme = {
     colors: { /* ... */ },
     space: { /* ...built-ins... */, xl: "40px" }, // required here - satisfies checks completeness
     // ...every other category...
   } satisfies Theme;

   const theme = createTheme(myTheme);
   ```
   Keep the `declare module` augmentation and this object in the same file, so there's exactly one place to update when adding a token.

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
  name: "Card", // required - a stable, developer-facing identifier for traceability
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

`name` is required (not optional) as of v0.1.1: an unnamed recipe can't show up in dev metadata or, later, in blast-radius analysis ("which recipes does this token change affect").

A recipe may only set props the underlying primitive already supports, cannot introduce selectors (`"& > *"`, `".foo"`, etc. are not part of this API), and there is no compound-variant engine in v0.1. See [`docs/architecture.md`](docs/architecture.md#recipes) for the one narrow TypeScript limitation this design has (variant _values_ aren't always compile-time-checked against the primitive's props the way `base` is — a documented, deliberate trade-off, not an oversight; teams that want the guarantee back can opt in with `variants: {...} satisfies RecipeVariantMap<BoxProps>`).

Setting `as` inside `base` changes the recipe's element _and_ its DOM prop typing - `defineRecipe(Box, { name: "ButtonLike", base: { as: "button" } })` produces a component that accepts `type`, `disabled`, and a correctly-typed `onClick`, not just `div` props. **Its `ref` is correctly typed too (v0.1.2):** `<ButtonLike ref={buttonRef} />` requires `buttonRef: Ref<HTMLButtonElement>` and rejects `Ref<HTMLAnchorElement>` at compile time - v0.1.1 got the DOM props right but left `ref` typed as `RefAttributes<unknown>`, which (since every element type is assignable to `unknown`) accepted _any_ ref regardless of the recipe's actual element, silently. That's fixed by building the recipe's `ref` prop the same way every primitive already builds its own, keyed off the same element-type parameter that drives the DOM props - see [`docs/architecture.md#recipes`](docs/architecture.md#recipes) for the exact mechanism. What's still not typed: overriding `as` at the _instance_ level on an already-defined recipe (e.g. rendering a `ButtonLike` as an `<a>` for one particular instance) - that remains untyped, same as v0.1.1; a recipe's element and ref/DOM-prop shape are fixed by its `base.as`, not re-inferable per instance.

If two different variant groups are both active and both set the same underlying prop (e.g. a `size` variant and a `density` variant both setting `padding`), resolution is always deterministic — the group declared later in `variants: {...}` wins, the same left-to-right rule as any other merge in this engine — and development builds warn about the collision so it's never a surprise:

```text
Recipe collision in <Card>:

Active variants:
  size="large"
  density="compact"

Both assign:
  padding

Resolved value:
  control
```

## 14. unsafeCss

The escape hatch, and it's a real one:

```tsx
<Box background="surface" unsafeCss={{ background: "red" }} /> // unsafeCss wins
```

It's named `unsafeCss`, not `css`, on purpose: past this point the framework can no longer guarantee scoping, token traceability, or predictability for that element.

`unsafeCss` is always fully supported and its use is always visible in dev metadata (`data-fw-unsafe-css="<count>"`), but it does **not** produce a console warning merely for existing — `unsafeCss={{ cursor: "pointer", font: "inherit" }}` stays silent. Warnings are reserved for patterns that usually mean "I reached for `unsafeCss` when the framework already has an answer": margin properties, raw z-index, layout/positioning properties a primitive already solves (`display`, `position`, `overflow`, ...), and arbitrary values where a semantic token exists (`padding: 13`, `color: "#ff0000"`). Each warning names the specific property and points at the framework alternative:

```text
Custom `marginLeft` detected in unsafeCss on <Box>: marginLeft: 17px;

Spacing between siblings should normally be controlled by the parent layout using `gap`, not a child's own margin.
```

This is a small, first-pass heuristic, not a CSS linter — see [`docs/architecture.md#unsafecss`](docs/architecture.md#unsafecss) for the exact rules and the reasoning behind "warn on suspicious, not on all."

## 15. Core rules

1. **No public margin props.** Spacing between siblings belongs to the parent (`gap`), never the child (`margin*`) — and every safe-css primitive is itself scoped-normalized to `margin: 0`, so this holds even for `as="h1"`/`as="p"`/etc. rendering an element that would otherwise carry a browser default margin. See [`docs/architecture.md#scoped-normalization`](docs/architecture.md#scoped-normalization).
2. **No generic CSS props.** No `display`, `position`, `overflow`, `zIndex`, `transform`, `flexDirection`, etc. Those are behaviors with their own primitive, or `unsafeCss`.
3. **Tokens, not values.** Every spacing/color/radius/size/border/shadow/layer prop takes a theme token name.
4. **Deterministic precedence.** `primitive defaults < recipe base < recipe variant < instance props < unsafeCss`, always — never CSS specificity.
5. **Scoped by construction.** Generated styles never use descendant selectors, never style siblings, never depend on DOM location.
6. **No global reset.** Importing safe-css does not restyle `body`, `button`, `h1`, or anything else you didn't render through it — the scoped `margin: 0` above only ever applies to elements a safe-css primitive itself rendered.
7. **Composable tokens.** When two tokens represent the same design decision (e.g. a border's color), the dependent one references the other's CSS variable rather than duplicating its value, so changing the source token changes everything that depends on it. See [`docs/architecture.md#token-dependencies`](docs/architecture.md#token-dependencies).
8. **`data-fw-*` is reserved.** Every attribute in that namespace (`data-fw-primitive`, `data-fw-recipe`, `data-fw-variant`, `data-fw-tokens`, `data-fw-unsafe-css`) is framework-owned traceability metadata. The framework's own value always wins if a consumer happens to pass one of these directly, and development builds warn when that happens so it's never a silent, confusing overwrite. See [`docs/architecture.md#future-traceability`](docs/architecture.md#future-traceability).

## 16. Inspector

`@safe-css/inspector` (v0.2.1) is a read-only, development-only visual DOM inspector: click a rendered safe-css element and see, in a docked panel, exactly why it looks the way it does — its primitive, recipe, active variants, its full safe-css ancestry down to the element itself, every token it uses (raw and resolved value, which CSS property uses it), that token's own dependency chain, and any `unsafeCss` in play. Selecting an element keeps it clearly highlighted for as long as its panel stays open, including while picking a different element to compare against — cancelling (**Esc**, or clicking elsewhere) always returns to whatever was selected before, never to a blank slate.

```bash
npm install --save-dev @safe-css/inspector
```

Requires a `@safe-css/core` in the `>=0.1.2 <0.2.0` range (the Inspector depends on the exact `data-fw-*`/`--fw-*` DOM contract that version stabilized — see [`docs/architecture.md#core-compatibility`](docs/architecture.md#core-compatibility)).

**Gate the import behind your build tool's dev flag** — this is the recommended integration, not merely an option. The component itself renders nothing in a production build, but that alone doesn't keep its code out of a production bundle; a bundler ships whatever it can statically see imported, regardless of what a runtime check later decides to render. For Vite:

```tsx
import { lazy, Suspense } from "react";

const Inspector = import.meta.env.DEV
  ? lazy(() => import("@safe-css/inspector").then((m) => ({ default: m.SafeCssInspector })))
  : null;

// Anywhere in the tree, doesn't need to be inside ThemeProvider:
{
  Inspector && (
    <Suspense fallback={null}>
      <Inspector />
    </Suspense>
  );
}
```

`import.meta.env.DEV` is a compile-time constant Vite replaces with a literal `false` in production, which lets Rollup prove the whole branch — including the dynamic `import()` inside it — is unreachable and tree-shake it away entirely; verified against `apps/demo`'s actual production build, not assumed (see [`docs/architecture.md#inspector`](docs/architecture.md#inspector) for the before/after bundle measurements). Other bundlers need the equivalent shape: a build-time-constant-gated dynamic import, not a runtime conditional around a static one.

That's the entire public API otherwise — one component, one optional `enabled` prop, no other configuration. Click **Inspect**, hover a safe-css element to see it highlighted with its primitive/recipe label, click to select it and open the panel.

It reads Core's DOM/CSS output only — the `data-fw-*` attributes and `--fw-*` CSS custom properties described in [Future traceability](docs/architecture.md#future-traceability) — never Core's internals, and never React context; `data-fw-*` metadata itself only exists in development builds of Core in the first place, so there's nothing for the Inspector to read in production even if it were mounted there. See [`docs/architecture.md#inspector`](docs/architecture.md#inspector) for the full architecture, including the Shadow DOM isolation, the picker's DevTools-style event capture, and its stated limitations (no theme editing, no reverse "what uses this token" analysis — that's future blast-radius work, not this).

## 17. v0.1.2 limitations

- **Fixed default token categories.** `colors`, `space`, `radius`, `size`, `border`, `shadow`, `layer` are the built-in shape; extra tokens need a small TypeScript declaration-merge (see [Theme](#5-theme)), not a fully generic per-app token schema. TypeScript accepting an augmented token name doesn't guarantee the runtime theme defines it — a `satisfies Theme`-checked custom theme closes that gap for teams that want it; the always-on runtime warning is the fallback for everyone else.
- **Nested `ThemeProvider` is a full theme replacement, not a partial/inherited override.** See [Theme](#5-theme) and [`docs/architecture.md#nested-themes`](docs/architecture.md#nested-themes). Partial nested themes may be worth adding later; they aren't implemented in v0.1.2.
- **Recipe variant values aren't always compile-time-validated** against the underlying primitive's props (only `base` reliably is) — a deliberate trade-off documented in [`docs/architecture.md`](docs/architecture.md#recipes). Opt in with `satisfies RecipeVariantMap<P>` for the stricter check.
- **A recipe's element (and therefore its DOM prop/`ref` typing) is fixed by `base.as`, not overridable per instance.** DOM props and `ref` are both correctly typed for the recipe's own element as of v0.1.2 (see [Recipes](#13-recipes)); instance-level polymorphic `as` on a recipe remains untyped.
- **No compound variants** in `defineRecipe`.
- **Impact Analysis is rendered-DOM-only.** It analyzes safe-css elements currently rendered in the document. It does not scan source code, crawl unmounted routes, or retain historical renders, so its counts describe the UI that exists right now rather than every possible usage in the repository. See [Inspector](#16-inspector) and [`docs/architecture.md`](docs/architecture.md#limitations).
- **No portal-aware primitives yet.** Modal/Tooltip/Popover/Toast are still out of scope, and CSS custom-property inheritance doesn't cross a React portal boundary into `document.body`. The architecture is prepared for this (see [`docs/architecture.md#portals`](docs/architecture.md#portals)) but nothing consumes it yet.
- **`unsafeCss`'s suspicious-pattern detection is a small, fixed heuristic, not a linter.** It catches known risky patterns (margin, raw z-index, layout bypasses, arbitrary values with a token equivalent); it does not attempt general CSS analysis.
- **The theme value-only render optimization only removes `ThemeMetaContext`-driven re-renders** (see [`docs/architecture.md#render-architecture`](docs/architecture.md#render-architecture)); it does not, and isn't meant to, prevent a component from re-rendering because its own parent did.
- **No component libraries.** Buttons, inputs, selects, modals, tabs, tooltips, forms, tables, animation, icons are explicitly out of scope — safe-css is a layout/theming layer, not a UI kit.

---

## Repository structure

```text
packages/core/       the published @safe-css/core library
packages/inspector/  the published @safe-css/inspector dev-tool (v0.2.1)
apps/demo/           a realistic dashboard app consuming both
docs/architecture.md    engine internals, precedence, SSR, diagnostics, Inspector, future work
```

## Documentation

- [`docs/architecture.md`](docs/architecture.md) — styling engine, theme token model, precedence, SSR strategy, diagnostics, the Inspector, future traceability.
- [`apps/demo`](apps/demo) — a full dashboard screen: shell, sidebar, sticky header, responsive card grid, Overlay badges, theme switching, RTL toggle, and the Inspector wired in.

## Development

```bash
npm install
npm run build       # build @safe-css/core, @safe-css/inspector, then the demo
npm test            # run core's and inspector's test suites
npm run typecheck   # typecheck core + inspector + demo
npm run lint         # eslint across the whole workspace
npm run dev          # start the demo app
```

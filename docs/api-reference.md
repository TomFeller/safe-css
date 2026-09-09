# API Reference

This is an exhaustive, practical reference for the current public API of `@safe-css/core`. It documents every prop, default, and behavior as implemented — not a conceptual introduction. For the mental model behind the API, see [Core Concepts](core-concepts.md) and [Layout](layout.md). For every built-in design token, see [Tokens](tokens.md).

Every code example on this page is a complete, paste-able `src/App.tsx` using only the current public API, and states what you should see after running it.

**Prerequisite:** unless an example itself renders `ThemeProvider` (as the [ThemeProvider](#themeprovider) example does), every example on this page assumes the one-time setup from [Getting Started](getting-started.md) is already in place — `@safe-css/core/styles.css` imported once near your entry point, and the app wrapped in `<ThemeProvider theme={createTheme()}>` (or a customized theme) somewhere above it. Without that, every token-based prop resolves to nothing and a development warning is logged.

---

## How do I...?

- Add padding — [Box](#box) (`padding`, `paddingInline`, `paddingBlock`)
- Add a border — [Box](#box) (`border`)
- Create vertical spacing between elements — [Stack](#stack) (`gap`)
- Create horizontal spacing between elements — [Row](#row) (`gap`)
- Make a row wrap instead of overflow — [Row](#row) (`wrap`)
- Create an adaptive grid of cards/tiles — [Grid](#grid) (`minItemWidth`)
- Create a fixed-column grid — [Grid](#grid) (`columns`)
- Create a contained, independently scrolling region — [ScrollArea](#scrollarea)
- Make a header (or any element) stick to an edge while scrolling — [Sticky](#sticky)
- Position a badge/indicator over another element — [Overlay](#overlay) / [Overlay.Item](#overlayitem)
- Control where an `Overlay.Item` sits and how far "on top of" the corner — [Overlay.Item](#overlayitem) (`anchor`, `placement`, `offset`)
- Independently offset an `Overlay.Item` on its inline and block axes — [Overlay.Item](#overlayitem) (`inlineOffset`, `blockOffset`)
- Style `:hover`, `:focus-visible`, or `:active` on a recipe — [defineRecipe](#definerecipe) (`states`)
- Make an element grow to fill available space in a flex layout — [Common primitive props](#common-primitive-props) (`grow`; supported on `Box`, `Stack`, `Row`, `ScrollArea` — not `Grid`, `Sticky`, or `Overlay`)
- Render a semantic DOM element (`h1`, `button`, `nav`, ...) — [Common primitive props](#common-primitive-props) (`as`)
- Create a reusable, named visual state (a "Card", a "Button") — [defineRecipe](#definerecipe)
- Create a centered, responsive main content container — [Layout: the main-container pattern](layout.md#the-main-container-pattern)
- Add CSS that safe-css does not model as a token/prop — [unsafeCss](#unsafecss)
- Find every available built-in design token — [Tokens](tokens.md)

**Current limitations** (see [Unsupported / unavailable capabilities](#unsupported--unavailable-capabilities) for details):

- Cursor styling (`cursor: "pointer"`, etc.) has no dedicated prop — use [`unsafeCss`](#unsafecss).
- Interactive states (`states` on `defineRecipe`) only support `hover`/`focusVisible`/`active`, only on `Box`-based recipes, and only for `background`/`color`/`border` — there is no `states.disabled`/`focus`/`checked`, no support on `Stack`/`Row`/`Grid`, and no arbitrary CSS inside a state. See [defineRecipe](#definerecipe).

---

## Common primitive props

Every primitive documented on this page (`Box`, `Stack`, `Row`, `Grid`, `ScrollArea`, `Sticky`, `Overlay`, `Overlay.Item`) accepts this same base set of props, in addition to whatever primitive-specific props are listed in its own section below.

| Prop                   | Type                                                                                | Default | Meaning                                                                                                                                                                                                                             |
| ---------------------- | ----------------------------------------------------------------------------------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `as`                   | `ElementType` (e.g. `"h1"`, `"button"`, `"nav"`, a component)                       | `"div"` | Which element (or component) the primitive renders. Changes both the rendered tag and, in TypeScript, which DOM props/event handlers are accepted (e.g. `as="button"` accepts `type`, `disabled`, and a correctly-typed `onClick`). |
| `id`                   | `string`                                                                            | —       | Passed through to the rendered element.                                                                                                                                                                                             |
| `className`            | `string`                                                                            | —       | Merged with the primitive's own generated class names (yours is appended, never replaces them).                                                                                                                                     |
| `children`             | `ReactNode`                                                                         | —       | Content rendered inside the element.                                                                                                                                                                                                |
| `unsafeCss`            | `React.CSSProperties`                                                               | —       | Escape hatch for CSS the primitive doesn't model. Applied with the highest precedence of any style source. See [unsafeCss](#unsafecss).                                                                                             |
| `ref`                  | matches whatever `as` resolves to (e.g. `Ref<HTMLButtonElement>` for `as="button"`) | —       | Forwarded to the underlying DOM node.                                                                                                                                                                                               |
| _(any other DOM prop)_ | matches the element `as` resolves to                                                | —       | Arbitrary DOM attributes and event handlers (`onClick`, `aria-*`, `data-*`, `tabIndex`, ...) for whatever element `as` renders are accepted and passed through.                                                                     |

Notes that apply to every primitive:

- **`style` is not an accepted prop on any primitive.** TypeScript rejects it. `unsafeCss` is the one documented way to set raw CSS.
- **The `data-fw-*` attribute namespace is reserved** for the framework's own development metadata (`data-fw-primitive`, `data-fw-classes`, `data-fw-tokens`, `data-fw-state-tokens`, `data-fw-state-suppressed`, `data-fw-unsafe-css`, and, on recipes, `data-fw-recipe`/`data-fw-variant`). These attributes are only present in development builds (never in production), and a consumer-supplied attribute in this namespace is silently overridden by the framework's own value — with a one-time development warning when that happens. This is also the contract the [Inspector](../packages/inspector/README.md) reads to build its own model — see [Architecture: Interactive states](architecture.md#interactive-states) and [Architecture: External Hooks](architecture.md#external-hooks).
- If a primitive is rendered with no `ThemeProvider` ancestor, every token-based prop resolves to an unset CSS variable (the property is left at its browser-initial value) and a development warning is logged once per primitive type (not once per instance).
- An invalid/unknown token name passed to any token prop (e.g. `padding="typo"`) does **not** fall back to a default value — it resolves to a `var()` reference that won't resolve, so the property is left unset, and a development warning is logged once per unique `(category, token, component, prop)` combination.

---

## ThemeProvider

### Purpose

Publishes a `Theme` to the component tree as CSS custom properties (`--fw-*`), so every primitive underneath it can resolve token props.

### Copy-paste example

```tsx
import { Box, ThemeProvider, createTheme } from "@safe-css/core";

const theme = createTheme();

const App = () => {
  return (
    <ThemeProvider theme={theme}>
      <Box padding="card" background="surface" border="subtle">
        Hello
      </Box>
    </ThemeProvider>
  );
};

export default App;
```

What you should see: a white, rounded-corner-free (no `radius` was set), padded, thin-bordered box containing "Hello". Remove the `ThemeProvider` and the same box renders with no padding, background, or border — every token resolves to nothing, and a console warning appears once in development.

### Props

| Prop          | Type              | Default                                                      | Meaning                                                                                                                                                                                                             |
| ------------- | ----------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `theme`       | `Theme`           | — (required)                                                 | The complete theme to publish. Build it with [`createTheme`](#createtheme) rather than constructing a `Theme` object by hand.                                                                                       |
| `diagnostics` | `"off" \| "warn"` | `"warn"` in development builds, `"off"` in production builds | Controls development console warnings (invalid tokens, missing `ThemeProvider`, suspicious `unsafeCss`, recipe variant collisions, reserved-attribute collisions, `Grid` conflicts). Never affects rendered output. |
| `children`    | `ReactNode`       | —                                                            | The subtree this theme applies to.                                                                                                                                                                                  |

### Common mistakes / ownership

- `ThemeProvider` can be nested, but **a nested `ThemeProvider` is a full theme replacement for its subtree, not a partial override** of the theme above it — see [Tokens: nested `ThemeProvider` scope](tokens.md#nested-themeprovider-scope).
- `ThemeProvider` renders a real (but `display: contents`) `<div data-fw-theme-root="">` wrapper — it does not insert a layout box, so it never breaks a `height: 100%` chain, but it is a real DOM node.
- A primitive validates a token's _name_ (and reads the diagnostics mode) through React context, which works normally across portals. But the token's actual _value_ reaches a primitive as an inherited CSS custom property — `var(--fw-...)` only resolves if the element is a **DOM** descendant of `ThemeProvider`'s rendered wrapper, regardless of where it sits in the React tree. For ordinary nested rendering these are the same thing, but they diverge across a React portal: an element rendered via `createPortal` into `document.body` is still inside the same React tree (so token-name validation still works), but is no longer a DOM descendant of `ThemeProvider`'s wrapper, so its CSS variables won't resolve. This is why safe-css does not currently ship portal-rendering primitives (`Modal`, `Tooltip`, `Popover`, ...).

---

## createTheme

### Purpose

Builds a complete `Theme` object by merging the tokens you specify over the built-in default theme, category by category. You only ever specify what you want to change.

### Signature

```text
function createTheme(input?: ThemeInput): Theme;
```

`ThemeInput` is a deep-partial of `Theme` — `{ [category]?: Partial<Theme[category]> }` — so you can override individual tokens within a category without repeating the rest.

### Copy-paste example

```ts
import { createTheme } from "@safe-css/core";

const theme = createTheme({
  colors: { action: "#7c3aed" },
  radius: { card: "20px" },
});
```

What you should see: nothing renders from this snippet alone — `createTheme` returns a plain object. Pass the result to `<ThemeProvider theme={theme}>` (see [ThemeProvider](#themeprovider)) to apply it. Every token not explicitly set here (`colors.surface`, `space.card`, `border.subtle`, ...) keeps its built-in default — see [Tokens](tokens.md) for the complete list.

### Common mistakes / ownership

- Calling `createTheme(partialInput)` **always merges over the built-in defaults**, never over a theme active higher up the tree. There is no way to partially override an ancestor's `ThemeProvider` — a nested provider needs a complete theme for what its subtree needs.
- `createTheme()` with no arguments is valid and returns the built-in default theme unchanged.

---

## Box

### Purpose

The general-purpose surface/container primitive: padding, background, color, radius, border, shadow, and sizing on a single element. It has no `display`, `position`, or `overflow` prop — those are behaviors, and behaviors belong to `Stack`, `Row`, `Grid`, `ScrollArea`, `Sticky`, and `Overlay`.

### Copy-paste example

```tsx
import { Box } from "@safe-css/core";

const App = () => {
  return (
    <Box padding="card" radius="card" background="surface" border="subtle">
      Apollo
    </Box>
  );
};

export default App;
```

(Requires a `ThemeProvider` ancestor — see [ThemeProvider](#themeprovider) — to resolve `card`, `surface`, and `subtle`.)

What you should see: a white, rounded, padded box with a thin border, containing the text "Apollo".

### Props

Also accepts every [common primitive prop](#common-primitive-props) (`as`, `id`, `className`, `children`, `unsafeCss`, `ref`, arbitrary DOM props).

| Prop            | Values / Type                     | Default   | Meaning                                                                                                                                                                                        |
| --------------- | --------------------------------- | --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `padding`       | space token                       | —         | Padding on all sides.                                                                                                                                                                          |
| `paddingInline` | space token                       | —         | Padding on the inline axis (left/right in LTR).                                                                                                                                                |
| `paddingBlock`  | space token                       | —         | Padding on the block axis (top/bottom in LTR).                                                                                                                                                 |
| `background`    | color token                       | —         | Background color (`background-color`).                                                                                                                                                         |
| `color`         | color token                       | —         | Text color.                                                                                                                                                                                    |
| `radius`        | radius token                      | —         | Corner radius (`border-radius`).                                                                                                                                                               |
| `border`        | border token \| `"none"`          | —         | Border shorthand. `"none"` explicitly clears the border (`border: none`) without going through token resolution.                                                                               |
| `shadow`        | shadow token \| `"none"`          | —         | Box shadow. `"none"` explicitly clears it the same way `border="none"` does.                                                                                                                   |
| `width`         | size token \| `"full"` \| `"fit"` | —         | `"full"` → `width: 100%`. `"fit"` → `width: fit-content`. Any other value is a size token resolved to `width: var(--fw-size-...)`.                                                             |
| `height`        | size token \| `"full"` \| `"fit"` | —         | Same resolution as `width`, for `height`.                                                                                                                                                      |
| `minWidth`      | size token                        | —         | `min-width`. Unlike `width`, does not accept `"full"`/`"fit"`.                                                                                                                                 |
| `maxWidth`      | size token                        | —         | `max-width`. Same restriction as `minWidth`.                                                                                                                                                   |
| `minHeight`     | size token                        | —         | `min-height`. Same restriction as `minWidth`.                                                                                                                                                  |
| `maxHeight`     | size token                        | —         | `max-height`. Same restriction as `minWidth`.                                                                                                                                                  |
| `grow`          | `boolean`                         | `false`   | When `true`, adds `flex-grow: 1` plus `min-width: 0; min-height: 0` (so it can actually shrink below its content size inside a flex/grid parent, rather than blocking that parent's overflow). |
| `shrink`        | `boolean`                         | — (unset) | `true` → `flex-shrink: 1` (explicit). `false` → `flex-shrink: 0`. Leaving it unset applies neither class, so the browser's own flex-shrink default (`1`) governs.                              |

### Common mistakes / ownership

- `Box` does not own layout direction, scrolling, sticky positioning, overlay positioning, or spacing between siblings — reaching for `unsafeCss` on a `Box` to get one of those is a sign you want a different primitive (`Stack`/`Row`/`Grid`, `ScrollArea`, `Sticky`, `Overlay`). Several of the relevant CSS properties (`overflow`, `position`, `display`, ...) trigger a development warning naming the alternative when set via `unsafeCss`.
- `Box` is scoped-normalized to `margin: 0`, including when it renders a semantic element via `as` (e.g. `<Box as="h1">` does not carry the browser's default heading margin).

---

## Stack

### Purpose

Vertical layout: `display: flex; flex-direction: column`, plus the spacing and alignment between its children.

### Copy-paste example

```tsx
import { Box, Stack } from "@safe-css/core";

const App = () => {
  return (
    <Stack gap="section">
      <Box as="h1">Projects</Box>
      <Box color="textMuted">Your active projects.</Box>
    </Stack>
  );
};

export default App;
```

What you should see: a heading and a muted line of text, stacked vertically with section-sized space between them (and no margin on either element).

### Props

Also accepts every [common primitive prop](#common-primitive-props).

| Prop      | Values / Type                                     | Default     | Meaning                                                                                                                              |
| --------- | ------------------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `gap`     | space token                                       | —           | Space between children (`gap`).                                                                                                      |
| `align`   | `"start"` \| `"center"` \| `"end"` \| `"stretch"` | `"stretch"` | Cross-axis (horizontal) alignment of children (`align-items`).                                                                       |
| `justify` | `"start"` \| `"center"` \| `"end"` \| `"between"` | `"start"`   | Main-axis (vertical) distribution of children (`justify-content`). Note: narrower than `Row`'s `justify` — no `"around"`/`"evenly"`. |
| `width`   | size token \| `"full"` \| `"fit"`                 | —           | Same resolution as `Box`'s `width`.                                                                                                  |
| `height`  | size token \| `"full"` \| `"fit"`                 | —           | Same resolution as `Box`'s `height`.                                                                                                 |
| `grow`    | `boolean`                                         | `false`     | Same behavior as `Box`'s `grow`.                                                                                                     |

`Stack` does not expose a `shrink` prop — only `Box` does.

### Common mistakes / ownership

- `Stack` owns vertical spacing between its children via `gap`. Giving a child its own `margin` (via `unsafeCss` or otherwise) for that purpose defeats the point — and `margin*` properties always trigger a development warning when set via `unsafeCss`.
- There is intentionally no `direction` prop. Horizontal intent is `Row`, not `<Stack direction="horizontal">`.

---

## Row

### Purpose

Horizontal layout: `display: flex; flex-direction: row`, plus intrinsic wrapping behavior when there isn't room for every child.

### Copy-paste example

```tsx
import { Box, Row } from "@safe-css/core";

const App = () => {
  return (
    <Row gap="element" wrap="when-needed">
      <Box padding="card" border="subtle">
        One
      </Box>
      <Box padding="card" border="subtle">
        Two
      </Box>
      <Box padding="card" border="subtle">
        Three
      </Box>
    </Row>
  );
};

export default App;
```

What you should see: three bordered boxes side by side with element-sized space between them; narrowing the viewport wraps them onto additional lines instead of overflowing or shrinking them past their content size.

### Props

Also accepts every [common primitive prop](#common-primitive-props).

| Prop      | Values / Type                                                                 | Default     | Meaning                                                                                                                               |
| --------- | ----------------------------------------------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `gap`     | space token                                                                   | —           | Space between children (`gap`).                                                                                                       |
| `align`   | `"start"` \| `"center"` \| `"end"` \| `"stretch"` \| `"baseline"`             | `"stretch"` | Cross-axis (vertical) alignment of children (`align-items`). `"baseline"` is unique to `Row` — not available on `Stack` or `Grid`.    |
| `justify` | `"start"` \| `"center"` \| `"end"` \| `"between"` \| `"around"` \| `"evenly"` | `"start"`   | Main-axis (horizontal) distribution of children (`justify-content`). Wider than `Stack`'s `justify` — also has `"around"`/`"evenly"`. |
| `wrap`    | `"never"` \| `"when-needed"`                                                  | `"never"`   | Whether children wrap onto additional lines when they don't fit.                                                                      |
| `width`   | size token \| `"full"` \| `"fit"`                                             | —           | Same resolution as `Box`'s `width`.                                                                                                   |
| `grow`    | `boolean`                                                                     | `false`     | Same behavior as `Box`'s `grow`.                                                                                                      |

`Row` does not expose a `height` prop (only `Stack`/`Box` do), and does not expose `shrink` (only `Box` does).

### Common mistakes / ownership

- `wrap` defaults to `"never"` — a plain `<Row>` does not wrap unless you set `wrap="when-needed"`.
- Reaching for `unsafeCss={{ flexWrap: "wrap" }}` instead of `wrap="when-needed"` still works, but skips the framework's traceability metadata and triggers a development warning (`flexDirection`/layout-bypass properties are on the suspicious list, though `flexWrap` itself is not explicitly listed — see [Unsupported / unavailable capabilities](#unsupported--unavailable-capabilities) for the exact heuristic table).

---

## Grid

### Purpose

Column layout for a collection of same-shape items, in one of two mutually exclusive modes: adaptive (`minItemWidth`) or fixed (`columns`).

### Copy-paste example — adaptive

```tsx
import { Box, Grid } from "@safe-css/core";

const App = () => {
  return (
    <Grid minItemWidth="card" gap="card">
      <Box padding="card" border="subtle">
        One
      </Box>
      <Box padding="card" border="subtle">
        Two
      </Box>
      <Box padding="card" border="subtle">
        Three
      </Box>
    </Grid>
  );
};

export default App;
```

What you should see: the three boxes arranged in as many equal-width columns as fit, each at least `size.card` (260px by default) wide. Resizing the window changes the column count with no code change.

### Copy-paste example — fixed

```tsx
import { Box, Grid } from "@safe-css/core";

const App = () => {
  return (
    <Grid columns={3} gap="card">
      <Box padding="card" border="subtle">
        One
      </Box>
      <Box padding="card" border="subtle">
        Two
      </Box>
      <Box padding="card" border="subtle">
        Three
      </Box>
    </Grid>
  );
};

export default App;
```

What you should see: the same three boxes, always in exactly 3 equal columns regardless of window width.

### Props

Also accepts every [common primitive prop](#common-primitive-props).

| Prop           | Values / Type                                     | Default                                                                                             | Meaning                                                                                                                                                                                                                                            |
| -------------- | ------------------------------------------------- | --------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `minItemWidth` | size token                                        | —                                                                                                   | Adaptive mode. Produces `grid-template-columns: repeat(auto-fit, minmax(min(token, 100%), 1fr))`. Mutually exclusive with `columns` — TypeScript rejects passing both; if bypassed at runtime, a development warning fires and adaptive mode wins. |
| `columns`      | `1` \| `2` \| `3` \| `4` \| `5` \| `6` \| `12`    | —                                                                                                   | Fixed mode. Produces `grid-template-columns: repeat(N, 1fr)`. Mutually exclusive with `minItemWidth` (see above).                                                                                                                                  |
| `gap`          | space token                                       | —                                                                                                   | Space between both rows and columns (`gap`).                                                                                                                                                                                                       |
| `rowGap`       | space token                                       | —                                                                                                   | Space between rows only (`row-gap`).                                                                                                                                                                                                               |
| `columnGap`    | space token                                       | —                                                                                                   | Space between columns only (`column-gap`).                                                                                                                                                                                                         |
| `align`        | `"start"` \| `"center"` \| `"end"` \| `"stretch"` | — (no default class applied; the browser's native CSS Grid default, `align-items: normal`, governs) | Cross-axis alignment of items within their grid cells (`align-items`). Unlike `Stack`/`Row`, there is no forced default.                                                                                                                           |

`Grid`'s prop surface is narrower than `Box`/`Stack`/`Row`: it does not expose `justify`, `width`, `height`, `grow`, or `shrink`.

### Common mistakes / ownership

- `Grid` is for collections — many similar items with no inherent order. A small, ordered set of actions that just happens to wrap is `Row`, not `Grid`.
- Neither `minItemWidth` nor `columns` is required; if both are omitted, no `grid-template-columns` is set and the browser's implicit grid behavior applies. This is rarely what you want — normally pick one mode.

---

## ScrollArea

### Purpose

An independently scrolling region. Not merely `overflow-y: auto` — it also sets `min-width: 0; min-height: 0`, which is what makes scrolling actually work inside a flex or grid ancestor (otherwise a flex/grid child's automatic minimum size prevents overflow from ever triggering).

### Copy-paste example

`height="full"` only means something if an ancestor chain has a real height to be a percentage of. safe-css ships no global reset, so add this once to your application's own global stylesheet:

```css
html,
body,
#root {
  height: 100%;
}
```

Then:

```tsx
import { Box, ScrollArea, Stack } from "@safe-css/core";

const items = Array.from({ length: 30 }, (_, i) => `Item ${i + 1}`);

const App = () => {
  return (
    <Stack height="full">
      <Box as="header" padding="card" background="surface" border="subtle">
        Fixed header
      </Box>

      <ScrollArea grow>
        <Stack gap="element">
          {items.map((item) => (
            <Box key={item} padding="card" border="subtle">
              {item}
            </Box>
          ))}
        </Stack>
      </ScrollArea>
    </Stack>
  );
};

export default App;
```

What you should see: a header that stays fixed, and 30 items below it that scroll within their own region — the header itself does not scroll away, because it's a sibling of `ScrollArea`, not inside it. (To make a header stick _while inside_ the scrolling region instead, see [Sticky](#sticky).)

### Props

Also accepts every [common primitive prop](#common-primitive-props).

| Prop         | Values / Type                              | Default      | Meaning                                                                                                                                                              |
| ------------ | ------------------------------------------ | ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `direction`  | `"vertical"` \| `"horizontal"` \| `"both"` | `"vertical"` | Which axis scrolls (`overflow-y`/`overflow-x`/`overflow`).                                                                                                           |
| `overscroll` | `"auto"` \| `"contain"`                    | `"auto"`     | `overscroll-behavior`. `"contain"` stops scrolling inside this region from chaining into scrolling whatever is behind it — useful for panels and modal-like content. |
| `grow`       | `boolean`                                  | `false`      | Same behavior as `Box`'s `grow`.                                                                                                                                     |

`ScrollArea` does not expose `gap`, padding, sizing (`width`/`height`/`min*`/`max*` beyond `grow`), or alignment props — it owns only the scrolling behavior itself.

### Common mistakes / ownership

- `ScrollArea` owns the contained scrolling. Reaching for `unsafeCss={{ overflowY: "auto" }}` on a `Box` instead skips the `min-height: 0` fix, so it's easy to end up with a region that silently doesn't scroll at all when nested inside a flex layout.
- For the outermost page scroll (the whole document scrolling normally), you don't need `ScrollArea` — that's the browser's default behavior with no safe-css involvement.

---

## Sticky

### Purpose

An element that stays attached to an edge of its nearest scrolling ancestor while that ancestor scrolls — a token-backed replacement for `position: sticky; top: 0; z-index: ...`.

### Copy-paste example

Uses the same bounded-height setup as [ScrollArea](#scrollarea) above (`html`, `body`, `#root` set to `height: 100%` in your own global stylesheet). `Sticky` only produces a visible effect inside something that actually scrolls, so this example nests it inside a `ScrollArea`:

```tsx
import { Box, Row, ScrollArea, Stack, Sticky } from "@safe-css/core";

const projects = Array.from({ length: 20 }, (_, i) => `Project ${i + 1}`);

const App = () => {
  return (
    <Stack height="full">
      <ScrollArea grow>
        <Sticky edge="top">
          <Box as="header" padding="card" background="surface" border="subtle">
            <Row align="center" justify="between">
              <strong>Projects</strong>
            </Row>
          </Box>
        </Sticky>

        <Box padding="page">
          <Stack gap="element">
            {projects.map((project) => (
              <Box key={project} padding="card" border="subtle">
                {project}
              </Box>
            ))}
          </Stack>
        </Box>
      </ScrollArea>
    </Stack>
  );
};

export default App;
```

What you should see: a header reading "Projects" that stays pinned to the top of the scrolling region while the 20 project rows beneath it scroll past underneath it.

### Props

Also accepts every [common primitive prop](#common-primitive-props).

| Prop     | Values / Type         | Default    | Meaning                                                                                                                                    |
| -------- | --------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `edge`   | `"top"` \| `"bottom"` | `"top"`    | Which edge the element sticks to. Implemented with logical properties (`inset-block-start`/`inset-block-end`), not literal `top`/`bottom`. |
| `offset` | space token           | `"none"`   | Distance from the edge (the value used for `inset-block-start`/`inset-block-end`).                                                         |
| `layer`  | layer token           | `"sticky"` | Stacking order (`z-index`).                                                                                                                |

`Sticky` does not expose `gap`, sizing, or alignment props — it owns only the sticky-positioning behavior itself, applied to whatever its single child renders.

### Common mistakes / ownership

- `Sticky` needs an actual scrolling ancestor for the effect to be visible. With no scrolling context, a `Sticky` element behaves like a normal in-flow element (CSS `position: sticky` requires a scrollable ancestor to do anything).
- Reaching for `unsafeCss={{ position: "sticky", top: 0, zIndex: 10 }}` on a `Box` instead works, but ties the offset and stacking order to raw numbers instead of theme tokens, and `position`/`top`/`zIndex` all trigger development warnings naming `Sticky`/`Overlay` or a `layer` token as the alternative.

---

## Overlay

### Purpose

Establishes a positioning context for one or more `Overlay.Item` children — the root half of a two-part primitive. Consumers never write `position: relative` themselves.

### Copy-paste example

See [Overlay.Item](#overlayitem) below — `Overlay` is only useful together with at least one `Overlay.Item`.

### Props

`Overlay` has no props of its own beyond every [common primitive prop](#common-primitive-props) — it establishes the positioning context and nothing else.

### Common mistakes / ownership

- `Overlay` and `Overlay.Item` own **where** something sits, and nothing else. They have no visual props (no `background`, `border`, `radius`, `padding`, `color`) — appearance is owned by whatever's inside them, typically `Box`:

  ```tsx
  <Overlay>
    <Box padding="element" radius="card" background="surface" border="subtle">
      outer
    </Box>

    <Overlay.Item anchor="top-end" placement="edge">
      <Box border="subtle">inner</Box>
    </Overlay.Item>
  </Overlay>
  ```

  `Overlay`/`Overlay.Item` decide where each element sits relative to the other; `Box` decides what each one looks like.

---

## Overlay.Item

### Purpose

Positions one element relative to the `Overlay` it's inside, by named anchor — never by raw `top`/`left`/`transform` values you compute yourself.

### Copy-paste example

```tsx
import { Box, Overlay } from "@safe-css/core";

const App = () => {
  return (
    <Overlay>
      <Box padding="element" radius="pill" background="surface" border="subtle">
        TF
      </Box>

      <Overlay.Item anchor="top-end" placement="edge">
        <Box padding="control" radius="pill" background="danger">
          3
        </Box>
      </Overlay.Item>
    </Overlay>
  );
};

export default App;
```

What you should see: a pill-shaped "TF" avatar with a small red "3" count badge straddling its top-right corner. The badge's size comes entirely from its own padding and content — no explicit width/height, and no `unsafeCss`.

### Props

Also accepts every [common primitive prop](#common-primitive-props).

| Prop           | Values / Type                                                                                                                                                 | Default      | Meaning                                                                                                                                                                                                                     |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `anchor`       | `"top-start"` \| `"top-center"` \| `"top-end"` \| `"center-start"` \| `"center"` \| `"center-end"` \| `"bottom-start"` \| `"bottom-center"` \| `"bottom-end"` | — (required) | Which of the 9 logical positions on the `Overlay` this item is positioned against. Expressed in logical (writing-direction-independent) terms, not physical `top`/`left`.                                                   |
| `placement`    | `"inside"` \| `"edge"`                                                                                                                                        | `"inside"`   | `"inside"` keeps the item flush inside the anchor corner/edge. `"edge"` centers it directly on the corner/edge itself (the notification-dot look).                                                                          |
| `offset`       | space token                                                                                                                                                   | `"none"`     | Shorthand/fallback offset for **both** non-centered logical axes at once. Effective value per axis: the axis-specific prop below, then `offset`, then `"none"` — see [Independent axis offsets](#independent-axis-offsets). |
| `inlineOffset` | space token                                                                                                                                                   | —            | Overrides `offset` for the inline axis only. Has no effect on an anchor that centers the inline axis (`top-center`, `bottom-center`, `center`) — a development warning is logged once if you pass it anyway.                |
| `blockOffset`  | space token                                                                                                                                                   | —            | Overrides `offset` for the block axis only. Has no effect on an anchor that centers the block axis (`center-start`, `center-end`, `center`) — a development warning is logged once if you pass it anyway.                   |
| `layer`        | layer token                                                                                                                                                   | `"overlay"`  | Stacking order (`z-index`).                                                                                                                                                                                                 |

### Independent axis offsets

`offset` is the shorthand: it sets both the inline and block axis at once. `inlineOffset`/`blockOffset` each independently override it for their own axis only — the other axis still falls back to `offset`, then `"none"`.

```tsx
// Both axes use "control" (identical to today's behavior with just `offset`)
<Overlay.Item anchor="top-end" offset="control" />

// inline axis uses "card"; block axis falls back to "control"
<Overlay.Item anchor="top-end" offset="control" inlineOffset="card" />

// fully independent - offset shorthand not used at all
<Overlay.Item anchor="top-end" inlineOffset="card" blockOffset="element" />
```

`inlineOffset`/`blockOffset` are deliberately **logical**, not `horizontalOffset`/`verticalOffset` — see [Overlay](#overlay)'s RTL note. Existing `anchor`/`placement`/RTL behavior is completely unchanged by these props.

**Centered axes.** Some anchors center one or both axes at a fixed `50%` instead of offsetting from an edge: `top-center`/`bottom-center` center the **inline** axis, `center-start`/`center-end` center the **block** axis, and `center` centers both. A centered axis never consumes an offset — not even the `offset` shorthand — so no token dependency is recorded for it:

```tsx
// inline axis stays centered at 50%; only the block axis (start edge) uses "card"
<Overlay.Item anchor="top-center" blockOffset="card" />
```

Passing `inlineOffset` (or `blockOffset`) explicitly on an anchor that centers that exact axis has no visual effect and logs a one-time development warning explaining why — it never throws. The `offset` shorthand alone never warns for this, since it legitimately targets both axes and must stay ergonomic even when one happens to be centered.

### Common mistakes / ownership

- See [Overlay](#overlay) above for the positioning-vs-appearance split.
- The corner-placement transform's sign flips automatically under `dir="rtl"` — an `anchor="top-end"` item stays in the correct visual corner in both LTR and RTL without any extra work, because anchors are logical, not physical.
- Reconstructing this by hand (`position: relative`/`absolute`, manual `top`/`right` offsets via `unsafeCss`) breaks under `dir="rtl"`, since raw `top`/`right` don't participate in logical-property flipping the way `Overlay`'s anchors do.
- Passing `inlineOffset`/`blockOffset` on a centered axis is a silent no-op (plus a development warning) — double-check `anchor` if an axis-specific offset doesn't seem to do anything.

---

## defineRecipe

### Purpose

Builds a reusable, named component from a primitive plus a fixed set of variants, without introducing arbitrary CSS, selectors, or a second styling system.

### Signature

```text
function defineRecipe<Primitive, E extends ElementType, V>(
  Primitive: Primitive,
  config: {
    name: string;
    base?: Partial<PrimitiveProps> & { as?: E };
    variants?: { [group: string]: { [option: string]: Partial<PrimitiveProps> } };
    defaultVariants?: { [group: string]: string };
  },
): RecipeComponent;
```

(Simplified for readability — the real exported signature uses more involved generics to recover a primitive's own prop type and correctly type `as`/`ref` per recipe. See `packages/core/src/recipes/defineRecipe.ts` for the exact types, or the `RecipeConfig`/`RecipeProps` exports in [Other exported types](#other-exported-types).)

### Copy-paste example

```tsx
import { Box, defineRecipe } from "@safe-css/core";

const Card = defineRecipe(Box, {
  name: "Card",
  base: {
    padding: "card",
    radius: "card",
    background: "surface",
    border: "subtle",
  },
  variants: {
    tone: {
      default: {},
      raised: { shadow: "raised" },
    },
  },
  defaultVariants: {
    tone: "default",
  },
});

const App = () => {
  return (
    <>
      <Card>Default card</Card>
      <Card tone="raised">Raised card</Card>
      <Card padding="section">Instance props still win</Card>
    </>
  );
};

export default App;
```

What you should see: three card-styled boxes — the second with a shadow (from the `raised` variant), the third with `section`-sized padding instead of `card`-sized padding, because instance props override the recipe's `base`.

### Config

| Field             | Type                                                                   | Required | Meaning                                                                                                                                                                                                                                                                                               |
| ----------------- | ---------------------------------------------------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `name`            | `string`                                                               | Yes      | A stable, developer-facing identifier. Shows up in development metadata as `data-fw-recipe`. A recipe with no name is not representable — `name` is required, not optional.                                                                                                                           |
| `base`            | `Partial<PrimitiveProps> & { as?: ElementType }`                       | No       | Default props applied to every instance. Setting `as` here changes the recipe's rendered element _and_ its DOM prop/`ref` typing for every instance (e.g. `base: { as: "button" }` accepts `type`, `disabled`, a correctly-typed `onClick`).                                                          |
| `variants`        | `{ [group: string]: { [option: string]: Partial<PrimitiveProps> } }`   | No       | Named groups of prop overrides. Each group becomes an instance prop (e.g. `variants: { tone: {...} }` → `<Card tone="..." />`). Answers "what state has the _application_ decided this component is in?" — see [Interactive states](#interactive-states) for the different question `states` answers. |
| `defaultVariants` | `{ [group: string]: string }`                                          | No       | Which option each variant group uses when the instance doesn't specify one.                                                                                                                                                                                                                           |
| `states`          | `{ hover?, focusVisible?, active?: { background?, color?, border? } }` | No       | Native browser interaction styling — answers "what is the browser doing right now?" See [Interactive states](#interactive-states) below; this is a distinct model from `variants`, not a shorthand for it.                                                                                            |

### Precedence

A recipe's props resolve in one deterministic order:

```text
primitive defaults
      ↓
recipe base
      ↓
recipe variant
      ↓
interactive state
      ↓
instance props
      ↓
unsafeCss
```

`base`/variants/instance props are a plain object merge with no CSS specificity involved, exactly as in v0.1. `states` is layered in separately (it becomes a native `:hover`/`:focus-visible`/`:active` CSS rule, which can't be expressed as a JS object merge — see [Interactive states](#interactive-states)), but an instance prop or `unsafeCss` for the _same property_ still always wins over it, deterministically, by construction — never by relying on CSS specificity.

If two _different_ active variant groups set the same underlying prop, the group declared later in `variants: {...}` wins — the same left-to-right rule as any other merge here — and a development warning fires naming the collision.

### Interactive states

`states` declares how a recipe should look for the three native browser interaction pseudo-classes — a fixed, small vocabulary, not a general CSS mechanism:

- **Supported states:** `hover`, `focusVisible`, `active` — nothing else. There is no `states.focus` (plain `:focus`), no `states.disabled`, `states.checked`, `states.expanded`, etc.
- **Supported properties inside a state:** `background`, `color`, `border` — nothing else. No `padding`, `radius`, `shadow`, sizing, or arbitrary CSS inside a state.
- **Supported on `Box`-based recipes only.** A recipe built on `Stack`, `Row`, or `Grid` has no eligible `states` keys at all — TypeScript rejects any key you try to set, at compile time, because none of those primitives expose `background`/`color`/`border`.
- Token types inside a state match the corresponding `Box` prop exactly (`background`/`color` take a color token, `border` takes a border token or the `"none"` literal).

```tsx
import { Box, defineRecipe } from "@safe-css/core";

const Button = defineRecipe(Box, {
  name: "Button",

  base: {
    as: "button",
    padding: "control",
    radius: "control",
    background: "action",
    color: "surface",
    border: "none",
  },

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
```

**Instance suppression.** If an instance sets a property a state also declares, the instance owns that property completely — every state's treatment of it is suppressed on that instance, not just overridden while hovered:

```tsx
<Button background="danger" />
// resting AND hovered background are both "danger" - states.hover.background
// never applies to this instance. This is intentional, deterministic
// precedence (see above), not a CSS specificity quirk. A development
// warning names the recipe, the property, and which states were suppressed.
```

**`unsafeCss` suppression.** The same thing happens when `unsafeCss` sets the same rendered CSS property a state targets (e.g. `states.hover.background` vs. `unsafeCss={{ backgroundColor: "red" }}`) — `unsafeCss` always wins, and a development warning names the collision. This detection only covers a small, fixed table of known collisions (`background`↔`backgroundColor`/`background`, `color`↔`color`, `border`↔`border`); `unsafeCss`'s `borderColor`/`borderWidth`/`borderStyle` longhands are a documented, accepted gap — not detected, since whether one actually overrides the `border` shorthand's effect depends on declaration order in a way that can't be reliably determined without a full CSS parser.

**Simultaneous states.** If more than one declared state is true at once for the same property (e.g. a mouse-held-down keyboard-focused button is both `:active` and `:focus-visible`), Core resolves this via a fixed priority — `hover < focus-visible < active` — never CSS selector specificity or stylesheet order. You never need to reason about specificity to predict which state wins. This priority only matters when multiple states target the _same_ property; states on different properties are independent.

Core uses real, native `:hover`/`:focus-visible`/`:active` CSS pseudo-classes — there is no JavaScript mouse/focus event tracking involved, and no client JS is required for the interaction itself to work (it's already correct in server-rendered markup, before any hydration). Native `:disabled` elements are structurally excluded from all three via `:not(:disabled)` on every rule, from day one — but a _configurable_ `states.disabled` (styling that isn't simply "this is the browser's native disabled state") does not exist yet.

See [Inspector: Interaction States](../packages/inspector/README.md) and [Architecture: Interactive states](architecture.md#interactive-states) for how this shows up in the dev tooling.

### Common mistakes / ownership

- A recipe may only set props the underlying primitive already supports. It cannot introduce selectors (`"& > *"`, `".foo"`, etc.) — there is no compound-variant engine.
- Overriding `as` at the _instance_ level on an already-defined recipe (e.g. rendering a `ButtonLike` recipe as an `<a>` for one particular usage) is not typed — a recipe's element and DOM prop/`ref` shape are fixed by its `base.as`, not re-inferable per instance.
- Don't reach for `variants` to express "the user is hovering this" (use `states`), and don't reach for `states` to express "the application has decided this nav item is the current one" (use `variants`) — see [Interactive states](#interactive-states) above and [Core Concepts](core-concepts.md) for the full distinction.

---

## unsafeCss

### Purpose

The escape hatch present on every primitive (it's part of [common primitive props](#common-primitive-props), not a separate component): raw CSS for cases the semantic token/prop system doesn't cover, applied with the highest precedence of any style source on that element.

### Copy-paste example

```tsx
import { Box } from "@safe-css/core";

const App = () => {
  return (
    <Box
      padding="card"
      background="surface"
      unsafeCss={{ cursor: "pointer", transform: "rotate(-1deg)" }}
    >
      Experimental
    </Box>
  );
};

export default App;
```

What you should see: a card-padded box, slightly rotated, showing a pointer cursor on hover — neither of which safe-css models as a token or prop. No console warning is produced: `cursor` and `transform` aren't in the suspicious-pattern list below.

### Behavior

- **Type:** `React.CSSProperties` (a plain inline-style object — camelCase keys, e.g. `marginTop`, not `margin-top`).
- **Precedence:** merged in last, after every other style source on that element (`{ ...tokenStyles, ...unsafeCss }`) — a plain object spread, so a later key always wins over an earlier one with the same name.
- **Traceability:** its use is always recorded in development metadata (`data-fw-unsafe-css="<count>"`), whether or not anything below triggers a warning.
- **Diagnostics:** `unsafeCss` does not warn merely for existing. Only properties matching a small, fixed table of known risky patterns produce a one-time development warning:

| Pattern                                                              | Example properties                                                                                                                                                                                                                             | Suggested alternative named in the warning                                                            |
| -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Any `margin*` property                                               | `margin`, `marginTop`, `marginInlineStart`, ...                                                                                                                                                                                                | The parent's `gap`                                                                                    |
| `zIndex`                                                             | `zIndex`                                                                                                                                                                                                                                       | A `layer` token via `Sticky`/`Overlay.Item`                                                           |
| Layout/positioning properties a primitive already solves             | `display`, `position`, `top`/`right`/`bottom`/`left`, `inset*`, `overflow`/`overflowX`/`overflowY`, `float`, `clear`, `flexDirection`, `justifyContent`, `alignItems`, `alignContent`, `gridTemplateColumns`/`gridTemplateRows`/`gridAutoFlow` | The primitive/prop named in the warning (`Stack`/`Row`/`Grid`, `ScrollArea`, `Sticky`/`Overlay`, ...) |
| Spacing properties, with an arbitrary (non-token, non-`var()`) value | `padding`, `paddingTop`/`Right`/`Bottom`/`Left`, `paddingInline*`, `paddingBlock*`, `gap`, `rowGap`, `columnGap`                                                                                                                               | A space token                                                                                         |
| Theme-backed visual properties, with an arbitrary value              | `color`, `background`/`backgroundColor`, `border`/`borderColor`, `borderRadius`, `boxShadow`                                                                                                                                                   | `Box`'s corresponding prop                                                                            |

"Arbitrary value" means a raw number or a string that isn't one of `none`/`inherit`/`initial`/`unset`/`transparent`/`currentcolor` and doesn't start with `var(`. This is a small, fixed heuristic — not a general CSS linter — so properties outside these tables (e.g. `cursor`, `font`, `transform`, `textDecoration`, ...) never warn.

### Common mistakes / ownership

- `unsafeCss` is a supported, fully-functional escape hatch, not a mistake in itself. The warnings above exist for the specific case where it's reaching for something a primitive already models — using it for `cursor`, `font`, decorative `transform`s, etc. is expected and stays silent.
- Because it's a plain inline-style object, `unsafeCss` cannot express selectors, pseudo-classes, or pseudo-elements (`:hover`, `:focus-visible`, `::before`, media queries, ...) — see [Unsupported / unavailable capabilities](#unsupported--unavailable-capabilities).

---

## Unsupported / unavailable capabilities

These are capabilities a developer is likely to look for that are **not currently modeled natively** by safe-css. This section states that fact and, where one exists, the currently available escape hatch — it does not propose a future API.

### Pseudo-state styling beyond `hover`/`focus-visible`/`active` on `background`/`color`/`border`

`defineRecipe`'s `states` (see [Interactive states](#interactive-states)) covers exactly `hover`, `focusVisible`, and `active`, on `background`/`color`/`border`, on `Box`-based recipes only. Outside that fixed vocabulary, there is no primitive-level escape hatch:

- No `states.focus` (plain `:focus`, as opposed to `:focus-visible`), `states.disabled`, `states.checked`, `states.expanded`, `:visited`, or any other pseudo-class.
- No interactive states at all on `Stack`, `Row`, or `Grid` (or any primitive other than `Box`).
- No `padding`, `radius`, `shadow`, sizing, or arbitrary CSS inside a state — only `background`/`color`/`border`.
- No transition/animation configuration for a state change.

Reaching any of these today requires styling outside safe-css entirely (a CSS module, a global stylesheet rule, or a CSS-in-JS library) targeting the rendered element via `className` or `id` — the Inspector's "External hooks" panel can help you confirm which classes/id on a rendered element are actually yours to target this way, not framework-generated. See [`packages/inspector/README.md`](../packages/inspector/README.md).

### Cursor styling

There is no `cursor` prop on any primitive. The available escape hatch is `unsafeCss={{ cursor: "pointer" }}` (or any other CSS `cursor` value) — this is a legitimate, silent use of `unsafeCss`; `cursor` is not in the suspicious-pattern table above.

### Arbitrary/non-token spacing, color, radius, size, border, or shadow values

Every token-based prop (`padding`, `background`, `radius`, `border`, `shadow`, `width`/`height`/`min*`/`max*`, `gap`, ...) only accepts a token name from the active theme — there is no prop that accepts a raw CSS value directly (e.g. `padding="17px"` is not valid; `padding="card"` is). The escape hatch is `unsafeCss`. For `padding`/`gap`-family properties and `color`/`background`/`border`/`radius`/`shadow`-family properties specifically, `unsafeCss` produces a development warning when the value looks arbitrary and a token equivalent exists (see the [unsafeCss diagnostics table](#unsafecss) above) — but **this heuristic does not currently cover `width`/`height`/`minWidth`/`maxWidth`/`minHeight`/`maxHeight`**: setting a raw pixel value for those via `unsafeCss` is silent, with no warning pointing back to the token-based prop.

### CSS selectors, descendant styling, or `::before`/`::after`

Nothing in safe-css's public API — not a primitive prop, not `unsafeCss`, not `defineRecipe` — can express a CSS selector, style a descendant by anything other than rendering it as its own primitive, or produce a pseudo-element. `unsafeCss` only ever styles the single element it's set on.

---

## Other exported types

`@safe-css/core` also exports these TypeScript types, useful if you're writing your own components around the primitives above:

| Export                                                                                                                                                                                                                                                                   | What it is                                                                                                                                                                       |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Theme`, `ThemeCategory`, `ThemeInput`                                                                                                                                                                                                                                   | The complete theme shape, its category names (`"colors" \| "space" \| "radius" \| "size" \| "border" \| "shadow" \| "layer"`), and the deep-partial input `createTheme` accepts. |
| `ThemeColorTokens`, `ThemeSpaceTokens`, `ThemeRadiusTokens`, `ThemeSizeTokens`, `ThemeBorderTokens`, `ThemeShadowTokens`, `ThemeLayerTokens`                                                                                                                             | The per-category token interfaces — the ones extended via declaration merging to add custom tokens. See [Tokens](tokens.md#custom-tokens-via-declaration-merging).               |
| `SpaceToken`, `ColorToken`, `RadiusToken`, `SizeToken`, `BorderToken`, `ShadowToken`, `LayerToken`                                                                                                                                                                       | The union of valid token names for each category (e.g. `SpaceToken` is `"none" \| "control" \| "element" \| "card" \| "section" \| "page"` by default).                          |
| `DiagnosticsMode`                                                                                                                                                                                                                                                        | `"off" \| "warn"` — the type of `ThemeProvider`'s `diagnostics` prop.                                                                                                            |
| `ThemeProviderProps`                                                                                                                                                                                                                                                     | The full prop type of `ThemeProvider`.                                                                                                                                           |
| `BoxProps`, `BoxOwnProps`, `StackProps`, `StackOwnProps`, `RowProps`, `RowOwnProps`, `GridProps`, `GridOwnProps`, `ScrollAreaProps`, `ScrollAreaOwnProps`, `StickyProps`, `StickyOwnProps`, `OverlayProps`, `OverlayOwnProps`, `OverlayItemProps`, `OverlayItemOwnProps` | Each primitive's full prop type (including inherited DOM props) and its "own props only" type (excluding DOM/common props) — useful for typing wrapper components.               |
| `StackAlign`, `StackJustify`, `RowAlign`, `RowJustify`, `RowWrap`, `GridAlign`, `GridColumns`, `ScrollDirection`, `Overscroll`, `StickyEdge`, `OverlayAnchor`, `OverlayPlacement`                                                                                        | The individual union types behind each primitive-specific prop documented above.                                                                                                 |
| `CommonProps`                                                                                                                                                                                                                                                            | The `as`/`id`/`className`/`children`/`unsafeCss` shape every primitive shares.                                                                                                   |
| `BoxDimension`                                                                                                                                                                                                                                                           | `"full" \| "fit" \| SizeToken` — the type behind `width`/`height` on `Box`, `Stack`, and `Row`.                                                                                  |
| `RecipeConfig`, `RecipeProps`, `RecipeVariantMap`, `RecipeVariantProps`                                                                                                                                                                                                  | The types behind `defineRecipe`'s config object and its returned component's props.                                                                                              |

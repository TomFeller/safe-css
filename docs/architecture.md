# Architecture

This document explains the internal design of `@safe-css/core` and the reasoning behind the choices that aren't obvious from reading the code. It assumes you've read the root [README](../README.md) for the product framing; this is the "how and why," not the "what."

## Contents

- [Styling engine](#styling-engine)
- [Theme token model](#theme-token-model)
- [Style precedence](#precedence)
- [Box](#box)
- [Stack](#stack)
- [Recipes](#recipes)
- [Scoped CSS](#scoped-css)
- [SSR strategy](#ssr-strategy)
- [Diagnostics](#diagnostics)
- [RTL / Overlay](#rtl--overlay)
- [Future traceability ("blast radius")](#future-traceability)
- [Non-goals](#non-goals)

## Styling engine

There is no runtime CSS-in-JS engine here — no style tag injection, no class-hash generation, no `<style>` mutation on mount. Given the constraints (SSR safety, deterministic output, low runtime overhead, no large dependency), a hybrid of two much simpler mechanisms covers everything the public API needs:

1. **A single static stylesheet** (`src/style/styles.css`, shipped as `dist/styles.css`), containing every _structural_ class the primitives can produce: `display: flex`, `flex-direction`, the `align-items`/`justify-content` keyword classes, `overflow` combinations for `ScrollArea`, `position: sticky`/`position: relative`/`position: absolute`, the fixed `grid-template-columns: repeat(N, 1fr)` classes, and the Overlay anchor → `transform` lookup table. Every one of these concerns has a small, closed set of possible values (there are only 4 `align` values, only 3 `ScrollArea` directions, only 9 Overlay anchors), so they can be fully enumerated at build time. This file never changes at runtime and is identical across every app that imports safe-css.
2. **Inline `style` objects for anything token-driven.** Token names are open-ended (`createTheme` can be called with a different value for `space.card` per app, and a project can add entirely new token names via declaration merging), so there is no way to precompute a finite set of classes for them. Instead, every token-driven prop resolves to a `var(--fw-<category>-<token>)` reference written directly into the element's `style` attribute — `padding: var(--fw-space-card)`, never `padding: 16px`.

This split is the core trick: structural concerns (a closed, small vocabulary) become static CSS; value concerns (an open vocabulary controlled by the theme) become CSS variable references. Neither one needs a runtime style-generation step, a class cache, or a `<style>` tag inserted during render — which is also exactly why SSR is trivial (see [SSR strategy](#ssr-strategy)) and why there's no hydration-mismatch risk: the class list and the style object are pure functions of props, computed identically on server and client.

The alternative most comparable libraries reach for — atomic-class generation with a runtime cache (`css-in-js` engines, Tailwind-style JIT) — was deliberately avoided. It would add a real dependency, a class-name hashing scheme to keep deterministic across server/client, and a runtime cache to manage, for a public API that (by design) only ever produces a few dozen distinct structural combinations. Static CSS is simpler, smaller, and easier to audit — a strong CSS reviewer can open `styles.css` and read the entire structural vocabulary in one pass.

## Theme token model

`Theme` is a fixed interface with seven categories (`colors`, `space`, `radius`, `size`, `border`, `shadow`, `layer`), each declared as its own named interface (`ThemeColorTokens`, `ThemeSpaceTokens`, ...) rather than inlined into `Theme` directly. That's what makes `declare module "@safe-css/core" { interface ThemeSpaceTokens { xl: string } }` work — TypeScript's declaration merging unions the extra member into the existing interface, and `SpaceToken = keyof Theme["space"]` picks it up everywhere automatically.

This is a deliberate simplification versus a fully generic `createTheme<T>()` that infers a bespoke token shape per call site. A fully generic version is possible in TypeScript but requires either a global "current theme" type registered via module augmentation anyway (the same mechanism used here, just wired through a generic parameter instead of a fixed interface) or components generic over an arbitrary theme shape, which would leak into every primitive's type signature for a benefit most projects won't use. The fixed-interface-plus-declaration-merging approach gives full autocomplete for the documented default token set with zero configuration, and an explicit, documented escape valve for teams that want more — see the README's [Theme](../README.md#5-theme) section.

`createTheme(input)` deep-merges `input` over a complete built-in default theme, one category at a time (`{ ...defaultTheme.space, ...input.space }`). The result is always a fully-populated `Theme` — no component ever has to handle a partially-defined theme, which is what lets token resolution simply be "look up `theme[category][token]`" with no fallback branch.

`themeToCssVariables(theme)` is the only place a theme's _values_ ever become literal CSS strings — it flattens the theme into a `{ "--fw-space-card": "16px", ... }` map, which `ThemeProvider` applies as an inline `style` object. Every downstream primitive only ever reads `var(--fw-space-card)`, never `16px`. This is what makes a theme change safe and total: changing `theme.space.card` changes one CSS custom property, and every element referencing it (via the browser's own CSS variable resolution) updates without React needing to re-render a single one of them — though in practice a theme swap in this codebase _is_ a React re-render (a new `theme` object triggers `ThemeProvider` to recompute its variable map), it doesn't have to be for the visual update to propagate.

## Precedence

Style precedence (`primitive defaults < recipe base < recipe variant < instance props < unsafeCss`) is implemented as an ordinary JavaScript object merge, not CSS specificity:

- Inside `defineRecipe`, the four layers are spread in order: `{ ...base, ...variantProps, ...instanceProps }`. Whatever key appears last wins. There is no CSS selector complexity involved at all — the "specificity" is just object-spread order.
- Inside each primitive, `unsafeCss` is merged last, into the already-computed `style` object: `{ ...style, ...unsafeCss }`. Because inline styles always win over class-based styles in the browser's own cascade, and `unsafeCss`'s properties are merged last within the inline style object itself, it wins over everything — both the component's own token-driven styles and (trivially) the static structural classes, which sit at the lowest possible specificity (a single class selector) by construction.

This is why the spec's constraint "no specificity games should be required" is met structurally rather than by convention: there is no scenario where two rules of equal specificity race, because there is only ever one class per structural concern applied to an element, and the token-driven properties never appear in the stylesheet at all — only in that element's own inline style.

## Box

`Box`'s prop list is intentionally asymmetric with `Stack`/`Row`/`Grid` — for example, only `Box` has `padding`, and only `Stack` has `height`. This isn't an oversight; it follows directly from "primitives expose behavior, not CSS." `Box` is a _surface_ (it has a padding box, a background, a border), so padding belongs there. `Stack` is a _layout behavior_ (arrange children vertically with a gap), and its `height`/`width` props exist only because "fill the available space" is a real, common layout need for a vertical stack — `Row`'s omission of `height` reflects that a horizontal flow's height is usually determined by its content or its parent, not something you'd set directly. When an app genuinely needs a `Row` to fill a parent's height, the answer is composition — wrap it in a `Stack` and use `grow` (see `apps/demo/src/App.tsx`'s shell for a worked example) — not a wider Box-like prop surface on every primitive "just in case." Keeping each primitive's prop list to what its own concept actually needs is what keeps the public surface small.

## Stack

See [Box](#box) above for why `Stack` has `height`/`width` but `Row` only has `width`. Structurally `Stack` is just `display: flex; flex-direction: column` plus the shared alignment/gap/sizing vocabulary described in [Styling engine](#styling-engine).

## Recipes

`defineRecipe`'s implementation is straightforward (merge props by precedence, `createElement` the underlying primitive), but getting its TypeScript signature right required working around two real inference limitations, both worth documenting so they aren't "fixed" by accident later:

1. **Why every primitive's type is two call signatures, not one.** A primitive like `Box` is polymorphic (`as="button"` changes its DOM prop set), which naturally wants a single generic call signature: `<E extends ElementType = "div">(props: BoxProps<E>) => ReactElement`. That works fine for direct JSX use. But `defineRecipe(Box, ...)` needs to _infer_ `Box`'s prop type from the value `Box` itself — and TypeScript's inference, when the source is a generic function with a default type parameter, does not reliably apply that default. The element type parameter is left unresolved, which collapses the inferred DOM-prop portion down to `any` and silently erases everything (including `onClick`) from the recipe's resulting prop type. Adding a second, concrete call signature pinned to the primitive's default tag (`(props: BoxProps<"div">) => ReactElement`) gives inference something non-generic to resolve against, which TypeScript prefers — see `src/primitives/internal/polymorphic.ts`'s `PolymorphicComponent` type and the comment there.
2. **Why a recipe's `variants` aren't as strictly type-checked as its `base`.** The natural way to express "every variant's props must be a subset of the primitive's props" is a generic constraint: `V extends Record<string, Record<string, Partial<P>>>`. But when `P` and `V` are _both_ being inferred in the same call (as they are here — `P` from the `Primitive` argument, `V` from `config.variants`), making `V`'s constraint reference `P` causes TypeScript to widen `keyof V` to `string`, which (via `Omit<P, keyof V>`) strips every other prop from the recipe's final type — the same failure mode as (1), for a different reason. The fix applied here decouples `V`'s constraint from `P` (`V extends Record<string, Record<string, object>>`) and instead offers the `P`-aware shape only as a soft, non-constraining hint (`VariantHint<P, V>`) intersected into the parameter type — enough for editor autocomplete in the common case, but not a hard guarantee. Callers who want the guarantee back can opt in explicitly: `variants: {...} satisfies RecipeVariantMap<BoxProps>` (see `tests/type-tests.ts`).

`base`'s props, by contrast, don't have this problem — `base?: Partial<Omit<P, "as">> & { as?: ElementType }` only involves `P` (already resolved by that point via `NoInfer<P>`), so excess-property checking works normally there. In practice this means a typo in `base` is reliably caught at compile time; a typo inside a `variants` leaf is not always caught, though React will still warn at runtime if it produces an unrecognized DOM attribute on a host element. This is the one place v0.1 knowingly trades a small amount of compile-time strictness for keeping the primitives' real prop types (DOM events included) intact — see the README's [v0.1 limitations](../README.md#16-v01-limitations).

Runtime enforcement of "no arbitrary selectors" doesn't need a runtime check at all: `variants`/`base` are always plain prop objects assigned to keys the primitive understands (or, at worst, forwarded as an inert DOM attribute) — there is no code path that accepts a selector string in the first place.

## Scoped CSS

Every rule in `styles.css` is a single class selector (a handful of Overlay RTL rules are `[dir="rtl"] .fw-anchor-*` — an attribute selector scoped to the framework's own class, still not a descendant selector reaching into arbitrary markup). There is no rule of the shape `.a .b`, no element selector (`button { ... }`), and no `!important` anywhere in the file. Combined with the precedence model above (object merge, not cascade), this is what guarantees a local instance-level prop change can never leak into a sibling, a child, or an unrelated page — the generated CSS simply has no mechanism to reach outside the element it's applied to.

## SSR strategy

Because every style decision reduces to (a) a fixed, precomputed class name and (b) a `var()` string built from plain string concatenation, rendering never touches `window`, `document`, or any browser API. `ThemeProvider` renders a normal `<div style={...}>` — inline styles are just React props, computed identically during `renderToString`/`renderToStaticMarkup` on the server and during the client's first render, so there's no hydration mismatch to guard against. `tests/ssr.test.tsx` asserts this directly by running under a plain Node Vitest environment (`// @vitest-environment node`, no jsdom at all) — if any code path referenced a browser global, that test would throw a `ReferenceError` rather than silently pass.

The one runtime environment check in the codebase (`isDevelopmentBuild()`, gating diagnostics) reads `process.env.NODE_ENV`, which is safe in both Node (where `process` is real) and in a bundled browser build (where bundlers statically replace `process.env.NODE_ENV`) — it's wrapped in a `try/catch` regardless, defaulting to "development" if the check can't be made at all, since a missed warning is worse than an extra one.

## Diagnostics

Diagnostics are additive-only: every warning is a `console.warn` call, gated by `ThemeProvider`'s `diagnostics` prop (`"warn"` by default outside production, `"off"` in production unless overridden). No diagnostic call ever changes rendered output, so flipping diagnostics on or off can never change what an app looks like — only what shows up in the console. Warnings are deduplicated per unique `(kind, key)` pair for the life of the module (`src/diagnostics/warn.ts`'s `warnOnce`), so a list of a hundred cards all using the same invalid token produces one warning, not a hundred.

## RTL / Overlay

`Overlay.Item`'s anchor system is the one place in the codebase where getting RTL right was genuinely non-trivial, and it's solved entirely in CSS, not JavaScript. The component computes each anchor's _logical_ inset properties (`inset-inline-start`/`inset-inline-end`, never `left`/`right`) directly in JS — that part is direction-agnostic by construction, since the browser resolves `inset-inline-start` to `left` or `right` based on ambient `dir` on its own. The one piece that _is_ direction-sensitive is the `transform` used for `placement="edge"` (straddling a corner/edge requires shifting the element by a percentage of its own size, and a percentage shift's sign is a physical, not logical, quantity). Rather than reading `document.dir` in JavaScript (which would mean a browser-only code path, undermining the SSR story above, and a possible flash/mismatch if `dir` isn't known synchronously), the sign flip lives in `styles.css` as a small number of `[dir="rtl"] .fw-anchor-*--edge` overrides. The component always emits the same class name regardless of direction; the browser's cascade — driven by whatever ancestor actually sets `dir="rtl"` — picks the correct transform. See `tests/overlay.test.tsx`'s RTL test, which asserts the class name is identical in both directions, and `apps/demo`'s RTL toggle for a live demonstration.

## Future traceability

A later "blast radius" feature (§32 of the original spec: "changing `radius.control` affects these N components across these M screens") needs a data source connecting theme tokens → primitives → recipes → variants → rendered instances. v0.1 doesn't build the analysis or the UI, but it does generate exactly that data source as a side effect of normal rendering, at effectively no cost:

- Every primitive collects the list of tokens it actually resolved (`space.card`, `radius.card`, `color.surface`, ...) while computing its style, and — in development builds only — writes them to a `data-fw-tokens` attribute.
- Every primitive writes `data-fw-primitive="Box"` (etc.).
- Every recipe instance additionally writes `data-fw-recipe="Card"` and `data-fw-variant="tone:raised"`.

None of this exists in production output (`isDevelopmentBuild()` gates it, same as diagnostics), so it costs nothing at runtime for real users. But it means a future tool doesn't need a redesign of the rendering pipeline to exist — it can be built as a dev-mode DOM walker (or a browser extension, or a Storybook addon) that reads these attributes directly, correlates them against a theme's token table, and answers "what does changing `radius.control` touch" without the framework's core architecture changing at all.

## Non-goals

Deliberately out of scope for v0.1 (and not accidentally missing): a button/input/select/modal/tabs/tooltip component library, a forms or data-table system, an animation framework, an icon system, Tailwind compatibility, non-React targets, a visual builder, an AI generator, a browser extension, a full CSS debugger, or a production-ready blast-radius UI. safe-css solves the layout/theming/scoping problem; it does not try to be a full design system or hide CSS from developers who already know it.

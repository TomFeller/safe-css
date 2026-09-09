# @safe-css/inspector

Development-only inspection tooling for safe-css.

The Inspector helps you understand rendered safe-css UI and analyze the rendered impact of token changes.

It answers three questions:

- **Why does this element look the way it does?**
- **What interaction styling (hover/focus-visible/active) does this element define?**
- **If I change this token, what currently rendered UI — including interaction behavior — will be affected?**

## Install

```bash
npm install -D @safe-css/inspector
```

Requires:

```text
@safe-css/core >=0.1.2 <0.2.0
```

## Usage

With Vite, load the Inspector only in development:

```tsx
import { lazy, Suspense } from "react";

const Inspector = import.meta.env.DEV
  ? lazy(() =>
      import("@safe-css/inspector").then((module) => ({
        default: module.SafeCssInspector,
      })),
    )
  : null;

export function App() {
  return (
    <>
      {/* your application */}

      {Inspector && (
        <Suspense fallback={null}>
          <Inspector />
        </Suspense>
      )}
    </>
  );
}
```

The Inspector does not need to be rendered inside `ThemeProvider`.

## What it provides

- element inspection
- primitive and recipe metadata
- active variants
- token usage
- raw and resolved token values
- token dependency chains
- `unsafeCss` visibility
- **Interaction states** — every declared `hover`/`focus-visible`/`active` rule (token-backed or, for `border: "none"`, a literal), each with the same raw/resolved value and dependency detail as an ordinary token, plus whether `unsafeCss` currently suppresses it on this instance
- **External hooks** — `className`/`id` on the selected element that safe-css itself didn't generate, computed from Core's own `data-fw-classes` metadata (never a `fw-` prefix guess); this reports that a hook exists, not that anything definitely uses it for styling
- Impact Analysis
  - direct and indirect rendered impact
  - affected recipe and primitive grouping
  - theme-scope-aware impact
  - affected-element highlighting
  - state-aware paths (`via hover · background`) and an **Interaction-only** summary count for elements affected exclusively through a declared interaction state — an additional characteristic of an affected element, not a third impact kind
  - suppressed interaction-state paths are correctly excluded from counting as effective impact

## Impact Analysis scope

Impact Analysis analyzes safe-css elements currently rendered in the document — including their declared interaction-state styling, whether or not that state is currently active.

It does not:

- scan source files
- crawl unmounted routes
- retain historical renders
- track live mouse/focus/keyboard events, or simulate/preview a hover state

## Production

The Inspector is development tooling and should not be included in production bundles.

Use a build-time development flag with a dynamic import, as shown above.

## Documentation

For the full safe-css documentation, see:

- [`docs/introduction.md`](../../docs/introduction.md)
- [`docs/getting-started.md`](../../docs/getting-started.md)
- [`docs/core-concepts.md`](../../docs/core-concepts.md)
- [`docs/layout.md`](../../docs/layout.md)
- [`docs/api-reference.md`](../../docs/api-reference.md)
- [`docs/tokens.md`](../../docs/tokens.md)
- [`docs/architecture.md`](../../docs/architecture.md)

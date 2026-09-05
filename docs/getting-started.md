# Getting Started

This guide takes you from an empty React app to a small safe-css interface you can inspect and analyze.

By the end, you will have used:

```text
createTheme
ThemeProvider
Box
Stack
Row
defineRecipe
SafeCssInspector
Impact Analysis
```

The examples use React with TypeScript.

---

# 1. Install safe-css

Install the Core package:

```bash
npm install @safe-css/core
```

Install the Inspector as a development dependency:

```bash
npm install -D @safe-css/inspector
```

The Inspector is development tooling and should not ship in your production bundle.

---

# 2. Import the Core stylesheet

Import the safe-css structural stylesheet once from your application entry point:

```tsx
// src/main.tsx

import "@safe-css/core/styles.css";

import { createRoot } from "react-dom/client";
import { App } from "./App";

createRoot(document.getElementById("root")!).render(<App />);
```

The stylesheet contains the finite structural CSS used by safe-css primitives.

Your design values come from the theme.

---

# 3. Create a theme

Create:

```text
src/theme.ts
```

```tsx
import { createTheme } from "@safe-css/core";

export const theme = createTheme({
  space: {
    card: "18px",
    section: "28px",
  },

  radius: {
    card: "14px",
  },
});
```

You only need to define the values you want to customize.

`createTheme()` fills in the rest from the default safe-css theme.

In this theme, we have defined three semantic decisions:

```text
space.card    = 18px
space.section = 28px
radius.card   = 14px
```

The important part is not the values.

It is the names.

Later, components will ask for:

```text
card
section
```

rather than repeating:

```text
18px
28px
```

---

# 4. Add ThemeProvider

Wrap your application:

```tsx
// src/main.tsx

import "@safe-css/core/styles.css";

import { createRoot } from "react-dom/client";
import { ThemeProvider } from "@safe-css/core";

import { App } from "./App";
import { theme } from "./theme";

createRoot(document.getElementById("root")!).render(
  <ThemeProvider theme={theme}>
    <App />
  </ThemeProvider>,
);
```

safe-css now exposes the theme through CSS custom properties inside that theme scope.

Primitives can reference semantic token names without knowing their literal values.

---

# 5. Build the first layout

Create:

```text
src/App.tsx
```

```tsx
import { Box, Row, Stack } from "@safe-css/core";

export function App() {
  return (
    <Box padding="page" background="surfaceRaised">
      <Stack gap="section">
        <Stack gap="element">
          <Box as="h1">Projects</Box>

          <Box color="textMuted">Your active projects.</Box>
        </Stack>

        <Row gap="element" wrap="when-needed">
          <Box padding="card" radius="card" background="surface" border="subtle">
            Apollo
          </Box>

          <Box padding="card" radius="card" background="surface" border="subtle">
            Atlas
          </Box>

          <Box padding="card" radius="card" background="surface" border="subtle">
            Nova
          </Box>
        </Row>
      </Stack>
    </Box>
  );
}
```

At this point, you already have the core safe-css mental model.

---

# 6. Notice who owns the spacing

There are no:

```text
margin-top
margin-bottom
```

rules on the children.

Instead:

```text
<Stack gap="section">
```

owns the vertical spacing between sections.

And:

```text
<Row gap="element">
```

owns the spacing between Cards.

This is one of safe-css's core rules:

> **The parent owns the spacing between its children.**

Children describe themselves.

Parents describe relationships.

---

# 7. Notice how responsive behavior is expressed

The row uses:

```text
<Row gap="element" wrap="when-needed">
```

This means:

> Keep the children in a horizontal row while there is enough space. Wrap when there is not.

The requirement is not:

> "At 768px, wrap."

It is:

> "Wrap when necessary."

safe-css prefers expressing the behavior directly when the browser already knows when that behavior should happen.

---

# 8. Turn the repeated Card into a recipe

The three Cards currently repeat the same styling decisions.

Once that collection of decisions has product meaning, give it an identity.

Create:

```text
src/Card.tsx
```

```tsx
import { Box, defineRecipe } from "@safe-css/core";

export const Card = defineRecipe(Box, {
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

      raised: {
        shadow: "raised",
      },
    },
  },

  defaultVariants: {
    tone: "default",
  },
});
```

Now update the page:

```tsx
// src/App.tsx

import { Box, Row, Stack } from "@safe-css/core";

import { Card } from "./Card";

export function App() {
  return (
    <Box padding="page" background="surfaceRaised">
      <Stack gap="section">
        <Stack gap="element">
          <Box as="h1">Projects</Box>

          <Box color="textMuted">Your active projects.</Box>
        </Stack>

        <Row gap="element" wrap="when-needed">
          <Card>
            <Stack gap="element">
              <Box as="h2">Apollo</Box>

              <Box color="textMuted">Production dashboard</Box>
            </Stack>
          </Card>

          <Card tone="raised">
            <Stack gap="element">
              <Box as="h2">Atlas</Box>

              <Box color="textMuted">Internal tooling</Box>
            </Stack>
          </Card>

          <Card>
            <Stack gap="element">
              <Box as="h2">Nova</Box>

              <Box color="textMuted">Customer portal</Box>
            </Stack>
          </Card>
        </Row>
      </Stack>
    </Box>
  );
}
```

The repeated style is now a product concept:

```text
Card
```

That identity becomes useful later when inspecting and grouping impact.

---

# 9. Change the design, not the components

Now change:

```text
radius: {
  card: "14px",
},
```

to:

```text
radius: {
  card: "20px",
},
```

in:

```text
src/theme.ts
```

Every rendered Card using:

```text
radius="card"
```

now receives the new value.

You did not edit the Card component.

You did not search for `14px`.

You changed the design decision:

```text
radius.card
```

The components kept the same intent.

---

# 10. Add the Inspector

Now add safe-css's development tooling.

We recommend loading the Inspector only in development so it is completely removed from production builds.

With Vite:

```tsx
// src/main.tsx

import "@safe-css/core/styles.css";

import { Suspense, lazy } from "react";

import { createRoot } from "react-dom/client";
import { ThemeProvider } from "@safe-css/core";

import { App } from "./App";
import { theme } from "./theme";

const Inspector = import.meta.env.DEV
  ? lazy(() =>
      import("@safe-css/inspector").then((module) => ({
        default: module.SafeCssInspector,
      })),
    )
  : null;

createRoot(document.getElementById("root")!).render(
  <>
    <ThemeProvider theme={theme}>
      <App />
    </ThemeProvider>

    {Inspector && (
      <Suspense fallback={null}>
        <Inspector />
      </Suspense>
    )}
  </>,
);
```

The Inspector does not need to be rendered inside `ThemeProvider`.

It reads safe-css's development metadata and CSS custom properties from the rendered DOM.

---

# 11. Inspect a rendered Card

Start the application in development mode.

A small:

```text
Inspect
```

launcher appears.

Click it and select one of the Cards.

The Inspector can show information such as:

```text
Card
────────────────

Tag
<div>

Primitive
Box

Recipe
Card

Tokens
space.card
radius.card
colors.surface
border.subtle
```

Instead of asking:

> "Which styles produced this Card?"

you can inspect the answer directly.

---

# 12. Understand a design token

Look at:

```text
radius.card
```

The Inspector can show:

```text
radius.card

Used by
border-radius

Raw value
20px
```

Raw and resolved values are shown separately only when they differ - a plain token like `radius.card` has nothing to resolve, so only its raw value appears.

For a token that depends on another token, both appear. For example:

```text
border.subtle

Used by
border

Raw value
1px solid var(--fw-color-border)

Resolved
1px solid #e5e7eb
```

with the dependency itself visible in its own section:

```text
border.subtle
└── colors.border
```

This is the first half of safe-css's development workflow:

> **Why does this element look this way?**

---

# 13. Analyze where the decision matters

Now choose:

```text
radius.card
```

and run:

```text
Analyze impact
```

Impact Analysis scans the safe-css UI currently rendered in the document.

With the three Cards above, you should see something conceptually similar to:

```text
Impact Analysis
────────────────

radius.card

Current value
20px

Rendered impact

3 affected elements

Direct
3

Indirect
0

Affected recipes

Card
3
```

You now know:

> If I change this exact `radius.card` definition, these three rendered Cards will be affected.

---

# 14. Highlight affected elements

Enable:

```text
Highlight affected
```

safe-css visually marks the affected elements.

The application elements themselves are not modified.

The highlight is Inspector-owned development UI.

This gives you a direct visual answer to:

> **Where does this design decision matter on the page?**

---

# 15. Analyze indirect impact

Impact Analysis is not limited to tokens an element uses directly.

Suppose:

```text
border.subtle
```

depends on:

```text
colors.border
```

Conceptually:

```text
colors.border
      ↓
border.subtle
      ↓
Card
```

From the Inspector's token dependency tree, run Impact Analysis on:

```text
colors.border
```

Cards using:

```text
border.subtle
```

can now appear as:

```text
Indirect
```

impact.

The Card never explicitly asked for:

```text
colors.border
```

but it still depends on that design decision.

That distinction becomes increasingly useful as token relationships grow.

---

# 16. Theme scopes matter

safe-css themes follow CSS custom-property inheritance.

That means the same token name can exist in different nested theme scopes.

For example:

```text
Outer theme
radius.card = 20px

Inner theme
radius.card = 8px
```

When you analyze the outer:

```text
radius.card
```

safe-css does not incorrectly count Cards whose value comes from the inner theme.

Impact Analysis identifies the exact:

```text
token + active theme scope
```

rather than treating every token with the same name as globally identical.

The Impact panel can report those separately as:

```text
Other theme scopes
N excluded
```

---

# 17. Understand what Impact Analysis does not mean

Impact Analysis is intentionally based on the rendered application.

If it says:

```text
3 affected elements
```

that means:

> **3 affected safe-css elements currently rendered in the document.**

It does not mean:

> "There are only three usages in the entire repository."

Impact Analysis does not currently:

- scan source files
- crawl routes
- inspect unmounted components
- retain historical renders

The wording in the Inspector deliberately uses:

```text
Rendered impact
```

to make that boundary explicit.

---

# 18. Use unsafeCss when you actually need CSS

safe-css intentionally does not expose every CSS property.

Sometimes you still need something outside its semantic model.

Use:

```tsx
<Box unsafeCss={{ transform: "rotate(-1deg)" }}>Experimental</Box>
```

`unsafeCss` is an explicit escape hatch.

It does not mean the CSS is wrong.

It means:

> **This decision exists outside safe-css's semantic styling model.**

Because the exception is explicit, the Inspector can keep it visible.

---

# 19. What you have built

You now have three connected layers.

## A semantic implementation

```tsx
<Stack gap="section">
  <Card />
  <Card tone="raised" />
  <Card />
</Stack>
```

The code expresses relationships and product concepts.

---

## Shared design decisions

```text
space.card
space.section
radius.card
border.subtle
```

Components depend on semantic names rather than repeated implementation values.

---

## Development visibility

```text
Inspector
"Why does this look this way?"

Impact Analysis
"Where does this decision matter?"
```

Together, the workflow is:

```text
Express
   ↓
Inspect
   ↓
Analyze
   ↓
Change with context
```

---

# 20. The rules to remember

You do not need to learn the entire safe-css API before using it.

Start with these rules.

## Choose the primitive that owns the behavior

Vertical layout:

```tsx
<Stack />
```

Horizontal layout:

```tsx
<Row />
```

General surface/container styling:

```tsx
<Box />
```

Use more specialized primitives for more specialized behavior.

---

## Prefer semantic design decisions

Prefer:

```text
padding="card"
```

over:

```text
padding: 16px
```

when `card` is the real design decision.

---

## Let the parent own sibling spacing

Prefer:

```text
<Stack gap="section">
```

over margins carried by individual children.

---

## Turn repeated product patterns into recipes

If a repeated group of safe-css decisions has become:

```text
a Card
a Panel
a Toolbar
```

give it a recipe identity.

---

## Use unsafeCss intentionally

If the framework does not model a requirement, use the escape hatch instead of forcing the abstraction.

---

## Inspect before guessing

If you are unsure why rendered UI looks a certain way, use the Inspector.

---

## Analyze before changing shared decisions

If a token is shared, use Impact Analysis to understand its currently rendered effect before changing it.

---

# Next

You now know the basic safe-css workflow:

```text
Theme
  ↓
Semantic primitives
  ↓
Recipes
  ↓
Inspector
  ↓
Impact Analysis
```

Continue with:

- [Core Concepts](core-concepts.md) — the mental model behind safe-css
- **Layout** — Box, Stack, Row, Grid, ScrollArea, Sticky and Overlay
- **Theming** — tokens, theme scopes and nested ThemeProviders
- **Recipes** — reusable semantic components and variants
- **Inspector** — understanding rendered styling
- **Impact Analysis** — understanding rendered change impact
- **Escape Hatches & Limitations** — where safe-css intentionally stops

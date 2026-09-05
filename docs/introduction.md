# Introduction

## CSS is easy to write. CSS is hard to change safely.

Writing a CSS rule is rarely the hard part.

The hard part comes later.

You change a spacing value and wonder what else uses it.

You update a shared style and hope it does not break another screen.

You add a margin because it fixes one component, without knowing whether the parent should have owned that spacing instead.

You change a design token, but cannot easily tell which rendered UI actually depends on it.

And as an application grows, more of its styling was written by someone else — another developer, your past self, or increasingly, an AI coding agent.

The problem is not:

> "How do I write `display: flex`?"

The problem is:

> **"Can I change this UI without being afraid of what else I might affect?"**

safe-css is built around that problem.

---

# What is safe-css?

safe-css is a React styling system built around **change safety, not styling flexibility**.

Its promise is simple:

> **CSS you can safely change.**

Instead of exposing the entire CSS language through component props, safe-css provides a deliberately constrained set of:

- semantic design tokens
- behavior-oriented primitives
- reusable recipes
- development tools for inspecting and analyzing rendered UI

You describe intent.

safe-css turns that intent into predictable CSS.

For example:

```tsx
<Stack gap="section">
  <Header />
  <Content />
</Stack>
```

This does not mean:

> "Create a div with some flexbox properties."

It means:

> "These elements belong in a vertical layout, with section-level spacing between them."

That distinction matters.

---

# The constraint is the feature

safe-css intentionally gives you **fewer ways to style something**.

That is not a missing feature.

It is the point.

A general CSS API gives you enormous flexibility:

```text
display
position
margin
overflow
z-index
flex
grid
...
```

But every additional way to express the same intent also creates another thing future developers need to understand.

safe-css narrows the available paths.

Instead of asking:

> "Which CSS properties should I use here?"

the framework encourages you to ask:

> "What behavior am I trying to express?"

Fewer valid paths make styling easier to:

```text
understand
inspect
change
```

---

# The complete loop

safe-css is more than a way to write styles.

It is designed around the full lifecycle of a UI decision.

```text
Express intent
      ↓
Use semantic decisions
      ↓
Inspect why
      ↓
Analyze where
```

You write:

```tsx
<Card />
```

Then, in development, you can inspect that rendered Card and ask:

> **Why does this element look this way?**

The Inspector might show:

```text
Card
──────────────

Primitive
Box

Tokens
space.card
radius.card
border.subtle
```

Then you can select:

```text
radius.card
```

and ask:

> **Where would changing this decision matter?**

Impact Analysis might answer:

```text
radius.card
12px

Rendered impact
───────────────

6 affected elements

Card
6
```

Or it can expose an indirect relationship:

```text
colors.border
      ↓
border.subtle
      ↓
16 rendered elements
```

That loop — **write, understand, analyze** — is central to safe-css.

---

# The four principles

safe-css is built around four principles.

## 1. Predictable

A styling decision should have a clear owner and a deterministic result.

Layout primitives have narrow responsibilities.

Recipes have explicit precedence.

Tokens resolve through known theme scopes.

Changing something should not depend on accidental CSS specificity.

---

## 2. Semantic

Prefer:

```tsx
<Box padding="card" radius="card" border="subtle" />
```

over:

```tsx
<div
  style={{
    padding: "16px",
    borderRadius: "12px",
    border: "1px solid #e5e7eb",
  }}
/>
```

The first version describes design decisions:

```text
space.card
radius.card
border.subtle
```

The second describes implementation values.

When the design changes, that difference matters.

---

## 3. Scoped

A styling decision should affect the scope that owns it.

safe-css themes use CSS custom properties, so normal CSS inheritance still applies.

Nested theme scopes remain independent.

The Inspector and Impact Analysis understand those boundaries instead of assuming every token with the same name is globally identical.

---

## 4. Changeable

The goal is not merely to make the first version of a UI easy to build.

The goal is to make the tenth change understandable.

safe-css is designed for the moment after someone says:

> "Just change the card radius."

Before changing it, you should be able to understand what that decision means and where it currently matters.

---

# Semantic design decisions

safe-css uses tokens to represent design intent.

For example:

```tsx
<Box padding="card" radius="card" background="surface" border="subtle" />
```

maps to decisions such as:

```text
space.card
radius.card
colors.surface
border.subtle
```

A theme can change their values:

```tsx
const theme = createTheme({
  space: {
    card: "20px",
  },

  radius: {
    card: "16px",
  },
});
```

The component still says:

```text
padding="card"
radius="card"
```

because the component's intent has not changed.

Only the design decision changed.

---

# Behavior-oriented primitives

safe-css intentionally does not expose every CSS property through one generic component.

Different behaviors have different primitives:

```text
Box
General surface and container styling

Stack
Vertical layout

Row
Horizontal layout

Grid
Grid layout

ScrollArea
Scrolling behavior

Sticky
Sticky positioning

Overlay
Overlay positioning
```

For example, `Box` does not expose generic:

```text
display
position
overflow
```

props.

Those properties represent different behaviors, so safe-css gives those behaviors explicit primitives.

This reduces the number of ways the same layout can be constructed.

---

# Parents own spacing

One of the most important safe-css rules is:

> **A parent owns the spacing between its children.**

Instead of:

```tsx
<>
  <Header />
  <Content style={{ marginTop: 24 }} />
  <Footer style={{ marginTop: 24 }} />
</>
```

write:

```tsx
<Stack gap="section">
  <Header />
  <Content />
  <Footer />
</Stack>
```

The children do not need to know where they happen to be rendered.

The parent describes their relationship.

This makes components easier to move and reuse without carrying accidental external spacing with them.

---

# Prefer behavior over unnecessary breakpoints

safe-css prefers intrinsic behavior when the browser already knows what should happen.

For example:

```tsx
<Row gap="element" wrap="when-needed">
  <Action />
  <Action />
  <Action />
</Row>
```

does not say:

> "Wrap at 768px."

It says:

> "Stay in a row while there is enough room. Wrap when there is not."

The requirement is behavioral, so the API expresses behavior.

---

# Recipes give patterns an identity

When a repeated group of styling decisions becomes a product concept, it can become a recipe.

For example:

```tsx
const Card = defineRecipe(Box, {
  name: "Card",

  base: {
    padding: "card",
    radius: "card",
    background: "surface",
  },
});
```

Now:

```tsx
<Card />
```

is no longer just a collection of primitive styling decisions.

It has an identity:

```text
Card
```

That identity can also appear in the Inspector and Impact Analysis.

Recipes do not create another styling system.

They are reusable compositions of the same safe-css vocabulary.

---

# Understand the rendered result

Predictable source code helps, but eventually you still need to answer:

> "Why does this particular element look like this?"

The development-only Inspector reads safe-css metadata from the rendered DOM.

For example:

```text
Card
──────────────

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

A token can expose more detail:

```text
border.subtle

Used by
border

Raw value
1px solid var(--fw-color-border)

Resolved
1px solid #e5e7eb
```

Instead of reconstructing the styling architecture manually, you can inspect it directly from the rendered UI.

---

# Understand where a decision matters

Understanding one element is only half of the problem.

The next question is:

> **"What else depends on this?"**

Impact Analysis follows token relationships through the currently rendered safe-css UI.

It distinguishes:

```text
Direct impact
Indirect impact
Different theme scopes
```

and can explain dependency paths such as:

```text
colors.border
└── border.subtle
    └── Card ×6
```

It can also highlight affected rendered elements directly on the page.

Impact Analysis is intentionally factual.

It analyzes the safe-css UI currently rendered in the document.

It does not claim to include unmounted routes, historical renders, or every source-code usage in the repository.

---

# An escape hatch, not another styling API

Sometimes you genuinely need CSS that safe-css does not model.

For that, primitives provide:

```text
unsafeCss
```

Example:

```tsx
<Box unsafeCss={{ transform: "rotate(-1deg)" }}>...</Box>
```

`unsafeCss` does not mean:

> "This CSS is bad."

It means:

> **"This styling decision exists outside the semantic safe-css system."**

The exception remains explicit and traceable instead of silently expanding the framework into a generic CSS-prop API.

The Inspector also surfaces custom CSS so those exceptions stay visible.

---

# What safe-css is not

safe-css is not trying to replace every CSS tool.

It is not:

- a utility-class framework
- a general CSS-in-JS engine
- a full component library
- a universal design system
- a replacement for understanding CSS
- a browser DevTools replacement

It deliberately does not expose every CSS property as a prop.

If every component could express every possible CSS rule, safe-css would lose much of the predictability it exists to provide.

---

# How it fits with component libraries

safe-css primitives handle layout and styling architecture.

They are not intended to replace behavioral application components such as:

```text
Dialog
Select
DatePicker
Menu
Tabs
```

You can build product components with safe-css and combine them with accessibility or component libraries where appropriate.

The goal is not to own every React component.

The goal is to make styling decisions predictable and traceable.

---

# Who is safe-css for?

safe-css is designed primarily for React developers who can write CSS, but do not want CSS architecture to become a permanent source of uncertainty as an application grows.

It becomes especially useful when the person changing the UI is not necessarily the person who originally wrote it.

That may be:

```text
another developer
your future self
an AI coding agent
```

The larger that gap becomes, the more valuable explicit styling intent and deterministic inspection become.

---

# The mental model

When working with safe-css, think in this order:

```text
1. What is the UI intent?

2. Which primitive owns that behavior?

3. Which semantic token describes the design decision?

4. If the pattern has product meaning, should it become a recipe?

5. If the rendered result is unclear, inspect it.

6. Before changing a shared decision, analyze its rendered impact.
```

Or more simply:

```text
Express intent
      ↓
Use semantic decisions
      ↓
Inspect why
      ↓
Analyze where
```

---

# The goal

safe-css is not designed to make CSS disappear.

It is designed to make CSS **less surprising**.

A developer should be able to look at:

```tsx
<Stack gap="section">
  <Card />
  <Card />
</Stack>
```

and understand the relationship immediately.

They should be able to inspect a `Card` and understand why it looks the way it does.

And before changing `radius.card`, they should be able to see where that decision currently matters.

safe-css intentionally gives you fewer styling paths so the ones you do use are easier to understand and change.

That is the promise:

> **CSS you can safely change.**

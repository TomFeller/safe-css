# Core Concepts

safe-css is intentionally opinionated.

The framework does not try to expose every possible CSS decision through React props.

Instead, it establishes a small set of rules about:

- who owns a styling decision
- how design values are represented
- how layout behavior is expressed
- how repeated patterns become reusable components
- how exceptions remain visible
- how rendered styling can be inspected later

Understanding these rules is more important than memorizing the API.

---

# 1. Constraint over flexibility

Most styling APIs optimize for flexibility.

They try to make this possible:

```text
"If CSS can do it, the API should let me express it."
```

safe-css takes a different position:

> **If several different CSS techniques express the same intent, prefer one predictable path.**

That is why safe-css deliberately does not expose generic props such as:

```text
display
position
overflow
margin
z-index
flex-direction
```

through `Box`.

It could.

It chooses not to.

The constraint reduces the number of valid ways to express the same layout, which makes future code easier to understand.

This is a recurring safe-css principle:

> **The easy path should also be the safe path.**

---

# 2. Express intent, not implementation

Consider this UI requirement:

> Place three actions horizontally. Keep space between them. Wrap if there is not enough room.

A CSS implementation might involve:

```css
display: flex;
flex-direction: row;
gap: 8px;
flex-wrap: wrap;
```

safe-css expresses the requirement instead:

```tsx
<Row gap="control" wrap="when-needed">
  <Save />
  <Preview />
  <Publish />
</Row>
```

The developer describes:

```text
horizontal relationship
control-level spacing
wrap when necessary
```

rather than manually reconstructing the CSS behavior.

This distinction is fundamental.

safe-css primitives are not intended to hide CSS syntax for its own sake.

They exist to give common styling behaviors a stable meaning.

---

# 3. Styling decisions need an owner

Many CSS problems are ownership problems.

The clearest example is spacing between siblings.

For example:

```tsx
<Card style={{ marginBottom: 24 }} />
```

raises a question:

> Why does the Card own the space below itself?

What happens when the Card moves somewhere that should not have that spacing?

safe-css uses a simple rule:

> **The parent owns the relationship between its children.**

So instead of children carrying external margins:

```tsx
<>
  <Card style={{ marginBottom: 24 }} />
  <Card style={{ marginBottom: 24 }} />
  <Card />
</>
```

the parent owns the relationship:

```tsx
<Stack gap="section">
  <Card />
  <Card />
  <Card />
</Stack>
```

Now the Card describes itself.

The Stack describes how the Cards relate to each other.

This rule matters enough that safe-css does not expose public margin props at all. Use:

```text
<Stack gap="section">
```

or:

```text
<Row gap="control">
```

instead of adding margin to children.

safe-css primitives are also scoped-normalized so browser-default margins from semantic elements such as:

```text
<Box as="h1">
```

do not unexpectedly reintroduce external spacing.

The result is a simpler ownership model:

```text
Child
owns its own appearance

Parent
owns relationships between children
```

---

# 4. Semantic tokens represent design decisions

A literal value answers:

> What is the value?

A semantic token answers:

> What decision does this value represent?

Compare:

```tsx
<Box padding="card" radius="card" />
```

with:

```tsx
<div
  style={{
    padding: "16px",
    borderRadius: "12px",
  }}
/>
```

The safe-css version contains two design decisions:

```text
space.card
radius.card
```

Their current values might happen to be:

```text
16px
12px
```

but those values are not the component's responsibility.

The component only needs to know:

> I need card spacing and card radius.

---

# 5. Tokens make design changes explicit

Suppose the design changes:

```text
radius.card

12px
↓
20px
```

A component that uses:

```text
radius="card"
```

does not change.

Its intent is still correct.

The theme changes because the design decision changed.

This creates a useful separation:

```text
Component
"What decision do I need?"

Theme
"What does that decision mean?"
```

That separation is what later makes Impact Analysis meaningful.

Instead of asking:

> "Where did we write `12px`?"

you can ask:

> "What currently depends on `radius.card`?"

---

# 6. Tokens can depend on other tokens

Design decisions are not always independent.

For example:

```text
border.subtle
```

may use:

```text
colors.border
```

internally.

Conceptually:

```text
colors.border
      ↓
border.subtle
```

A Card can request:

```text
border="subtle"
```

without directly requesting:

```text
colors.border
```

but it still depends on that color decision.

safe-css preserves these relationships through CSS custom properties.

This allows the Inspector and Impact Analysis to distinguish:

```text
direct dependency
indirect dependency
```

instead of treating every final CSS value as unrelated.

---

# 7. Theme scopes follow CSS inheritance

safe-css themes are implemented with CSS custom properties.

That means token values naturally follow DOM inheritance.

A theme establishes a scope.

A nested `ThemeProvider` establishes another scope for its subtree.

For example:

```text
Outer scope
radius.card = 20px

    Card A
    Card B

    Inner scope
    radius.card = 8px

        Card C
```

Card A and Card B resolve:

```text
radius.card → 20px
```

Card C resolves:

```text
radius.card → 8px
```

These are not the same active design definition just because they share the same token name.

That distinction matters when analyzing change impact.

---

# 8. A nested ThemeProvider is a new theme

You might reach for a nested `ThemeProvider` to give one part of a UI its own design values — a branded subtree, an embedded widget, or a preview panel showing a different theme — without touching the theme anywhere else.

Before doing that, one important implementation detail matters:

A nested `ThemeProvider` does not partially inherit custom safe-css theme values from the provider above it.

`createTheme()` merges its input over the built-in default theme.

So:

```tsx
<ThemeProvider theme={outerTheme}>
  ...
  <ThemeProvider theme={innerTheme}>...</ThemeProvider>
</ThemeProvider>
```

means the inner subtree receives the complete `innerTheme`.

It does not mean:

```text
outerTheme
+
inner overrides
```

unless you explicitly construct `innerTheme` that way.

The important mental model is:

> **Each ThemeProvider publishes a complete safe-css theme for its scope.**

---

# 9. Behavior belongs to specialized primitives

`Box` is deliberately not a generic CSS container.

For example, these concerns have dedicated primitives:

```text
Vertical layout
→ Stack

Horizontal layout
→ Row

Grid layout
→ Grid

Scrolling
→ ScrollArea

Sticky positioning
→ Sticky

Anchored overlay positioning
→ Overlay
```

This matters because raw CSS properties often carry hidden requirements.

Scrolling is not merely:

```css
overflow-y: auto;
```

Sticky behavior is not merely:

```css
position: sticky;
```

Overlay positioning is not merely:

```css
position: absolute;
```

A behavior-oriented primitive can encode the whole safe pattern instead of exposing one low-level property and leaving the rest to the caller.

---

# 10. Prefer intrinsic behavior

Responsive design does not always require named breakpoints.

Consider:

```text
<Row wrap="when-needed">
```

The real requirement is:

> Wrap when the available space is insufficient.

The browser already knows when that becomes true.

Similarly, an adaptive Grid can respond to available space using intrinsic layout rather than requiring the application to choose a breakpoint first.

safe-css prefers this style of API when the requirement itself is intrinsic.

The rule is not:

> Never use responsive breakpoints.

The rule is:

> **Do not introduce a breakpoint when the real requirement is simply behavioral.**

---

# 11. Recipes give repeated decisions an identity

Primitives describe behavior.

Recipes describe reusable product concepts.

For example:

```tsx
const Card = defineRecipe(Box, {
  name: "Card",

  base: {
    padding: "card",
    radius: "card",
    background: "surface",
    border: "subtle",
  },
});
```

Without the recipe, these are simply several primitive decisions.

With the recipe, they become:

```text
Card
```

That identity matters both to developers and to safe-css development tooling.

Impact Analysis can group rendered effects by:

```text
Card
ProjectCard
UserCard
```

instead of reporting only anonymous `Box` elements.

---

# 12. Recipes do not create a second styling language

A recipe can only compose styling decisions already supported by its underlying primitive.

It does not introduce:

```text
selectors
arbitrary CSS rules
another specificity system
```

A recipe is essentially:

> **A named, reusable composition of safe-css decisions.**

This keeps the same mental model from primitive usage through higher-level product components.

---

# 13. Precedence is deterministic

When several safe-css layers contribute to the same property, precedence is explicit:

```text
primitive defaults
      ↓
recipe base
      ↓
recipe variant
      ↓
instance props
      ↓
unsafeCss
```

Later layers win.

For example:

```tsx
const Card = defineRecipe(Box, {
  name: "Card",
  base: {
    padding: "card",
  },
});
```

and:

```tsx
<Card padding="section" />
```

results in:

```text
padding = section
```

because instance props override recipe base values.

There is no CSS specificity contest involved.

It is deterministic JavaScript-level merging.

---

# 14. Variants express meaningful differences

Recipes can expose variants when a product concept has a small number of meaningful states.

For example:

```tsx
<Card tone="raised" />
```

is preferable to exposing several implementation-level choices such as:

```text
shadow
border
background
```

to every caller.

The variant describes:

```text
raised Card
```

rather than:

```text
Card with these three particular CSS differences
```

This is the same intent-first principle applied at the recipe level.

---

# 15. unsafeCss is an explicit boundary

safe-css cannot and should not model every possible styling requirement.

For cases outside the semantic system, use:

```text
unsafeCss
```

For example:

```tsx
<Box
  unsafeCss={{
    transform: "rotate(-1deg)",
  }}
>
  Experimental
</Box>
```

The name is intentionally uncomfortable.

It does not mean:

> "The CSS is dangerous."

It means:

> **safe-css can no longer fully reason about this styling decision.**

Once styling leaves the semantic token/primitive model, some guarantees become weaker.

So the boundary should remain visible.

---

# 16. An escape hatch should remain an escape hatch

If `unsafeCss` became the normal way to style every element:

```tsx
<Box
  unsafeCss={{
    display: "flex",
    marginTop: "14px",
    overflow: "auto",
    position: "sticky",
  }}
/>
```

safe-css would technically still render the UI.

But the framework would no longer provide much value.

The intended order is:

```text
1. Use the safe-css primitive that owns the behavior.

2. Use semantic tokens for design decisions.

3. Create a recipe when a pattern gains product meaning.

4. Use unsafeCss for the remaining exception.
```

Not:

```text
Use Box + unsafeCss for everything.
```

---

# 17. Rendered styling remains traceable

safe-css primitives emit development metadata describing the decisions that produced the rendered element.

That metadata powers the Inspector.

The Inspector can answer questions such as:

```text
What primitive rendered this?

Which recipe produced it?

Which variants are active?

Which tokens does it use?

What do those tokens resolve to?

Which safe-css ancestor owns the surrounding layout?
```

The goal is not merely to produce predictable CSS.

It is to preserve enough structure to explain that CSS later.

---

# 18. Inspector answers why

Consider a rendered Card.

Instead of manually searching:

```text
component
→ recipe
→ primitive
→ token
→ CSS variable
→ final CSS
```

the Inspector can expose that chain directly.

For example:

```text
Card

Primitive
Box

Tokens
space.card
radius.card
border.subtle
```

and:

```text
border.subtle

Used by
border

Raw value
1px solid var(--fw-color-border)

Resolved
1px solid #e5e7eb
```

The Inspector answers:

> **Why does this rendered element look the way it does?**

---

# 19. Impact Analysis answers where

Once you understand a styling decision, the next question is:

> What else depends on it?

Impact Analysis follows token relationships through the currently rendered safe-css UI.

For example:

```text
colors.border
      ↓
border.subtle
      ↓
Card
```

The Card may be indirectly affected even though it never explicitly requests `colors.border`.

Impact Analysis can report:

```text
Rendered impact

Direct
Indirect

Affected recipes
Affected primitives

Impact paths
```

and optionally highlight affected rendered elements on the page.

---

# 20. Impact is scoped and rendered

Impact Analysis deliberately does not claim more knowledge than it has.

It analyzes:

> **safe-css elements currently rendered in the document**

It does not currently:

```text
scan source code
crawl routes
inspect unmounted components
retain historical renders
```

And it respects theme scopes.

The same token name under another active theme definition is not automatically part of the same impact.

The useful identity is:

```text
token
+
active theme scope
```

not merely:

```text
token name
```

---

# 21. Change safety comes from visibility, not prohibition

safe-css cannot guarantee that every UI change will look good.

It does not try to decide:

```text
safe change
dangerous change
good design
bad design
```

Instead, it tries to make styling decisions:

```text
explicit
owned
semantic
traceable
inspectable
```

Before changing a shared token, you can understand where it currently matters.

Before debugging an element, you can understand why it received its styling.

That visibility is the foundation for safer change.

---

# 22. The safe-css decision process

When building UI, use this sequence.

## Step 1 — Identify the behavior

Ask:

> What relationship or behavior am I trying to express?

Then choose the primitive.

```text
vertical relationship → Stack
horizontal relationship → Row
collection layout → Grid
scrolling → ScrollArea
sticky behavior → Sticky
overlay positioning → Overlay
```

---

## Step 2 — Choose semantic decisions

Ask:

> Which design decision describes this value?

Use:

```text
padding="card"
```

rather than choosing a literal spacing value when a semantic token exists.

---

## Step 3 — Assign ownership

Ask:

> Which element should own this decision?

If it describes relationships between siblings:

the parent probably owns it.

---

## Step 4 — Create identity when patterns repeat

If a combination of styling decisions has become a product concept:

```text
Card
Panel
Toolbar
```

turn it into a recipe.

---

## Step 5 — Use the escape hatch intentionally

If safe-css does not model the requirement:

use `unsafeCss`.

Keep the exception explicit.

---

## Step 6 — Inspect instead of reconstructing

If the rendered result is confusing:

use the Inspector.

---

## Step 7 — Analyze shared changes

Before changing a shared design token:

use Impact Analysis to understand its currently rendered effect.

---

# The mental model

Most of safe-css can be summarized as:

```text
Behavior has an owner.

Design values have semantic names.

Repeated decisions gain identity.

Exceptions remain visible.

Rendered decisions remain explainable.
```

Or as a workflow:

```text
Express intent
      ↓
Use semantic decisions
      ↓
Create clear ownership
      ↓
Inspect why
      ↓
Analyze where
      ↓
Change with context
```

That is the foundation the rest of the safe-css API builds on.

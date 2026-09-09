# Layout

safe-css does not have one layout component with a large prop surface.

It has several, and each one owns a different behavior.

This document answers the question you actually have when you sit down to build something:

> **Which primitive should I choose for this layout problem, and why?**

It is not an exhaustive API reference — see [API Reference](api-reference.md) for every prop, default, and value. `docs/core-concepts.md` already covers the rules behind the API (ownership, tokens, precedence). This document assumes those rules and applies them to one recurring decision: picking the right primitive.

---

# 1. Choosing the right primitive

Start here:

```text
Need a general surface/container?
→ Box

Need vertical sibling layout?
→ Stack

Need horizontal flow?
→ Row

Need a collection that adapts to available width?
→ Grid

Need an independently scrolling region?
→ ScrollArea

Need content that stays attached to an edge while its container scrolls?
→ Sticky

Need something positioned relative to another element?
→ Overlay
```

Every one of these could, in principle, be built by hand from `Box` plus raw CSS. safe-css deliberately does not do that.

`display`, `position`, `overflow`, and `z-index` are not props on `Box`. They are behaviors, and each behavior has exactly one primitive that owns it. This is the same idea as `Box`'s constraint on styling values, applied to layout: fewer valid ways to build the same thing means less to reason about when you come back to change it later.

The rest of this document goes through each primitive: what it owns, when to reach for it, when to reach for something else instead, and the mistakes that come from treating `Box` as a general-purpose CSS container.

---

# 2. Box

`Box` is the general-purpose surface/container primitive.

### What it owns

Visual and spatial properties of a single element: padding, background, color, radius, border, shadow, and sizing.

### When to use it

Anything that needs to look like something — a card surface, a page's outer padding, a colored badge, a bordered panel — but does not need to arrange its own children in a particular direction.

### When not to use it

`Box` does not own:

```text
layout direction        → Stack or Row
scrolling                → ScrollArea
sticky positioning       → Sticky
overlay positioning      → Overlay
spacing between siblings → the parent's gap, never a child's margin
```

If you find yourself reaching for `unsafeCss` on a `Box` to get one of these behaviors, that is usually a sign you want a different primitive, not a workaround on this one.

### Typical usage

```tsx
<Box padding="card" radius="card" background="surface" border="subtle">
  Apollo
</Box>
```

```tsx
<Box as="h1" color="textMuted">
  Projects
</Box>
```

### Important behavior

`Box` is scoped-normalized to `margin: 0`, including when it renders a semantic element via `as`. `<Box as="h1">` does not carry the browser's default heading margin. This is what makes "parents own spacing" actually true in practice — a UA stylesheet default can't quietly reintroduce a margin a parent didn't ask for.

### Relevant props

Visual:

```text
background, color, radius, border, shadow
```

Spacing (of the Box's own content, not its siblings):

```text
padding, paddingInline, paddingBlock
```

Sizing:

```text
width, height        — a size token, or the keywords "full" / "fit"
minWidth, maxWidth, minHeight, maxHeight  — a size token
grow, shrink          — flex-child behavior when Box is inside Stack/Row
```

`border` and `shadow` also accept `"none"`, which explicitly clears them rather than leaving them unset.

Every primitive also accepts `as` (which element to render), `id`, `className`, and `unsafeCss`.

### Common mistakes

```tsx
// Avoid: reaching for unsafeCss to make Box scroll
<Box unsafeCss={{ overflowY: "auto", minHeight: 0 }}>{children}</Box>

// Prefer: scrolling is ScrollArea's job
<ScrollArea>{children}</ScrollArea>
```

This isn't a style preference — development builds actually warn when `unsafeCss` sets `overflow`/`overflowY`/`overflowX`, naming `ScrollArea` as the alternative, precisely because this is a common way people reach for `Box` past what it owns.

### Why this primitive exists

If `Box` exposed `display`, `position`, and `overflow` directly, every layout decision in an application could be expressed as "some CSS on a Box," and there would be no stable vocabulary for the Inspector, Impact Analysis, or a teammate reading the code to latch onto. Giving each behavior its own primitive is what makes "which primitive is this" a meaningful, answerable question.

---

# 3. Stack

> Stack owns vertical relationships between siblings.

### What it owns

Vertical layout — `display: flex; flex-direction: column` — plus the spacing between its children.

### When to use it

Any time a set of elements should read top to bottom: a page's sections, a form's fields, the content inside a card.

### When not to use it

If the children should flow left to right, use `Row`. Stack has no `direction` prop — there is intentionally no `<Stack direction="horizontal">`; horizontal intent gets its own primitive instead of a flag on this one.

### Typical usage

```tsx
<Stack gap="section">
  <Stack gap="element">
    <Box as="h1">Projects</Box>
    <Box color="textMuted">Your active projects.</Box>
  </Stack>

  <Box>Content</Box>
</Stack>
```

A card's internal content is a common nested case:

```tsx
<Card>
  <Stack gap="element">
    <Box as="h2">Apollo</Box>
    <Box color="textMuted">Production dashboard</Box>
  </Stack>
</Card>
```

### Important behavior

`gap` is spacing the Stack owns, not spacing its children carry. This is the difference between:

```text
<Content style={{ marginTop: 24 }} />
<Footer style={{ marginTop: 24 }} />
```

and:

```tsx
<Stack gap="section">
  <Content />
  <Footer />
</Stack>
```

In the first version, every child needs to know it's not first and needs to know the correct spacing value. In the second, the children describe themselves and the Stack describes their relationship — which is also what lets `Content` or `Footer` move somewhere else without dragging a stale margin along.

### Relevant props

```text
gap        — space token
align      — "start" | "center" | "end" | "stretch" (default "stretch")
justify    — "start" | "center" | "end" | "between" (default "start")
width, height, grow
```

`Stack` currently exposes `width`, `height`, and `grow`. It does not expose a `shrink` prop.

### Common mistakes

```tsx
// Avoid: a child owns spacing that isn't its own
<Card style={{ marginBottom: 24 }} />
<Card style={{ marginBottom: 24 }} />
<Card />

// Prefer: the parent owns the relationship
<Stack gap="section">
  <Card />
  <Card />
  <Card />
</Stack>
```

---

# 4. Row

> Row owns horizontal flow between siblings.

### What it owns

Horizontal layout — `display: flex; flex-direction: row` — plus intrinsic wrapping behavior when there isn't room.

### When to use it

A toolbar's actions, a header's left/right groups, a small fixed set of items that reads as one horizontal unit: a label next to a value, a button next to another button.

### When not to use it

Row is for a set of siblings whose relationship is primarily horizontal — toolbar actions, header controls, label/value pairs, and similar UI.
If the items should participate in shared columns or form a repeated collection of cards or tiles, use `Grid` instead.
Both preserve DOM order. The difference is layout intent, not whether the items have an order.

### Typical usage

```tsx
<Row gap="control" align="center" justify="between" wrap="when-needed">
  <strong>Projects</strong>
  <Button tone="action">New project</Button>
</Row>
```

### Important behavior

```tsx
<Row gap="element" wrap="when-needed">
```

expresses a behavioral requirement, not a viewport-width requirement:

> Keep the children in a row while there's enough space. Wrap when there isn't.

The alternative — picking a pixel breakpoint at which to wrap — requires guessing where a wrap will look right, for a specific viewport, on a specific day, with specific children. `wrap="when-needed"` instead relies on the browser's own flex-wrap behavior, which already knows the actual available width and the children's actual sizes. `wrap` defaults to `"never"` — a Row does not wrap unless you ask it to.

### Relevant props

```text
gap        — space token
align      — "start" | "center" | "end" | "stretch" | "baseline" (default "stretch")
justify    — "start" | "center" | "end" | "between" | "around" | "evenly" (default "start")
wrap       — "never" | "when-needed" (default "never")
width, grow
```

`Row` currently exposes `width` and `grow`. It does not expose a `height` prop.

### Common mistakes

```tsx
// Avoid: an arbitrary breakpoint for a behavioral requirement
<Row unsafeCss={{ flexWrap: "wrap" }} />

// Prefer: say what should happen when space runs out
<Row wrap="when-needed" />
```

---

# 5. Grid

`Grid` is for collections of items, not for a handful of positioned siblings.

### What it owns

Column layout for a set of same-shape items, in one of two mutually exclusive modes.

### Adaptive Grid

```tsx
<Grid minItemWidth="card" gap="card">
  <ProjectCard />
  <ProjectCard />
  <ProjectCard />
</Grid>
```

`minItemWidth` produces `repeat(auto-fit, minmax(min(token, 100%), 1fr))`. In plain terms: the browser fits as many columns as it can while keeping every item at least `size.card` wide, and stretches them evenly to fill the remaining space. Resize the container and the column count changes on its own — there is no breakpoint prop, and no JavaScript deciding how many columns to render.

### Fixed-column Grid

```tsx
<Grid columns={3} gap="card">
  <ProjectCard />
  <ProjectCard />
  <ProjectCard />
</Grid>
```

`columns` (one of `1`, `2`, `3`, `4`, `5`, `6`, `12`) produces a fixed `repeat(N, 1fr)` template — the same number of columns regardless of available width. Use this when the layout is genuinely a fixed grid (a settings page laid out in two fixed columns, a 12-column composition grid), not a collection that should reflow.

### Why they're mutually exclusive

Adaptive and fixed answer different questions — "how many columns fit?" versus "how many columns should there always be?" — and a single `Grid` can't coherently answer both at once. `minItemWidth` and `columns` are typed so that passing both is a compile error; if that's bypassed at runtime, development builds warn and adaptive mode wins deterministically.

### When to use it

A collection of cards, tiles, or similar items where the right number of columns depends on available width, or a genuinely fixed-column composition.

### When not to use it

A small, ordered set of actions or labels that just happens to wrap — that's `Row`. A single column of items — that's `Stack`.

### Typical usage

See the adaptive and fixed examples above.

### Important behavior

Grid's `align` controls cross-axis alignment of items within their cells (`align-items`), the same vocabulary `Stack` and `Row` use. Grid does not currently expose `justify`, `width`, `height`, `grow`, or `shrink`. Its public sizing surface is narrower than `Box`, `Stack`, and `Row`.

### Relevant props

```text
minItemWidth   — size token (adaptive mode)
columns        — 1 | 2 | 3 | 4 | 5 | 6 | 12 (fixed mode)
gap, rowGap, columnGap — space token
align          — "start" | "center" | "end" | "stretch"
```

### Common mistakes

```tsx
// Avoid: a Row that wraps, standing in for a real collection
<Row gap="card" wrap="when-needed">
  {projects.map((p) => (
    <ProjectCard key={p.id} project={p} />
  ))}
</Row>

// Prefer: Grid, once it's actually a collection
<Grid minItemWidth="card" gap="card">
  {projects.map((p) => (
    <ProjectCard key={p.id} project={p} />
  ))}
</Grid>
```

Both will visually wrap. `Grid` also gives every item a consistent column width, and makes the intent explicit: this is a collection, not an ordered toolbar that happens to run out of room.

---

# 6. ScrollArea

### What it owns

An independently scrolling region.

### When to use it

Any time part of the page should scroll while another part — a header, a sidebar — stays put.

### When not to use it

For the outermost page scroll (the whole document scrolling normally), you don't need `ScrollArea` at all — that's just the browser's default behavior. Reach for it specifically when you need a _contained_ region to scroll independently of its surroundings.

### Typical usage

The common shape is a fixed header above a scrolling body, inside a full-height Stack:

```text
Stack (height="full")
├── header                fixed — does not scroll
└── ScrollArea (grow)     fills the remaining height
      └── content           scrolls inside this region only
```

`height="full"` renders `height: 100%`, and `100%` only means something if an ancestor has a real height to be a percentage _of_. In a typical app, nothing does that by default — the browser doesn't give `html`/`body`/`#root` a height on its own. safe-css deliberately ships no global reset (see [Core rules](../README.md#15-core-rules)), so this is one line of ordinary CSS your application adds once, not something a token or prop can express:

```css
html,
body,
#root {
  height: 100%;
}
```

With that in place, the following is a complete example — copy it into `src/App.tsx` in a normal safe-css app (after `@safe-css/core/styles.css` and the above CSS are in place) and it will scroll:

```tsx
import { Box, ScrollArea, Stack, Sticky } from "@safe-css/core";

const items = Array.from({ length: 30 }, (_, i) => `Item ${i + 1}`);

const App = () => {
  return (
    <Stack height="full">
      <ScrollArea grow>
        <Sticky edge="top">
          <Box as="header" padding="card" background="surface" border="subtle">
            Scrolling list
          </Box>
        </Sticky>

        <Box padding="page">
          <Stack gap="element">
            {items.map((item) => (
              <Box key={item} padding="card" border="subtle">
                {item}
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

What you should see: a header reading "Scrolling list" and 30 items below it. Scrolling moves the items, but the header stays pinned to the top of the scrolling region rather than scrolling away — because the `Sticky` above is nested _inside_ the `ScrollArea`, not outside it. (`Sticky` needs a scrolling ancestor to visibly do anything; see [Sticky](#7-sticky) below.)

### Important behavior

`ScrollArea` is not just `overflow-y: auto`. Inside a flex or grid ancestor, a child's automatic minimum size otherwise prevents overflow from ever kicking in — a well-known CSS trap. `ScrollArea` also sets `min-width: 0; min-height: 0`, which is what actually makes `grow` + scrolling work together reliably. This is exactly the kind of thing a dedicated primitive is for: not hiding `overflow-y: auto`, but encoding the whole pattern so nobody has to rediscover the min-size problem project after project.

### Relevant props

```text
direction    — "vertical" | "horizontal" | "both" (default "vertical")
overscroll   — "auto" | "contain" (default "auto")
grow
```

Use `overscroll="contain"` when you don't want scrolling inside this region to chain into scrolling the page behind it — a common need for panels and modals-in-waiting.

### Common mistakes

```tsx
// Avoid
<Box unsafeCss={{ overflowY: "auto" }}>{content}</Box>

// Prefer
<ScrollArea>{content}</ScrollArea>
```

The `unsafeCss` version also skips the min-size fix above, so it's easy to end up with a region that silently doesn't scroll at all when nested inside a flex layout — not just a stylistic downgrade, a real, non-obvious bug.

---

# 7. Sticky

### What it owns

An element that stays attached to an edge of its scrolling container while that container scrolls.

### When to use it

A toolbar or header that should remain visible above scrolling content.

### When not to use it

If the element doesn't need to stay attached while something scrolls — it just needs to be visually near another element — that's `Overlay`, not `Sticky`.

### Typical usage

```text
ScrollArea (scrolls)
├── Sticky (edge="top")   stays pinned to the top of ScrollArea
│     └── header
└── page content            scrolls underneath the sticky header
```

`Sticky` only produces a visible effect when it's inside something that actually scrolls — with no scrolling ancestor, there's nothing for it to stick relative to. The following is a complete, copy-paste example. It needs the same one-time bounded-height CSS as the [ScrollArea](#6-scrollarea) example above (`html`, `body`, `#root` set to `height: 100%` in your own global stylesheet — not part of safe-css):

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

What you should see: a header reading "Projects" that stays fixed at the top while the 20 project rows beneath it scroll past underneath it.

### Important behavior

`Sticky` replaces `position: sticky; top: 0; z-index: ...` with two theme-backed decisions instead of two raw numbers: how far from the edge (`offset`, a space token) and how high in the stacking order (`layer`, a layer token). Because both are tokens, a sticky header's offset and stacking position update automatically if the underlying token changes, the same way any other design decision does. `Sticky` also uses logical edges internally (the block-start/block-end side, not literal "top"/"bottom" pixels), keeping it consistent with the rest of the framework's writing-direction-aware primitives.

### Relevant props

```text
edge      — "top" | "bottom" (default "top")
offset    — space token (default "none")
layer     — layer token (default "sticky")
```

### Common mistakes

```tsx
// Avoid
<Box unsafeCss={{ position: "sticky", top: 0, zIndex: 10 }} />

// Prefer
<Sticky edge="top" />
```

Beyond being shorter, the `Sticky` version ties the offset and stacking order to the theme instead of a number that has to be kept in sync by hand.

---

# 8. Overlay

`Overlay` is less obvious than the others because it's really two components working together: `Overlay` (the positioning context) and `Overlay.Item` (the thing positioned relative to it).

### What it owns

Positioning one element relative to another — a badge on an avatar, an indicator on an icon — without either side writing `position: relative`/`position: absolute` by hand.

`Overlay` and `Overlay.Item` own **where** something sits, and nothing else. They have no visual props of their own — border, background, radius, padding, and color still belong to whatever's inside them, typically `Box`:

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

Positioning and appearance stay separate: `Overlay`/`Overlay.Item` decide where each element sits relative to the other; `Box` decides what each one looks like.

### When to use it

A small indicator that should sit at a corner or edge of another element: a status dot, an unread-count badge, a notification marker.

### When not to use it

If the two elements should sit side by side in normal flow, that's `Row`, not `Overlay`. Overlay is specifically for one element visually anchored _on top of_ another.

### Typical usage

An avatar with a status dot:

```tsx
<Overlay>
  <Avatar initials="TF" />
  <Overlay.Item anchor="top-end" placement="edge">
    <StatusIndicator tone="action" />
  </Overlay.Item>
</Overlay>
```

An icon with a notification badge:

```tsx
<Overlay>
  <BellIcon />
  <Overlay.Item anchor="top-end" placement="edge">
    <NotificationBadge count={3} />
  </Overlay.Item>
</Overlay>
```

### Important behavior

`Overlay` establishes the positioning context; `Overlay.Item` is positioned against it by `anchor`, one of nine logical grid positions — never by raw `top`/`left`/`transform` values you compute yourself:

```text
top-start      top-center      top-end

center-start      center       center-end

bottom-start   bottom-center   bottom-end
```

`placement` controls how far "on top of" the corner the item sits:

```text
placement="inside"   the item sits flush inside the anchor corner/edge
placement="edge"     the item straddles the anchor corner/edge itself
                      (the classic notification-dot look)
```

Both examples above use `placement="edge"`.

Anchors are expressed in logical terms (inline-start/end, block-start/end), and the corner-placement transform's sign flips automatically under `dir="rtl"`. An `anchor="top-end"` item stays in the correct visual corner whether the page is left-to-right or right-to-left, without any extra work.

**Independent axis offsets.** `offset` is a shorthand that sets both non-centered axes at once. `inlineOffset`/`blockOffset` each independently override it for their own axis — the other axis still falls back to `offset`, then `"none"`:

```tsx
// Pull the badge in slightly more on the inline axis than the block axis.
<Overlay.Item anchor="top-end" placement="edge" inlineOffset="element" blockOffset="control">
  <StatusIndicator />
</Overlay.Item>
```

These are deliberately named `inlineOffset`/`blockOffset` — logical, not `horizontalOffset`/`verticalOffset` — for the same writing-direction-independence reason `anchor` itself is logical.

Some anchors center an axis at a fixed `50%` instead of offsetting from an edge — `top-center`/`bottom-center` center the inline axis, `center-start`/`center-end` center the block axis, `center` centers both. A centered axis never consumes an offset (including the `offset` shorthand); passing `inlineOffset`/`blockOffset` explicitly for an anchor that centers that exact axis has no effect and logs a one-time development warning rather than doing anything silently:

```tsx
// Inline axis stays centered at 50%; only the block offset applies.
<Overlay.Item anchor="top-center" blockOffset="card">
  <Toast />
</Overlay.Item>
```

### Relevant props

`Overlay` itself has no layout props of its own — it only establishes the positioning context.

`Overlay.Item`:

```text
anchor         — one of the 9 positions (required)
placement      — "inside" | "edge" (default "inside")
offset         — space token (default "none") - shorthand for both axes
inlineOffset   — space token - overrides offset on the inline axis only
blockOffset    — space token - overrides offset on the block axis only
layer          — layer token (default "overlay")
```

### Common mistakes

```tsx
// Avoid
<Box unsafeCss={{ position: "relative" }}>
  <Avatar />
  <Box unsafeCss={{ position: "absolute", top: -2, right: -2 }}>
    <StatusIndicator />
  </Box>
</Box>

// Prefer
<Overlay>
  <Avatar />
  <Overlay.Item anchor="top-end" placement="edge">
    <StatusIndicator />
  </Overlay.Item>
</Overlay>
```

The hand-rolled version also silently breaks under `dir="rtl"` — the badge stays on the visual right instead of following the corner — since raw `top`/`right` values don't participate in logical-property flipping the way `Overlay`'s anchors do.

---

# 9. Choosing between similar-looking primitives

A few decisions come up often enough to call out directly.

**Box vs Stack** — these often compose rather than compete. `Box` owns the appearance and sizing of a surface; `Stack` owns vertical relationships between siblings. A card can therefore be a `Box` containing a `Stack`. Choose based on which responsibility you need, not how many children the element has.

**Stack vs Row** — direction. Vertical reading order is `Stack`; horizontal is `Row`. There's no `direction` prop on either — the primitive itself is the direction.

**Row vs Grid** — use `Row` when the relationship is primarily horizontal and each child mostly sizes from its own content. Use `Grid` when the items form a collection and should participate in shared columns or tracks. Both preserve DOM order; the difference is layout responsibility.

**Box + overflow vs ScrollArea** — `Box` doesn't have an `overflow` prop at all; reaching for it via `unsafeCss` skips the flex/grid min-size fix that makes scrolling actually work in context. Use `ScrollArea`.

**Box + position vs Sticky** — `position: sticky` by hand means picking a raw offset and z-index. `Sticky` ties both to the theme.

**Box + absolute positioning vs Overlay** — hand-rolled `position: relative`/`absolute`/`top`/`right` breaks under RTL and has to be recomputed per anchor. `Overlay` encodes the geometry once, correctly, for all nine anchors.

---

# The main-container pattern

The most common question from developers new to safe-css: how do I get a normal, centered, responsive main content container — the thing almost every app shell has, with a max width and horizontal padding that scales down on small screens?

There is no `Container` primitive for this. It's a composition of two primitives already documented above:

```tsx
<Stack width="full" align="center">
  <Box width="full" maxWidth="content" paddingInline="page">
    {children}
  </Box>
</Stack>
```

`size.content` (the `maxWidth` token) caps the container's width on large screens; `space.page` (the `paddingInline` token) is a responsive `clamp()` that gives the content readable breathing room on small screens without needing a separate breakpoint prop. `Stack align="center"` centers the (narrower, once `maxWidth` kicks in) `Box` within the full-width row it sits in.

This is deliberately a composition, not a primitive, and that's not an oversight: safe-css adds a new primitive when there is real _behavior_ or a _correctness property_ to own — the way `Sticky` owns edge-offset/z-index correctness, or `Overlay` owns anchor geometry and RTL-safe transforms. A centered max-width container is two existing primitives with two token-driven props; there is no behavior left to own, no correctness pitfall a hand-written version would get wrong, and no CSS specificity or scoping issue only a dedicated component could solve. Adding `Container` here would shorten one line at the cost of a third way to express "centered, capped-width column" alongside `Box`+`Stack` — see [Core Concepts §9](core-concepts.md#9-behavior-belongs-to-specialized-primitives) for the general rule this follows.

---

# 10. A composed example

Layout primitives are meant to compose, not compete. This is the shape of a real application shell, built entirely from the primitives above:

```tsx
function Shell() {
  return (
    <Stack height="full">
      <ScrollArea grow>
        <Sticky edge="top">
          <Box as="header" padding="card" background="surface" border="subtle">
            <Row align="center" justify="between">
              <strong>Projects</strong>

              <Overlay>
                <Avatar initials="TF" />

                <Overlay.Item anchor="top-end" placement="edge">
                  <StatusIndicator tone="action" />
                </Overlay.Item>
              </Overlay>
            </Row>
          </Box>
        </Sticky>

        <Box padding="page">
          <Grid minItemWidth="card" gap="card">
            <ProjectCard />
            <ProjectCard />
            <ProjectCard />
          </Grid>
        </Box>
      </ScrollArea>
    </Stack>
  );
}
```

Each primitive owns exactly one thing here:

```text
Stack      — the full-height shell
ScrollArea — the independently scrolling region
Sticky     — keeps the header attached to the top of that scrolling region
Box        — the header surface and page padding
Row        — the header's horizontal relationship
Overlay    — positions the status badge relative to the avatar
Grid       — the adaptive card collection
```

No primitive is doing another primitive's job, and nothing here was built with `unsafeCss`.

---

# 11. Common mistakes, collected

```text
Using a child's own margin for spacing that belongs to the parent's gap.

Reaching for Box + unsafeCss for a behavior another primitive already owns
(scrolling, sticky, overlay positioning, display/flex properties).

Using a wrapping Row for what is really a collection - use Grid instead.

Inventing a pixel breakpoint for a requirement that's actually intrinsic
(wrap="when-needed", or an adaptive Grid).

Putting overflow on the wrong element instead of wrapping the scrolling
region itself in ScrollArea.

Reconstructing overlay positioning by hand (position: relative/absolute,
manual top/right offsets) instead of using Overlay's anchors - which also
tends to silently break under dir="rtl".
```

---

# 12. Layout decisions are visible in the Inspector

Every primitive writes down which one it is. Inspecting a rendered element in development shows this directly:

```text
Primitive
Stack
```

along with the tokens it used and, for a recipe, which recipe produced it. The value of choosing the correct primitive isn't only the CSS it generates — it's that the decision stays visible later, when you or someone else is looking at the rendered page and asking why it's laid out the way it is. `docs/core-concepts.md` covers the Inspector and Impact Analysis in more depth; this is only meant to reinforce why the choice you make in this document matters beyond the moment you write it.

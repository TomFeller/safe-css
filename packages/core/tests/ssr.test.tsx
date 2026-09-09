// @vitest-environment node
//
// This file runs in a plain Node environment - no jsdom, so `window` and
// `document` are genuinely undefined. If any component accidentally reached
// for a browser global during render, this file would throw a
// ReferenceError instead of silently passing under jsdom.
import { createRef } from "react";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import {
  Box,
  Grid,
  Overlay,
  Row,
  ScrollArea,
  Stack,
  Sticky,
  ThemeProvider,
  createTheme,
  defineRecipe,
} from "../src";

// Defined once at module scope - recipes are meant to be created outside
// render, same as any other component definition.
const Card = defineRecipe(Box, {
  name: "Card",
  base: { padding: "card", radius: "card", background: "surface" },
  variants: { tone: { raised: { shadow: "raised" } } },
});

function Dashboard() {
  return (
    <ThemeProvider theme={createTheme()}>
      <Stack height="full">
        <Sticky edge="top">
          <Box padding="card" background="surface" border="subtle">
            Header
          </Box>
        </Sticky>
        <ScrollArea grow>
          <Stack gap="section">
            <Row gap="control" align="center" justify="between" wrap="when-needed">
              <span>Title</span>
              <span>Actions</span>
            </Row>
            <Grid minItemWidth="card" gap="card">
              <Card tone="raised">One</Card>
              <Card>Two</Card>
            </Grid>
            <Overlay>
              <Box width="control" height="control" radius="pill" background="action" />
              <Overlay.Item anchor="top-end" placement="edge">
                <Box radius="pill" background="danger" />
              </Overlay.Item>
            </Overlay>
          </Stack>
        </ScrollArea>
      </Stack>
    </ThemeProvider>
  );
}

describe("SSR", () => {
  it("renders a full dashboard-shaped tree to static markup without throwing", () => {
    expect(() => renderToStaticMarkup(<Dashboard />)).not.toThrow();
  });

  it("produces deterministic output across repeated renders (same input -> same markup)", () => {
    const first = renderToStaticMarkup(<Dashboard />);
    const second = renderToStaticMarkup(<Dashboard />);
    expect(first).toBe(second);
  });

  it("embeds theme CSS variables inline, so the server output already carries resolved values", () => {
    const html = renderToStaticMarkup(<Dashboard />);
    expect(html).toContain("--fw-space-card:16px");
    expect(html).toContain("--fw-color-surface:#ffffff");
  });

  it("emits var() references (not literal values) for token-driven component styles", () => {
    const html = renderToStaticMarkup(<Dashboard />);
    expect(html).toContain("var(--fw-radius-card)");
  });
});

describe("SSR: Overlay.Item independent axis offsets", () => {
  it("produces deterministic output for independent inlineOffset/blockOffset, including on a centered axis", () => {
    const render = () =>
      renderToStaticMarkup(
        <ThemeProvider theme={createTheme()}>
          <Overlay>
            <Overlay.Item anchor="top-center" inlineOffset="card" blockOffset="element">
              <Box background="action" />
            </Overlay.Item>
          </Overlay>
        </ThemeProvider>,
      );
    expect(render()).toBe(render());
  });

  it("emits the resolved block offset and the centered-axis 50% inset, with no fabricated inline offset dependency", () => {
    const html = renderToStaticMarkup(
      <ThemeProvider theme={createTheme()}>
        <Overlay>
          <Overlay.Item anchor="top-center" blockOffset="card">
            <Box background="action" />
          </Overlay.Item>
        </Overlay>
      </ThemeProvider>,
    );
    expect(html).toContain("var(--fw-space-card)");
    expect(html).toContain("50%");
    expect(html).toContain('data-fw-tokens="space.card layer.overlay"');
  });
});

// A recipe with interactive states, defined once at module scope like Card
// above - this is the whole point being verified: nothing about states
// requires `window`/`document`, since the entire bridge is static inline
// style plus a stylesheet the browser already has - no client JS runs
// before a `:hover`/`:focus-visible`/`:active` style is correct.
const Button = defineRecipe(Box, {
  name: "Button",
  base: { as: "button", padding: "control", background: "action", color: "surface" },
  variants: { tone: { secondary: { background: "surface", color: "text" } } },
  states: {
    hover: { background: "surfaceRaised" },
    focusVisible: { border: "strong" },
    active: { background: "danger" },
  },
});

describe("SSR: interactive states", () => {
  it("renders a recipe with states to static markup without throwing, and without needing window/document", () => {
    expect(() =>
      renderToStaticMarkup(
        <ThemeProvider theme={createTheme()}>
          <Button>Go</Button>
        </ThemeProvider>,
      ),
    ).not.toThrow();
  });

  it("produces deterministic output across repeated renders", () => {
    const render = () =>
      renderToStaticMarkup(
        <ThemeProvider theme={createTheme()}>
          <Button tone="secondary">Go</Button>
        </ThemeProvider>,
      );
    expect(render()).toBe(render());
  });

  it("emits the bridge's nested var() fallback expression and every declared state's -value custom property in the static markup", () => {
    const html = renderToStaticMarkup(
      <ThemeProvider theme={createTheme()}>
        <Button>Go</Button>
      </ThemeProvider>,
    );
    // `Button` only declares `focusVisible` for `border`, not `background`
    // (see the recipe definition above) - per the "only include state
    // layers actually declared for that property" requirement, the
    // background fallback chain correctly includes just hover and active,
    // skipping a focusVisible layer that was never declared for background.
    expect(html).toContain(
      "var(--fw-state-active-background, var(--fw-state-hover-background, var(--fw-color-action)))",
    );
    // `border` has no base/variant/instance resting value at all (only
    // `focusVisible.border` is declared) - the innermost fallback is
    // `unset`, not `initial`, so a state-only property doesn't force an
    // inherited property like `color` to reset to its CSS-spec default at
    // rest (see stateBridge.ts's `applyStateBridge`).
    expect(html).toContain("var(--fw-state-focus-visible-border, unset)");
    expect(html).toContain("--fw-state-hover-background-value:var(--fw-color-surfaceRaised)");
    expect(html).toContain("--fw-state-focus-visible-border-value:var(--fw-border-strong)");
    expect(html).toContain("--fw-state-active-background-value:var(--fw-color-danger)");
  });

  it("an instance override renders a plain, unbridged value in static markup, deterministically", () => {
    const html = renderToStaticMarkup(
      <ThemeProvider theme={createTheme()}>
        <Button background="textMuted">Go</Button>
      </ThemeProvider>,
    );
    expect(html).toContain("background-color:var(--fw-color-textMuted)");
    expect(html).not.toContain("--fw-state-hover-background-value");
  });

  it("an explicit ref does not change the bridge output, and output stays deterministic", () => {
    // A ref is not a styling decision - passing one must not change SSR
    // output at all, and none of this requires a real DOM node to exist.
    const ref = createRef<HTMLButtonElement>();
    const withRef = () =>
      renderToStaticMarkup(
        <ThemeProvider theme={createTheme()}>
          <Button ref={ref}>Go</Button>
        </ThemeProvider>,
      );
    const withoutRef = renderToStaticMarkup(
      <ThemeProvider theme={createTheme()}>
        <Button>Go</Button>
      </ThemeProvider>,
    );
    expect(withRef()).toBe(withRef());
    expect(withRef()).toBe(withoutRef);
  });
});

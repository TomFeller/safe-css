// @vitest-environment node
//
// This file runs in a plain Node environment - no jsdom, so `window` and
// `document` are genuinely undefined. If any component accidentally reached
// for a browser global during render, this file would throw a
// ReferenceError instead of silently passing under jsdom.
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

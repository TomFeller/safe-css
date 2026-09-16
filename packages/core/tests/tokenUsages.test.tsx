import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
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
import { debugAttributes } from "../src/primitives/internal/debugAttributes";
import { renderWithTheme } from "./test-utils";

/**
 * `data-fw-token-usages` records exact token -> rendered-CSS-property
 * provenance, recorded by each primitive at the same call site that
 * resolves a token into a style value - never reverse-engineered later from
 * `element.style`, which is unreliable for shorthand CSS properties (the bug
 * this metadata exists to fix; see the Inspector's `inspection/inspectElement.ts`).
 * See `primitives/internal/debugAttributes.ts` and `internal/tokenUsage.ts`.
 */
describe("data-fw-token-usages: Box", () => {
  it("padding -> padding", () => {
    const { getByTestId } = renderWithTheme(<Box data-testid="el" padding="card" />);
    expect(getByTestId("el").getAttribute("data-fw-token-usages")).toBe("space.card|padding");
  });

  it("paddingInline -> padding-inline, paddingBlock -> padding-block", () => {
    const { getByTestId } = renderWithTheme(
      <Box data-testid="el" paddingInline="card" paddingBlock="card" />,
    );
    expect(getByTestId("el").getAttribute("data-fw-token-usages")).toBe(
      "space.card|padding-inline space.card|padding-block",
    );
  });

  it("radius -> border-radius", () => {
    const { getByTestId } = renderWithTheme(<Box data-testid="el" radius="card" />);
    expect(getByTestId("el").getAttribute("data-fw-token-usages")).toBe(
      "radius.card|border-radius",
    );
  });

  it("border -> border", () => {
    const { getByTestId } = renderWithTheme(<Box data-testid="el" border="subtle" />);
    expect(getByTestId("el").getAttribute("data-fw-token-usages")).toBe("border.subtle|border");
  });

  it("background -> background-color", () => {
    const { getByTestId } = renderWithTheme(<Box data-testid="el" background="surface" />);
    expect(getByTestId("el").getAttribute("data-fw-token-usages")).toBe(
      "colors.surface|background-color",
    );
  });

  it("color -> color", () => {
    const { getByTestId } = renderWithTheme(<Box data-testid="el" color="surface" />);
    expect(getByTestId("el").getAttribute("data-fw-token-usages")).toBe("colors.surface|color");
  });

  it("shadow -> box-shadow", () => {
    const { getByTestId } = renderWithTheme(<Box data-testid="el" shadow="raised" />);
    expect(getByTestId("el").getAttribute("data-fw-token-usages")).toBe("shadow.raised|box-shadow");
  });

  it("width/height -> width/height, min/max -> min-*/max-*", () => {
    const { getByTestId } = renderWithTheme(
      <Box
        data-testid="el"
        width="card"
        height="card"
        minWidth="card"
        maxWidth="card"
        minHeight="card"
        maxHeight="card"
      />,
    );
    expect(getByTestId("el").getAttribute("data-fw-token-usages")).toBe(
      "size.card|width size.card|height size.card|min-width size.card|max-width size.card|min-height size.card|max-height",
    );
  });

  it("multiple props/token usages combine, in declaration order", () => {
    const { getByTestId } = renderWithTheme(
      <Box data-testid="el" padding="card" radius="card" border="subtle" background="surface" />,
    );
    expect(getByTestId("el").getAttribute("data-fw-token-usages")).toBe(
      "space.card|padding colors.surface|background-color radius.card|border-radius border.subtle|border",
    );
  });

  it('border="none" creates no fake token usage', () => {
    const { getByTestId } = renderWithTheme(<Box data-testid="el" border="none" />);
    expect(getByTestId("el").hasAttribute("data-fw-token-usages")).toBe(false);
  });

  it('shadow="none" creates no fake token usage', () => {
    const { getByTestId } = renderWithTheme(<Box data-testid="el" shadow="none" />);
    expect(getByTestId("el").hasAttribute("data-fw-token-usages")).toBe(false);
  });

  it("a Box with no token-backed props at all omits the attribute entirely", () => {
    const { getByTestId } = renderWithTheme(<Box data-testid="el" grow />);
    expect(getByTestId("el").hasAttribute("data-fw-token-usages")).toBe(false);
  });
});

describe("data-fw-token-usages: interactive states", () => {
  it("a state-only declaration (no resting value for that property) records no ordinary token usage", () => {
    const Button = defineRecipe(Box, {
      name: "Button",
      states: { hover: { background: "surfaceRaised" } },
    });
    const { getByTestId } = renderWithTheme(<Button data-testid="el">Go</Button>);
    expect(getByTestId("el").hasAttribute("data-fw-token-usages")).toBe(false);
  });

  it("a token used both by resting styling and by a state records only its ordinary usage", () => {
    const Button = defineRecipe(Box, {
      name: "Button",
      base: { background: "action" },
      states: { hover: { background: "surfaceRaised" } },
    });
    const { getByTestId } = renderWithTheme(<Button data-testid="el">Go</Button>);
    expect(getByTestId("el").getAttribute("data-fw-token-usages")).toBe(
      "colors.action|background-color",
    );
  });
});

describe("data-fw-token-usages: Stack / Row / Grid", () => {
  it("Stack: gap -> gap, width/height -> width/height", () => {
    const { getByTestId } = renderWithTheme(
      <Stack data-testid="el" gap="card" width="card" height="card" />,
    );
    expect(getByTestId("el").getAttribute("data-fw-token-usages")).toBe(
      "space.card|gap size.card|width size.card|height",
    );
  });

  it("Row: gap -> gap, width -> width", () => {
    const { getByTestId } = renderWithTheme(<Row data-testid="el" gap="card" width="card" />);
    expect(getByTestId("el").getAttribute("data-fw-token-usages")).toBe(
      "space.card|gap size.card|width",
    );
  });

  it("Grid: gap/rowGap/columnGap -> gap/row-gap/column-gap", () => {
    const { getByTestId } = renderWithTheme(
      <Grid data-testid="el" gap="card" rowGap="card" columnGap="card" />,
    );
    expect(getByTestId("el").getAttribute("data-fw-token-usages")).toBe(
      "space.card|gap space.card|row-gap space.card|column-gap",
    );
  });

  it("Grid: minItemWidth -> grid-template-columns", () => {
    const { getByTestId } = renderWithTheme(<Grid data-testid="el" minItemWidth="card" />);
    expect(getByTestId("el").getAttribute("data-fw-token-usages")).toBe(
      "size.card|grid-template-columns",
    );
  });
});

describe("data-fw-token-usages: ScrollArea", () => {
  it("never emits the attribute - ScrollArea has no token-backed props", () => {
    const { getByTestId } = renderWithTheme(<ScrollArea data-testid="el" direction="both" grow />);
    expect(getByTestId("el").hasAttribute("data-fw-token-usages")).toBe(false);
  });
});

describe("data-fw-token-usages: Sticky", () => {
  it("edge='top' -> inset-block-start; layer -> z-index", () => {
    const { getByTestId } = renderWithTheme(
      <Sticky data-testid="el" edge="top" offset="card" layer="sticky" />,
    );
    expect(getByTestId("el").getAttribute("data-fw-token-usages")).toBe(
      "space.card|inset-block-start layer.sticky|z-index",
    );
  });

  it("edge='bottom' -> inset-block-end", () => {
    const { getByTestId } = renderWithTheme(
      <Sticky data-testid="el" edge="bottom" offset="card" />,
    );
    expect(getByTestId("el").getAttribute("data-fw-token-usages")).toContain(
      "space.card|inset-block-end",
    );
  });
});

describe("data-fw-token-usages: Overlay.Item", () => {
  it("top-start: inline/block offsets resolve to inset-inline-start/inset-block-start; layer -> z-index", () => {
    const { getByTestId } = renderWithTheme(
      <Overlay>
        <Overlay.Item data-testid="el" anchor="top-start" offset="card" layer="sticky" />
      </Overlay>,
    );
    expect(getByTestId("el").getAttribute("data-fw-token-usages")).toBe(
      "space.card|inset-inline-start space.card|inset-block-start layer.sticky|z-index",
    );
  });

  it("bottom-end: inline/block offsets resolve to inset-inline-end/inset-block-end", () => {
    const { getByTestId } = renderWithTheme(
      <Overlay>
        <Overlay.Item data-testid="el" anchor="bottom-end" offset="card" />
      </Overlay>,
    );
    const usages = getByTestId("el").getAttribute("data-fw-token-usages") ?? "";
    expect(usages).toContain("space.card|inset-inline-end");
    expect(usages).toContain("space.card|inset-block-end");
  });

  it("a centered axis records no phantom token usage for that axis, even when offset is given", () => {
    const { getByTestId } = renderWithTheme(
      <Overlay>
        <Overlay.Item data-testid="el" anchor="center" offset="card" />
      </Overlay>,
    );
    const usages = getByTestId("el").getAttribute("data-fw-token-usages")?.split(" ") ?? [];
    expect(usages.some((u) => u.startsWith("space."))).toBe(false);
    expect(usages).toEqual(["layer.overlay|z-index"]);
  });
});

describe("data-fw-token-usages: production", () => {
  let originalEnv: string | undefined;

  beforeEach(() => {
    originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  it("is absent in production, even when the underlying styling is fully applied", () => {
    const { getByTestId } = render(
      <ThemeProvider theme={createTheme()}>
        <Box data-testid="el" padding="card" border="subtle" background="surface" />
      </ThemeProvider>,
    );
    const el = getByTestId("el");
    expect(el.hasAttribute("data-fw-token-usages")).toBe(false);
    expect(el.style.padding).toBe("var(--fw-space-card)");
  });
});

describe("data-fw-token-usages: reserved-attribute collision protection", () => {
  it("warns and the framework's own value wins when a consumer passes data-fw-token-usages directly", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { getByTestId } = renderWithTheme(
      (
        <Box
          data-testid="el"
          padding="card"
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- deliberately bypassing the public prop type for this test
          {...({ "data-fw-token-usages": "fake.token|fake-property" } as any)}
        />
      ) as never,
    );
    const el = getByTestId("el");
    expect(el.getAttribute("data-fw-token-usages")).toBe("space.card|padding");
    expect(warn).toHaveBeenCalled();
    const message = warn.mock.calls.map((c) => c[0] as string).find((m) => m.includes("Box"));
    expect(message).toContain("data-fw-token-usages");
    warn.mockRestore();
  });
});

describe("data-fw-token-usages: deduplication (debugAttributes unit)", () => {
  it("collapses duplicate identical token/property usages into one entry", () => {
    const attrs = debugAttributes(
      {
        primitive: "Box",
        tokenUsages: ["space.card|padding", "space.card|padding", "space.card|padding-inline"],
      },
      {},
      "warn",
    );
    expect(attrs["data-fw-token-usages"]).toBe("space.card|padding space.card|padding-inline");
  });
});

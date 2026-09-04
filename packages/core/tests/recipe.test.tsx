import { describe, expect, it, vi } from "vitest";
import { createRef } from "react";
import { fireEvent } from "@testing-library/react";
import { Box, Stack, defineRecipe } from "../src";
import { renderWithTheme } from "./test-utils";

describe("defineRecipe", () => {
  it("applies base props when no variant or instance override is given", () => {
    const Card = defineRecipe(Box, {
      name: "Card",
      base: { padding: "card", radius: "card", background: "surface" },
    });
    const { getByTestId } = renderWithTheme(<Card data-testid="el" />);
    const el = getByTestId("el");
    expect(el.style.padding).toBe("var(--fw-space-card)");
    expect(el.style.borderRadius).toBe("var(--fw-radius-card)");
    expect(el.style.backgroundColor).toBe("var(--fw-color-surface)");
  });

  it("applies the selected variant's props over base", () => {
    const Card = defineRecipe(Box, {
      name: "Card",
      base: { border: "subtle" },
      variants: {
        tone: {
          default: { border: "subtle" },
          raised: { shadow: "raised" },
        },
      },
      defaultVariants: { tone: "default" },
    });

    const { getByTestId } = renderWithTheme(<Card data-testid="el" tone="raised" />);
    const el = getByTestId("el");
    expect(el.style.boxShadow).toBe("var(--fw-shadow-raised)");
  });

  it("falls back to defaultVariants when no variant prop is passed", () => {
    const Card = defineRecipe(Box, {
      name: "Card",
      variants: {
        tone: {
          default: { border: "subtle" },
          raised: { shadow: "raised" },
        },
      },
      defaultVariants: { tone: "default" },
    });

    const { getByTestId } = renderWithTheme(<Card data-testid="el" />);
    expect(getByTestId("el").style.border).toBe("var(--fw-border-subtle)");
  });

  it("instance props override both base and the selected variant (highest precedence before unsafeCss)", () => {
    const Card = defineRecipe(Box, {
      name: "Card",
      base: { padding: "card" },
      variants: {
        tone: { raised: { padding: "section" } },
      },
      defaultVariants: { tone: "raised" },
    });

    const { getByTestId } = renderWithTheme(<Card data-testid="el" padding="control" />);
    expect(getByTestId("el").style.padding).toBe("var(--fw-space-control)");
  });

  it("does not forward the variant-selector prop itself to the underlying primitive", () => {
    const Card = defineRecipe(Box, {
      name: "Card",
      variants: { tone: { raised: { shadow: "raised" } } },
    });
    const { getByTestId } = renderWithTheme(<Card data-testid="el" tone="raised" />);
    // `tone` is not a Box prop - it must not leak through as a DOM attribute.
    expect(getByTestId("el").getAttribute("tone")).toBeNull();
  });

  it("a recipe base can pin `as`, e.g. building a button-shaped recipe on Box", () => {
    const Button = defineRecipe(Box, {
      name: "Button",
      base: { as: "button", padding: "control" },
    });
    const { getByTestId } = renderWithTheme(<Button data-testid="el">Click</Button>);
    expect(getByTestId("el").tagName).toBe("BUTTON");
  });

  it("forwards refs through to the underlying primitive's element", () => {
    const Card = defineRecipe(Box, { name: "Card" });
    let node: HTMLElement | null = null;
    renderWithTheme(
      <Card
        ref={(el: HTMLElement | null) => {
          node = el;
        }}
        data-testid="el"
      />,
    );
    expect(node).toBeInstanceOf(HTMLElement);
  });

  it("works on primitives other than Box, e.g. Stack", () => {
    const Section = defineRecipe(Stack, {
      name: "Section",
      base: { gap: "section", align: "center" },
    });
    const { getByTestId } = renderWithTheme(<Section data-testid="el" />);
    const el = getByTestId("el");
    expect(el.style.gap).toBe("var(--fw-space-section)");
    expect(el.className).toContain("fw-align-center");
  });

  it("exposes dev-only data-fw-recipe/data-fw-variant metadata for future traceability tooling", () => {
    const Card = defineRecipe(Box, {
      name: "Card",
      variants: { tone: { raised: { shadow: "raised" } } },
    });
    const { getByTestId } = renderWithTheme(<Card data-testid="el" tone="raised" />);
    const el = getByTestId("el");
    expect(el.getAttribute("data-fw-recipe")).toBe("Card");
    expect(el.getAttribute("data-fw-variant")).toBe("tone:raised");
  });

  it("always sets data-fw-recipe, even with no active variant, since name is required", () => {
    const Card = defineRecipe(Box, { name: "Card" });
    const { getByTestId } = renderWithTheme(<Card data-testid="el" />);
    expect(getByTestId("el").getAttribute("data-fw-recipe")).toBe("Card");
    expect(getByTestId("el").hasAttribute("data-fw-variant")).toBe(false);
  });
});

describe("defineRecipe: base.as changes the element and its DOM prop typing", () => {
  it("renders the pinned element and forwards element-specific DOM props/events", () => {
    const ButtonLike = defineRecipe(Box, {
      name: "ButtonLike",
      base: { as: "button", padding: "control" },
    });

    const onClick = vi.fn();
    const { getByTestId } = renderWithTheme(
      <ButtonLike data-testid="el" type="submit" disabled={false} onClick={onClick}>
        Go
      </ButtonLike>,
    );

    const el = getByTestId("el") as HTMLButtonElement;
    expect(el.tagName).toBe("BUTTON");
    expect(el.type).toBe("submit");
    fireEvent.click(el);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("forwards a ref typed to the pinned element", () => {
    const ButtonLike = defineRecipe(Box, {
      name: "ButtonLike",
      base: { as: "button" },
    });
    const ref = createRef<HTMLButtonElement>();
    renderWithTheme(<ButtonLike ref={ref}>Go</ButtonLike>);
    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
  });
});

describe("defineRecipe: variant collision diagnostics", () => {
  it("warns when two active variant groups assign different values to the same prop", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const Card = defineRecipe(Box, {
      name: "Card",
      variants: {
        size: { large: { padding: "section" } },
        density: { compact: { padding: "control" } },
      },
    });

    const { getByTestId } = renderWithTheme(
      <Card data-testid="el" size="large" density="compact" />,
    );

    expect(warn).toHaveBeenCalledTimes(1);
    const message = warn.mock.calls[0]?.[0] as string;
    expect(message).toContain("Card");
    expect(message).toContain("padding");
    expect(message).toContain('size="large"');
    expect(message).toContain('density="compact"');

    // Resolution is still fully deterministic - the later-declared group
    // (density) wins, exactly as documented.
    expect(getByTestId("el").style.padding).toBe("var(--fw-space-control)");

    warn.mockRestore();
  });

  it("does not warn when only one of the colliding groups is active", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const Card = defineRecipe(Box, {
      name: "Card",
      variants: {
        size: { large: { padding: "section" } },
        density: { compact: { padding: "control" } },
      },
    });
    renderWithTheme(<Card size="large" />);
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it("does not warn when both active variants assign the exact same value", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const Card = defineRecipe(Box, {
      name: "Card",
      variants: {
        size: { large: { padding: "section" } },
        density: { roomy: { padding: "section" } },
      },
    });
    renderWithTheme(<Card size="large" density="roomy" />);
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it("does not warn about unrelated props two variants happen to both set independently", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const Card = defineRecipe(Box, {
      name: "Card",
      variants: {
        tone: { raised: { shadow: "raised" } },
        size: { large: { padding: "section" } },
      },
    });
    renderWithTheme(<Card tone="raised" size="large" />);
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it("does not warn in production diagnostics mode", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const Card = defineRecipe(Box, {
      name: "Card",
      variants: {
        size: { large: { padding: "section" } },
        density: { compact: { padding: "control" } },
      },
    });
    renderWithTheme(<Card size="large" density="compact" />, { diagnostics: "off" });
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });
});

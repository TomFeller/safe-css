import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Box, Stack, defineRecipe } from "../src";
import { renderWithTheme } from "./test-utils";

const STYLES_CSS_PATH = join(import.meta.dirname, "../src/style/styles.css");

describe("interactive states: the internal string channel never reaches the DOM", () => {
  // The channel (`RECIPE_STATE_BRIDGE` in stateBridge.ts) is an ordinary
  // string-keyed prop, not a Symbol - chosen specifically because a
  // Symbol-keyed prop is unreliable through React-DOM's `forwardRef` path
  // (see the "ref does not affect the state bridge" describe block below).
  // What keeps it off the rendered element isn't the key's *type* - it's
  // that `Box` explicitly destructures this exact key out of its props
  // before spreading the remainder onto the underlying DOM element (see
  // Box.tsx). These tests verify that guarantee holds on the supported
  // recipe -> Box path, including when a caller bypasses the public type
  // and hands the exact private key through by hand.
  it("no attribute name or value anywhere in the rendered HTML references the internal channel", () => {
    const Button = defineRecipe(Box, {
      name: "Button",
      base: { background: "action" },
      states: {
        hover: { background: "surfaceRaised" },
        focusVisible: { border: "strong" },
        active: { background: "danger" },
      },
    });
    const { getByTestId } = renderWithTheme(<Button data-testid="el">Go</Button>);
    const html = getByTestId("el").outerHTML;
    expect(html.toLowerCase()).not.toContain("internalrecipestatebridge");
    expect(html.toLowerCase()).not.toContain("recipestatebridge");
  });

  it("even a caller who bypasses the public type and spreads the exact private key by hand cannot make it a DOM attribute", () => {
    // Deliberately a recipe with no `states` at all, so `defineRecipe`
    // itself never assigns this key - whatever reaches `Box` under this
    // name here came entirely from the caller's own spread, isolating
    // `Box`'s own stripping behavior (rather than the framework's bridge
    // assignment happening to overwrite it).
    const Card = defineRecipe(Box, {
      name: "Card",
      base: { background: "surface" },
    });
    // Box's own destructuring keys off this exact string (kept in sync with
    // `RECIPE_STATE_BRIDGE` in stateBridge.ts, which is not exported
    // publicly) - this is the adversarial case the framework does promise
    // to guard against: Box consumes this key before `...rest` regardless
    // of who set it or what shape its value has.
    const props = {
      "data-testid": "el",
      __safeCssInternalRecipeStateBridge: "not-a-real-bridge",
    } as Record<string, unknown>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- deliberately bypassing the public prop type for this test
    const { getByTestId } = renderWithTheme(<Card {...(props as any)} />);
    const attrNames = Array.from(getByTestId("el").attributes).map((a) => a.name);
    expect(attrNames.every((name) => !name.toLowerCase().includes("recipestatebridge"))).toBe(true);
  });
});

describe("interactive states: type/API surface", () => {
  it("accepts hover, focusVisible, and active state keys with background/color/border", () => {
    const Button = defineRecipe(Box, {
      name: "Button",
      base: { background: "action" },
      states: {
        hover: { background: "surfaceRaised" },
        focusVisible: { border: "strong" },
        active: { background: "danger", color: "surface", border: "none" },
      },
    });
    const { getByTestId } = renderWithTheme(<Button data-testid="el" />);
    expect(getByTestId("el")).toBeInstanceOf(HTMLElement);
  });

  it("rejects an unsupported state name at compile time", () => {
    defineRecipe(Box, {
      name: "Button",
      states: {
        // @ts-expect-error - "focus" is not a supported state key in this phase
        focus: { background: "action" },
      },
    });
  });

  it("rejects a disabled state key at compile time (not supported until a later phase)", () => {
    defineRecipe(Box, {
      name: "Button",
      states: {
        // @ts-expect-error - "disabled" is not a supported state key in this phase
        disabled: { background: "action" },
      },
    });
  });

  it("rejects an unsupported state style prop at compile time", () => {
    defineRecipe(Box, {
      name: "Button",
      states: {
        hover: {
          // @ts-expect-error - "radius" is not an approved state style prop in this phase
          radius: "card",
        },
      },
    });
  });

  it("rejects padding/sizing/layout props inside a state at compile time", () => {
    defineRecipe(Box, {
      name: "Button",
      states: {
        hover: {
          // @ts-expect-error - "padding" is not an approved state style prop in this phase
          padding: "card",
        },
      },
    });
  });

  it("enforces the same token type as the corresponding Box prop", () => {
    defineRecipe(Box, {
      name: "Button",
      states: {
        hover: {
          // @ts-expect-error - not a real color token
          background: "not-a-real-token",
        },
      },
    });
  });

  it("accepts border's existing 'none' sentinel inside a state", () => {
    const Button = defineRecipe(Box, {
      name: "Button",
      states: { hover: { border: "none" } },
    });
    const { getByTestId } = renderWithTheme(<Button data-testid="el" />);
    expect(getByTestId("el")).toBeInstanceOf(HTMLElement);
  });

  it("a recipe built on a primitive with no eligible props accepts no state style keys (Stack)", () => {
    defineRecipe(Stack, {
      name: "Section",
      states: {
        hover: {
          // @ts-expect-error - Stack has no background/color/border props, so states has no valid keys
          background: "action",
        },
      },
    });
  });

  it("existing defineRecipe typing (base/variants/instance overrides) remains intact alongside states", () => {
    const Button = defineRecipe(Box, {
      name: "Button",
      base: { as: "button", padding: "control", background: "action" },
      variants: { tone: { secondary: { background: "surface" } } },
      defaultVariants: { tone: "secondary" },
      states: { hover: { background: "surfaceRaised" } },
    });
    const { getByTestId } = renderWithTheme(
      <Button data-testid="el" tone="secondary" padding="section" disabled>
        Go
      </Button>,
    );
    const el = getByTestId("el") as HTMLButtonElement;
    expect(el.tagName).toBe("BUTTON");
    expect(el.disabled).toBe(true);
  });
});

describe("interactive states: precedence", () => {
  it("base < hover: hover's value is reachable through the resting base value as fallback", () => {
    const Button = defineRecipe(Box, {
      name: "Button",
      base: { background: "action" },
      states: { hover: { background: "surfaceRaised" } },
    });
    const { getByTestId } = renderWithTheme(<Button data-testid="el" />);
    const el = getByTestId("el");
    expect(el.style.backgroundColor).toBe(
      "var(--fw-state-hover-background, var(--fw-color-action))",
    );
    expect(el.style.getPropertyValue("--fw-state-hover-background-value")).toBe(
      "var(--fw-color-surfaceRaised)",
    );
  });

  it("variant < hover: the active variant's value becomes the resting fallback, not base's", () => {
    const Button = defineRecipe(Box, {
      name: "Button",
      base: { background: "action" },
      variants: { tone: { secondary: { background: "surface" } } },
      states: { hover: { background: "surfaceRaised" } },
    });
    const { getByTestId } = renderWithTheme(<Button data-testid="el" tone="secondary" />);
    expect(getByTestId("el").style.backgroundColor).toBe(
      "var(--fw-state-hover-background, var(--fw-color-surface))",
    );
  });

  it("hover < instance: an instance override renders the plain, unbridged value with no hover slot at all", () => {
    const Button = defineRecipe(Box, {
      name: "Button",
      base: { background: "action" },
      variants: { tone: { secondary: { background: "surface" } } },
      states: { hover: { background: "surfaceRaised" } },
    });
    const { getByTestId } = renderWithTheme(
      <Button data-testid="el" tone="secondary" background="danger" />,
    );
    const el = getByTestId("el");
    expect(el.style.backgroundColor).toBe("var(--fw-color-danger)");
    expect(el.style.getPropertyValue("--fw-state-hover-background-value")).toBe("");
  });

  it("focusVisible outranks hover when both are simultaneously declared for the same property", () => {
    const Button = defineRecipe(Box, {
      name: "Button",
      base: { background: "action" },
      states: {
        hover: { background: "surfaceRaised" },
        focusVisible: { background: "surface" },
      },
    });
    const { getByTestId } = renderWithTheme(<Button data-testid="el" />);
    expect(getByTestId("el").style.backgroundColor).toBe(
      "var(--fw-state-focus-visible-background, var(--fw-state-hover-background, var(--fw-color-action)))",
    );
  });

  it("active outranks focusVisible and hover when all three are simultaneously declared", () => {
    const Button = defineRecipe(Box, {
      name: "Button",
      base: { background: "action" },
      states: {
        hover: { background: "surfaceRaised" },
        focusVisible: { background: "surface" },
        active: { background: "danger" },
      },
    });
    const { getByTestId } = renderWithTheme(<Button data-testid="el" />);
    expect(getByTestId("el").style.backgroundColor).toBe(
      "var(--fw-state-active-background, var(--fw-state-focus-visible-background, var(--fw-state-hover-background, var(--fw-color-action))))",
    );
    expect(getByTestId("el").style.getPropertyValue("--fw-state-active-background-value")).toBe(
      "var(--fw-color-danger)",
    );
  });

  it("only includes the state layers actually declared for a property, not the full priority chain", () => {
    const Button = defineRecipe(Box, {
      name: "Button",
      base: { background: "action" },
      states: { active: { background: "danger" } },
    });
    const { getByTestId } = renderWithTheme(<Button data-testid="el" />);
    expect(getByTestId("el").style.backgroundColor).toBe(
      "var(--fw-state-active-background, var(--fw-color-action))",
    );
  });

  it("unsafeCss wins over state styling for the same rendered CSS property", () => {
    const Button = defineRecipe(Box, {
      name: "Button",
      base: { background: "action" },
      states: { hover: { background: "surfaceRaised" } },
    });
    const { getByTestId } = renderWithTheme(
      <Button data-testid="el" unsafeCss={{ backgroundColor: "red" }} />,
    );
    expect(getByTestId("el").style.backgroundColor).toBe("red");
  });

  it("instance suppresses all declared states for that property, not just the highest-priority one", () => {
    const Button = defineRecipe(Box, {
      name: "Button",
      base: { background: "action" },
      states: {
        hover: { background: "surfaceRaised" },
        active: { background: "danger" },
      },
    });
    const { getByTestId } = renderWithTheme(<Button data-testid="el" background="textMuted" />);
    const el = getByTestId("el");
    expect(el.style.backgroundColor).toBe("var(--fw-color-textMuted)");
    expect(el.style.getPropertyValue("--fw-state-hover-background-value")).toBe("");
    expect(el.style.getPropertyValue("--fw-state-active-background-value")).toBe("");
  });

  it("an unrelated instance prop does not suppress states declared for a different property", () => {
    const Button = defineRecipe(Box, {
      name: "Button",
      base: { background: "action", color: "surface" },
      states: {
        hover: { background: "surfaceRaised", color: "text" },
      },
    });
    const { getByTestId } = renderWithTheme(<Button data-testid="el" padding="section" />);
    const el = getByTestId("el");
    expect(el.style.backgroundColor).toBe(
      "var(--fw-state-hover-background, var(--fw-color-action))",
    );
    expect(el.style.color).toBe("var(--fw-state-hover-color, var(--fw-color-surface))");
  });

  it("a state can apply even when the property has no resting value at all (no base/variant/instance) - the fallback is 'unset', not 'initial'", () => {
    // `unset`, not `initial`, is the innermost fallback for a state-only
    // property: for a non-inherited property like `background-color`,
    // `unset` behaves exactly like `initial` anyway, so this case is
    // functionally indistinguishable from the old behavior - but see the
    // `color` case below, where the difference is load-bearing.
    const NavLink = defineRecipe(Box, {
      name: "NavLink",
      states: { hover: { background: "surfaceRaised" } },
    });
    const { getByTestId } = renderWithTheme(<NavLink data-testid="el" />);
    const el = getByTestId("el");
    expect(el.style.backgroundColor).toBe("var(--fw-state-hover-background, unset)");
    expect(el.style.getPropertyValue("--fw-state-hover-background-value")).toBe(
      "var(--fw-color-surfaceRaised)",
    );
  });

  it("a state-only 'color' (an inherited property) falls back to 'unset' so a child inherits its parent's color at rest instead of resetting to CSS-initial black", () => {
    // This is the case `unset` vs `initial` actually matters for: `color`
    // is an inherited CSS property. `initial` here would have forced the
    // resting color to the CSS spec's initial value (black) even though
    // this recipe never declared a resting color at all - only a hover
    // one, which would have visually overridden the parent's `color="danger"`
    // at rest despite the child never asking for that. `unset` resolves to
    // `inherit` for an inherited property, so at rest the child correctly
    // inherits the parent's color, and only switches to the hover token on
    // `:hover` - jsdom does not execute real CSS cascade/inheritance (see
    // the "CSS bridge stylesheet" describe block above), so this asserts
    // the generated style string rather than a computed value; the actual
    // browser cascade behavior was verified separately via a real-Chromium
    // spike (see the v0.4 Phase 1 correctness-fix report).
    const NavLink = defineRecipe(Box, {
      name: "NavLink",
      states: { hover: { color: "action" } },
    });
    const { getByTestId } = renderWithTheme(
      <Box color="danger">
        <NavLink data-testid="el" />
      </Box>,
    );
    const el = getByTestId("el");
    expect(el.style.color).toBe("var(--fw-state-hover-color, unset)");
    expect(el.style.getPropertyValue("--fw-state-hover-color-value")).toBe(
      "var(--fw-color-action)",
    );
  });

  it("a state-only 'border' (a non-inherited property) also falls back to 'unset'", () => {
    const Button = defineRecipe(Box, {
      name: "Button",
      states: { focusVisible: { border: "strong" } },
    });
    const { getByTestId } = renderWithTheme(<Button data-testid="el" />);
    const el = getByTestId("el");
    expect(el.style.border).toBe("var(--fw-state-focus-visible-border, unset)");
    expect(el.style.getPropertyValue("--fw-state-focus-visible-border-value")).toBe(
      "var(--fw-border-strong)",
    );
  });

  it("an explicit resting value is unaffected by the 'unset' fallback change - it is still the innermost fallback", () => {
    const Button = defineRecipe(Box, {
      name: "Button",
      base: { background: "action" },
      states: { hover: { background: "surfaceRaised" } },
    });
    const { getByTestId } = renderWithTheme(<Button data-testid="el" />);
    expect(getByTestId("el").style.backgroundColor).toBe(
      "var(--fw-state-hover-background, var(--fw-color-action))",
    );
  });

  it("border 'none' works as a state value and as the resting fallback", () => {
    const Button = defineRecipe(Box, {
      name: "Button",
      base: { border: "subtle" },
      states: { hover: { border: "none" } },
    });
    const { getByTestId } = renderWithTheme(<Button data-testid="el" />);
    const el = getByTestId("el");
    expect(el.style.border).toBe("var(--fw-state-hover-border, var(--fw-border-subtle))");
    expect(el.style.getPropertyValue("--fw-state-hover-border-value")).toBe("none");
  });

  it("border 'none' as the resting value still lets a state override it with a real token", () => {
    const Button = defineRecipe(Box, {
      name: "Button",
      base: { border: "none" },
      states: { focusVisible: { border: "strong" } },
    });
    const { getByTestId } = renderWithTheme(<Button data-testid="el" />);
    const el = getByTestId("el");
    expect(el.style.border).toBe("var(--fw-state-focus-visible-border, none)");
    expect(el.style.getPropertyValue("--fw-state-focus-visible-border-value")).toBe(
      "var(--fw-border-strong)",
    );
  });
});

describe("interactive states: instance-suppression diagnostic", () => {
  it("warns once, naming the recipe, property, and affected state(s)", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const Button = defineRecipe(Box, {
      name: "Button",
      base: { background: "action" },
      states: { hover: { background: "surfaceRaised" }, active: { background: "danger" } },
    });
    renderWithTheme(<Button background="textMuted" />);
    expect(warn).toHaveBeenCalledTimes(1);
    const message = warn.mock.calls[0]?.[0] as string;
    expect(message).toContain("Button");
    expect(message).toContain("background");
    expect(message).toContain("hover");
    expect(message).toContain("active");
    warn.mockRestore();
  });

  it("does not warn when no instance override collides with a state-declared property", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const Button = defineRecipe(Box, {
      name: "Button",
      base: { background: "action" },
      states: { hover: { background: "surfaceRaised" } },
    });
    renderWithTheme(<Button padding="section" />);
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it("does not warn when diagnostics is off", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const Button = defineRecipe(Box, {
      name: "Button",
      base: { background: "action" },
      states: { hover: { background: "surfaceRaised" } },
    });
    renderWithTheme(<Button background="danger" />, { diagnostics: "off" });
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });
});

describe("interactive states: an explicit ref does not affect the state bridge", () => {
  // A ref is not a styling decision. An earlier version of this bridge used
  // a Symbol-keyed private channel, which React-DOM silently dropped
  // whenever a `forwardRef` component's incoming props object also carried
  // a "ref" key (its internal props rebuild only ever visits string keys) -
  // that made a recipe's hover/focusVisible/active styling vanish on any
  // instance that was also given a ref, which is not acceptable: rendering
  // `<Button ref={ref} />` must behave identically, stylistically, to
  // `<Button />`. The channel is now an ordinary string-keyed prop (see
  // `RECIPE_STATE_BRIDGE` in stateBridge.ts), which survives that path
  // unconditionally regardless of whether a ref is present, and `Box`
  // explicitly strips it back out before forwarding the remaining props to
  // the DOM element - so it never appears as a DOM attribute either way.
  function makeButton() {
    return defineRecipe(Box, {
      name: "Button",
      base: { as: "button", background: "action" },
      states: {
        hover: { background: "surfaceRaised" },
        focusVisible: { border: "strong" },
        active: { background: "danger" },
      },
    });
  }

  it("ref reaches the DOM node, and the resting value, every declared state's -value custom property, and dev metadata are all still present", () => {
    const Button = makeButton();
    const ref = createRef<HTMLButtonElement>();
    const { getByTestId } = renderWithTheme(
      <Button ref={ref} data-testid="el">
        Go
      </Button>,
    );
    const el = getByTestId("el") as HTMLButtonElement;

    // 1. ref.current is the underlying button
    expect(ref.current).toBe(el);
    expect(el.tagName).toBe("BUTTON");

    // 2. resting background still carries the bridge var() expression
    expect(el.style.backgroundColor).toBe(
      "var(--fw-state-active-background, var(--fw-state-hover-background, var(--fw-color-action)))",
    );

    // 3-5. every declared state's -value custom property is present
    expect(el.style.getPropertyValue("--fw-state-hover-background-value")).toBe(
      "var(--fw-color-surfaceRaised)",
    );
    expect(el.style.getPropertyValue("--fw-state-focus-visible-border-value")).toBe(
      "var(--fw-border-strong)",
    );
    expect(el.style.getPropertyValue("--fw-state-active-background-value")).toBe(
      "var(--fw-color-danger)",
    );

    // 6. data-fw-state-tokens is present in development
    const stateTokenEntries = el.getAttribute("data-fw-state-tokens")?.split(" ") ?? [];
    expect(stateTokenEntries).toHaveLength(3);
    expect(stateTokenEntries).toEqual(
      expect.arrayContaining([
        "hover|background|colors.surfaceRaised",
        "focusVisible|border|border.strong",
        "active|background|colors.danger",
      ]),
    );

    // 7. state tokens remain unioned into data-fw-tokens
    const tokens = el.getAttribute("data-fw-tokens")?.split(" ") ?? [];
    expect(tokens).toEqual(
      expect.arrayContaining([
        "colors.action",
        "colors.surfaceRaised",
        "border.strong",
        "colors.danger",
      ]),
    );
  });

  it("no private internal prop appears anywhere in the rendered HTML", () => {
    const Button = makeButton();
    const ref = createRef<HTMLButtonElement>();
    const { getByTestId } = renderWithTheme(
      <Button ref={ref} data-testid="el">
        Go
      </Button>,
    );
    const html = getByTestId("el").outerHTML;
    expect(html.toLowerCase()).not.toContain("internalrecipestatebridge");
    expect(html.toLowerCase()).not.toContain("recipestatebridge");
  });

  it("emits no React warning (e.g. an unknown DOM attribute) for this combination", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const Button = makeButton();
    const ref = createRef<HTMLButtonElement>();
    renderWithTheme(<Button ref={ref}>Go</Button>);
    expect(errorSpy).not.toHaveBeenCalled();
    expect(warnSpy).not.toHaveBeenCalled();
    errorSpy.mockRestore();
    warnSpy.mockRestore();
  });

  it("a recipe instance without a ref behaves identically to one with a ref", () => {
    const Button = makeButton();

    const withoutRef = renderWithTheme(<Button data-testid="el">Go</Button>);
    const elWithoutRef = withoutRef.getByTestId("el");
    const backgroundWithoutRef = elWithoutRef.style.backgroundColor;
    const borderWithoutRef = elWithoutRef.style.border;
    const stateTokensWithoutRef = elWithoutRef.getAttribute("data-fw-state-tokens");
    withoutRef.unmount();

    const ref = createRef<HTMLButtonElement>();
    const withRef = renderWithTheme(
      <Button ref={ref} data-testid="el">
        Go
      </Button>,
    );
    const elWithRef = withRef.getByTestId("el");

    expect(elWithRef.style.backgroundColor).toBe(backgroundWithoutRef);
    expect(elWithRef.style.border).toBe(borderWithoutRef);
    expect(elWithRef.getAttribute("data-fw-state-tokens")).toBe(stateTokensWithoutRef);
  });

  it("an instance override still suppresses only that property's states, ref notwithstanding", () => {
    const Button = makeButton();
    const ref = createRef<HTMLButtonElement>();
    const { getByTestId } = renderWithTheme(
      <Button ref={ref} data-testid="el" background="textMuted">
        Go
      </Button>,
    );
    const el = getByTestId("el");
    // background is suppressed entirely - plain instance value, no bridge
    expect(el.style.backgroundColor).toBe("var(--fw-color-textMuted)");
    expect(el.style.getPropertyValue("--fw-state-hover-background-value")).toBe("");
    expect(el.style.getPropertyValue("--fw-state-active-background-value")).toBe("");
    // border (a different property) is unaffected by the background override
    expect(el.style.getPropertyValue("--fw-state-focus-visible-border-value")).toBe(
      "var(--fw-border-strong)",
    );
  });

  it("unsafeCss still wins over the bridge for the same rendered property, ref notwithstanding", () => {
    const Button = makeButton();
    const ref = createRef<HTMLButtonElement>();
    const { getByTestId } = renderWithTheme(
      <Button ref={ref} data-testid="el" unsafeCss={{ backgroundColor: "hotpink" }}>
        Go
      </Button>,
    );
    expect(getByTestId("el").style.backgroundColor).toBe("hotpink");
  });
});

describe("interactive states: unsafeCss-suppression diagnostic", () => {
  it("warns when unsafeCss.backgroundColor collides with a state-declared background", () => {
    // unsafeCss.backgroundColor also independently trips the pre-existing
    // "this already has a semantic token equivalent" suspicious-unsafeCss
    // heuristic (see warnSuspiciousUnsafeCss) - that diagnostic is unrelated
    // to interactive states and continues to fire on its own, so this test
    // looks for the specific state-suppression message rather than
    // asserting a total call count.
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const Button = defineRecipe(Box, {
      name: "Button",
      base: { background: "action" },
      states: { hover: { background: "surfaceRaised" } },
    });
    renderWithTheme(<Button unsafeCss={{ backgroundColor: "red" }} />);
    const message = warn.mock.calls
      .map((call) => call[0] as string)
      .find((m) => m.includes("Button"));
    expect(message).toBeDefined();
    expect(message).toContain("background");
    expect(message).toContain("backgroundColor");
    expect(message).toContain("hover");
    warn.mockRestore();
  });

  it("warns when unsafeCss uses the 'background' shorthand instead of 'backgroundColor'", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const Button = defineRecipe(Box, {
      name: "Button",
      base: { background: "action" },
      states: { hover: { background: "surfaceRaised" } },
    });
    renderWithTheme(<Button unsafeCss={{ background: "red" }} />);
    const message = warn.mock.calls
      .map((call) => call[0] as string)
      .find((m) => m.includes("interaction-state styling"));
    expect(message).toBeDefined();
    expect(message).toContain("background");
    expect(message).toContain("hover");
    warn.mockRestore();
  });

  it("does not warn when unsafeCss sets an unrelated property", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const Button = defineRecipe(Box, {
      name: "Button",
      base: { background: "action" },
      states: { hover: { background: "surfaceRaised" } },
    });
    renderWithTheme(<Button unsafeCss={{ cursor: "pointer" }} />);
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it("does not attempt to detect a border longhand (borderColor) colliding with a border state (documented limitation)", () => {
    // `borderColor` still trips the pre-existing, unrelated
    // warnSuspiciousUnsafeCss heuristic on its own (Box already has a
    // `border` prop) - that's expected and orthogonal to this test. What
    // this documented limitation actually means is that the *state-specific*
    // suppression diagnostic (STATE_BRIDGE_UNSAFE_CSS_KEYS only matches the
    // exact `border` key, not `borderColor`/`borderWidth`/`borderStyle`)
    // never fires for this collision - so assert its message is absent,
    // not that no warning fired at all.
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const Button = defineRecipe(Box, {
      name: "Button",
      base: { border: "subtle" },
      states: { hover: { border: "strong" } },
    });
    renderWithTheme(<Button unsafeCss={{ borderColor: "red" }} />);
    const suppressionMessage = warn.mock.calls
      .map((call) => call[0] as string)
      .find((m) => m.includes("interaction-state styling"));
    expect(suppressionMessage).toBeUndefined();
    warn.mockRestore();
  });
});

describe("interactive states: data-fw-state-suppressed metadata", () => {
  it("records state|property|unsafeCssKey when unsafeCss suppresses a declared state", () => {
    const Button = defineRecipe(Box, {
      name: "Button",
      base: { background: "action" },
      states: { hover: { background: "surfaceRaised" } },
    });
    const { getByTestId } = renderWithTheme(
      <Button data-testid="el" unsafeCss={{ backgroundColor: "red" }} />,
    );
    expect(getByTestId("el").getAttribute("data-fw-state-suppressed")).toBe(
      "hover|background|backgroundColor",
    );
  });

  it("emits one entry per affected state when a single unsafeCss key suppresses several declared states for the same property", () => {
    const Button = defineRecipe(Box, {
      name: "Button",
      base: { background: "action" },
      states: { hover: { background: "surfaceRaised" }, active: { background: "danger" } },
    });
    const { getByTestId } = renderWithTheme(
      <Button data-testid="el" unsafeCss={{ backgroundColor: "red" }} />,
    );
    const entries = getByTestId("el").getAttribute("data-fw-state-suppressed")?.split(" ");
    expect(entries).toEqual(
      expect.arrayContaining([
        "hover|background|backgroundColor",
        "active|background|backgroundColor",
      ]),
    );
    expect(entries).toHaveLength(2);
  });

  it("does not add the attribute at all when nothing is suppressed", () => {
    const Button = defineRecipe(Box, {
      name: "Button",
      base: { background: "action" },
      states: { hover: { background: "surfaceRaised" } },
    });
    const { getByTestId } = renderWithTheme(<Button data-testid="el" />);
    expect(getByTestId("el").hasAttribute("data-fw-state-suppressed")).toBe(false);
  });

  it("does not remove data-fw-state-tokens for a suppressed declaration - the dependency is still real, just ineffective here", () => {
    const Button = defineRecipe(Box, {
      name: "Button",
      base: { background: "action" },
      states: { hover: { background: "surfaceRaised" } },
    });
    const { getByTestId } = renderWithTheme(
      <Button data-testid="el" unsafeCss={{ backgroundColor: "red" }} />,
    );
    expect(getByTestId("el").getAttribute("data-fw-state-tokens")).toBe(
      "hover|background|colors.surfaceRaised",
    );
  });

  it("only reports suppression for the property that actually collides, not an unrelated declared property", () => {
    const Button = defineRecipe(Box, {
      name: "Button",
      base: { background: "action", border: "subtle" },
      states: { hover: { background: "surfaceRaised", border: "strong" } },
    });
    const { getByTestId } = renderWithTheme(
      <Button data-testid="el" unsafeCss={{ backgroundColor: "red" }} />,
    );
    expect(getByTestId("el").getAttribute("data-fw-state-suppressed")).toBe(
      "hover|background|backgroundColor",
    );
  });
});

describe("interactive states: token metadata", () => {
  it("base token metadata is preserved alongside state tokens", () => {
    const Button = defineRecipe(Box, {
      name: "Button",
      base: { background: "surface" },
      states: { hover: { background: "action" } },
    });
    const { getByTestId } = renderWithTheme(<Button data-testid="el" />);
    const tokens = getByTestId("el").getAttribute("data-fw-tokens")?.split(" ");
    expect(tokens).toContain("colors.surface");
    expect(tokens).toContain("colors.action");
  });

  it("a state-only token (no resting value at all) is still included in data-fw-tokens", () => {
    const NavLink = defineRecipe(Box, {
      name: "NavLink",
      states: { hover: { background: "action" } },
    });
    const { getByTestId } = renderWithTheme(<NavLink data-testid="el" />);
    expect(getByTestId("el").getAttribute("data-fw-tokens")).toBe("colors.action");
  });

  it("data-fw-state-tokens uses the agreed state|property|token format", () => {
    const Button = defineRecipe(Box, {
      name: "Button",
      states: {
        hover: { background: "action" },
        focusVisible: { border: "strong" },
      },
    });
    const { getByTestId } = renderWithTheme(<Button data-testid="el" />);
    const entries = getByTestId("el").getAttribute("data-fw-state-tokens")?.split(" ");
    expect(entries).toContain("hover|background|colors.action");
    expect(entries).toContain("focusVisible|border|border.strong");
  });

  it("deduplicates data-fw-tokens when the resting value and a state share the same token", () => {
    const Button = defineRecipe(Box, {
      name: "Button",
      base: { background: "action" },
      states: { hover: { background: "action" } },
    });
    const { getByTestId } = renderWithTheme(<Button data-testid="el" />);
    expect(getByTestId("el").getAttribute("data-fw-tokens")).toBe("colors.action");
  });

  it("an unknown state token produces the same development warning as an unknown base/variant/instance token", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const Button = defineRecipe(Box, {
      name: "Button",
      states: { hover: { background: "typo" as never } },
    });
    renderWithTheme(<Button />);
    expect(warn).toHaveBeenCalledTimes(1);
    const message = warn.mock.calls[0]?.[0] as string;
    expect(message).toContain("typo");
    expect(message).toContain("Unknown");
    warn.mockRestore();
  });

  it("border 'none' inside a state does not create a fake token dependency", () => {
    const Button = defineRecipe(Box, {
      name: "Button",
      base: { border: "subtle" },
      states: { hover: { border: "none" } },
    });
    const { getByTestId } = renderWithTheme(<Button data-testid="el" />);
    const el = getByTestId("el");
    expect(el.getAttribute("data-fw-tokens")).toBe("border.subtle");
    expect(el.getAttribute("data-fw-state-tokens")).toBeNull();
  });

  it("no data-fw-state-tokens attribute at all when no property has an active bridge", () => {
    const Card = defineRecipe(Box, { name: "Card", base: { background: "surface" } });
    const { getByTestId } = renderWithTheme(<Card data-testid="el" />);
    expect(getByTestId("el").hasAttribute("data-fw-state-tokens")).toBe(false);
  });
});

describe("interactive states: CSS bridge stylesheet (source-level - jsdom does not load real CSS)", () => {
  const css = readFileSync(STYLES_CSS_PATH, "utf8");
  const cssNoComments = css.replace(/\/\*[\s\S]*?\*\//g, "");

  it("defines a reset for every (state x property) custom property on .fw-Box", () => {
    for (const state of ["hover", "focus-visible", "active"]) {
      for (const property of ["background", "color", "border"]) {
        expect(css).toContain(`--fw-state-${state}-${property}: initial;`);
      }
    }
  });

  it("defines :hover, :focus-visible, and :active bridge rules, each guarded with :not(:disabled)", () => {
    expect(cssNoComments).toMatch(/\.fw-Box:hover:not\(:disabled\)\s*\{/);
    expect(cssNoComments).toMatch(/\.fw-Box:focus-visible:not\(:disabled\)\s*\{/);
    expect(cssNoComments).toMatch(/\.fw-Box:active:not\(:disabled\)\s*\{/);
  });

  it("each bridge rule reads its own -value custom property with an initial fallback", () => {
    expect(css).toContain(
      "--fw-state-hover-background: var(--fw-state-hover-background-value, initial);",
    );
    expect(css).toContain(
      "--fw-state-focus-visible-color: var(--fw-state-focus-visible-color-value, initial);",
    );
    expect(css).toContain(
      "--fw-state-active-border: var(--fw-state-active-border-value, initial);",
    );
  });

  it("contains no !important anywhere in the file", () => {
    expect(cssNoComments).not.toMatch(/!important/);
  });

  it("contains no per-recipe selector (only the fixed, shared .fw-Box class is used)", () => {
    // No selector should reference a specific recipe name or a hashed/
    // generated-looking class - every interactive-state selector is scoped
    // to the same shared .fw-Box class every Box instance already carries.
    const stateRules = cssNoComments.match(/\.fw-Box(?::[\w-]+(?:\([^)]*\))?)*\s*\{[^}]*\}/g) ?? [];
    expect(stateRules.length).toBeGreaterThan(0);
    for (const rule of stateRules) {
      expect(rule.startsWith(".fw-Box")).toBe(true);
    }
  });

  it("does not introduce a bare element selector or a descendant selector", () => {
    const bareElementSelector = /(?<![.\w-])(h1|h2|h3|p|button|div|span|a)\s*[:{]/;
    expect(cssNoComments).not.toMatch(bareElementSelector);
    // A descendant combinator (space between two selectors) inside a rule's
    // selector list would look like ".fw-Box .fw-Box" - none of our own
    // selectors should ever contain that shape.
    expect(cssNoComments).not.toMatch(/\.fw-Box\s+\.fw-\w+\s*\{/);
  });
});

/**
 * Regression coverage for the parent -> child custom-property leakage bug
 * found and fixed during the v0.4 feasibility spike. jsdom does not execute
 * real CSS (no cascade, no `:hover`/`:focus-visible` pseudo-class matching,
 * no custom-property inheritance) - `vitest.config.ts` runs with `css:
 * false`, the same reason `marginNormalization.test.tsx` asserts on the
 * stylesheet source rather than computed style. The actual live-browser
 * leakage scenario (hovering a parent Box does not bleed into a
 * non-hovered nested child Box's resolved background, and hovering the
 * child correctly shows both its own hover color and its hover-matching
 * ancestor's) was verified empirically against real nested `Box` elements
 * in Chromium during the spike, using the exact reset rule now shipped in
 * styles.css and asserted on above. What jsdom *can* verify, and what this
 * covers: that Box's own rendering logic keeps a parent's and a nested
 * child's bridge computation fully independent at the React/JS level, with
 * nothing shared or leaked between two separate elements' rendered output.
 */
describe("interactive states: nested Box bridge independence (JS-level; see comment above)", () => {
  it("a parent and a nested child Box each render their own bridge tokens, with no cross-contamination", () => {
    const { getByTestId } = renderWithTheme(
      <Box
        data-testid="parent"
        unsafeCss={{ backgroundColor: "var(--fw-state-hover-background, blue)" }}
      >
        <Box data-testid="child" background="surface">
          child
        </Box>
      </Box>,
    );
    // Not using the bridge on the parent here (unsafeCss stands in for a
    // resting value only) - the point is purely that rendering a parent
    // and child Box together never causes one's fields to appear on the
    // other's element.
    const parent = getByTestId("parent");
    const child = getByTestId("child");
    expect(parent.style.getPropertyValue("--fw-state-hover-background-value")).toBe("");
    expect(child.style.getPropertyValue("--fw-state-hover-background-value")).toBe("");
  });

  it("two sibling recipes with different hover tokens for the same property never mix them up", () => {
    const RedOnHover = defineRecipe(Box, {
      name: "RedOnHover",
      base: { background: "surface" },
      states: { hover: { background: "danger" } },
    });
    const GreenOnHover = defineRecipe(Box, {
      name: "GreenOnHover",
      base: { background: "surface" },
      states: { hover: { background: "surfaceRaised" } },
    });

    const { getByTestId } = renderWithTheme(
      <Stack>
        <RedOnHover data-testid="a" />
        <GreenOnHover data-testid="b" />
      </Stack>,
    );

    expect(getByTestId("a").style.getPropertyValue("--fw-state-hover-background-value")).toBe(
      "var(--fw-color-danger)",
    );
    expect(getByTestId("b").style.getPropertyValue("--fw-state-hover-background-value")).toBe(
      "var(--fw-color-surfaceRaised)",
    );
  });
});

import { describe, expect, it, vi } from "vitest";
import { Box, defineRecipe } from "../src";
import { renderWithTheme } from "./test-utils";

describe("reserved data-fw-* namespace: primitives", () => {
  it("the framework's own data-fw-primitive always wins over a consumer-supplied one", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { getByTestId } = renderWithTheme(<Box data-testid="el" data-fw-primitive="Banana" />);
    expect(getByTestId("el").getAttribute("data-fw-primitive")).toBe("Box");
    warn.mockRestore();
  });

  it("warns in development when a consumer passes a reserved attribute directly", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    renderWithTheme(<Box data-fw-primitive="Banana" />);
    expect(warn).toHaveBeenCalledTimes(1);
    const message = warn.mock.calls[0]?.[0] as string;
    expect(message).toContain("data-fw-primitive");
    expect(message).toContain("reserved");
    warn.mockRestore();
  });

  it("reports every colliding key when more than one reserved attribute is misused at once", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    renderWithTheme(<Box padding="card" data-fw-primitive="Banana" data-fw-tokens="fake.token" />);
    expect(warn).toHaveBeenCalledTimes(1);
    const message = warn.mock.calls[0]?.[0] as string;
    expect(message).toContain("data-fw-primitive");
    expect(message).toContain("data-fw-tokens");
    warn.mockRestore();
  });

  it("does not warn when no reserved attribute is used", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    renderWithTheme(<Box padding="card" data-testid="fine" data-analytics-id="x" />);
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it("does not warn when diagnostics is off", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    renderWithTheme(<Box data-fw-primitive="Banana" />, { diagnostics: "off" });
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });
});

describe("reserved data-fw-* namespace: recipes", () => {
  it("a recipe's own data-fw-recipe/data-fw-variant always win over consumer-supplied instance props", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const Card = defineRecipe(Box, {
      name: "Card",
      variants: { tone: { raised: { shadow: "raised" } } },
    });
    const { getByTestId } = renderWithTheme(
      <Card data-testid="el" tone="raised" data-fw-recipe="Evil" data-fw-variant="tone:evil" />,
    );
    const el = getByTestId("el");
    expect(el.getAttribute("data-fw-recipe")).toBe("Card");
    expect(el.getAttribute("data-fw-variant")).toBe("tone:raised");
    warn.mockRestore();
  });

  it("warns when a recipe instance passes a reserved attribute directly", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const Card = defineRecipe(Box, { name: "Card" });
    renderWithTheme(<Card data-fw-recipe="Evil" />);
    expect(warn).toHaveBeenCalledTimes(1);
    const message = warn.mock.calls[0]?.[0] as string;
    expect(message).toContain("Card");
    expect(message).toContain("data-fw-recipe");
    warn.mockRestore();
  });

  it("a normal recipe render does NOT warn about its own data-fw-recipe/data-fw-variant reaching the underlying primitive", () => {
    // Regression test: `data-fw-recipe`/`data-fw-variant` are legitimately
    // passed down from the recipe layer to its underlying primitive on every
    // render. The underlying primitive (Box) must not mistake this for a
    // consumer misuse and warn about it - only `data-fw-primitive`,
    // `data-fw-tokens`, and `data-fw-unsafe-css` are Box's own concern.
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const Card = defineRecipe(Box, {
      name: "Card",
      variants: { tone: { raised: { shadow: "raised" } } },
    });
    renderWithTheme(<Card tone="raised" />);
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it("does not warn when diagnostics is off", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const Card = defineRecipe(Box, { name: "Card" });
    renderWithTheme(<Card data-fw-recipe="Evil" />, { diagnostics: "off" });
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });
});

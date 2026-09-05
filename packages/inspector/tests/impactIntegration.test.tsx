import { afterEach, describe, expect, it, vi } from "vitest";
import { act, render, waitFor } from "@testing-library/react";
import { SafeCssInspector } from "../src/component/SafeCssInspector";

afterEach(() => {
  vi.unstubAllEnvs();
});

function dispatchComposed(target: Element, type: string, init: EventInit = {}): Event {
  const event = new MouseEvent(type, { bubbles: true, cancelable: true, composed: true, ...init });
  target.dispatchEvent(event);
  return event;
}

function hover(target: Element): void {
  target.dispatchEvent(
    new Event("pointermove", { bubbles: true, cancelable: true, composed: true }),
  );
}

function pressEscape(): void {
  document.dispatchEvent(
    new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }),
  );
}

/** A theme scope containing two Card recipes: one using `radius.card` directly, another reachable only indirectly via `border.subtle -> colors.border`. */
function mountScope(): {
  scope: HTMLElement;
  cardA: HTMLElement;
  cardB: HTMLElement;
  other: HTMLElement;
  colorSwatch: HTMLElement;
} {
  const scope = document.createElement("div");
  scope.style.setProperty("--fw-radius-card", "12px");
  scope.style.setProperty("--fw-color-border", "#e5e7eb");
  scope.style.setProperty("--fw-border-subtle", "1px solid var(--fw-color-border)");

  const cardA = document.createElement("div");
  cardA.setAttribute("data-fw-primitive", "Box");
  cardA.setAttribute("data-fw-recipe", "Card");
  cardA.setAttribute("data-fw-tokens", "radius.card");
  cardA.style.setProperty("border-radius", "var(--fw-radius-card)");

  const cardB = document.createElement("div");
  cardB.setAttribute("data-fw-primitive", "Box");
  cardB.setAttribute("data-fw-recipe", "Card");
  cardB.setAttribute("data-fw-tokens", "radius.card");
  cardB.style.setProperty("border-radius", "var(--fw-radius-card)");

  const other = document.createElement("div");
  other.setAttribute("data-fw-primitive", "Box");
  other.setAttribute("data-fw-recipe", "ProjectCard");
  other.setAttribute("data-fw-tokens", "border.subtle");
  other.style.setProperty("border", "var(--fw-border-subtle)");

  // Directly uses colors.border too (e.g. a text color), so it can be
  // selected and "Analyze impact" launched on colors.border specifically -
  // border.subtle's own indirect dependent, ProjectCard, is a *different*
  // element from this one.
  const colorSwatch = document.createElement("div");
  colorSwatch.setAttribute("data-fw-primitive", "Box");
  colorSwatch.setAttribute("data-fw-tokens", "colors.border");
  colorSwatch.style.setProperty("color", "var(--fw-color-border)");
  scope.appendChild(colorSwatch);

  scope.append(cardA, cardB, other);
  document.body.appendChild(scope);
  return { scope, cardA, cardB, other, colorSwatch };
}

function getShadowRoot(): ShadowRoot {
  const host = document.querySelector("[data-safe-css-inspector-host]");
  if (!host?.shadowRoot) throw new Error("Inspector shadow host not found");
  return host.shadowRoot;
}

function findButton(shadowRoot: ShadowRoot, text: string): HTMLButtonElement {
  const button = Array.from(shadowRoot.querySelectorAll("button")).find((btn) =>
    btn.textContent?.includes(text),
  );
  if (!button) throw new Error(`No button containing "${text}"`);
  return button as HTMLButtonElement;
}

function launcherButton(shadowRoot: ShadowRoot): HTMLButtonElement {
  return shadowRoot.querySelector(".fw-inspector-launcher") as HTMLButtonElement;
}

/** Hovers and clicks `target` - assumes picking mode is already active. */
async function hoverAndClick(shadowRoot: ShadowRoot, target: HTMLElement): Promise<void> {
  hover(target);
  await waitFor(() => {
    expect(shadowRoot.querySelector(".fw-inspector-highlight-label")).not.toBeNull();
  });
  act(() => {
    dispatchComposed(target, "click");
  });
  await waitFor(() => {
    expect(shadowRoot.querySelector(".fw-inspector-highlight.selected")).not.toBeNull();
  });
}

/** Enters picking mode via the launcher, then selects `target`. Only use when NOT already picking - see `hoverAndClick` for re-pick scenarios. */
async function selectElement(shadowRoot: ShadowRoot, target: HTMLElement): Promise<void> {
  act(() => {
    dispatchComposed(launcherButton(shadowRoot), "click");
  });
  await hoverAndClick(shadowRoot, target);
}

describe("Impact Analysis integration", () => {
  it("switches to the Impact panel from a token's 'Analyze impact' action, showing direct impact across two Cards", async () => {
    const { cardA } = mountScope();
    render(<SafeCssInspector />);
    const shadowRoot = getShadowRoot();

    await selectElement(shadowRoot, cardA);
    act(() => {
      dispatchComposed(findButton(shadowRoot, "Analyze impact"), "click");
    });

    const panel = shadowRoot.querySelector(".fw-inspector-panel");
    expect(panel?.textContent).toContain("Impact Analysis");
    expect(panel?.textContent).toContain("radius.card");
    expect(panel?.textContent).toContain("12px");
    // 2 Cards use radius.card from this scope.
    expect(panel?.textContent).toMatch(/2\s*Rendered impact|Rendered impact.*2/s);
  });

  it("finds indirect impact through a dependency chain (colors.border -> border.subtle -> ProjectCard)", async () => {
    const { colorSwatch } = mountScope();
    render(<SafeCssInspector />);
    const shadowRoot = getShadowRoot();

    await selectElement(shadowRoot, colorSwatch);
    act(() => {
      dispatchComposed(findButton(shadowRoot, "Analyze impact"), "click");
    });

    const panel = shadowRoot.querySelector(".fw-inspector-panel");
    expect(panel?.textContent).toContain("colors.border");
    expect(panel?.textContent).toContain("border.subtle");
    expect(panel?.textContent).toContain("ProjectCard");
  });

  it("offers 'Analyze impact' on a nested dependency token (colors.border under border.subtle's tree) even when the selected element never lists it directly", async () => {
    const { other } = mountScope();
    render(<SafeCssInspector />);
    const shadowRoot = getShadowRoot();

    // `other` (ProjectCard) only lists `border.subtle` in its own
    // data-fw-tokens - colors.border is reachable only through the "Token
    // dependencies" tree, exactly like a real theme's border-color token
    // (there is no primitive prop that sets colors.* on a border directly).
    await selectElement(shadowRoot, other);
    expect(
      Array.from(shadowRoot.querySelectorAll(".fw-inspector-token-name")).map(
        (el) => el.textContent,
      ),
    ).not.toContain("colors.border");

    act(() => {
      const dependencyRow = Array.from(shadowRoot.querySelectorAll(".fw-inspector-tree li")).find(
        (li) => li.querySelector(".fw-inspector-code")?.textContent === "colors.border",
      );
      const button = dependencyRow?.querySelector(".fw-inspector-link-button");
      dispatchComposed(button!, "click");
    });

    const panel = shadowRoot.querySelector(".fw-inspector-panel");
    expect(panel?.textContent).toContain("Impact Analysis");
    expect(panel?.textContent).toContain("colors.border");
    expect(panel?.textContent).toContain("ProjectCard");
  });

  it("Back to element restores the exact previous Element Inspector view without re-picking", async () => {
    const { cardA } = mountScope();
    render(<SafeCssInspector />);
    const shadowRoot = getShadowRoot();

    await selectElement(shadowRoot, cardA);
    act(() => {
      dispatchComposed(findButton(shadowRoot, "Analyze impact"), "click");
    });
    expect(shadowRoot.querySelector(".fw-inspector-panel")?.textContent).toContain(
      "Impact Analysis",
    );

    act(() => {
      dispatchComposed(findButton(shadowRoot, "Back to element"), "click");
    });

    const panel = shadowRoot.querySelector(".fw-inspector-panel");
    expect(panel?.textContent).not.toContain("Impact Analysis");
    expect(panel?.textContent).toContain("Card"); // Element section still showing the same Card
    // Still selected - no re-pick was required.
    expect(shadowRoot.querySelector(".fw-inspector-highlight.selected")).not.toBeNull();
  });

  it("Pick another from Impact mode, then Escape, restores the same Impact panel", async () => {
    const { cardA } = mountScope();
    render(<SafeCssInspector />);
    const shadowRoot = getShadowRoot();

    await selectElement(shadowRoot, cardA);
    act(() => {
      dispatchComposed(findButton(shadowRoot, "Analyze impact"), "click");
    });

    act(() => {
      dispatchComposed(launcherButton(shadowRoot), "click"); // "Pick another"
    });
    expect(shadowRoot.querySelector(".fw-inspector-banner")).not.toBeNull();
    expect(shadowRoot.querySelector(".fw-inspector-panel")).toBeNull();

    act(pressEscape);

    const panel = shadowRoot.querySelector(".fw-inspector-panel");
    expect(panel?.textContent).toContain("Impact Analysis");
    expect(panel?.textContent).toContain("radius.card");
  });

  it("selecting a new element from Impact mode's re-pick exits to Element mode for that new element", async () => {
    const { cardA, other } = mountScope();
    render(<SafeCssInspector />);
    const shadowRoot = getShadowRoot();

    await selectElement(shadowRoot, cardA);
    act(() => {
      dispatchComposed(findButton(shadowRoot, "Analyze impact"), "click");
    });

    act(() => {
      dispatchComposed(launcherButton(shadowRoot), "click");
    });
    await hoverAndClick(shadowRoot, other);

    const panel = shadowRoot.querySelector(".fw-inspector-panel");
    expect(panel?.textContent).not.toContain("Impact Analysis");
    expect(panel?.textContent).toContain("ProjectCard");
  });

  it("Close from Impact mode clears the selection, the highlight, and the panel entirely", async () => {
    const { cardA } = mountScope();
    render(<SafeCssInspector />);
    const shadowRoot = getShadowRoot();

    await selectElement(shadowRoot, cardA);
    act(() => {
      dispatchComposed(findButton(shadowRoot, "Analyze impact"), "click");
    });

    act(() => {
      dispatchComposed(findButton(shadowRoot, "Close"), "click");
    });

    expect(shadowRoot.querySelector(".fw-inspector-panel")).toBeNull();
    expect(shadowRoot.querySelector(".fw-inspector-highlight.selected")).toBeNull();
    expect(launcherButton(shadowRoot).textContent).toContain("Inspect");
  });

  it("Refresh impact recomputes after a new rendered element starts using the token", async () => {
    const { scope, cardA } = mountScope();
    render(<SafeCssInspector />);
    const shadowRoot = getShadowRoot();

    await selectElement(shadowRoot, cardA);
    act(() => {
      dispatchComposed(findButton(shadowRoot, "Analyze impact"), "click");
    });
    expect(shadowRoot.querySelector(".fw-inspector-panel")?.textContent).toMatch(/2/);

    const cardC = document.createElement("div");
    cardC.setAttribute("data-fw-primitive", "Box");
    cardC.setAttribute("data-fw-recipe", "Card");
    cardC.setAttribute("data-fw-tokens", "radius.card");
    scope.appendChild(cardC);

    act(() => {
      dispatchComposed(findButton(shadowRoot, "Refresh impact"), "click");
    });

    expect(shadowRoot.querySelector(".fw-inspector-panel")?.textContent).toMatch(/3/);
  });

  it("toggling 'Highlight affected' shows and hides overlay boxes for the affected elements", async () => {
    const { cardA } = mountScope();
    render(<SafeCssInspector />);
    const shadowRoot = getShadowRoot();

    await selectElement(shadowRoot, cardA);
    act(() => {
      dispatchComposed(findButton(shadowRoot, "Analyze impact"), "click");
    });

    expect(shadowRoot.querySelectorAll(".fw-inspector-impact-highlight")).toHaveLength(0);

    act(() => {
      dispatchComposed(findButton(shadowRoot, "Highlight affected"), "click");
    });
    await waitFor(() => {
      expect(shadowRoot.querySelectorAll(".fw-inspector-impact-highlight").length).toBeGreaterThan(
        0,
      );
    });

    act(() => {
      dispatchComposed(findButton(shadowRoot, "Hide highlights"), "click");
    });
    expect(shadowRoot.querySelectorAll(".fw-inspector-impact-highlight")).toHaveLength(0);
  });

  it("explains the rendered-DOM-only scope directly in the panel", async () => {
    const { cardA } = mountScope();
    render(<SafeCssInspector />);
    const shadowRoot = getShadowRoot();

    await selectElement(shadowRoot, cardA);
    act(() => {
      dispatchComposed(findButton(shadowRoot, "Analyze impact"), "click");
    });

    expect(shadowRoot.querySelector(".fw-inspector-panel")?.textContent).toContain(
      "currently rendered in the document",
    );
  });
});

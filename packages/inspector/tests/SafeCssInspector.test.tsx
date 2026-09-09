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

function mountFixture(recipe = "Card"): HTMLElement {
  const fixture = document.createElement("div");
  fixture.setAttribute("data-fw-primitive", "Box");
  fixture.setAttribute("data-fw-recipe", recipe);
  fixture.setAttribute("data-fw-variant", "tone:raised");
  fixture.setAttribute("data-fw-tokens", "space.card");
  fixture.style.setProperty("--fw-space-card", "16px");
  fixture.style.setProperty("padding", "var(--fw-space-card)");
  // getBoundingClientRect() always returns zeros in jsdom, which is fine -
  // the highlight overlay only needs *an* element, not a real layout.
  document.body.appendChild(fixture);
  return fixture;
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

function findButton(shadowRoot: ShadowRoot, text: string): HTMLButtonElement {
  const button = Array.from(shadowRoot.querySelectorAll(".fw-inspector-icon-button")).find((btn) =>
    btn.textContent?.includes(text),
  );
  if (!button) throw new Error(`No panel button containing "${text}"`);
  return button as HTMLButtonElement;
}

/** Clicks the launcher to enter picking mode (works from idle or from an existing selection). */
function enterPicking(shadowRoot: ShadowRoot): void {
  const launcher = shadowRoot.querySelector(".fw-inspector-launcher") as HTMLButtonElement;
  act(() => {
    dispatchComposed(launcher, "click");
  });
}

/**
 * Hovers `target` (must already be in picking mode) then clicks it to
 * select it, and waits for the resulting *selected* highlight's own
 * measurement pass (a separate `HighlightOverlay` instance from the hover
 * one, with its own rAF-driven `rect`) to actually land, so callers don't
 * race it.
 */
async function hoverAndSelect(shadowRoot: ShadowRoot, target: HTMLElement): Promise<void> {
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

/** Enters picking mode and selects `target` in one step, for tests that don't need the two steps separately. */
async function pickAndSelect(shadowRoot: ShadowRoot, target: HTMLElement): Promise<void> {
  enterPicking(shadowRoot);
  await hoverAndSelect(shadowRoot, target);
}

function getShadowRoot(): ShadowRoot {
  const host = document.querySelector("[data-safe-css-inspector-host]");
  if (!host?.shadowRoot) throw new Error("Inspector shadow host not found");
  return host.shadowRoot;
}

describe("SafeCssInspector", () => {
  it("renders nothing, and creates no host, when enabled={false}", () => {
    const { container } = render(<SafeCssInspector enabled={false} />);
    expect(container.innerHTML).toBe("");
    expect(document.querySelector("[data-safe-css-inspector-host]")).toBeNull();
  });

  it("renders nothing, and creates no host, in a production build", () => {
    vi.stubEnv("NODE_ENV", "production");
    const { container } = render(<SafeCssInspector />);
    expect(container.innerHTML).toBe("");
    expect(document.querySelector("[data-safe-css-inspector-host]")).toBeNull();
  });

  it("mounts a launcher inside an isolated shadow root by default", () => {
    render(<SafeCssInspector />);
    const shadowRoot = getShadowRoot();
    expect(shadowRoot.querySelector(".fw-inspector-launcher")).not.toBeNull();
  });

  it("walks the launcher -> pick -> hover -> select -> panel -> close flow end to end", async () => {
    const fixture = mountFixture();
    render(<SafeCssInspector />);
    const shadowRoot = getShadowRoot();

    const launcher = () => shadowRoot.querySelector(".fw-inspector-launcher") as HTMLButtonElement;

    // Idle: launcher present, no banner, no panel.
    expect(launcher().textContent).toContain("Inspect");
    expect(shadowRoot.querySelector(".fw-inspector-panel")).toBeNull();

    // Enter picking mode.
    act(() => {
      dispatchComposed(launcher(), "click");
    });
    expect(launcher().textContent).toContain("Cancel");
    expect(shadowRoot.querySelector(".fw-inspector-banner")).not.toBeNull();

    // Hover the fixture: highlight + label appear, describing "Card · Box".
    // HighlightOverlay measures the element's rect on a rAF, so the state
    // update lands asynchronously, one frame after the hover event itself -
    // waitFor polls (each check wrapped in act) until it shows up.
    fixture.dispatchEvent(
      new Event("pointermove", { bubbles: true, cancelable: true, composed: true }),
    );
    await waitFor(() => {
      expect(shadowRoot.querySelector(".fw-inspector-highlight-label")?.textContent).toBe(
        "Card · Box",
      );
    });

    // Click the fixture: selects it, panel opens with its data.
    act(() => {
      dispatchComposed(fixture, "click");
    });

    const panel = shadowRoot.querySelector(".fw-inspector-panel");
    expect(panel).not.toBeNull();
    expect(panel!.textContent).toContain("Box");
    expect(panel!.textContent).toContain("Card");
    expect(panel!.textContent).toContain("tone");
    expect(panel!.textContent).toContain("raised");
    expect(panel!.textContent).toContain("space.card");
    expect(panel!.textContent).toContain("16px");

    // Picking banner/highlight are gone now that something is selected.
    expect(shadowRoot.querySelector(".fw-inspector-banner")).toBeNull();

    // Close returns to idle.
    const closeButton = Array.from(shadowRoot.querySelectorAll(".fw-inspector-icon-button")).find(
      (btn) => btn.textContent?.includes("Close"),
    ) as HTMLButtonElement;
    act(() => {
      dispatchComposed(closeButton, "click");
    });
    expect(shadowRoot.querySelector(".fw-inspector-panel")).toBeNull();
    expect(launcher().textContent).toContain("Inspect");
  });

  it("cancels picking on Escape without selecting anything", () => {
    render(<SafeCssInspector />);
    const shadowRoot = getShadowRoot();
    const launcher = shadowRoot.querySelector(".fw-inspector-launcher") as HTMLButtonElement;

    act(() => {
      dispatchComposed(launcher, "click");
    });
    expect(shadowRoot.querySelector(".fw-inspector-banner")).not.toBeNull();

    act(() => {
      document.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }),
      );
    });

    expect(shadowRoot.querySelector(".fw-inspector-banner")).toBeNull();
    expect(shadowRoot.querySelector(".fw-inspector-panel")).toBeNull();
  });

  it("keeps the selected element highlighted (persistently, not just during picking) until the panel closes", async () => {
    const fixture = mountFixture();
    render(<SafeCssInspector />);
    const shadowRoot = getShadowRoot();

    await pickAndSelect(shadowRoot, fixture);

    // The persistent highlight uses the "selected" variant, distinct from
    // the transient hover box, and survives past the moment picking ended.
    const selectedHighlight = shadowRoot.querySelector(".fw-inspector-highlight.selected");
    expect(selectedHighlight).not.toBeNull();
    expect(shadowRoot.querySelector(".fw-inspector-highlight-label.selected")?.textContent).toBe(
      "Card · Box",
    );

    act(() => {
      dispatchComposed(findButton(shadowRoot, "Close"), "click");
    });

    expect(shadowRoot.querySelector(".fw-inspector-highlight.selected")).toBeNull();
  });

  it("Escape during a fresh pick (no prior selection) returns to idle - scenario A", () => {
    render(<SafeCssInspector />);
    const shadowRoot = getShadowRoot();
    const launcher = shadowRoot.querySelector(".fw-inspector-launcher") as HTMLButtonElement;

    act(() => {
      dispatchComposed(launcher, "click");
    });
    expect(shadowRoot.querySelector(".fw-inspector-banner")).not.toBeNull();

    act(pressEscape);

    expect(shadowRoot.querySelector(".fw-inspector-banner")).toBeNull();
    expect(shadowRoot.querySelector(".fw-inspector-panel")).toBeNull();
    expect(shadowRoot.querySelector(".fw-inspector-highlight.selected")).toBeNull();
    expect(launcher.textContent).toContain("Inspect");
  });

  it("Escape during re-pick (existing selection) restores the previous selection and its panel - scenario B", async () => {
    const card = mountFixture("Card");
    render(<SafeCssInspector />);
    const shadowRoot = getShadowRoot();

    await pickAndSelect(shadowRoot, card);
    expect(shadowRoot.querySelector(".fw-inspector-panel")?.textContent).toContain("Card");

    // "Pick another" - re-enter picking mode without losing the selection.
    enterPicking(shadowRoot);
    expect(shadowRoot.querySelector(".fw-inspector-banner")).not.toBeNull();
    // The panel is hidden while re-picking, but the previous selection's
    // highlight remains visible underneath.
    expect(shadowRoot.querySelector(".fw-inspector-panel")).toBeNull();
    expect(shadowRoot.querySelector(".fw-inspector-highlight.selected")).not.toBeNull();

    act(pressEscape);

    // Restored, not reset to idle: same panel, same data, highlight back.
    expect(shadowRoot.querySelector(".fw-inspector-banner")).toBeNull();
    const panel = shadowRoot.querySelector(".fw-inspector-panel");
    expect(panel).not.toBeNull();
    expect(panel!.textContent).toContain("Card");
    expect(shadowRoot.querySelector(".fw-inspector-highlight.selected")).not.toBeNull();
  });

  it("cancelling re-pick by clicking a non-inspectable area also restores the previous selection", async () => {
    const card = mountFixture("Card");
    const plain = document.createElement("div");
    document.body.appendChild(plain);

    render(<SafeCssInspector />);
    const shadowRoot = getShadowRoot();

    await pickAndSelect(shadowRoot, card);

    enterPicking(shadowRoot);

    act(() => {
      dispatchComposed(plain, "click");
    });

    expect(shadowRoot.querySelector(".fw-inspector-panel")?.textContent).toContain("Card");
  });

  it("picking a different element during re-pick replaces the selection normally", async () => {
    const card = mountFixture("Card");
    const button = mountFixture("Button");

    render(<SafeCssInspector />);
    const shadowRoot = getShadowRoot();

    await pickAndSelect(shadowRoot, card);
    expect(shadowRoot.querySelector(".fw-inspector-panel")?.textContent).toContain("Card");

    // Re-enter picking (do NOT reuse pickAndSelect here - it would click the
    // launcher a second time, which cancels an in-progress pick, not start one).
    enterPicking(shadowRoot);
    await hoverAndSelect(shadowRoot, button);

    const panel = shadowRoot.querySelector(".fw-inspector-panel");
    expect(panel!.textContent).toContain("Button");
    expect(panel!.textContent).not.toContain("Card");
  });

  it("shows both the persistent selected highlight and a transient hover highlight together during re-pick", async () => {
    const card = mountFixture("Card");
    const button = mountFixture("Button");

    render(<SafeCssInspector />);
    const shadowRoot = getShadowRoot();

    await pickAndSelect(shadowRoot, card);
    enterPicking(shadowRoot);

    hover(button);
    await waitFor(() => {
      const highlights = shadowRoot.querySelectorAll(".fw-inspector-highlight");
      expect(highlights.length).toBe(2);
    });

    expect(shadowRoot.querySelector(".fw-inspector-highlight.selected")).not.toBeNull();
    expect(shadowRoot.querySelector(".fw-inspector-highlight:not(.selected)")).not.toBeNull();
  });

  it("Refresh never destroys a good snapshot for a detached element (only a live one gets re-inspected)", async () => {
    const fixture = mountFixture();
    render(<SafeCssInspector />);
    const shadowRoot = getShadowRoot();

    await pickAndSelect(shadowRoot, fixture);
    const panelBefore = shadowRoot.querySelector(".fw-inspector-panel")?.textContent;
    expect(panelBefore).toContain("space.card");
    expect(panelBefore).toContain("16px");

    fixture.remove();

    act(() => {
      dispatchComposed(findButton(shadowRoot, "Refresh"), "click");
    });

    const panelAfter = shadowRoot.querySelector(".fw-inspector-panel")?.textContent;
    // The stale note appears, but the real data (token name, its raw value)
    // that was already known is still there - Refresh didn't wipe it out
    // trying to re-derive it from a now-parentless element.
    expect(panelAfter).toContain("no longer in the document");
    expect(panelAfter).toContain("space.card");
    expect(panelAfter).toContain("16px");
  });

  it("removes the selected highlight when the selected element becomes detached, while preserving the stale snapshot", async () => {
    const fixture = mountFixture();

    render(<SafeCssInspector />);

    const shadowRoot = getShadowRoot();

    await pickAndSelect(shadowRoot, fixture);

    // Selection is active and highlighted.
    expect(shadowRoot.querySelector(".fw-inspector-highlight.selected")).not.toBeNull();

    // Remove the selected element from the application DOM.
    fixture.remove();

    // Refresh should detect that the element is detached.
    act(() => {
      dispatchComposed(findButton(shadowRoot, "Refresh"), "click");
    });

    // The Inspector keeps the last known data.
    const panel = shadowRoot.querySelector(".fw-inspector-panel");

    expect(panel?.textContent).toContain("no longer in the document");

    expect(panel?.textContent).toContain("space.card");
    expect(panel?.textContent).toContain("16px");

    // But a detached element must no longer have a visual highlight.
    expect(shadowRoot.querySelector(".fw-inspector-highlight.selected")).toBeNull();
  });

  it("blocks the underlying app's own click handler while picking", () => {
    const fixture = mountFixture();
    const appHandler = vi.fn();
    fixture.addEventListener("click", appHandler);

    render(<SafeCssInspector />);
    const shadowRoot = getShadowRoot();
    const launcher = shadowRoot.querySelector(".fw-inspector-launcher") as HTMLButtonElement;

    act(() => {
      dispatchComposed(launcher, "click");
    });
    act(() => {
      dispatchComposed(fixture, "click");
    });

    expect(appHandler).not.toHaveBeenCalled();
  });

  it("shows a stale notice, without crashing, once the selected element leaves the document", () => {
    const fixture = mountFixture();
    render(<SafeCssInspector />);
    const shadowRoot = getShadowRoot();
    const launcher = shadowRoot.querySelector(".fw-inspector-launcher") as HTMLButtonElement;

    act(() => {
      dispatchComposed(launcher, "click");
    });
    act(() => {
      dispatchComposed(fixture, "click");
    });
    expect(shadowRoot.querySelector(".fw-inspector-panel")).not.toBeNull();

    fixture.remove();

    // No MutationObserver by design - the panel only re-checks connectivity
    // on its next render, e.g. via the manual Refresh action.
    const refreshButton = Array.from(shadowRoot.querySelectorAll(".fw-inspector-icon-button")).find(
      (btn) => btn.textContent?.includes("Refresh"),
    ) as HTMLButtonElement;
    act(() => {
      dispatchComposed(refreshButton, "click");
    });

    expect(shadowRoot.querySelector(".fw-inspector-panel")?.textContent).toContain(
      "no longer in the document",
    );
  });
});

describe("SafeCssInspector: External hooks (v0.4 Phase 3)", () => {
  it("shows the External hooks section, with className and id, for a real picked element", async () => {
    const fixture = document.createElement("div");
    fixture.setAttribute("data-fw-primitive", "Box");
    fixture.setAttribute("data-fw-classes", "fw-Box");
    fixture.className = "fw-Box navigation-item active";
    fixture.id = "primary-nav-home";
    document.body.appendChild(fixture);

    render(<SafeCssInspector />);
    const shadowRoot = getShadowRoot();
    await pickAndSelect(shadowRoot, fixture);

    const panel = shadowRoot.querySelector(".fw-inspector-panel");
    expect(panel?.textContent).toContain("External hooks");
    expect(panel?.textContent).toContain("navigation-item");
    expect(panel?.textContent).toContain("active");
    expect(panel?.textContent).toContain("primary-nav-home");
  });

  it("omits the External hooks section entirely for a framework-only element", async () => {
    const fixture = document.createElement("div");
    fixture.setAttribute("data-fw-primitive", "Box");
    fixture.setAttribute("data-fw-classes", "fw-Box");
    fixture.className = "fw-Box";
    document.body.appendChild(fixture);

    render(<SafeCssInspector />);
    const shadowRoot = getShadowRoot();
    await pickAndSelect(shadowRoot, fixture);

    expect(shadowRoot.querySelector(".fw-inspector-panel")?.textContent).not.toContain(
      "External hooks",
    );
  });
});

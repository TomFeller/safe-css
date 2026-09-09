import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { InteractionStatesSection } from "../src/ui/InteractionStatesSection";
import type { InspectedToken, InteractionState } from "../src/types";

afterEach(cleanup);

function tokenFixture(overrides: Partial<InspectedToken> = {}): InspectedToken {
  return {
    token: "colors.action",
    category: "colors",
    name: "action",
    cssVariable: "--fw-color-action",
    properties: [],
    rawValue: "#2563eb",
    resolvedValue: "#2563eb",
    dependencies: [],
    owner: document.createElement("div"),
    ...overrides,
  };
}

describe("InteractionStatesSection", () => {
  it("shows an empty-state message when there are no interaction states", () => {
    const { container } = render(<InteractionStatesSection interactionStates={[]} />);
    expect(container.textContent).toContain(
      "This element's recipe declares no hover/focus-visible/active styling.",
    );
  });

  it("renders the human-facing 'focus-visible' label, not the implementation name 'focusVisible'", () => {
    const states: InteractionState[] = [
      {
        state: "focusVisible",
        label: "focus-visible",
        declarations: [{ property: "border", token: tokenFixture({ token: "border.strong" }) }],
      },
    ];
    const { container } = render(<InteractionStatesSection interactionStates={states} />);
    expect(container.textContent).toContain("focus-visible");
    expect(container.textContent).not.toContain("focusVisible");
  });

  it("renders a token-backed declaration's token identity and raw value", () => {
    const states: InteractionState[] = [
      {
        state: "hover",
        label: "hover",
        declarations: [
          {
            property: "background",
            token: tokenFixture({ token: "colors.action", rawValue: "#2563eb" }),
          },
        ],
      },
    ];
    const { container } = render(<InteractionStatesSection interactionStates={states} />);
    expect(container.textContent).toContain("hover");
    expect(container.textContent).toContain("background");
    expect(container.textContent).toContain("colors.action");
    expect(container.textContent).toContain("#2563eb");
  });

  it("renders a literal declaration ('none') plainly, without a token identity or 'Analyze impact'", () => {
    const onAnalyzeImpact = vi.fn();
    const states: InteractionState[] = [
      {
        state: "hover",
        label: "hover",
        declarations: [{ property: "border", literal: "none" }],
      },
    ];
    const { container, queryByText } = render(
      <InteractionStatesSection interactionStates={states} onAnalyzeImpact={onAnalyzeImpact} />,
    );
    expect(container.textContent).toContain("none");
    expect(queryByText("Analyze impact")).toBeNull();
  });

  it("calls onAnalyzeImpact with the declaration's own token when 'Analyze impact' is clicked", () => {
    const onAnalyzeImpact = vi.fn();
    const states: InteractionState[] = [
      {
        state: "hover",
        label: "hover",
        declarations: [{ property: "background", token: tokenFixture({ token: "colors.action" }) }],
      },
    ];
    const { getByText } = render(
      <InteractionStatesSection interactionStates={states} onAnalyzeImpact={onAnalyzeImpact} />,
    );
    getByText("Analyze impact").click();
    expect(onAnalyzeImpact).toHaveBeenCalledWith("colors.action");
  });

  it("does not offer 'Analyze impact' for a token with no resolvable theme owner", () => {
    const onAnalyzeImpact = vi.fn();
    const states: InteractionState[] = [
      {
        state: "hover",
        label: "hover",
        declarations: [
          {
            property: "background",
            token: tokenFixture({ token: "colors.typo", rawValue: undefined, owner: undefined }),
          },
        ],
      },
    ];
    const { queryByText } = render(
      <InteractionStatesSection interactionStates={states} onAnalyzeImpact={onAnalyzeImpact} />,
    );
    expect(queryByText("Analyze impact")).toBeNull();
  });

  it("shows the suppression message when a declaration is marked suppressed, without hiding the declaration itself", () => {
    const states: InteractionState[] = [
      {
        state: "hover",
        label: "hover",
        declarations: [
          {
            property: "background",
            token: tokenFixture({ token: "colors.action" }),
            suppressedBy: { unsafeCssKey: "backgroundColor" },
          },
        ],
      },
    ];
    const { container } = render(<InteractionStatesSection interactionStates={states} />);
    expect(container.textContent).toContain("Suppressed by unsafeCss.backgroundColor");
    // The declaration itself (its token) is still shown, not hidden.
    expect(container.textContent).toContain("colors.action");
  });

  it("renders a token-backed declaration's own dependency tree, with its own 'Analyze impact' affordance", () => {
    const onAnalyzeImpact = vi.fn();
    const states: InteractionState[] = [
      {
        state: "focusVisible",
        label: "focus-visible",
        declarations: [
          {
            property: "border",
            token: tokenFixture({
              token: "border.subtle",
              cssVariable: "--fw-border-subtle",
              dependencies: [
                {
                  token: "colors.border",
                  cssVariable: "--fw-color-border",
                  cycle: false,
                  children: [],
                },
              ],
            }),
          },
        ],
      },
    ];
    const { container, getAllByText } = render(
      <InteractionStatesSection interactionStates={states} onAnalyzeImpact={onAnalyzeImpact} />,
    );
    expect(container.textContent).toContain("colors.border");
    // Two "Analyze impact" buttons: one for the declaration's own token,
    // one for the dependency-tree node.
    expect(getAllByText("Analyze impact")).toHaveLength(2);
    getAllByText("Analyze impact")[1]?.click();
    expect(onAnalyzeImpact).toHaveBeenCalledWith("colors.border");
  });
});

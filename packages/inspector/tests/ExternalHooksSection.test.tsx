import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { ExternalHooksSection } from "../src/ui/ExternalHooksSection";
import type { ExternalHooksInfo, InspectedElement } from "../src/types";

afterEach(cleanup);

function fixture(externalHooks: ExternalHooksInfo): InspectedElement {
  return {
    element: document.createElement("div"),
    tagName: "div",
    primitive: "Box",
    recipe: undefined,
    variants: [],
    ancestry: [],
    tokens: [],
    interactionStates: [],
    externalHooks,
    unsafeCss: { count: 0, detected: [], uncertain: false },
  };
}

describe("ExternalHooksSection", () => {
  it("renders nothing (omits the section) when there are no external classes and no id", () => {
    const { container } = render(
      <ExternalHooksSection
        element={fixture({ frameworkClasses: ["fw-Box"], externalClasses: [] })}
      />,
    );
    expect(container.textContent).toBe("");
    expect(container.querySelector("section")).toBeNull();
  });

  it("renders one external class under the 'className' label", () => {
    const { container } = render(
      <ExternalHooksSection
        element={fixture({ frameworkClasses: ["fw-Box"], externalClasses: ["navigation-item"] })}
      />,
    );
    expect(container.textContent).toContain("External hooks");
    expect(container.textContent).toContain("className");
    expect(container.textContent).toContain("navigation-item");
  });

  it("renders multiple external classes", () => {
    const { container } = render(
      <ExternalHooksSection
        element={fixture({
          frameworkClasses: ["fw-Box"],
          externalClasses: ["navigation-item", "active"],
        })}
      />,
    );
    expect(container.textContent).toContain("navigation-item");
    expect(container.textContent).toContain("active");
  });

  it("renders id only, with no className row, when there are no external classes", () => {
    const { container, queryByText } = render(
      <ExternalHooksSection
        element={fixture({
          frameworkClasses: ["fw-Box"],
          externalClasses: [],
          id: "primary-nav-home",
        })}
      />,
    );
    expect(container.textContent).toContain("id");
    expect(container.textContent).toContain("primary-nav-home");
    expect(queryByText("className")).toBeNull();
  });

  it("renders both className and id together", () => {
    const { container } = render(
      <ExternalHooksSection
        element={fixture({
          frameworkClasses: ["fw-Box"],
          externalClasses: ["navigation-item"],
          id: "primary-nav-home",
        })}
      />,
    );
    expect(container.textContent).toContain("className");
    expect(container.textContent).toContain("navigation-item");
    expect(container.textContent).toContain("id");
    expect(container.textContent).toContain("primary-nav-home");
  });

  it("never claims these hooks style anything - the section heading is 'External hooks', not 'External styling'", () => {
    const { container } = render(
      <ExternalHooksSection
        element={fixture({ frameworkClasses: ["fw-Box"], externalClasses: ["navigation-item"] })}
      />,
    );
    expect(container.textContent).toContain("External hooks");
    expect(container.textContent).not.toContain("External styling");
  });
});

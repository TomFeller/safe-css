import { afterEach, describe, expect, it } from "vitest";
import { collectAncestry, findNearestInspectable } from "../src/inspection/ancestry";

let container: HTMLElement | null = null;

afterEach(() => {
  container?.remove();
  container = null;
});

function mount(html: string): HTMLElement {
  container = document.createElement("div");
  container.innerHTML = html;
  document.body.appendChild(container);
  return container;
}

describe("findNearestInspectable", () => {
  it("finds the element itself when it carries data-fw-primitive", () => {
    const root = mount(`<div data-fw-primitive="Box" id="a"></div>`);
    const target = root.querySelector("#a") as Element;
    expect(findNearestInspectable(target)).toBe(target);
  });

  it("walks up through non-safe-css elements to the nearest ancestor", () => {
    const root = mount(`
      <div data-fw-primitive="Stack" id="outer">
        <div id="plain"><span id="leaf">text</span></div>
      </div>
    `);
    const leaf = root.querySelector("#leaf") as Element;
    expect(findNearestInspectable(leaf)).toBe(root.querySelector("#outer"));
  });

  it("returns null when there is no inspectable ancestor", () => {
    const root = mount(`<div id="plain"><span id="leaf"></span></div>`);
    const leaf = root.querySelector("#leaf") as Element;
    expect(findNearestInspectable(leaf)).toBeNull();
  });
});

describe("collectAncestry", () => {
  it("returns an empty array for a root element with no safe-css ancestors", () => {
    const root = mount(`<div data-fw-primitive="Box" id="a"></div>`);
    expect(collectAncestry(root.querySelector("#a") as HTMLElement)).toEqual([]);
  });

  it("collects nested safe-css ancestors nearest-first, skipping plain DOM nodes", () => {
    const root = mount(`
      <div data-fw-primitive="Stack" id="outer">
        <div data-fw-primitive="Row" data-fw-recipe="Toolbar" id="middle">
          <div id="plain">
            <div data-fw-primitive="Box" id="inner"></div>
          </div>
        </div>
      </div>
    `);
    const ancestry = collectAncestry(root.querySelector("#inner") as HTMLElement);

    expect(ancestry.map((a) => a.element.id)).toEqual(["middle", "outer"]);
    expect(ancestry[0]).toMatchObject({ primitive: "Row", recipe: "Toolbar" });
    expect(ancestry[1]).toMatchObject({ primitive: "Stack", recipe: undefined });
  });
});

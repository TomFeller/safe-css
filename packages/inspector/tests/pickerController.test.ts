import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createPickerController, type PickerController } from "../src/picker/pickerController";

let container: HTMLElement | null = null;
let host: HTMLElement | null = null;
let controller: PickerController | null = null;

afterEach(() => {
  controller?.stop();
  controller = null;
  container?.remove();
  container = null;
  host?.remove();
  host = null;
});

// `composed: true` matters here: it's what lets these events cross a
// shadow boundary at all (the real click/pointermove events the picker
// listens for are composed by default; `new MouseEvent`/`new Event` are
// not, unless told to be) - without it, the self-exclusion tests below
// would never even reach the document-level listener.
function click(target: Element): MouseEvent {
  const event = new MouseEvent("click", { bubbles: true, cancelable: true, composed: true });
  target.dispatchEvent(event);
  return event;
}

function hover(target: Element): void {
  target.dispatchEvent(
    new Event("pointermove", { bubbles: true, cancelable: true, composed: true }),
  );
}

describe("createPickerController", () => {
  beforeEach(() => {
    container = document.createElement("div");
    container.innerHTML = `
      <div data-fw-primitive="Stack" id="stack">
        <div data-fw-primitive="Box" id="box"><span id="leaf">text</span></div>
      </div>
      <div id="plain">not inspectable</div>
    `;
    document.body.appendChild(container);

    host = document.createElement("div");
    host.attachShadow({ mode: "open" });
    const innerButton = document.createElement("button");
    innerButton.id = "inner-button";
    host.shadowRoot!.appendChild(innerButton);
    // A stand-in for the panel and the selected/hover highlight boxes -
    // anything else the Inspector's own UI renders into its shadow tree.
    const panel = document.createElement("div");
    panel.id = "inner-panel";
    const highlight = document.createElement("div");
    highlight.id = "inner-highlight";
    panel.appendChild(highlight);
    host.shadowRoot!.appendChild(panel);
    document.body.appendChild(host);
  });

  it("calls onHover with the nearest inspectable ancestor of the pointer target", () => {
    const onHover = vi.fn();
    controller = createPickerController(host!, { onHover, onSelect: vi.fn(), onCancel: vi.fn() });
    controller.start();

    hover(container!.querySelector("#leaf")!);

    expect(onHover).toHaveBeenCalledTimes(1);
    expect(onHover).toHaveBeenCalledWith(container!.querySelector("#box"));
  });

  it("de-duplicates onHover calls while the resolved element doesn't change", () => {
    const onHover = vi.fn();
    controller = createPickerController(host!, { onHover, onSelect: vi.fn(), onCancel: vi.fn() });
    controller.start();

    const box = container!.querySelector("#box")!;
    const leaf = container!.querySelector("#leaf")!;
    hover(box);
    hover(leaf); // resolves to the same nearest-inspectable element (box)

    expect(onHover).toHaveBeenCalledTimes(1);
  });

  it("calls onHover(null) when moving from an inspectable element to a non-inspectable one", () => {
    const onHover = vi.fn();
    controller = createPickerController(host!, { onHover, onSelect: vi.fn(), onCancel: vi.fn() });
    controller.start();

    hover(container!.querySelector("#box")!);
    hover(container!.querySelector("#plain")!);

    expect(onHover).toHaveBeenNthCalledWith(1, container!.querySelector("#box"));
    expect(onHover).toHaveBeenNthCalledWith(2, null);
  });

  it("treats events retargeted to the inspector's own shadow host as hovering nothing", () => {
    const onHover = vi.fn();
    controller = createPickerController(host!, { onHover, onSelect: vi.fn(), onCancel: vi.fn() });
    controller.start();

    hover(container!.querySelector("#box")!);
    hover(host!.shadowRoot!.getElementById("inner-button")!);

    expect(onHover).toHaveBeenNthCalledWith(1, container!.querySelector("#box"));
    expect(onHover).toHaveBeenNthCalledWith(2, null);
  });

  it("never treats the Inspector's own panel or highlight-box elements as hoverable/selectable, regardless of nesting depth", () => {
    const onHover = vi.fn();
    const onSelect = vi.fn();
    controller = createPickerController(host!, { onHover, onSelect, onCancel: vi.fn() });
    controller.start();

    const deeplyNestedHighlight = host!.shadowRoot!.getElementById("inner-highlight")!;
    hover(deeplyNestedHighlight);
    click(deeplyNestedHighlight);

    // Retargeted to `host` regardless of how deep inside the shadow tree
    // the event actually originated - the launcher/panel/highlight overlay
    // are all equally "the Inspector's own UI" to this check. Hovering
    // never even calls back (internal hover state starts at `null`, and
    // this resolves to `null` too - no change to report).
    expect(onHover).not.toHaveBeenCalled();
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("selects an inspectable element on click, and blocks the app's own click handler", () => {
    const onSelect = vi.fn();
    const box = container!.querySelector("#box")!;
    const appHandler = vi.fn();
    box.addEventListener("click", appHandler);

    controller = createPickerController(host!, { onHover: vi.fn(), onSelect, onCancel: vi.fn() });
    controller.start();

    const event = click(box);

    expect(onSelect).toHaveBeenCalledWith(box);
    expect(event.defaultPrevented).toBe(true);
    expect(appHandler).not.toHaveBeenCalled();
  });

  it("cancels when clicking somewhere with no inspectable ancestor", () => {
    const onCancel = vi.fn();
    controller = createPickerController(host!, { onHover: vi.fn(), onSelect: vi.fn(), onCancel });
    controller.start();

    click(container!.querySelector("#plain")!);

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("lets clicks on the inspector's own UI through untouched", () => {
    const onSelect = vi.fn();
    const onCancel = vi.fn();
    const innerButton = host!.shadowRoot!.getElementById("inner-button")!;
    const innerHandler = vi.fn();
    innerButton.addEventListener("click", innerHandler);

    controller = createPickerController(host!, { onHover: vi.fn(), onSelect, onCancel });
    controller.start();

    const event = click(innerButton);

    expect(event.defaultPrevented).toBe(false);
    expect(innerHandler).toHaveBeenCalledTimes(1);
    expect(onSelect).not.toHaveBeenCalled();
    expect(onCancel).not.toHaveBeenCalled();
  });

  it("cancels on Escape", () => {
    const onCancel = vi.fn();
    controller = createPickerController(host!, { onHover: vi.fn(), onSelect: vi.fn(), onCancel });
    controller.start();

    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }),
    );

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("stop() resets the current hover to null and removes all listeners", () => {
    const onHover = vi.fn();
    const onSelect = vi.fn();
    controller = createPickerController(host!, { onHover, onSelect, onCancel: vi.fn() });
    controller.start();

    hover(container!.querySelector("#box")!);
    expect(onHover).toHaveBeenCalledTimes(1);

    controller.stop();
    expect(onHover).toHaveBeenLastCalledWith(null);

    click(container!.querySelector("#box")!);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("start() and stop() are idempotent", () => {
    const onHover = vi.fn();
    controller = createPickerController(host!, { onHover, onSelect: vi.fn(), onCancel: vi.fn() });

    controller.start();
    controller.start();
    hover(container!.querySelector("#box")!);
    expect(onHover).toHaveBeenCalledTimes(1);

    controller.stop();
    controller.stop();
  });
});

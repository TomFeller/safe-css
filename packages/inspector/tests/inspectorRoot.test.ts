import { afterEach, describe, expect, it } from "vitest";
import {
  createInspectorRoot,
  destroyInspectorRoot,
  isInspectorOwnNode,
  INSPECTOR_HOST_ATTRIBUTE,
} from "../src/internal/inspectorRoot";

let root: ReturnType<typeof createInspectorRoot> | null = null;

afterEach(() => {
  if (root) destroyInspectorRoot(root);
  root = null;
});

describe("createInspectorRoot", () => {
  it("attaches a host element carrying the host attribute, with an open shadow root", () => {
    root = createInspectorRoot();

    expect(root.host.hasAttribute(INSPECTOR_HOST_ATTRIBUTE)).toBe(true);
    expect(document.body.contains(root.host)).toBe(true);
    expect(root.host.shadowRoot).toBe(root.shadowRoot);
    expect(root.shadowRoot.mode).toBe("open");
    expect(root.shadowRoot.contains(root.mount)).toBe(true);
  });

  it("never intercepts pointer events on the host itself, only on its mount subtree", () => {
    root = createInspectorRoot();
    expect(root.host.style.pointerEvents).toBe("none");
    expect(root.mount.style.pointerEvents).toBe("auto");
  });
});

describe("destroyInspectorRoot", () => {
  it("removes the host from the document", () => {
    root = createInspectorRoot();
    const host = root.host;
    destroyInspectorRoot(root);
    expect(document.body.contains(host)).toBe(false);
    root = null;
  });
});

describe("isInspectorOwnNode", () => {
  it("is true for the host itself and false for any other node", () => {
    root = createInspectorRoot();
    const outside = document.createElement("div");

    expect(isInspectorOwnNode(root.host, root.host)).toBe(true);
    expect(isInspectorOwnNode(outside, root.host)).toBe(false);
    expect(isInspectorOwnNode(null, root.host)).toBe(false);
  });
});

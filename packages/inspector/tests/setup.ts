import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

afterEach(() => {
  // Guarded: this same setup file also runs for the SSR test, which opts
  // into a `node` (no-DOM) environment via a `@vitest-environment` docblock
  // to prove the component never touches `document` outside an effect.
  if (typeof document === "undefined") return;

  cleanup();
  // Any inspector host elements left attached directly to document.body
  // (bypassing React's own unmount, e.g. a test that didn't unmount) are
  // removed so tests don't leak DOM state into each other.
  document.querySelectorAll("[data-safe-css-inspector-host]").forEach((node) => node.remove());
});

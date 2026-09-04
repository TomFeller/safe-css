import { StrictMode, Suspense, lazy } from "react";
import { createRoot } from "react-dom/client";
import "@safe-css/core/styles.css";
import "./index.css";
import { App } from "./App";

// Dev-only, and gated so its code is actually excluded from the production
// bundle - not just inert at runtime. `import.meta.env.DEV` is a compile-time
// constant Vite replaces with a literal `false` in a production build, which
// lets Rollup eliminate this whole branch (and the dynamic import inside it)
// during tree-shaking; a static top-level `import { SafeCssInspector } from
// "@safe-css/inspector"` would ship the entire package in the production
// bundle regardless of the component rendering nothing at runtime, since
// bundlers can't know that from a runtime NODE_ENV check alone. See
// docs/architecture.md#inspector.
const Inspector = import.meta.env.DEV
  ? lazy(() =>
      import("@safe-css/inspector").then((module) => ({ default: module.SafeCssInspector })),
    )
  : null;

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
    {Inspector && (
      <Suspense fallback={null}>
        <Inspector />
      </Suspense>
    )}
  </StrictMode>,
);

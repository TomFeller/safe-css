import type { DiagnosticsMode } from "../theme/types";

/**
 * Best-effort development detection. Bundlers (Vite, webpack, etc.) replace
 * `process.env.NODE_ENV` at build time, so this works without the library
 * depending on any particular bundler. If `NODE_ENV` can't be determined at
 * all we default to treating the build as development, since a missed
 * warning is worse than an extra one during local work.
 */
export function isDevelopmentBuild(): boolean {
  try {
    return process.env.NODE_ENV !== "production";
  } catch {
    return true;
  }
}

export function defaultDiagnosticsMode(): DiagnosticsMode {
  return isDevelopmentBuild() ? "warn" : "off";
}

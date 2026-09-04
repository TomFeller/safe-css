/**
 * Loosely mirrors `@safe-css/core`'s own `isDevelopmentBuild` (same
 * `process.env.NODE_ENV` check), but is not imported from it - the
 * Inspector must not depend on Core's private implementation modules (see
 * docs/architecture.md#inspector) - and deliberately does NOT copy Core's
 * fallback behavior.
 *
 * Core's version fails *open* (`catch { return true }`): if it can't
 * determine the environment, it defaults to "development", because the
 * worst case is an extra console warning or a `data-fw-*` attribute - both
 * harmless. The Inspector's worst case if it fails open is materially
 * different: mounting a live Shadow DOM root, event listeners, and an
 * interactive panel for a real end user. Since v0.2.1, this check fails
 * *closed* instead - if the environment genuinely can't be identified, the
 * Inspector stays inactive rather than risk shipping tooling to production.
 *
 * In practice the `catch` branch is not the primary production safeguard
 * either way: `process.env.NODE_ENV` is statically replaced by bundlers
 * (Vite/esbuild/webpack) in both dev and prod builds, so this almost never
 * throws. The real, recommended protection is build-time exclusion - gating
 * the import itself behind `import.meta.env.DEV` (or equivalent) so the
 * Inspector's code isn't part of the production bundle at all - see
 * `apps/demo/src/main.tsx` and docs/architecture.md#inspector. This runtime
 * check is a second, defense-in-depth layer, not the primary one.
 */
export function isDevelopmentBuild(): boolean {
  try {
    return process.env.NODE_ENV !== "production";
  } catch {
    return false;
  }
}

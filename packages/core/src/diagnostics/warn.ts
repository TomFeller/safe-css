import type { DiagnosticsMode } from "../theme/types";

const seen = new Set<string>();

/**
 * Emits a `console.warn` at most once per unique message key for the
 * lifetime of the module. This keeps diagnostics actionable instead of
 * spamming the console when the same invalid usage renders repeatedly (e.g.
 * a list of cards all using the same bad token).
 */
function warnOnce(key: string, message: string): void {
  if (seen.has(key)) return;
  seen.add(key);
  console.warn(`[safe-css] ${message}`);
}

export function warnIfEnabled(mode: DiagnosticsMode, key: string, message: string): void {
  if (mode !== "warn") return;
  warnOnce(key, message);
}

export function warnInvalidToken(
  mode: DiagnosticsMode,
  category: string,
  token: string,
  component: string,
  prop: string,
): void {
  warnIfEnabled(
    mode,
    `invalid-token:${category}:${token}:${component}:${prop}`,
    `Unknown ${category} token "${token}" passed to \`${prop}\` on <${component}>. ` +
      `This value will not resolve to a theme value and the property will be treated as unset. ` +
      `Check \`theme.${category}\` for the available token names.`,
  );
}

export function warnMissingThemeProvider(component: string): void {
  warnIfEnabled(
    "warn",
    `missing-theme-provider:${component}`,
    `<${component}> was rendered without a <ThemeProvider> ancestor. ` +
      `Theme tokens will resolve to nothing until the app is wrapped in <ThemeProvider theme={createTheme(...)}>.`,
  );
}

export function warnGridConflict(mode: DiagnosticsMode): void {
  warnIfEnabled(
    mode,
    "grid-conflict",
    "Grid cannot use both `columns` and `minItemWidth`. Choose fixed (`columns`) or adaptive (`minItemWidth`) layout.",
  );
}

export function warnUnsafeCss(
  mode: DiagnosticsMode,
  component: string,
  unsafeCss: Record<string, unknown>,
): void {
  if (mode !== "warn") return;
  const entries = Object.entries(unsafeCss);
  if (entries.length === 0) return;

  const key = `unsafe-css:${component}:${entries.map(([k]) => k).join(",")}`;
  const preview = entries
    .map(([prop, value]) => `  ${prop}: ${typeof value === "number" ? `${value}px` : value};`)
    .join("\n");

  warnOnce(
    key,
    `Custom CSS detected on <${component}>:\n\n${preview}\n\n` +
      `This bypasses the theme and framework guarantees. Consider a semantic token or prop instead.`,
  );
}

export function warnConflictingProps(
  mode: DiagnosticsMode,
  component: string,
  message: string,
): void {
  warnIfEnabled(mode, `conflict:${component}:${message}`, message);
}

/** Test-only: clears the warn-once cache so tests don't leak state into each other. */
export function _resetDiagnosticsForTests(): void {
  seen.clear();
}

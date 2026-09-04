import type { DiagnosticsMode } from "../theme/types";
import { formatCssValue } from "./cssValueFormat";
import { classifySuspiciousUnsafeCssProp } from "./unsafeCssHeuristics";

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

/**
 * `unsafeCss` is intentionally allowed and does not warn merely for
 * existing - that would train developers to ignore diagnostics entirely
 * (see docs/architecture.md#unsafecss). Instead, only properties matching a
 * known risky pattern (margin, raw z-index, layout properties a primitive
 * already solves, arbitrary values where a token exists) produce a
 * warning, one per suspicious property. Everything else - `cursor`,
 * `font`, decorative `transform`s, and so on - stays silent. `unsafeCss`
 * usage is still always visible in dev metadata regardless of whether
 * anything here fires; see `debugAttributes`'s `unsafeCssCount`.
 */
export function warnSuspiciousUnsafeCss(
  mode: DiagnosticsMode,
  component: string,
  unsafeCss: Record<string, unknown>,
): void {
  if (mode !== "warn") return;

  for (const [prop, value] of Object.entries(unsafeCss)) {
    const suspicion = classifySuspiciousUnsafeCssProp(prop, value);
    if (!suspicion) continue;

    warnOnce(
      `unsafe-css:${component}:${prop}:${String(value)}`,
      `Custom \`${prop}\` detected in unsafeCss on <${component}>: ${prop}: ${formatCssValue(prop, value)};\n\n` +
        suspicion.reason,
    );
  }
}

interface VariantContribution {
  group: string;
  option: string;
  value: unknown;
}

interface VariantCollision {
  prop: string;
  loser: VariantContribution;
  winner: VariantContribution;
}

/**
 * Warns when two *different* active variant groups on the same recipe
 * instance both assign a value to the same underlying prop. Resolution is
 * always deterministic (declaration order in `variants: {...}`, later wins -
 * a plain object spread, same as everywhere else in this engine), so this
 * never changes behavior; it just makes an easy-to-miss interaction visible.
 */
export function warnRecipeVariantCollision(
  mode: DiagnosticsMode,
  recipeName: string,
  activeVariants: string[],
  collisions: VariantCollision[],
): void {
  if (mode !== "warn" || collisions.length === 0) return;

  const key =
    `recipe-collision:${recipeName}:` +
    collisions
      .map(
        (c) => `${c.prop}:${c.winner.group}=${c.winner.option}>${c.loser.group}=${c.loser.option}`,
      )
      .join(",");

  const variantLines = activeVariants.map((v) => `  ${v.replace(":", '="')}"`).join("\n");
  const propLines = collisions.map((c) => `  ${c.prop}`).join("\n");
  const resolvedLines = collisions
    .map((c) => `  ${c.prop}: ${formatCssValue(c.prop, c.winner.value)}`)
    .join("\n");

  warnOnce(
    key,
    `Recipe collision in <${recipeName}>:\n\n` +
      `Active variants:\n${variantLines}\n\n` +
      `Both assign:\n${propLines}\n\n` +
      `Resolved value:\n${resolvedLines}\n\n` +
      `Variant groups resolve in declaration order (the group declared later in ` +
      `\`variants: {...}\` wins). If that's what you intended, no action is needed.`,
  );
}

/** Test-only: clears the warn-once cache so tests don't leak state into each other. */
export function _resetDiagnosticsForTests(): void {
  seen.clear();
}

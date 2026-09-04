/* eslint-disable react-refresh/only-export-components -- internal context
   plumbing (providers + hooks), not a UI component file; Fast Refresh doesn't
   apply here. */
import { createContext, useContext } from "react";
import { defaultTheme } from "./defaultTheme";
import { buildTokenNameIndex, type TokenNameIndex } from "./tokenIndex";
import type { DiagnosticsMode, Theme } from "./types";
import { defaultDiagnosticsMode } from "../diagnostics/env";

/**
 * What a primitive actually needs to resolve and validate a token prop:
 * the set of valid token *names* per category, the diagnostics mode, and
 * whether a `ThemeProvider` exists at all. Deliberately does not include the
 * theme's *values* - primitives never read them (they only ever emit
 * `var(--fw-...)` references), so subscribing to values here would force
 * every primitive to re-render on every theme value change for no reason.
 * See docs/architecture.md#render-architecture.
 */
export interface ThemeMetaContextValue {
  tokenNames: TokenNameIndex;
  diagnostics: DiagnosticsMode;
  /** False for the context's default value, i.e. no ThemeProvider ancestor. */
  isProvided: boolean;
}

const defaultTokenNames = buildTokenNameIndex(defaultTheme);

const ThemeMetaContext = createContext<ThemeMetaContextValue>({
  tokenNames: defaultTokenNames,
  diagnostics: defaultDiagnosticsMode(),
  isProvided: false,
});
ThemeMetaContext.displayName = "SafeCssThemeMetaContext";

export const ThemeMetaContextProvider = ThemeMetaContext.Provider;

export function useThemeMeta(): ThemeMetaContextValue {
  const value = useContext(ThemeMetaContext);

  // The context's default `diagnostics` value above is computed once, when
  // this module first evaluates - fine for a real bundled build (bundlers
  // statically replace `process.env.NODE_ENV` before the module even runs,
  // so the value is already correct by then), but wrong to rely on as a
  // general guarantee: recomputing it here, only for the truly-unprovided
  // fallback, means the "no ThemeProvider at all" path always reflects the
  // environment at render time rather than whatever it happened to be when
  // this module was first imported. `ThemeProvider` already does the
  // equivalent fresh computation for its own `diagnostics` prop default; this
  // keeps the unprovided path consistent with it. See docs/architecture.md#diagnostics.
  if (!value.isProvided) {
    return { ...value, diagnostics: defaultDiagnosticsMode() };
  }
  return value;
}

/**
 * Holds the *actual* theme value, separately from {@link ThemeMetaContext}.
 * No primitive subscribes to this today - it exists so a future
 * portal-rendered primitive (Modal, Tooltip, Popover, ...) can read the
 * active theme and re-publish it (via a nested `ThemeProvider`) at the
 * portal's own DOM root, where CSS custom-property inheritance can't reach
 * because portals escape the React tree's DOM position. Reading it costs
 * nothing today precisely because nothing reads it. See
 * docs/architecture.md#portals.
 */
const ThemeValueContext = createContext<Theme>(defaultTheme);
ThemeValueContext.displayName = "SafeCssThemeValueContext";

export const ThemeValueContextProvider = ThemeValueContext.Provider;

export function useThemeValue(): Theme {
  return useContext(ThemeValueContext);
}

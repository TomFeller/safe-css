/* eslint-disable react-refresh/only-export-components -- internal context
   plumbing (provider + hook), not a UI component file; Fast Refresh doesn't
   apply here. */
import { createContext, useContext } from "react";
import { defaultTheme } from "./defaultTheme";
import type { DiagnosticsMode, Theme } from "./types";
import { defaultDiagnosticsMode } from "../diagnostics/env";

export interface ThemeContextValue {
  theme: Theme;
  diagnostics: DiagnosticsMode;
  /** False for the context's default value, i.e. no ThemeProvider ancestor. */
  isProvided: boolean;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: defaultTheme,
  diagnostics: defaultDiagnosticsMode(),
  isProvided: false,
});

ThemeContext.displayName = "SafeCssThemeContext";

export const ThemeContextProvider = ThemeContext.Provider;

export function useThemeContext(): ThemeContextValue {
  return useContext(ThemeContext);
}

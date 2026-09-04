import { useMemo, type ReactNode } from "react";
import { ThemeContextProvider } from "./ThemeContext";
import { themeToCssVariables } from "./cssVariables";
import { defaultDiagnosticsMode } from "../diagnostics/env";
import type { DiagnosticsMode, Theme } from "./types";

export interface ThemeProviderProps {
  theme: Theme;
  /**
   * Controls development diagnostics (invalid tokens, conflicting props,
   * unsafe CSS usage, ...). Defaults to `"warn"` in development builds and
   * `"off"` in production builds. Diagnostics never affect rendered output -
   * only console warnings - so this is safe to change at any time.
   */
  diagnostics?: DiagnosticsMode;
  children?: ReactNode;
}

/**
 * Publishes a {@link Theme} to the component tree as CSS custom properties.
 *
 * The provider itself renders a `display: contents` wrapper: it carries the
 * CSS variables (so they inherit into every descendant, including through
 * portals rendered inside the same DOM subtree) without inserting a layout
 * box of its own, so it never interferes with height/width chains like
 * `<Stack height="full">`.
 *
 * `ThemeProvider` can be nested. A nested provider overrides only the CSS
 * variables it defines; anything else continues to inherit from the parent
 * theme, following normal CSS custom property inheritance.
 */
export function ThemeProvider(props: ThemeProviderProps) {
  const { theme, diagnostics, children } = props;

  const cssVariables = useMemo(() => themeToCssVariables(theme), [theme]);
  const resolvedDiagnostics = diagnostics ?? defaultDiagnosticsMode();

  const contextValue = useMemo(
    () => ({ theme, diagnostics: resolvedDiagnostics, isProvided: true }),
    [theme, resolvedDiagnostics],
  );

  const style = useMemo(
    () => ({ display: "contents", ...cssVariables }) as React.CSSProperties,
    [cssVariables],
  );

  return (
    <ThemeContextProvider value={contextValue}>
      <div data-fw-theme-root="" style={style}>
        {children}
      </div>
    </ThemeContextProvider>
  );
}

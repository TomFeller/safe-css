import { useMemo, type ReactNode } from "react";
import { ThemeMetaContextProvider, ThemeValueContextProvider } from "./ThemeContext";
import { themeToCssVariables } from "./cssVariables";
import { buildTokenNameIndex, tokenNameSignature } from "./tokenIndex";
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
 *
 * Internally this publishes two separate contexts (see `ThemeContext.tsx`):
 * a metadata context primitives actually subscribe to (token *names* +
 * diagnostics mode, referentially stable across a value-only theme change),
 * and a raw value context nothing consumes yet, reserved for future
 * portal-rendered primitives. See docs/architecture.md#render-architecture.
 */
export function ThemeProvider(props: ThemeProviderProps) {
  const { theme, diagnostics, children } = props;

  const cssVariables = useMemo(() => themeToCssVariables(theme), [theme]);
  const resolvedDiagnostics = diagnostics ?? defaultDiagnosticsMode();

  // Recomputed every render (cheap - a few dozen key lookups), but only
  // *changes value* when the theme's token names change, not when their
  // values do. That's what lets `tokenNames` below stay a stable reference
  // across a plain `space.card: "16px" -> "20px"` update.
  const signature = tokenNameSignature(theme);
  // Intentionally keyed on `signature`, not `theme`: recomputing whenever
  // `theme`'s *reference* changes (which happens on every value-only update)
  // would defeat the entire point of this memo. See
  // docs/architecture.md#render-architecture.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const tokenNames = useMemo(() => buildTokenNameIndex(theme), [signature]);

  const metaValue = useMemo(
    () => ({ tokenNames, diagnostics: resolvedDiagnostics, isProvided: true }),
    [tokenNames, resolvedDiagnostics],
  );

  const style = useMemo(
    () => ({ display: "contents", ...cssVariables }) as React.CSSProperties,
    [cssVariables],
  );

  return (
    <ThemeValueContextProvider value={theme}>
      <ThemeMetaContextProvider value={metaValue}>
        <div data-fw-theme-root="" style={style}>
          {children}
        </div>
      </ThemeMetaContextProvider>
    </ThemeValueContextProvider>
  );
}

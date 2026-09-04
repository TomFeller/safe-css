import { render, type RenderOptions } from "@testing-library/react";
import type { ReactElement } from "react";
import { ThemeProvider, createTheme } from "../src";
import type { DiagnosticsMode } from "../src";

export const testTheme = createTheme();

/** Renders `ui` inside a `ThemeProvider` using the default theme, with diagnostics forced on unless overridden. */
export function renderWithTheme(
  ui: ReactElement,
  options?: RenderOptions & { diagnostics?: DiagnosticsMode },
) {
  return render(
    <ThemeProvider theme={testTheme} diagnostics={options?.diagnostics ?? "warn"}>
      {ui}
    </ThemeProvider>,
    options,
  );
}

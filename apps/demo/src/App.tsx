import { useState } from "react";
import { Row, ScrollArea, Stack, ThemeProvider } from "@safe-css/core";
import { Sidebar } from "./sections/Sidebar";
import { Header } from "./sections/Header";
import { ProjectGrid } from "./sections/ProjectGrid";
import { themePresets, type ThemePresetName } from "./theme/presets";

/**
 * The realistic dashboard screen described in the spec: an application
 * shell (sidebar + main), a sticky header, a grown ScrollArea for the main
 * content, nested Stack/Row layouts, and a responsive card Grid - built
 * without a single ordinary CSS rule in this file.
 */
export function App() {
  const [themeName, setThemeName] = useState<ThemePresetName>("default");
  const [rtl, setRtl] = useState(false);
  const [activeNavItem, setActiveNavItem] = useState("Overview");

  return (
    <div dir={rtl ? "rtl" : "ltr"} style={{ height: "100%" }}>
      <ThemeProvider theme={themePresets[themeName]}>
        {/* `Row` has no public `height` prop (only `Stack` does) - it fills
            the outer Stack's height via `grow`, exactly like `ScrollArea`
            does further down. See docs/architecture.md#box for why each
            primitive's prop surface is deliberately asymmetric. */}
        <Stack height="full">
          <Row grow>
            <Sidebar activeItem={activeNavItem} onSelect={setActiveNavItem} />

            <Stack height="full" grow>
              <Header
                theme={themeName}
                onThemeChange={setThemeName}
                rtl={rtl}
                onToggleRtl={() => setRtl((v) => !v)}
              />

              <ScrollArea grow>
                <ProjectGrid />
              </ScrollArea>
            </Stack>
          </Row>
        </Stack>
      </ThemeProvider>
    </div>
  );
}

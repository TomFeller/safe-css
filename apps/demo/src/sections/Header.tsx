import { Box, Overlay, Row, Sticky } from "@safe-css/core";
import { Avatar, StatusIndicator } from "../components/Avatar";
import { ThemeSwitcher } from "../components/ThemeSwitcher";
import type { ThemePresetName } from "../theme/presets";

export function Header({
  theme,
  onThemeChange,
  rtl,
  onToggleRtl,
}: {
  theme: ThemePresetName;
  onThemeChange: (name: ThemePresetName) => void;
  rtl: boolean;
  onToggleRtl: () => void;
}) {
  return (
    <Sticky edge="top">
      <Box as="header" padding="card" background="surface" border="subtle">
        <Row align="center" justify="between" gap="element" wrap="when-needed">
          <Row align="center" gap="section" wrap="when-needed">
            <strong>Projects</strong>
            <ThemeSwitcher active={theme} onChange={onThemeChange} />
          </Row>

          <Row align="center" gap="element">
            <Box
              as="button"
              onClick={onToggleRtl}
              paddingInline="element"
              paddingBlock="control"
              radius="control"
              border="subtle"
              background="surface"
              unsafeCss={{ cursor: "pointer", font: "inherit" }}
            >
              {rtl ? "LTR" : "RTL"}
            </Box>

            <Overlay>
              <Avatar initials="TF" />
              <Overlay.Item anchor="top-end" placement="edge">
                <StatusIndicator tone="action" />
              </Overlay.Item>
            </Overlay>
          </Row>
        </Row>
      </Box>
    </Sticky>
  );
}

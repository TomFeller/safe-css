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
            {/*
              `id` and `className` here are harmless, ordinary consumer hooks
              - not styled by safe-css, not read by anything in this demo.
              They exist so the Inspector's "External hooks" panel has
              something real to show: select this button and it should
              report `id="rtl-toggle"` and `className="qa-rtl-toggle"` as
              external, separate from `fw-Box` (its own framework class).
            */}
            <Box
              as="button"
              id="rtl-toggle"
              className="qa-rtl-toggle"
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

            {/*
              inlineOffset/blockOffset (v0.4) pull the status dot in by
              different amounts on each axis - independently of one
              another, and correctly logical under the RTL toggle above.
            */}
            <Overlay>
              <Avatar initials="TF" />
              <Overlay.Item
                anchor="top-end"
                placement="edge"
                inlineOffset="control"
                blockOffset="element"
              >
                <StatusIndicator tone="action" />
              </Overlay.Item>
            </Overlay>
          </Row>
        </Row>
      </Box>
    </Sticky>
  );
}

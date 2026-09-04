import { Row } from "@safe-css/core";
import { Button } from "./Button";
import { themePresets, type ThemePresetName } from "../theme/presets";

const LABELS: Record<ThemePresetName, string> = {
  default: "Default",
  compact: "Compact",
  vibrant: "Vibrant",
};

export function ThemeSwitcher({
  active,
  onChange,
}: {
  active: ThemePresetName;
  onChange: (name: ThemePresetName) => void;
}) {
  return (
    <Row gap="control" wrap="when-needed">
      {(Object.keys(themePresets) as ThemePresetName[]).map((name) => (
        <Button
          key={name}
          tone={name === active ? "action" : "neutral"}
          onClick={() => onChange(name)}
        >
          {LABELS[name]}
        </Button>
      ))}
    </Row>
  );
}

import { Box, Row, ScrollArea, Stack } from "@safe-css/core";

const NAV_SECTIONS: Array<{ label: string; items: string[] }> = [
  { label: "Workspace", items: ["Overview", "Projects", "Tasks", "Timeline"] },
  { label: "Team", items: ["Members", "Roles", "Invitations"] },
  { label: "Insights", items: ["Reports", "Activity", "Exports"] },
];

export function Sidebar({
  activeItem,
  onSelect,
}: {
  activeItem: string;
  onSelect: (item: string) => void;
}) {
  return (
    <Stack as="nav" aria-label="Primary" width="sidebar" height="full">
      <Box padding="card" border="subtle">
        <Row align="center" gap="control">
          <Box
            width="control"
            height="control"
            radius="control"
            background="action"
            color="surface"
            unsafeCss={{ display: "grid", placeItems: "center", fontWeight: 700 }}
          >
            sc
          </Box>
          <strong>safe-css</strong>
        </Row>
      </Box>

      <ScrollArea grow>
        <Box padding="card">
          <Stack gap="section">
            {NAV_SECTIONS.map((section) => (
              <Stack key={section.label} gap="control">
                <Box
                  paddingInline="control"
                  color="textMuted"
                  unsafeCss={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.06em" }}
                >
                  {section.label}
                </Box>
                <Stack gap="none">
                  {section.items.map((item) => {
                    const active = item === activeItem;
                    return (
                      <Box
                        key={item}
                        as="button"
                        onClick={() => onSelect(item)}
                        paddingInline="control"
                        paddingBlock="control"
                        radius="control"
                        background={active ? "surfaceRaised" : "surface"}
                        color={active ? "action" : "text"}
                        border="none"
                        unsafeCss={{ cursor: "pointer", textAlign: "start", font: "inherit" }}
                      >
                        {item}
                      </Box>
                    );
                  })}
                </Stack>
              </Stack>
            ))}
          </Stack>
        </Box>
      </ScrollArea>
    </Stack>
  );
}

import { Box, Grid, Row, Stack } from "@safe-css/core";
import { Card } from "../components/Card";
import { Button } from "../components/Button";
import { StatusIndicator } from "../components/Avatar";

interface Project {
  name: string;
  description: string;
  status: "on-track" | "attention";
  tasks: string;
}

const PROJECTS: Project[] = [
  {
    name: "Design System",
    description: "Token architecture and primitive audit.",
    status: "on-track",
    tasks: "12 / 18",
  },
  {
    name: "Billing Revamp",
    description: "Usage-based pricing rollout.",
    status: "attention",
    tasks: "4 / 20",
  },
  {
    name: "Mobile Onboarding",
    description: "First-run flow and empty states.",
    status: "on-track",
    tasks: "9 / 9",
  },
  {
    name: "Search Relevance",
    description: "Ranking model evaluation.",
    status: "on-track",
    tasks: "6 / 14",
  },
  {
    name: "Data Export",
    description: "CSV/JSON export for reports.",
    status: "attention",
    tasks: "2 / 11",
  },
  {
    name: "Accessibility Pass",
    description: "Keyboard nav and contrast audit.",
    status: "on-track",
    tasks: "15 / 15",
  },
];

function ProjectCard({ project }: { project: Project }) {
  const raised = project.status === "attention";
  return (
    <Card tone={raised ? "raised" : "default"}>
      <Stack gap="element">
        <Row align="center" justify="between">
          <strong>{project.name}</strong>
          <Row align="center" gap="control">
            <StatusIndicator tone={raised ? "danger" : "action"} />
            <Box color="textMuted" unsafeCss={{ fontSize: 12 }}>
              {raised ? "Needs attention" : "On track"}
            </Box>
          </Row>
        </Row>

        <Box color="textMuted">{project.description}</Box>

        <Row align="center" justify="between">
          <Box color="textMuted" unsafeCss={{ fontSize: 13 }}>
            {project.tasks} tasks
          </Box>
          <Button tone="neutral">Open</Button>
        </Row>
      </Stack>
    </Card>
  );
}

export function ProjectGrid() {
  return (
    <Box padding="page">
      <Stack gap="section">
        <Row gap="control" align="center" justify="between" wrap="when-needed">
          <Stack gap="none">
            {/* No `margin: 0` needed here: every safe-css primitive - including
                `as="h1"` - is scoped-normalized to zero margin. See
                docs/architecture.md#scoped-normalization. */}
            <Box as="h1" unsafeCss={{ fontSize: 20 }}>
              Active projects
            </Box>
            <Box color="textMuted">Everything your team is shipping this quarter.</Box>
          </Stack>

          <Row gap="control" wrap="when-needed">
            <Button tone="neutral">Filter</Button>
            <Button tone="action">New project</Button>
          </Row>
        </Row>

        <Grid minItemWidth="card" gap="card">
          {PROJECTS.map((project) => (
            <ProjectCard key={project.name} project={project} />
          ))}
        </Grid>
      </Stack>
    </Box>
  );
}

# @safe-css/core

**CSS you can safely change.** A semantic layout and theming framework for React — primitives for behavior (`Stack`, `Row`, `Grid`, `ScrollArea`, `Sticky`, `Overlay`), tokens instead of raw values, and a deterministic style precedence with no CSS specificity involved. Recipes (`defineRecipe`) can also declare native `hover`/`focus-visible`/`active` interaction styling — real CSS pseudo-classes, no JavaScript event tracking.

```bash
npm install @safe-css/core react react-dom
```

```tsx
import "@safe-css/core/styles.css";
import { ThemeProvider, createTheme, Stack, Box } from "@safe-css/core";

const theme = createTheme();

function App() {
  return (
    <ThemeProvider theme={theme}>
      <Stack gap="section">
        <Box padding="card" background="surface" radius="card">
          Hello
        </Box>
      </Stack>
    </ThemeProvider>
  );
}
```

Full documentation, the complete API reference, and a realistic demo app live in this repository — see the root [README](../../README.md) and [`docs/architecture.md`](../../docs/architecture.md).

import { Box, Stack, type ColorToken } from "@safe-css/core";

/**
 * Centering initials inside a circle needs no escape hatch: `Box` handles
 * the circular surface (radius, background), and a nested `Stack` handles
 * alignment - composition of two primitives instead of reaching for raw CSS.
 * `Stack` (not `Row`) on purpose: only `Stack` exposes a `height` prop, and
 * that's what makes `justify="center"` have room to center within.
 */
export function Avatar({ initials, tone = "action" }: { initials: string; tone?: ColorToken }) {
  return (
    <Box width="control" height="control" radius="pill" background={tone} color="surface">
      <Stack align="center" justify="center" height="full">
        {initials}
      </Stack>
    </Box>
  );
}

/**
 * A decorative status dot. There is no semantic token for "badge dot
 * diameter" - that's a purely cosmetic, one-off size, so `unsafeCss` is the
 * right tool here rather than inventing a new size token for a single use.
 */
export function StatusIndicator({ tone = "action" }: { tone?: ColorToken }) {
  return (
    <Box
      radius="pill"
      background={tone}
      border="strong"
      unsafeCss={{ width: 10, height: 10 }}
      aria-hidden="true"
    />
  );
}

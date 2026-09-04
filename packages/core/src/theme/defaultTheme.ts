import type { Theme } from "./types";

/**
 * The built-in default theme. `createTheme()` merges its input over this, so
 * every app gets a complete, valid theme even if only a few tokens are
 * customized.
 */
export const defaultTheme: Theme = {
  colors: {
    text: "#202124",
    textMuted: "#6b7280",

    surface: "#ffffff",
    surfaceRaised: "#f8fafc",

    border: "#e5e7eb",

    action: "#2563eb",
    danger: "#dc2626",
  },

  space: {
    none: "0px",

    control: "8px",
    element: "12px",
    card: "16px",
    section: "24px",

    page: "clamp(16px, 3vw, 32px)",
  },

  radius: {
    none: "0px",

    control: "6px",
    card: "12px",
    modal: "16px",
    pill: "999px",
  },

  size: {
    sidebar: "280px",
    card: "260px",
    content: "1200px",
    control: "40px",
  },

  // `border.subtle` intentionally references `--fw-color-border` rather than
  // repeating its literal value: they represent the *same* design decision
  // ("what color is a subtle border"), so changing `colors.border` must
  // change `border.subtle` too - see docs/architecture.md#token-dependencies.
  // `border.strong` is a deliberately independent decision (a visibly
  // stronger, unrelated shade for emphasis), so it stays a literal value.
  border: {
    subtle: "1px solid var(--fw-color-border)",
    strong: "1px solid #9ca3af",
  },

  shadow: {
    raised: "0 2px 8px rgba(0,0,0,.08)",
    overlay: "0 12px 40px rgba(0,0,0,.16)",
  },

  layer: {
    base: 0,
    sticky: 10,
    overlay: 20,
    modal: 30,
    toast: 40,
  },
};

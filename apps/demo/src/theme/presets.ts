import { createTheme, type Theme } from "@safe-css/core";

/**
 * Three named themes sharing the same token *names* but different values.
 * Switching between them in the demo (see ThemeSwitcher) changes every
 * consumer at once - Cards, buttons, the sidebar, the sticky header - purely
 * by re-rendering `<ThemeProvider theme={...}>` with a new value. No
 * component needs to know a theme change happened.
 */
export const themePresets = {
  default: createTheme(),

  compact: createTheme({
    space: {
      control: "6px",
      element: "8px",
      card: "12px",
      section: "16px",
    },
    radius: {
      control: "4px",
      card: "8px",
      modal: "10px",
    },
  }),

  vibrant: createTheme({
    colors: {
      action: "#7c3aed",
      surfaceRaised: "#faf5ff",
      border: "#e9d5ff",
    },
    radius: {
      control: "10px",
      card: "20px",
      modal: "24px",
    },
    shadow: {
      raised: "0 4px 16px rgba(124,58,237,.16)",
      overlay: "0 16px 48px rgba(124,58,237,.24)",
    },
  }),
} satisfies Record<string, Theme>;

export type ThemePresetName = keyof typeof themePresets;

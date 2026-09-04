/**
 * The token categories below are declared as separate interfaces (rather than
 * one big `Theme` interface with inline object types) so that consumers can
 * extend them via TypeScript declaration merging when they add custom tokens:
 *
 * ```ts
 * declare module "@safe-css/core" {
 *   interface ThemeSpaceTokens {
 *     xl: string;
 *   }
 * }
 * ```
 *
 * This keeps the default developer experience fully typed out of the box
 * (autocomplete for every token in the example theme) while still leaving a
 * documented escape valve for teams with a larger token set, without making
 * every primitive generic over an arbitrary theme shape.
 */

export interface ThemeColorTokens {
  text: string;
  textMuted: string;
  surface: string;
  surfaceRaised: string;
  border: string;
  action: string;
  danger: string;
}

export interface ThemeSpaceTokens {
  none: string;
  control: string;
  element: string;
  card: string;
  section: string;
  page: string;
}

export interface ThemeRadiusTokens {
  none: string;
  control: string;
  card: string;
  modal: string;
  pill: string;
}

export interface ThemeSizeTokens {
  sidebar: string;
  card: string;
  content: string;
  control: string;
}

export interface ThemeBorderTokens {
  subtle: string;
  strong: string;
}

export interface ThemeShadowTokens {
  raised: string;
  overlay: string;
}

export interface ThemeLayerTokens {
  base: number;
  sticky: number;
  overlay: number;
  modal: number;
  toast: number;
}

export interface Theme {
  colors: ThemeColorTokens;
  space: ThemeSpaceTokens;
  radius: ThemeRadiusTokens;
  size: ThemeSizeTokens;
  border: ThemeBorderTokens;
  shadow: ThemeShadowTokens;
  layer: ThemeLayerTokens;
}

export type ThemeCategory = keyof Theme;

export type SpaceToken = keyof Theme["space"];
export type ColorToken = keyof Theme["colors"];
export type RadiusToken = keyof Theme["radius"];
export type SizeToken = keyof Theme["size"];
export type BorderToken = keyof Theme["border"];
export type ShadowToken = keyof Theme["shadow"];
export type LayerToken = keyof Theme["layer"];

/** Deep-partial input accepted by `createTheme`, merged over the built-in defaults. */
export type ThemeInput = {
  [K in keyof Theme]?: Partial<Theme[K]>;
};

export type DiagnosticsMode = "off" | "warn";

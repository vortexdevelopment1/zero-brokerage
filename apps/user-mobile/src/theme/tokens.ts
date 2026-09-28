/**
 * Zero Brokerage User Mobile App — Centralized Semantic Design Tokens
 *
 * Visual Direction:
 * - Premium, calm, modern, editorial, spacious, elegant, neutral, image-forward.
 * - Restrained motion, comfortable visual hierarchy, accessible contrast.
 * - Authoritative design source: blueprints/02-user-app/
 */

export const colors = {
  // Canvas & Surfaces
  canvas: "#FFFFFF",
  canvasDark: "#09090B",
  surface: "#FFFFFF",
  mutedSurface: "#F4F4F5",
  surfaceMuted: "#F4F4F5",
  surfaceSubtle: "#FAFAFA",

  // Content Hierarchy (Text & Icons)
  primaryContent: "#09090B",
  secondaryContent: "#71717A",
  mutedContent: "#A1A1AA",
  inverseContent: "#FFFFFF",

  // Borders & Separators
  subtleBorder: "#F4F4F5",
  defaultBorder: "#E4E4E7",
  strongBorder: "#D4D4D8",

  // Brand Palette (Nautical Trust Blue & Architectural Amber)
  brand: {
    DEFAULT: "#0A3C61",
    primary: "#0A3C61",
    dark: "#062A45",
    light: "#E3F0FA",
    hover: "#0E4F80",
    accent: "#D3822A",
    accentLight: "#FCEFD8",
  },

  // Interactive Controls
  interactive: {
    DEFAULT: "#0A3C61",
    hover: "#0E4F80",
    pressed: "#062A45",
  },

  // State: Disabled
  disabled: {
    background: "#F4F4F5",
    content: "#A1A1AA",
    border: "#E4E4E7",
  },

  // State: Success
  success: {
    DEFAULT: "#159862",
    light: "#E1F5EB",
    text: "#0F7A4E",
    border: "#A3E0C4",
  },

  // State: Warning
  warning: {
    DEFAULT: "#C07A00",
    light: "#FCEFD8",
    text: "#9A5B00",
    border: "#F7D69B",
  },

  // State: Error / Destructive
  error: {
    DEFAULT: "#D33A2E",
    light: "#FBE7E5",
    text: "#B3261E",
    border: "#F6B3AD",
  },

  // State: Information
  info: {
    DEFAULT: "#1877BE",
    light: "#E3F0FA",
    text: "#0E4F80",
    border: "#B8D9F0",
  },

  // Overlays & Scrims
  overlay: "rgba(9, 9, 11, 0.5)",
  overlaySubtle: "rgba(9, 9, 11, 0.25)",
} as const;

export const spacing = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
} as const;

export const shape = {
  small: 4,
  medium: 8,
  large: 12,
  extraLarge: 16,
  pill: 9999,
} as const;

export const elevation = {
  none: {
    shadowColor: "transparent",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  low: {
    shadowColor: "#09090B",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  medium: {
    shadowColor: "#09090B",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  high: {
    shadowColor: "#09090B",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 6,
  },
} as const;

export const motion = {
  fast: 150,
  normal: 250,
  slow: 400,
} as const;

export const typography = {
  display: {
    fontSize: 32,
    lineHeight: 40,
    fontWeight: "700" as const,
    letterSpacing: -0.5,
  },
  h1: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "700" as const,
    letterSpacing: -0.4,
  },
  h2: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: "600" as const,
    letterSpacing: -0.3,
  },
  h3: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: "600" as const,
    letterSpacing: -0.2,
  },
  title: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "600" as const,
    letterSpacing: -0.1,
  },
  bodyLarge: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "400" as const,
    letterSpacing: 0,
  },
  body: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "400" as const,
    letterSpacing: 0,
  },
  bodySmall: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "400" as const,
    letterSpacing: 0,
  },
  label: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "600" as const,
    letterSpacing: 0.2,
  },
  caption: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "400" as const,
    letterSpacing: 0.2,
  },
} as const;

export const tokens = {
  colors,
  spacing,
  shape,
  elevation,
  motion,
  typography,
} as const;

export type Colors = typeof colors;
export type Spacing = typeof spacing;
export type Shape = typeof shape;
export type Elevation = typeof elevation;
export type Motion = typeof motion;
export type Typography = typeof typography;
export type Tokens = typeof tokens;

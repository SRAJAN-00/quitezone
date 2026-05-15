import { Platform } from "react-native";

const lightAccent = "#7C3AED";
const darkAccent = "#A78BFA";

export const Colors = {
  light: {
    text: "#1C1C1E",
    background: "#F5F5F7",
    tint: lightAccent,
    icon: "#8E8E93",
    tabIconDefault: "#8E8E93",
    tabIconSelected: lightAccent,
    page: "#F5F5F7",
    pageAlt: "#EFEFF2",
    surface: "#FFFFFF",
    surfaceStrong: "#FAFAFB",
    panel: "#FFFFFF",
    panelMuted: "#F3F3F6",
    border: "#E5E5E5",
    borderStrong: "#D8D8D8",
    muted: "#8E8E93",
    mutedStrong: "#636366",
    accent: lightAccent,
    accentSoft: "#F3E8FF",
    accentTextOn: "#FFFFFF",
    heroText: "#1C1C1E",
    heroSubtitle: "#8E8E93",
    heroGradientStart: "#FFFFFF",
    heroGradientEnd: "#E5E5E5",
    success: "#16A34A",
    warning: "#B45309",
    danger: "#DC2626",
    input: "#FFFFFF",
    placeholder: "#A1A1AA",
    tabBar: "rgba(245, 245, 247, 0.92)",
    overlay: "rgba(28, 28, 30, 0.14)",
  },
  dark: {
    text: "#F8F8FA",
    background: "#0B0B0C",
    tint: darkAccent,
    icon: "#9CA3AF",
    tabIconDefault: "#6B7280",
    tabIconSelected: darkAccent,
    page: "#111113",
    pageAlt: "#1A1A1F",
    surface: "#1B1B21",
    surfaceStrong: "#23232B",
    panel: "#1B1B21",
    panelMuted: "#262630",
    border: "#2D2D37",
    borderStrong: "#3B3B47",
    muted: "#9CA3AF",
    mutedStrong: "#D1D5DB",
    accent: darkAccent,
    accentSoft: "#2A213E",
    accentTextOn: "#0B0B0C",
    heroText: "#F8F8FA",
    heroSubtitle: "#9CA3AF",
    heroGradientStart: "#1B1B21",
    heroGradientEnd: "#2D2D37",
    success: "#34D399",
    warning: "#FBBF24",
    danger: "#F87171",
    input: "#16161B",
    placeholder: "#6B7280",
    tabBar: "rgba(11, 11, 12, 0.9)",
    overlay: "rgba(0, 0, 0, 0.7)",
  },
};

export type ColorSchemeName = keyof typeof Colors;
export type QuietTheme = (typeof Colors)["light"];

export function getTheme(colorScheme: ColorSchemeName | null | undefined) {
  return Colors[colorScheme ?? "light"];
}

export const Radius = {
  sm: 10,
  md: 16,
  lg: 24,
  pill: 999,
  full: 999,
};

export const Spacing = {
  xs: 10,
  sm: 14,
  md: 20,
  lg: 24,
  xl: 32,
  xxl: 40,
};

export const Fonts = Platform.select({
  ios: {
    sans: "system-ui",
    serif: "ui-serif",
    rounded: "ui-rounded",
    mono: "ui-monospace",
  },
  default: {
    sans: "normal",
    serif: "serif",
    rounded: "normal",
    mono: "monospace",
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'Avenir Next Rounded', 'Trebuchet MS', 'Segoe UI', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, monospace",
  },
});

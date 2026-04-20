import { Platform } from "react-native";

const lightAccent = "#2F80ED";
const darkAccent = "#4D9BFF";

export const Colors = {
  light: {
    text: "#000000",
    background: "#F2F4F7",
    tint: lightAccent,
    icon: "#666666",
    tabIconDefault: "#999999",
    tabIconSelected: lightAccent,
    page: "#F2F4F7",
    pageAlt: "#E5E7EB",
    surface: "#FFFFFF",
    surfaceStrong: "#FFFFFF",
    panel: "#FFFFFF",
    panelMuted: "#F9FAFB",
    border: "#E5E7EB",
    borderStrong: "#D1D5DB",
    muted: "#6B7280",
    mutedStrong: "#374151",
    accent: lightAccent,
    accentSoft: "#E0EFFC", // very soft blue background
    accentTextOn: "#FFFFFF",
    success: "#10B981",
    warning: "#F59E0B",
    danger: "#EF4444",
    input: "#F9FAFB",
    placeholder: "#9CA3AF",
    tabBar: "#FFFFFF",
    overlay: "rgba(0, 0, 0, 0.05)",
  },
  dark: {
    text: "#FFFFFF",
    background: "#000000",
    tint: darkAccent,
    icon: "#A1A1AA",
    tabIconDefault: "#71717A",
    tabIconSelected: darkAccent,
    page: "#000000",
    pageAlt: "#09090B",
    surface: "#18181B",
    surfaceStrong: "#27272A",
    panel: "#18181B",
    panelMuted: "#09090B",
    border: "#27272A",
    borderStrong: "#3F3F46",
    muted: "#A1A1AA",
    mutedStrong: "#D4D4D8",
    accent: darkAccent,
    accentSoft: "#192B4D",
    accentTextOn: "#000000",
    success: "#34D399",
    warning: "#FBBF24",
    danger: "#F87171",
    input: "#27272A",
    placeholder: "#71717A",
    tabBar: "#000000",
    overlay: "rgba(0, 0, 0, 0.4)",
  },
};

export type ColorSchemeName = keyof typeof Colors;
export type QuietTheme = (typeof Colors)["light"];

export function getTheme(colorScheme: ColorSchemeName | null | undefined) {
  return Colors[colorScheme ?? "light"];
}

export const Radius = {
  sm: 16,
  md: 24,
  lg: 32,
  pill: 999,
};

export const Spacing = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
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

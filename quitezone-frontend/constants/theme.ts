import { Platform } from "react-native";

const lightAccent = "#09090B"; // zinc-950
const darkAccent = "#FAFAFA"; // zinc-50

export const Colors = {
  light: {
    text: "#09090B",
    background: "#FFFFFF",
    tint: lightAccent,
    icon: "#71717A", // zinc-500
    tabIconDefault: "#A1A1AA", // zinc-400
    tabIconSelected: lightAccent,
    page: "#FAFAFA", // zinc-50
    pageAlt: "#F4F4F5", // zinc-100
    surface: "#FFFFFF",
    surfaceStrong: "#FFFFFF",
    panel: "#FFFFFF",
    panelMuted: "#F4F4F5",
    border: "#E4E4E7", // zinc-200
    borderStrong: "#D4D4D8", // zinc-300
    muted: "#71717A", // zinc-500
    mutedStrong: "#3F3F46", // zinc-700
    accent: lightAccent,
    accentSoft: "#F4F4F5", // zinc-100
    accentTextOn: "#FAFAFA",
    success: "#10B981", // emerald-500
    warning: "#F59E0B", // amber-500
    danger: "#EF4444", // red-500
    input: "#FFFFFF",
    placeholder: "#A1A1AA", // zinc-400
    tabBar: "#FFFFFF",
    overlay: "rgba(0, 0, 0, 0.05)",
  },
  dark: {
    text: "#FAFAFA",
    background: "#09090B",
    tint: darkAccent,
    icon: "#A1A1AA", // zinc-400
    tabIconDefault: "#71717A", // zinc-500
    tabIconSelected: darkAccent,
    page: "#09090B",
    pageAlt: "#18181B", // zinc-900
    surface: "#09090B",
    surfaceStrong: "#18181B",
    panel: "#09090B",
    panelMuted: "#18181B",
    border: "#27272A", // zinc-800
    borderStrong: "#3F3F46", // zinc-700
    muted: "#A1A1AA", // zinc-400
    mutedStrong: "#D4D4D8", // zinc-300
    accent: darkAccent,
    accentSoft: "#27272A", // zinc-800
    accentTextOn: "#09090B",
    success: "#34D399",
    warning: "#FBBF24",
    danger: "#F87171",
    input: "#09090B",
    placeholder: "#71717A",
    tabBar: "#09090B",
    overlay: "rgba(0, 0, 0, 0.4)",
  },
};

export type ColorSchemeName = keyof typeof Colors;
export type QuietTheme = (typeof Colors)["light"];

export function getTheme(colorScheme: ColorSchemeName | null | undefined) {
  return Colors[colorScheme ?? "light"];
}

export const Radius = {
  sm: 6,
  md: 8,
  lg: 12,
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

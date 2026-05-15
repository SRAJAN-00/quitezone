import { useThemeContext } from "@/context/theme-context";

export function useColorScheme() {
  const { colorScheme } = useThemeContext();
  return colorScheme;
}

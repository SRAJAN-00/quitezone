import React, { createContext, useContext, useEffect, useState } from "react";
import { useColorScheme as useDeviceColorScheme } from "react-native";
import * as SecureStore from "expo-secure-store";

type ColorSchemeName = "light" | "dark";

type ThemeContextType = {
  colorScheme: ColorSchemeName;
  toggleTheme: () => void;
  setTheme: (theme: ColorSchemeName) => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_KEY = "quitezone-theme-preference";

export function AppThemeProvider({ children }: { children: React.ReactNode }) {
  const deviceScheme = useDeviceColorScheme() ?? "light";
  const [colorScheme, setColorScheme] = useState<ColorSchemeName>(deviceScheme);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    SecureStore.getItemAsync(THEME_KEY).then((savedTheme) => {
      if (savedTheme === "light" || savedTheme === "dark") {
        setColorScheme(savedTheme as ColorSchemeName);
      }
      setIsLoaded(true);
    });
  }, []);

  const toggleTheme = () => {
    setColorScheme((prev) => {
      const next = prev === "light" ? "dark" : "light";
      SecureStore.setItemAsync(THEME_KEY, next);
      return next;
    });
  };

  const setTheme = (theme: ColorSchemeName) => {
    setColorScheme(theme);
    SecureStore.setItemAsync(THEME_KEY, theme);
  };

  // Prevent flashing before theme is loaded
  if (!isLoaded) return null;

  return (
    <ThemeContext.Provider value={{ colorScheme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useThemeContext() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useThemeContext must be used within an AppThemeProvider");
  }
  return context;
}

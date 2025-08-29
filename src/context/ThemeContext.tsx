import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface Theme {
  colors: {
    background: string;
    surface: string;
    primary: string;
    secondary: string;
    accent: string;
    text: string;
    textSecondary: string;
    border: string;
    placeholder: string;
    shadow: string;
    card: string;
    success: string;
    warning: string;
    error: string;
  };
}

export const lightTheme: Theme = {
  colors: {
    background: "#f8f9fa",
    surface: "#ffffff",
    primary: "#FF3B30",
    secondary: "#5856D6",
    accent: "#FF9500",
    text: "#000000",
    textSecondary: "#666666",
    border: "#E5E5EA",
    placeholder: "#C7C7CC",
    shadow: "#000000",
    card: "#ffffff",
    success: "#34C759",
    warning: "#FF9500",
    error: "#FF3B30",
  },
};

export const darkTheme: Theme = {
  colors: {
    background: "#000000",
    surface: "#1C1C1E",
    primary: "#FF453A",
    secondary: "#5E5CE6",
    accent: "#FF9F0A",
    text: "#FFFFFF",
    textSecondary: "#8E8E93",
    border: "#38383A",
    placeholder: "#8E8E93",
    shadow: "#000000",
    card: "#2C2C2E",
    success: "#30D158",
    warning: "#FF9F0A",
    error: "#FF453A",
  },
};

interface ThemeContextType {
  theme: Theme;
  isDarkMode: boolean;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = "@theme_mode";

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [isDarkMode, setIsDarkMode] = useState(true); // Default to dark mode

  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      if (savedTheme !== null) {
        setIsDarkMode(JSON.parse(savedTheme));
      }
    } catch (error) {
      console.error("Failed to load theme:", error);
    }
  };

  const saveTheme = async (darkMode: boolean) => {
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(darkMode));
    } catch (error) {
      console.error("Failed to save theme:", error);
    }
  };

  const toggleTheme = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    saveTheme(newMode);
  };

  const currentTheme = isDarkMode ? darkTheme : lightTheme;

  return (
    <ThemeContext.Provider
      value={{ theme: currentTheme, isDarkMode, toggleTheme }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}

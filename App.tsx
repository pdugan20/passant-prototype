import React from "react";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import AppNavigator from "./src/navigation/AppNavigator";
import { NotesProvider } from "./src/context/NotesContext";
import { ThemeProvider, useTheme } from "./src/context/ThemeContext";

function AppContent() {
  const { isDarkMode, theme: _theme } = useTheme();

  return (
    <>
      <AppNavigator />
      <StatusBar style={isDarkMode ? "light" : "dark"} animated={true} />
    </>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <NotesProvider>
          <AppContent />
        </NotesProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

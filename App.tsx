import React from "react";
import { StatusBar } from "expo-status-bar";
import { View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import AppNavigator from "./src/navigation/AppNavigator";
import { NotesProvider } from "./src/context/NotesContext";
import { ThemeProvider, useTheme } from "./src/context/ThemeContext";

function AppContent() {
  const { isDarkMode, theme } = useTheme();

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <AppNavigator />
      <StatusBar style={isDarkMode ? "light" : "dark"} animated={true} />
    </View>
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

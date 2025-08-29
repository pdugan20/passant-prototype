import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert } from "react-native";
import { useNotes } from "../context/NotesContext";
import { useTheme } from "../context/ThemeContext";
import * as Haptics from "expo-haptics";

export default function ActivityScreen() {
  const { notes, clearAllNotes } = useNotes();
  const { theme, isDarkMode } = useTheme();

  const handleReset = () => {
    Alert.alert(
      "Reset Prototype",
      `This will delete all ${notes.length} saved notes and reset the app to its initial state. This cannot be undone.`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Reset",
          style: "destructive",
          onPress: async () => {
            await clearAllNotes();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ],
      {
        userInterfaceStyle: isDarkMode ? "dark" : "light",
      },
    );
  };

  const styles = createStyles(theme);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Activity</Text>
      <Text style={styles.subtitle}>Recent activity will appear here</Text>

      <TouchableOpacity onPress={handleReset} style={styles.resetButton}>
        <Text style={styles.resetText}>Reset prototype</Text>
      </TouchableOpacity>
    </View>
  );
}

const createStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
      alignItems: "center",
      justifyContent: "center",
    },
    title: {
      fontSize: 24,
      fontWeight: "bold",
      color: theme.colors.text,
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 16,
      color: theme.colors.textSecondary,
    },
    resetButton: {
      position: "absolute",
      bottom: 50,
      paddingVertical: 8,
      paddingHorizontal: 16,
      borderWidth: 1,
      borderColor: theme.colors.error,
      borderRadius: 50,
      minWidth: 120,
      alignItems: "center",
    },
    resetText: {
      color: theme.colors.error,
      fontSize: 14,
      fontWeight: "600",
    },
  });

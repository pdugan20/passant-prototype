import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";

interface MentionPillProps {
  text: string;
  type?: "location" | "person" | "restaurant";
}

const getIconForType = (type: string) => {
  switch (type) {
    case "location":
      return "location";
    case "person":
      return "person";
    case "restaurant":
      return "restaurant";
    default:
      return "at";
  }
};

export default function MentionPill({
  text,
  type = "location",
}: MentionPillProps) {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  return (
    <View style={styles.pill}>
      <Ionicons
        name={getIconForType(type)}
        size={12}
        color={theme.colors.primary}
        style={styles.icon}
      />
      <Text style={styles.text}>{text}</Text>
    </View>
  );
}

const createStyles = (theme: any) =>
  StyleSheet.create({
    pill: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.colors.primary + "20",
      borderColor: theme.colors.primary,
      borderWidth: 1,
      borderRadius: 12,
      paddingHorizontal: 8,
      paddingVertical: 4,
      marginHorizontal: 2,
    },
    icon: {
      marginRight: 4,
    },
    text: {
      fontSize: 14,
      color: theme.colors.primary,
      fontWeight: "500",
    },
  });

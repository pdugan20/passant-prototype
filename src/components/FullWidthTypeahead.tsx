import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
  Platform,
} from "react-native";
import * as Symbols from "expo-symbols";
import Animated, {
  useAnimatedStyle,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { useTheme } from "../context/ThemeContext";
import * as Haptics from "expo-haptics";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

interface Suggestion {
  id: string;
  name: string;
  address: string;
}

interface FullWidthTypeaheadProps {
  visible: boolean;
  suggestions: Suggestion[];
  onSelect: (suggestion: Suggestion) => void;
  onClose?: () => void;
  keyword?: string;
  keyboardHeight?: number;
}

export default function FullWidthTypeahead({
  visible,
  suggestions,
  onSelect,
  onClose: _onClose,
  keyword = "",
  keyboardHeight = 0,
}: FullWidthTypeaheadProps) {
  const { theme, isDarkMode } = useTheme();
  const styles = createStyles(theme, isDarkMode);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          translateY: withTiming(visible ? 0 : 500, {
            duration: 250,
            easing: Easing.out(Easing.cubic),
          }),
        },
      ],
    };
  });

  const handleSelect = (suggestion: Suggestion) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSelect(suggestion);
  };

  const filteredSuggestions = suggestions.filter((suggestion) =>
    suggestion.name.toLowerCase().includes(keyword.toLowerCase()),
  );

  const showPlaceholder = keyword === "" && filteredSuggestions.length > 0;

  return (
    <Animated.View
      style={[
        styles.container,
        animatedStyle,
        keyboardHeight > 0 ? { bottom: keyboardHeight - 20 } : {}, // Adjust to extend behind keyboard
      ]}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          showPlaceholder && styles.placeholderContent,
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={!showPlaceholder}
      >
        {showPlaceholder ? (
          <View style={styles.placeholderState}>
            <Symbols.SymbolView
              name="mappin"
              size={48}
              tintColor={theme.colors.textSecondary}
              style={styles.placeholderIcon}
            />
            <Text style={styles.placeholderText}>
              Add a bar, restaurant, or another{"\n"}favorite place to this
              list.
            </Text>
          </View>
        ) : filteredSuggestions.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No locations found</Text>
          </View>
        ) : (
          filteredSuggestions.map((suggestion, index) => (
            <TouchableOpacity
              key={suggestion.id}
              style={styles.suggestionItem}
              onPress={() => handleSelect(suggestion)}
              activeOpacity={0.7}
            >
              <View style={styles.suggestionContent}>
                <Text style={styles.suggestionName}>{suggestion.name}</Text>
                <Text style={styles.suggestionAddress}>
                  {suggestion.address}
                </Text>
              </View>
              {index < filteredSuggestions.length - 1 && (
                <View style={styles.divider} />
              )}
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </Animated.View>
  );
}

const createStyles = (theme: any, _isDarkMode: boolean) =>
  StyleSheet.create({
    container: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: theme.colors.surface,
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      height: SCREEN_HEIGHT * 0.3 + 20, // Add extra height to extend behind keyboard
      maxHeight: 320,
      shadowColor: theme.colors.shadow,
      shadowOffset: {
        width: 0,
        height: -4,
      },
      shadowOpacity: 0.2,
      shadowRadius: 12,
      elevation: 12,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingTop: 12,
      paddingBottom: Platform.OS === "ios" ? 20 : 10,
    },
    placeholderContent: {
      flex: 1,
      justifyContent: "flex-start",
      paddingTop: 60,
    },
    placeholderState: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 20,
      paddingHorizontal: 40,
    },
    placeholderIcon: {
      marginBottom: 16,
    },
    placeholderText: {
      fontSize: 16,
      color: theme.colors.textSecondary,
      textAlign: "center",
      lineHeight: 22,
    },
    suggestionItem: {
      width: "100%",
    },
    suggestionContent: {
      paddingHorizontal: 20,
      paddingVertical: 16,
    },
    suggestionName: {
      fontSize: 17,
      fontWeight: "500",
      color: theme.colors.text,
      marginBottom: 4,
    },
    suggestionAddress: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      lineHeight: 18,
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: theme.colors.border,
      marginLeft: 20,
    },
    emptyState: {
      paddingVertical: 40,
      alignItems: "center",
    },
    emptyText: {
      fontSize: 16,
      color: theme.colors.textSecondary,
    },
  });

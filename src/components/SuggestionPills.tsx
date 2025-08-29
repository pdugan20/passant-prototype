import React, { useRef, useState, useEffect } from "react";
import {
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Animated,
  Easing,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";
import * as Haptics from "expo-haptics";

interface Suggestion {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
  template?: {
    title: string;
    content: string;
  };
}

interface SuggestionPillsProps {
  onSuggestionPress: (template: { title: string; content: string }) => void;
  onUndo?: () => void;
  showUpdatePill?: boolean;
  onUpdatePress?: () => void;
}

const SUGGESTIONS: Suggestion[] = [
  {
    id: "1",
    icon: "restaurant",
    text: "Best Italian restaurants in Seattle",
    template: {
      title: "Best Italian restaurants in Seattle",
      content:
        "Top-rated Italian spots with authentic cuisine and great atmosphere.\n\n• {@}[Canon](1)\n• {@}[The Walrus and the Carpenter](3)\n\nMake sure to get reservations in advance!",
    },
  },
  {
    id: "2",
    icon: "wine",
    text: "My favorite dive bars",
    template: {
      title: "My favorite dive bars",
      content:
        "Relaxed neighborhood bars with character and friendly crowds.\n\n• {@}[Bathtub Gin & Co](2)\n• {@}[Navy Strength](8)\n\nGreat for casual drinks with friends.",
    },
  },
  {
    id: "3",
    icon: "library",
    text: "Great Museums for kids",
    template: {
      title: "Great Museums for kids",
      content:
        "Interactive and educational museums that kids will love exploring.\n\n• Museum of Flight\n• Seattle Children's Museum\n• Pacific Science Center\n\nPerfect for educational family outings.",
    },
  },
  {
    id: "4",
    icon: "cafe",
    text: "Coffee shops with wifi",
    template: {
      title: "Coffee shops with wifi",
      content:
        "Reliable wifi and comfortable seating for remote work sessions.\n\n• {@}[Capitol Cider](17)\n• {@}[Unicorn](6)\n\nGreat for working remotely.",
    },
  },
  {
    id: "5",
    icon: "airplane",
    text: "Weekend getaway destinations",
    template: {
      title: "Weekend getaway destinations",
      content:
        "Scenic destinations within a few hours drive for mini adventures.\n\n• San Juan Islands\n• Mount Rainier National Park\n• Leavenworth\n\nPerfect for quick escapes from the city.",
    },
  },
  {
    id: "6",
    icon: "storefront",
    text: "Local farmers markets",
    template: {
      title: "Local farmers markets",
      content:
        "Weekly markets featuring fresh produce, artisan goods, and local vendors.\n\n• Pike Place Market\n• University District Farmers Market\n• Ballard Farmers Market\n\nFresh produce and local vendors.",
    },
  },
  {
    id: "7",
    icon: "fitness",
    text: "Best hiking trails nearby",
    template: {
      title: "Best hiking trails nearby",
      content:
        "Scenic trails with rewarding views, ranging from easy to moderate difficulty.\\n\\n• Mount Pilchuck\\n• Rattlesnake Ledge Trail\\n• Mount Si\\n\\nGreat for weekend outdoor adventures!",
    },
  },
  {
    id: "8",
    icon: "musical-notes",
    text: "Live music venues",
    template: {
      title: "Live music venues",
      content:
        "Intimate venues featuring local bands and touring acts across various genres.\\n\\n• {@}[The Crocodile](11)\\n• {@}[Witness Bar](14)\\n\\nCheck their calendars for upcoming shows!",
    },
  },
  {
    id: "9",
    icon: "car",
    text: "Road trip stops",
    template: {
      title: "Road trip stops",
      content:
        "Must-see stops for scenic drives and memorable photo opportunities.\\n\\n• Deception Pass Bridge\\n• Snoqualmie Falls\\n• Mount Rainier National Park\\n\\nPerfect for scenic drives and photo stops.",
    },
  },
  {
    id: "10",
    icon: "gift",
    text: "Unique gift shops",
    template: {
      title: "Unique gift shops",
      content:
        "Local shops and markets for discovering unique, handmade, and vintage treasures.\\n\\n• Pike Place Market crafts\\n• Fremont Sunday Market\\n• Capitol Hill vintage stores\\n\\nGreat for finding one-of-a-kind items.",
    },
  },
  {
    id: "11",
    icon: "pizza",
    text: "Late night food spots",
    template: {
      title: "Late night food spots",
      content:
        "Reliable spots that stay open late when hunger strikes after hours.\\n\\n• Dick's Drive-In\\n• 13 Coins Restaurant\\n• Bamboo Garden\\n\\nOpen late for those midnight cravings!",
    },
  },
  {
    id: "12",
    icon: "home",
    text: "Home improvement ideas",
    template: {
      title: "Home improvement ideas",
      content:
        "Simple projects to enhance comfort, functionality, and style in your living space.\\n\\n• Install smart home devices\\n• Create a reading nook\\n• Add plants for better air quality\\n\\nSmall changes that make a big difference.",
    },
  },
];

export default function SuggestionPills({
  onSuggestionPress,
  onUndo,
  showUpdatePill,
  onUpdatePress,
}: SuggestionPillsProps) {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const [showUndo, setShowUndo] = useState(false);
  const [_undoTemplate, setUndoTemplate] = useState<{
    title: string;
    content: string;
  } | null>(null);
  const [hasAnimatedUpdate, setHasAnimatedUpdate] = useState(false);

  // Animate in the update pill when it appears
  useEffect(() => {
    if (showUpdatePill && !hasAnimatedUpdate) {
      // Start from below and faded out
      slideAnim.setValue(30);
      fadeAnim.setValue(0);

      // Animate up and fade in
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 150,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 150,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]).start();

      setHasAnimatedUpdate(true);
    } else if (!showUpdatePill && hasAnimatedUpdate) {
      // Reset for next time
      setHasAnimatedUpdate(false);
    }
  }, [showUpdatePill, hasAnimatedUpdate, slideAnim, fadeAnim]);

  const handlePress = (suggestion: Suggestion) => {
    if (!suggestion.template) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Store the template for undo
    setUndoTemplate(suggestion.template);

    // Animate fade out and slight slide down
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 30, // Just slide down a little behind keyboard top
        duration: 150,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Populate the template
      onSuggestionPress(suggestion.template!);

      // Switch to undo pill and animate back up
      setTimeout(() => {
        setShowUndo(true);
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 150,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(slideAnim, {
            toValue: 0,
            duration: 150,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]).start();
      }, 100);
    });
  };

  const handleUndo = () => {
    if (onUndo) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      // Animate fade out and slight slide down
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 150,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 30,
          duration: 150,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]).start(() => {
        // Clear the note
        onUndo();

        // Reset state and animate back up with suggestion pills
        setTimeout(() => {
          setShowUndo(false);
          setUndoTemplate(null);
          Animated.parallel([
            Animated.timing(fadeAnim, {
              toValue: 1,
              duration: 150,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(slideAnim, {
              toValue: 0,
              duration: 150,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
          ]).start();
        }, 100);
      });
    }
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY: slideAnim }],
          opacity: fadeAnim,
        },
      ]}
    >
      {showUndo ? (
        // Undo pill - same container as suggestion pills for left alignment
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <TouchableOpacity
            style={styles.undoPill}
            onPress={handleUndo}
            activeOpacity={0.7}
          >
            <Ionicons
              name="arrow-undo"
              size={16}
              color={theme.colors.textSecondary}
              style={styles.icon}
            />
            <Text style={styles.undoText}>Undo</Text>
          </TouchableOpacity>
        </ScrollView>
      ) : showUpdatePill ? (
        // Update list description pill
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <TouchableOpacity
            style={styles.updatePill}
            onPress={() => {
              if (onUpdatePress) {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

                // Animate out before calling the handler
                Animated.parallel([
                  Animated.timing(fadeAnim, {
                    toValue: 0,
                    duration: 150,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                  }),
                  Animated.timing(slideAnim, {
                    toValue: 30,
                    duration: 150,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                  }),
                ]).start(() => {
                  onUpdatePress();
                });
              }
            }}
            activeOpacity={0.7}
          >
            <Ionicons
              name="sparkles"
              size={16}
              color={theme.colors.textSecondary}
              style={styles.icon}
            />
            <Text style={styles.updateText}>Update list description</Text>
          </TouchableOpacity>
        </ScrollView>
      ) : (
        // Suggestion pills
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {SUGGESTIONS.map((suggestion) => (
            <TouchableOpacity
              key={suggestion.id}
              style={styles.pill}
              onPress={() => handlePress(suggestion)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={suggestion.icon}
                size={16}
                color={theme.colors.textSecondary}
                style={styles.icon}
              />
              <Text style={styles.text}>{suggestion.text}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </Animated.View>
  );
}

const createStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      backgroundColor: "transparent",
      paddingVertical: 12,
    },
    scrollContent: {
      paddingLeft: 16,
      paddingRight: 0,
      gap: 0,
    },
    pill: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.colors.surface,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 20,
      shadowColor: theme.colors.shadow,
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
      borderWidth: 1,
      borderColor: theme.colors.border,
      marginRight: 16,
    },
    icon: {
      marginRight: 6,
    },
    text: {
      fontSize: 14,
      color: theme.colors.text,
      fontWeight: "500",
    },
    undoPill: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.colors.surface,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 20,
      shadowColor: theme.colors.shadow,
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
      borderWidth: 1,
      borderColor: theme.colors.border,
      marginRight: 16,
    },
    undoText: {
      fontSize: 14,
      color: theme.colors.text,
      fontWeight: "500",
    },
    updatePill: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.colors.surface,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 20,
      shadowColor: theme.colors.shadow,
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
      borderWidth: 1,
      borderColor: theme.colors.border,
      marginRight: 16,
    },
    updateText: {
      fontSize: 14,
      color: theme.colors.text,
      fontWeight: "500",
    },
  });

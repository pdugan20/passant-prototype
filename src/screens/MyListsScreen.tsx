import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  SectionList,
  Dimensions,
  Animated,
  PanResponder,
  Alert,
  Share,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { SymbolView } from "expo-symbols";
import { useNotes } from "../context/NotesContext";
import { useTheme } from "../context/ThemeContext";
import * as Haptics from "expo-haptics";

export default function MyListsScreen() {
  const navigation = useNavigation<any>();
  const { notes, deleteNote } = useNotes();
  const { theme, isDarkMode } = useTheme();
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const swipeableRefs = useRef<{ [key: string]: Animated.Value }>({});

  const handleNotePress = (noteId: string) => {
    // Close any open swipes first
    Object.keys(swipeableRefs.current).forEach((key) => {
      if (key !== noteId) {
        Animated.timing(swipeableRefs.current[key], {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }).start();
      }
    });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate("NoteEditor", { noteId });
  };

  const handleShare = async (item: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const message = `${item.title}\n\n${getPreviewText(item.content)}`;
      await Share.share({
        message,
        title: item.title,
      });
    } catch (error) {
      console.log("Error sharing:", error);
    }
  };

  const handleDelete = (item: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      `Delete ${item.title}?`,
      "Delete this list is a permanent action and cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await deleteNote(item.id);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ],
      {
        userInterfaceStyle: isDarkMode ? "dark" : "light",
      },
    );
  };

  const handleAddNote = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    navigation.navigate("NoteEditor", { noteId: null });
  };

  const _toggleViewMode = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setViewMode(viewMode === "list" ? "grid" : "list");
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const noteDate = new Date(date);
    const diffInDays = Math.floor(
      (now.getTime() - noteDate.getTime()) / (1000 * 3600 * 24),
    );

    if (diffInDays < 1) {
      return noteDate.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    } else if (diffInDays < 7) {
      return noteDate.toLocaleDateString("en-US", { weekday: "short" });
    } else {
      return noteDate.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
    }
  };

  const getCategoryForDate = (date: Date) => {
    const now = new Date();
    const noteDate = new Date(date);
    const diffInDays = Math.floor(
      (now.getTime() - noteDate.getTime()) / (1000 * 3600 * 24),
    );
    const diffInMonths =
      (now.getFullYear() - noteDate.getFullYear()) * 12 +
      (now.getMonth() - noteDate.getMonth());

    if (diffInDays < 1) {
      return "Today";
    } else if (diffInMonths < 1) {
      return "This Month";
    } else if (diffInMonths === 1) {
      return "Last Month";
    } else {
      return noteDate.toLocaleDateString("en-US", {
        month: "long",
        year:
          noteDate.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
      });
    }
  };

  const organizeNotesByDate = (notes: any[]) => {
    const grouped = notes.reduce(
      (acc, note) => {
        const category = getCategoryForDate(note.updatedAt);
        if (!acc[category]) {
          acc[category] = [];
        }
        acc[category].push(note);
        return acc;
      },
      {} as Record<string, any[]>,
    );

    const sectionOrder = ["Today", "This Month", "Last Month"];
    const sections: any[] = [];

    // Add predefined sections
    for (const section of sectionOrder) {
      if (grouped[section]) {
        sections.push({
          title: section,
          data: grouped[section].sort(
            (a: any, b: any) =>
              new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
          ),
        });
        delete grouped[section];
      }
    }

    // Add remaining months in chronological order
    const remainingKeys = Object.keys(grouped).sort((a: string, b: string) => {
      const dateA = new Date(grouped[a][0].updatedAt);
      const dateB = new Date(grouped[b][0].updatedAt);
      return dateB.getTime() - dateA.getTime();
    });

    for (const key of remainingKeys) {
      sections.push({
        title: key,
        data: grouped[key].sort(
          (a: any, b: any) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
        ),
      });
    }

    return sections;
  };

  const noteSections = organizeNotesByDate(notes);

  const getPreviewText = (content: string) => {
    // Extract @ mentions, keeping track of place names
    const mentions: string[] = [];
    const mentionRegex = /\{@\}\[([^\]]+)\]\([^)]+\)/g;
    let match;
    while ((match = mentionRegex.exec(content)) !== null) {
      mentions.push(match[1]);
    }

    // Remove mention syntax from content for preview
    const cleanContent = content.replace(mentionRegex, "");

    // Get the non-bullet text (everything after the bullets section)
    const lines = cleanContent.split("\n");
    const nonBulletLines = lines.filter((line) => !line.trim().startsWith("•"));
    const additionalText = nonBulletLines.join(" ").trim();

    // Combine mentions and any additional text
    const parts: string[] = [];
    if (mentions.length > 0) {
      parts.push(mentions.join(", "));
    }
    if (additionalText) {
      parts.push(additionalText);
    }

    return parts.join(" • ") || "Empty note";
  };

  // Create SwipeableRow component
  const SwipeableRow = ({
    item,
    children,
  }: {
    item: any;
    children: React.ReactNode;
  }) => {
    const translateX = useRef(new Animated.Value(0)).current;
    const shareScale = useRef(new Animated.Value(0)).current;
    const shareOpacity = useRef(new Animated.Value(0)).current;
    const deleteScale = useRef(new Animated.Value(0)).current;
    const deleteOpacity = useRef(new Animated.Value(0)).current;

    // Store ref for this item
    if (!swipeableRefs.current[item.id]) {
      swipeableRefs.current[item.id] = translateX;
    }

    const animateButtons = (show: boolean) => {
      if (show) {
        // Animate share button first
        Animated.parallel([
          Animated.spring(shareScale, {
            toValue: 1,
            useNativeDriver: true,
            tension: 65,
            friction: 7,
          }),
          Animated.timing(shareOpacity, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start();

        // Then animate delete button with delay
        setTimeout(() => {
          Animated.parallel([
            Animated.spring(deleteScale, {
              toValue: 1,
              useNativeDriver: true,
              tension: 65,
              friction: 7,
            }),
            Animated.timing(deleteOpacity, {
              toValue: 1,
              duration: 200,
              useNativeDriver: true,
            }),
          ]).start();
        }, 50);
      } else {
        // Hide both buttons
        Animated.parallel([
          Animated.timing(shareScale, {
            toValue: 0,
            duration: 150,
            useNativeDriver: true,
          }),
          Animated.timing(shareOpacity, {
            toValue: 0,
            duration: 150,
            useNativeDriver: true,
          }),
          Animated.timing(deleteScale, {
            toValue: 0,
            duration: 150,
            useNativeDriver: true,
          }),
          Animated.timing(deleteOpacity, {
            toValue: 0,
            duration: 150,
            useNativeDriver: true,
          }),
        ]).start();
      }
    };

    const panResponder = useRef(
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) => {
          return Math.abs(gestureState.dx) > 5;
        },
        onPanResponderGrant: () => {
          // Close other open swipes
          Object.keys(swipeableRefs.current).forEach((key) => {
            if (key !== item.id) {
              Animated.timing(swipeableRefs.current[key], {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
              }).start();
            }
          });
        },
        onPanResponderMove: (_, gestureState) => {
          // Only allow left swipe (negative dx)
          if (gestureState.dx < 0) {
            translateX.setValue(Math.max(gestureState.dx, -140));
            // Start showing buttons when swiped enough
            if (gestureState.dx < -30) {
              const progress = Math.min(1, Math.abs(gestureState.dx + 30) / 90);
              shareScale.setValue(progress * 0.8);
              shareOpacity.setValue(progress * 0.8);
              if (gestureState.dx < -70) {
                const deleteProgress = Math.min(
                  1,
                  Math.abs(gestureState.dx + 70) / 70,
                );
                deleteScale.setValue(deleteProgress * 0.8);
                deleteOpacity.setValue(deleteProgress * 0.8);
              }
            }
          }
        },
        onPanResponderRelease: (_, gestureState) => {
          if (gestureState.dx < -70) {
            // Snap to open position
            Animated.spring(translateX, {
              toValue: -140,
              useNativeDriver: true,
              tension: 40,
              friction: 8,
            }).start();
            animateButtons(true);
          } else {
            // Snap back to closed
            Animated.spring(translateX, {
              toValue: 0,
              useNativeDriver: true,
              tension: 40,
              friction: 8,
            }).start();
            animateButtons(false);
          }
        },
      }),
    ).current;

    return (
      <View style={styles.swipeableContainer}>
        <View style={styles.actionsContainer}>
          <Animated.View
            style={[
              styles.actionButtonWrapper,
              {
                transform: [{ scale: shareScale }],
                opacity: shareOpacity,
              },
            ]}
          >
            <TouchableOpacity
              style={[styles.actionButton, styles.shareButton]}
              onPress={() => {
                handleShare(item);
                Animated.timing(translateX, {
                  toValue: 0,
                  duration: 200,
                  useNativeDriver: true,
                }).start();
                animateButtons(false);
              }}
            >
              <Ionicons name="share-outline" size={20} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.actionText}>Share</Text>
          </Animated.View>

          <Animated.View
            style={[
              styles.actionButtonWrapper,
              {
                transform: [{ scale: deleteScale }],
                opacity: deleteOpacity,
              },
            ]}
          >
            <TouchableOpacity
              style={[styles.actionButton, styles.deleteButton]}
              onPress={() => {
                handleDelete(item);
                // Don't close the swipe here - let the deletion animation handle it
              }}
            >
              <Ionicons name="trash-outline" size={20} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.actionText}>Delete</Text>
          </Animated.View>
        </View>
        <Animated.View
          style={[
            styles.swipeableRow,
            {
              transform: [{ translateX }],
            },
          ]}
          {...panResponder.panHandlers}
        >
          {children}
        </Animated.View>
      </View>
    );
  };

  const renderNote = ({
    item,
    index,
    section,
  }: {
    item: any;
    index: number;
    section: any;
  }) => {
    const _screenWidth = Dimensions.get("window").width;
    const isGrid = viewMode === "grid";

    if (isGrid) {
      // For grid mode, group items in pairs
      const isEven = index % 2 === 0;
      const nextItem = section.data[index + 1];

      if (isEven) {
        // Render a row with this item and the next one (if exists)
        return (
          <View style={styles.gridRow}>
            <TouchableOpacity
              style={styles.gridItem}
              onPress={() => handleNotePress(item.id)}
              activeOpacity={0.7}
            >
              <View style={styles.gridEmojiContainer}>
                <Text style={styles.emoji}>{item.emoji || "🍽️"}</Text>
              </View>
              <View style={styles.gridNoteContent}>
                <Text style={styles.gridNoteTitle} numberOfLines={2}>
                  {item.title || "Untitled"}
                </Text>
                <Text style={styles.gridNoteDate}>
                  {formatDate(item.updatedAt)}
                </Text>
              </View>
            </TouchableOpacity>

            {nextItem && (
              <TouchableOpacity
                style={styles.gridItem}
                onPress={() => handleNotePress(nextItem.id)}
                activeOpacity={0.7}
              >
                <View style={styles.gridEmojiContainer}>
                  <Text style={styles.emoji}>{nextItem.emoji || "🍽️"}</Text>
                </View>
                <View style={styles.gridNoteContent}>
                  <Text style={styles.gridNoteTitle} numberOfLines={2}>
                    {nextItem.title || "Untitled"}
                  </Text>
                  <Text style={styles.gridNoteDate}>
                    {formatDate(nextItem.updatedAt)}
                  </Text>
                </View>
              </TouchableOpacity>
            )}
          </View>
        );
      } else {
        // Skip odd-indexed items as they're already rendered with the even item
        return null;
      }
    } else {
      // List mode - render with swipeable functionality
      return (
        <SwipeableRow item={item}>
          <TouchableOpacity
            style={styles.noteItem}
            onPress={() => handleNotePress(item.id)}
            activeOpacity={0.7}
          >
            <View style={styles.emojiContainer}>
              <Text style={styles.emoji}>{item.emoji || "🍽️"}</Text>
            </View>
            <View style={styles.noteContent}>
              <Text style={styles.noteTitle} numberOfLines={1}>
                {item.title || "Untitled"}
              </Text>
              <Text style={styles.notePreview} numberOfLines={2}>
                <Text style={styles.noteDate}>
                  {formatDate(item.updatedAt)}
                </Text>
                <Text> • {getPreviewText(item.content)}</Text>
              </Text>
            </View>
          </TouchableOpacity>
        </SwipeableRow>
      );
    }
  };

  const styles = createStyles(theme);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>My Lists</Text>
          <Text style={styles.headerSubtitle}>
            {notes.length} {notes.length === 1 ? "list" : "lists"}
          </Text>
        </View>
        <View style={styles.viewToggle}>
          <TouchableOpacity
            style={styles.viewButton}
            onPress={() => {
              if (viewMode !== "list") {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setViewMode("list");
              }
            }}
          >
            <SymbolView
              name={
                viewMode === "list"
                  ? "rectangle.grid.1x2.fill"
                  : "rectangle.grid.1x2"
              }
              style={[
                styles.symbolIcon,
                {
                  tintColor:
                    viewMode === "list"
                      ? "#FFFFFF"
                      : theme.colors.textSecondary,
                } as any,
              ]}
              type="monochrome"
              fallback={
                <Ionicons
                  name={viewMode === "list" ? "apps" : "apps-outline"}
                  size={20}
                  color={
                    viewMode === "list" ? "#FFFFFF" : theme.colors.textSecondary
                  }
                />
              }
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.viewButton}
            onPress={() => {
              if (viewMode !== "grid") {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setViewMode("grid");
              }
            }}
          >
            <SymbolView
              name={
                viewMode === "grid" ? "square.grid.2x2.fill" : "square.grid.2x2"
              }
              style={[
                styles.symbolIcon,
                {
                  tintColor:
                    viewMode === "grid"
                      ? "#FFFFFF"
                      : theme.colors.textSecondary,
                } as any,
              ]}
              type="monochrome"
              fallback={
                <Ionicons
                  name={viewMode === "grid" ? "grid" : "grid-outline"}
                  size={20}
                  color={
                    viewMode === "grid" ? "#FFFFFF" : theme.colors.textSecondary
                  }
                />
              }
            />
          </TouchableOpacity>
        </View>
      </View>

      {notes.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>No notes yet</Text>
          <Text style={styles.emptyStateSubtext}>
            Tap the + button to create your first note
          </Text>
        </View>
      ) : (
        <SectionList
          sections={noteSections}
          renderItem={renderNote}
          renderSectionHeader={({ section: { title } }) => (
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{title}</Text>
            </View>
          )}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          stickySectionHeadersEnabled={false}
          // @ts-expect-error - SectionList doesn't officially support numColumns but it works
          numColumns={1}
          key={viewMode} // Force re-render when switching modes
        />
      )}

      <Pressable
        style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
        onPress={handleAddNote}
      >
        <Ionicons name="add" size={28} color="white" />
      </Pressable>
    </View>
  );
}

const createStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      paddingHorizontal: 20,
      paddingTop: 98, // Extra space for future navigation icons
      paddingBottom: 20,
      backgroundColor: theme.colors.background,
    },
    headerLeft: {
      flex: 1,
    },
    headerTitle: {
      fontSize: 34,
      fontWeight: "bold",
      color: theme.colors.text,
    },
    headerSubtitle: {
      fontSize: 16,
      color: theme.colors.textSecondary,
      marginTop: 4,
    },
    viewToggle: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.colors.surface,
      borderRadius: 50,
      padding: 2,
      borderWidth: 1,
      borderColor: theme.colors.border,
      marginTop: 8,
    },
    viewButton: {
      padding: 8,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 50,
      marginHorizontal: 1,
    },
    symbolIcon: {
      width: 20,
      height: 20,
    },
    listContent: {
      paddingVertical: 10,
    },
    noteItem: {
      flexDirection: "row",
      backgroundColor: theme.colors.surface,
      marginHorizontal: 20,
      marginVertical: 5,
      padding: 16,
      borderRadius: 12,
      shadowColor: theme.colors.shadow,
      shadowOffset: {
        width: 0,
        height: 1,
      },
      shadowOpacity: 0.05,
      shadowRadius: 3,
      elevation: 2,
    },
    emojiContainer: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: theme.colors.surface,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    emoji: {
      fontSize: 20,
    },
    noteContent: {
      flex: 1,
      justifyContent: "center",
    },
    gridItem: {
      backgroundColor: theme.colors.surface,
      marginVertical: 5,
      padding: 16,
      borderRadius: 12,
      shadowColor: theme.colors.shadow,
      shadowOffset: {
        width: 0,
        height: 1,
      },
      shadowOpacity: 0.05,
      shadowRadius: 3,
      elevation: 2,
      alignItems: "center",
      justifyContent: "center",
      height: 150,
      width: "45%",
      maxWidth: 180,
    },
    gridRow: {
      flexDirection: "row",
      justifyContent: "flex-start",
      paddingLeft: 20,
      paddingRight: 0,
      marginVertical: 0,
      gap: 10,
    },
    gridEmojiContainer: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: theme.colors.surface,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    gridNoteContent: {
      alignItems: "center",
      width: "100%",
    },
    gridNoteTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: theme.colors.text,
      marginBottom: 8,
      textAlign: "center",
    },
    gridNoteDate: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      textAlign: "center",
    },
    noteTitle: {
      fontSize: 17,
      fontWeight: "600",
      color: theme.colors.text,
      marginBottom: 4,
    },
    notePreview: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      lineHeight: 20,
    },
    noteDate: {
      fontSize: 14,
      color: theme.colors.textSecondary,
    },
    sectionHeader: {
      paddingHorizontal: 20,
      paddingTop: 20,
      paddingBottom: 8,
      backgroundColor: theme.colors.background,
    },
    sectionTitle: {
      fontSize: 22,
      fontWeight: "600",
      color: theme.colors.text,
    },
    emptyState: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 40,
    },
    emptyStateText: {
      fontSize: 20,
      fontWeight: "600",
      color: theme.colors.text,
      marginBottom: 8,
    },
    emptyStateSubtext: {
      fontSize: 16,
      color: theme.colors.textSecondary,
      textAlign: "center",
    },
    fab: {
      position: "absolute",
      right: 20,
      bottom: 30,
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: theme.colors.primary,
      alignItems: "center",
      justifyContent: "center",
      shadowColor: theme.colors.shadow,
      shadowOffset: {
        width: 0,
        height: 4,
      },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 8,
    },
    fabPressed: {
      backgroundColor: theme.colors.primary,
      opacity: 0.8,
      transform: [{ scale: 0.95 }],
    },
    swipeableContainer: {
      position: "relative",
      overflow: "hidden",
    },
    swipeableRow: {
      backgroundColor: theme.colors.background,
      zIndex: 2,
    },
    actionsContainer: {
      position: "absolute",
      right: 20,
      top: 0,
      bottom: 0,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "flex-end",
      zIndex: 1,
    },
    actionButtonWrapper: {
      alignItems: "center",
      marginHorizontal: 8,
    },
    actionButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      justifyContent: "center",
      alignItems: "center",
      shadowColor: theme.colors.shadow,
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    shareButton: {
      backgroundColor: "#007AFF",
    },
    deleteButton: {
      backgroundColor: "#FF3B30",
    },
    actionText: {
      color: theme.colors.text,
      fontSize: 11,
      marginTop: 6,
      fontWeight: "500",
    },
  });

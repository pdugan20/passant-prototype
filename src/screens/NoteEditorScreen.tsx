import React, { useState, useEffect, useRef } from "react";
import {
  View,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  Text,
  Alert,
  InputAccessoryView,
  Keyboard,
  Dimensions,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useNotes } from "../context/NotesContext";
import { useTheme } from "../context/ThemeContext";
import * as Haptics from "expo-haptics";
import {
  EMOJI_CATEGORIES,
  getEmojiCategory,
} from "../constants/emojiCategories";
import { FEATURE_FLAGS } from "../config/featureFlags";
import SuggestionPills from "../components/SuggestionPills";
import MentionPill from "../components/MentionPill";
import FullWidthTypeahead from "../components/FullWidthTypeahead";
import { useMentions } from "react-native-controlled-mentions";

export default function NoteEditorScreen() {
  const navigation = useNavigation();
  const route = useRoute<any>();
  const { noteId } = route.params || {};
  const { addNote, updateNote, getNote, deleteNote, togglePrivacy } =
    useNotes();
  const { theme, isDarkMode } = useTheme();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [content, setContent] = useState("");
  const [selectedEmoji, setSelectedEmoji] = useState("🍽️");
  const [_isEditingTitle, setIsEditingTitle] = useState(!noteId);
  const [_isEditingContent, setIsEditingContent] = useState(false);
  const [availableEmojis, setAvailableEmojis] = useState(
    EMOJI_CATEGORIES.restaurant,
  );
  const [showingTypeahead, setShowingTypeahead] = useState(false);
  const [typeaheadKeyword, setTypeaheadKeyword] = useState("");
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [_lastKeyPress, _setLastKeyPress] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [showUpdatePill, setShowUpdatePill] = useState(false);
  const [_currentCursorPosition, _setCurrentCursorPosition] = useState(0);

  const contentInputRef = useRef<any>(null);
  const titleInputRef = useRef<TextInput>(null);
  const descriptionInputRef = useRef<TextInput>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const typeaheadTriggerRef = useRef<boolean>(false);

  useEffect(() => {
    if (noteId) {
      const note = getNote(noteId);
      if (note) {
        setTitle(note.title);
        setContent(note.content);
        if (FEATURE_FLAGS.noteEditor.hasDescriptionField && note.description) {
          setDescription(note.description);
        }
        const noteEmoji = note.emoji || "🍽️";
        setSelectedEmoji(noteEmoji);
        setIsPrivate(note.isPrivate || false);
        const emojis = getEmojiCategory(note.title);

        // Reorder emojis to put selected emoji first when navigating back
        const reorderedEmojis =
          noteEmoji && emojis.includes(noteEmoji)
            ? [noteEmoji, ...emojis.filter((emoji) => emoji !== noteEmoji)]
            : emojis;

        setAvailableEmojis(reorderedEmojis);
      }
    }
  }, [noteId]);

  // Handle focus for new notes - manually focus after screen animation
  useEffect(() => {
    if (!noteId) {
      const timer = setTimeout(() => {
        titleInputRef.current?.focus();
      }, 800);

      return () => clearTimeout(timer);
    }
  }, [noteId]);

  useEffect(() => {
    // Skip this effect if we're loading an existing note (first useEffect handles emoji ordering)
    if (noteId && getNote(noteId)) {
      return;
    }

    const emojis = getEmojiCategory(title);

    // Only reorder emojis based on title change, not selectedEmoji change
    // This prevents immediate reordering when user selects a different emoji
    setAvailableEmojis(emojis);

    // If current emoji is not in the new category, select the first one
    if (!emojis.includes(selectedEmoji) && emojis.length > 0) {
      setSelectedEmoji(emojis[0]);
    }
  }, [title]); // Removed selectedEmoji dependency

  // Keyboard event listeners
  useEffect(() => {
    const keyboardWillShow = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      (e) => {
        setKeyboardHeight(e.endCoordinates.height);
        // Don't need to scroll here anymore as we handle it when @ is typed
      },
    );

    const keyboardWillHide = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => {
        setKeyboardHeight(0);
        setShowingTypeahead(false);
        typeaheadTriggerRef.current = false;
      },
    );

    return () => {
      keyboardWillShow.remove();
      keyboardWillHide.remove();
    };
  }, []);

  const handleSave = async () => {
    if (!title.trim() && !content.trim()) {
      return; // Don't save empty notes
    }

    const noteData: any = {
      title: title.trim() || "Untitled",
      content: content.trimEnd(), // Only trim trailing spaces, keep leading indentation
      emoji: selectedEmoji,
      isPrivate: isPrivate,
    };

    if (FEATURE_FLAGS.noteEditor.hasDescriptionField) {
      noteData.description = description.trim();
    }

    if (noteId) {
      // Only update if something has actually changed
      const existingNote = getNote(noteId);
      if (existingNote) {
        const hasChanges =
          existingNote.title !== noteData.title ||
          existingNote.content !== noteData.content ||
          existingNote.emoji !== noteData.emoji ||
          existingNote.isPrivate !== noteData.isPrivate ||
          (FEATURE_FLAGS.noteEditor.hasDescriptionField &&
            existingNote.description !== noteData.description);

        if (hasChanges) {
          await updateNote(noteId, noteData);
        }
      }
    } else {
      await addNote(noteData);
    }
  };

  const handleBack = async () => {
    await handleSave();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.goBack();
  };

  const handleDelete = () => {
    Alert.alert(
      "Delete Note",
      "Are you sure you want to delete this note?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            if (noteId) {
              await deleteNote(noteId);
              Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Success,
              );
              navigation.goBack();
            }
          },
        },
      ],
      {
        userInterfaceStyle: isDarkMode ? "dark" : "light",
      },
    );
  };

  const handlePrivacyToggle = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (noteId) {
      await togglePrivacy(noteId);
    }
    setIsPrivate(!isPrivate);
  };

  const handleTitleSubmit = () => {
    setIsEditingTitle(false);
    if (FEATURE_FLAGS.noteEditor.hasDescriptionField) {
      // Focus on description field if enabled
      setTimeout(() => {
        descriptionInputRef.current?.focus();
      }, 100);
    } else {
      setIsEditingContent(true);
      setTimeout(() => {
        if (contentInputRef.current) {
          // Try different focus methods for react-native-controlled-mentions
          if (contentInputRef.current.getInnerRef) {
            contentInputRef.current.getInnerRef()?.focus();
          } else if (contentInputRef.current.focus) {
            contentInputRef.current.focus();
          }
        }
      }, 100);
    }
  };

  const handleDescriptionSubmit = () => {
    setIsEditingContent(true);
    setTimeout(() => {
      if (contentInputRef.current) {
        // Try different focus methods for react-native-controlled-mentions
        if (contentInputRef.current.getInnerRef) {
          contentInputRef.current.getInnerRef()?.focus();
        } else if (contentInputRef.current.focus) {
          contentInputRef.current.focus();
        }
      }
    }, 100);
  };

  const handleSuggestionPress = (template: {
    title: string;
    content: string;
  }) => {
    if (!title) {
      setTitle(template.title);
      setContent(template.content);
      // Update emoji based on the suggestion
      const emojis = getEmojiCategory(template.title);
      setAvailableEmojis(emojis);
      if (!emojis.includes(selectedEmoji) && emojis.length > 0) {
        setSelectedEmoji(emojis[0]);
      }
    }
  };

  const handleUndo = () => {
    // Clear the note content
    setTitle("");
    setContent("");
    // Reset to default emoji and category
    setSelectedEmoji("🍽️");
    setAvailableEmojis(EMOJI_CATEGORIES.restaurant);
    // Focus back on title
    setTimeout(() => titleInputRef.current?.focus(), 500);
  };

  const handleUpdatePress = () => {
    // Hide the update pill
    setShowUpdatePill(false);
    // Focus on title field to edit description
    titleInputRef.current?.focus();
    // Set cursor at end of title
    setTimeout(() => {
      titleInputRef.current?.setSelection(title.length, title.length);
    }, 100);
  };

  const inputAccessoryViewID = "suggestionPills";
  const styles = createStyles(theme, isDarkMode);

  // Seattle bars for mention suggestions with addresses
  const mentionSuggestions = [
    { id: "1", name: "Canon", address: "928 12th Ave, Capitol Hill" },
    { id: "2", name: "Bathtub Gin & Co", address: "2205 2nd Ave, Belltown" },
    {
      id: "3",
      name: "The Walrus and the Carpenter",
      address: "4743 Ballard Ave NW, Ballard",
    },
    { id: "4", name: "Fremont Brewing", address: "1050 N 34th St, Fremont" },
    {
      id: "5",
      name: "Radiator Whiskey",
      address: "94 Pike St #30, Pike Place Market",
    },
    { id: "6", name: "Unicorn", address: "1118 E Pike St, Capitol Hill" },
    {
      id: "7",
      name: "The Collective on First",
      address: "400 Dexter Ave N, South Lake Union",
    },
    { id: "8", name: "Navy Strength", address: "2505 2nd Ave, Belltown" },
    { id: "9", name: "Rob Roy", address: "2332 2nd Ave, Belltown" },
    {
      id: "10",
      name: "Flatstick Pub",
      address: "240 2nd Ave S, Pioneer Square",
    },
    { id: "11", name: "The Crocodile", address: "2200 2nd Ave, Belltown" },
    {
      id: "12",
      name: "Bourbon & Bones",
      address: "625 1st Ave, Pioneer Square",
    },
    { id: "13", name: "Tavern Law", address: "1406 12th Ave, Capitol Hill" },
    { id: "14", name: "Witness Bar", address: "410 Broadway E, Capitol Hill" },
    { id: "15", name: "Queen City Grill", address: "2201 1st Ave, Belltown" },
    {
      id: "16",
      name: "The Lodge Sports Grille",
      address: "16011 Aurora Ave N, Shoreline",
    },
    { id: "17", name: "Capitol Cider", address: "818 E Pike St, Capitol Hill" },
    {
      id: "18",
      name: "Rhein Haus Seattle",
      address: "912 12th Ave, Capitol Hill",
    },
    { id: "19", name: "Outlander Brewery", address: "225 N 36th St, Fremont" },
    {
      id: "20",
      name: "Holy Mountain Brewing",
      address: "1421 Elliott Ave W, Interbay",
    },
  ];

  // Configuration for mentions - simple styling for editing mode
  const triggersConfig = {
    mention: {
      trigger: "@",
      textStyle: {
        backgroundColor: theme.colors.primary + "20",
        color: theme.colors.primary,
        fontWeight: "500" as any,
        paddingHorizontal: 2,
        borderRadius: 4,
      },
    },
  };

  // Parse content and render with pills
  const _parseContentWithPills = (text: string) => {
    const mentionRegex = /\{@\}\[([^\]]+)\]\(([^)]+)\)/g;
    const parts: any[] = [];
    let lastIndex = 0;
    let match;
    let key = 0;

    while ((match = mentionRegex.exec(text)) !== null) {
      // Add text before mention
      if (match.index > lastIndex) {
        parts.push(
          <Text key={key++} style={styles.contentText}>
            {text.substring(lastIndex, match.index)}
          </Text>,
        );
      }

      // Add pill for mention
      parts.push(<MentionPill key={key++} text={match[1]} type="location" />);

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(
        <Text key={key++} style={styles.contentText}>
          {text.substring(lastIndex)}
        </Text>,
      );
    }

    // If no mentions found, just return the plain text
    if (parts.length === 0) {
      parts.push(
        <Text key={0} style={styles.contentText}>
          {text}
        </Text>,
      );
    }

    return parts;
  };

  // Simple markdown-style auto-formatting
  const handleContentChange = (text: string) => {
    let processedText = text;

    // Auto-detect bullet points: "- " becomes "  • " (with base indentation)
    processedText = processedText.replace(/^- /gm, "  • ");
    processedText = processedText.replace(/^ {2}- /gm, "    • ");
    processedText = processedText.replace(/^ {4}- /gm, "      • ");

    // Auto-detect bullet points: "* " becomes "  • " (with base indentation)
    processedText = processedText.replace(/^\* /gm, "  • ");
    processedText = processedText.replace(/^ {2}\* /gm, "    • ");
    processedText = processedText.replace(/^ {4}\* /gm, "      • ");

    // Only add bullet continuation when user presses Enter
    if (
      text.length > content.length &&
      text.includes("\n" + content) === false
    ) {
      // Check if the new text has more newlines than the old content
      const oldNewlines = (content.match(/\n/g) || []).length;
      const newNewlines = (processedText.match(/\n/g) || []).length;

      if (newNewlines > oldNewlines) {
        const lines = processedText.split("\n");
        for (let i = 0; i < lines.length - 1; i++) {
          const currentLine = lines[i];
          const nextLine = lines[i + 1];

          // If current line is a bullet with content and next line is completely empty, add bullet to next line
          const bulletMatch = currentLine.match(/^(\s*)• (.+)$/);
          if (bulletMatch && nextLine === "") {
            const indent = bulletMatch[1];
            lines[i + 1] = indent + "• ";
            break;
          }
        }
        processedText = lines.join("\n");
      }
    }

    setContent(processedText);
  };

  // Parse content with rich formatting (headings, bullets, etc.)
  const _parseRichContent = (text: string) => {
    const lines = text.split("\n");
    const elements: any[] = [];
    let key = 0;

    lines.forEach((line) => {
      if (line.startsWith("# ")) {
        // H1 - Large heading
        elements.push(
          <Text key={key++} style={styles.heading1}>
            {line.substring(2)}
          </Text>,
        );
      } else if (line.startsWith("## ")) {
        // H2 - Medium heading
        elements.push(
          <Text key={key++} style={styles.heading2}>
            {line.substring(3)}
          </Text>,
        );
      } else if (line.startsWith("### ")) {
        // H3 - Small heading
        elements.push(
          <Text key={key++} style={styles.heading3}>
            {line.substring(4)}
          </Text>,
        );
      } else if (line.startsWith("• ") || line.match(/^\d+\. /)) {
        // Bullet points and numbered lists
        elements.push(
          <Text key={key++} style={styles.listItem}>
            {line}
          </Text>,
        );
      } else if (line.trim()) {
        // Regular text
        elements.push(
          <Text key={key++} style={styles.contentText}>
            {line}
          </Text>,
        );
      }

      // Add line break except for last line
      if (line !== lines[lines.length - 1]) {
        elements.push(<Text key={key++}>{"\n"}</Text>);
      }
    });

    return elements;
  };

  // Use mentions hook for content input with enhanced formatting
  const { textInputProps } = useMentions({
    value: content,
    onChange: (text: string) => {
      // First run our bullet point logic
      handleContentChange(text);

      // Check if we should show typeahead
      const atIndex = text.lastIndexOf("@");

      // First check if @ was deleted or doesn't exist
      if (atIndex === -1) {
        // No @ in text, hide typeahead
        setShowingTypeahead(false);
        typeaheadTriggerRef.current = false;
        setTypeaheadKeyword("");
      } else if (atIndex === text.length - 1) {
        // User just typed @ at the end
        setShowingTypeahead(true);
        setTypeaheadKeyword("");
        typeaheadTriggerRef.current = true;

        // Add padding and scroll to position the @ just above the typeahead
        setTimeout(() => {
          if (scrollViewRef.current && contentInputRef.current) {
            contentInputRef.current.measure(
              (_x, y, _width, height, _pageX, pageY) => {
                if (scrollViewRef.current) {
                  // Get cursor position within the text input
                  const textBeforeAt = text.substring(0, atIndex);
                  const lineCount = (textBeforeAt.match(/\n/g) || []).length;

                  // Estimate the vertical position of the cursor within the input
                  const lineHeight = 22;
                  const cursorOffsetInInput = Math.min(
                    lineCount * lineHeight,
                    height,
                  );

                  // Calculate the absolute position of the cursor on screen
                  const cursorScreenY = pageY + cursorOffsetInInput;

                  // Get screen dimensions
                  const { height: screenHeight } = Dimensions.get("window");

                  // Calculate where we want the cursor to be:
                  // Screen height - keyboard height - typeahead height - padding
                  const typeaheadHeight = 300;
                  const paddingAboveTypeahead = 30;
                  const targetCursorY =
                    screenHeight -
                    keyboardHeight -
                    typeaheadHeight -
                    paddingAboveTypeahead;

                  // Calculate how much to scroll
                  const currentScrollY = 0; // Start from current position
                  const scrollDelta = cursorScreenY - targetCursorY;
                  const newScrollY = currentScrollY + scrollDelta;

                  if (scrollDelta > 0) {
                    scrollViewRef.current.scrollTo({
                      y: Math.max(0, newScrollY),
                      animated: false,
                    });
                  }
                }
              },
            );
          }
        }, 10);
      } else if (showingTypeahead) {
        // Check if there's text after @ and it doesn't end with space
        const textAfterAt = text.substring(atIndex + 1);
        if (textAfterAt.includes(" ")) {
          // User typed space after @, hide typeahead
          setShowingTypeahead(false);
          typeaheadTriggerRef.current = false;
          setTypeaheadKeyword("");
        } else {
          // Update keyword for filtering
          setTypeaheadKeyword(textAfterAt);
        }
      }
    },
    triggersConfig,
  });

  // Handle suggestion selection from new typeahead
  const handleTypeaheadSelect = (suggestion: any) => {
    // Check if this is an existing note and we're adding a new mention
    if (noteId && content.includes("•")) {
      setShowUpdatePill(true);
      // Auto-hide the pill after 10 seconds
      setTimeout(() => setShowUpdatePill(false), 10000);
    }

    // Replace the @ and any partial text with the mention
    const atIndex = content.lastIndexOf("@");
    if (atIndex >= 0) {
      const beforeAt = content.substring(0, atIndex);
      const afterAt = content.substring(atIndex);
      const spaceIndex = afterAt.indexOf(" ");
      const afterMention = spaceIndex > 0 ? afterAt.substring(spaceIndex) : "";

      // Format as mention using the controlled-mentions format
      const mentionText = `{@}[${suggestion.name}](${suggestion.id})`;
      const newContent = beforeAt + mentionText + afterMention;
      setContent(newContent);
    }

    // Hide typeahead
    setShowingTypeahead(false);
    typeaheadTriggerRef.current = false;
    setTypeaheadKeyword("");

    // Refocus the input
    setTimeout(() => {
      contentInputRef.current?.focus();
    }, 100);
  };

  // Handle closing typeahead
  const handleTypeaheadClose = () => {
    setShowingTypeahead(false);
    typeaheadTriggerRef.current = false;
    setTypeaheadKeyword("");
    contentInputRef.current?.focus();
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.headerButton}>
          <Ionicons
            name="chevron-back"
            size={28}
            color={theme.colors.primary}
          />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <TouchableOpacity
            style={styles.privacyPill}
            onPress={handlePrivacyToggle}
          >
            <Text style={styles.privacyPillText}>
              {isPrivate ? "Private" : "Public"}
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => {
            Alert.alert(
              "Options",
              "",
              [
                ...(noteId
                  ? [
                      {
                        text: "Delete Note",
                        style: "destructive" as const,
                        onPress: handleDelete,
                      },
                    ]
                  : []),
                {
                  text: "Cancel",
                  style: "cancel" as const,
                },
              ],
              {
                userInterfaceStyle: isDarkMode ? "dark" : "light",
              },
            );
          }}
        >
          <Ionicons
            name="ellipsis-horizontal-circle"
            size={24}
            color={theme.colors.primary}
          />
        </TouchableOpacity>
      </View>

      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={{
          paddingBottom: showingTypeahead ? 400 : 0,
        }}
        keyboardShouldPersistTaps="handled"
      >
        {FEATURE_FLAGS.noteEditor.showEmojiPicker && (
          <View style={styles.emojiSelector}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.emojiScrollContent}
              keyboardShouldPersistTaps="handled"
            >
              {availableEmojis.map((emoji) => (
                <TouchableOpacity
                  key={emoji}
                  style={[
                    styles.emojiButton,
                    selectedEmoji === emoji && styles.emojiButtonSelected,
                  ]}
                  onPress={() => {
                    setSelectedEmoji(emoji);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                >
                  <Text style={styles.emojiText}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        <View style={styles.editorContainer}>
          <TextInput
            ref={titleInputRef}
            style={styles.titleInput}
            value={title}
            onChangeText={setTitle}
            placeholder={FEATURE_FLAGS.noteEditor.showHintText ? "Title" : ""}
            placeholderTextColor={theme.colors.placeholder}
            selectionColor={theme.colors.primary}
            onSubmitEditing={handleTitleSubmit}
            returnKeyType="next"
            blurOnSubmit={false}
            submitBehavior="submit"
            onFocus={() => setIsEditingTitle(true)}
            multiline={true}
            autoComplete="off"
            autoCorrect={false}
            spellCheck={false}
            keyboardAppearance={isDarkMode ? "dark" : "light"}
            inputAccessoryViewID={inputAccessoryViewID}
          />

          {/* Description field - conditionally shown based on feature flag */}
          {FEATURE_FLAGS.noteEditor.hasDescriptionField && (
            <TextInput
              ref={descriptionInputRef}
              style={styles.descriptionInput}
              value={description}
              onChangeText={setDescription}
              placeholder="Describe this list in one sentence..."
              placeholderTextColor={theme.colors.placeholder}
              selectionColor={theme.colors.primary}
              onSubmitEditing={handleDescriptionSubmit}
              returnKeyType="next"
              blurOnSubmit={false}
              submitBehavior="submit"
              multiline={false}
              autoComplete="off"
              autoCorrect={false}
              spellCheck={false}
              keyboardAppearance={isDarkMode ? "dark" : "light"}
              inputAccessoryViewID={inputAccessoryViewID}
            />
          )}

          {/* TextInput with mention highlighting - always visible */}
          <TextInput
            ref={contentInputRef}
            style={styles.contentInput}
            placeholder={
              FEATURE_FLAGS.noteEditor.showHintText &&
              !FEATURE_FLAGS.noteEditor.hasDescriptionField
                ? "Start adding places..."
                : ""
            }
            placeholderTextColor={theme.colors.placeholder}
            selectionColor={theme.colors.primary}
            multiline
            textAlignVertical="top"
            scrollEnabled={false}
            autoComplete="off"
            autoCorrect={false}
            spellCheck={false}
            onFocus={() => {
              setIsEditingTitle(false);
              setIsEditingContent(true);
            }}
            onBlur={() => setIsEditingContent(false)}
            onKeyPress={(event) => {
              // Handle backspace at beginning of content to move to title
              if (event.nativeEvent.key === "Backspace") {
                const selection = contentInputRef.current?.selection;
                if (selection && selection.start === 0 && selection.end === 0) {
                  // At the very beginning of content field
                  event.preventDefault();
                  titleInputRef.current?.focus();
                  // Set cursor to end of title
                  setTimeout(() => {
                    titleInputRef.current?.setSelection(
                      title.length,
                      title.length,
                    );
                  }, 50);
                }
              }
            }}
            keyboardAppearance={isDarkMode ? "dark" : "light"}
            inputAccessoryViewID={inputAccessoryViewID}
            {...textInputProps}
          />
        </View>
      </ScrollView>

      {Platform.OS === "ios" &&
        ((!noteId && !title.trim() && !content.trim()) || showUpdatePill) && (
          <InputAccessoryView nativeID={inputAccessoryViewID}>
            <SuggestionPills
              onSuggestionPress={handleSuggestionPress}
              onUndo={handleUndo}
              showUpdatePill={showUpdatePill}
              onUpdatePress={handleUpdatePress}
            />
          </InputAccessoryView>
        )}

      {/* Full-width typeahead that slides up from keyboard */}
      <FullWidthTypeahead
        visible={showingTypeahead}
        suggestions={mentionSuggestions}
        keyword={typeaheadKeyword}
        keyboardHeight={keyboardHeight}
        onSelect={handleTypeaheadSelect}
        onClose={handleTypeaheadClose}
      />
    </KeyboardAvoidingView>
  );
}

const createStyles = (theme: any, isDarkMode: boolean) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingTop: Platform.OS === "ios" ? 60 : 30,
      paddingHorizontal: 16,
      paddingBottom: 10,
      backgroundColor: theme.colors.background,
    },
    headerButton: {
      padding: 8,
      alignItems: "center",
      justifyContent: "center",
    },
    headerCenter: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    privacyPill: {
      backgroundColor: isDarkMode
        ? theme.colors.background
        : theme.colors.surface,
      borderRadius: 16,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    privacyPillText: {
      fontSize: 14,
      fontWeight: "500",
      color: theme.colors.text,
    },
    scrollView: {
      flex: 1,
    },
    emojiSelector: {
      marginHorizontal: 20,
      marginVertical: 14,
      paddingVertical: 7,
      backgroundColor: theme.colors.surface,
      borderRadius: 50,
      borderWidth: 1,
      borderColor: isDarkMode ? "#333333" : "#E8E8E8",
      shadowColor: theme.colors.shadow,
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.09,
      shadowRadius: 7,
      elevation: 3,
    },
    emojiScrollContent: {
      paddingHorizontal: 15,
    },
    emojiButton: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: theme.colors.surface,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 11,
    },
    emojiButtonSelected: {
      backgroundColor: isDarkMode ? "#404040" : "#D1D1D6",
    },
    emojiText: {
      fontSize: 19,
    },
    editorContainer: {
      flex: 1,
      padding: 20,
    },
    titleInput: {
      fontSize: 34,
      fontWeight: "bold",
      color: theme.colors.text,
      marginBottom: 16,
      marginTop: -8,
      lineHeight: 41,
    },
    descriptionInput: {
      fontSize: 17,
      color: theme.colors.text,
      marginBottom: 16,
      paddingVertical: 8,
      lineHeight: 22,
    },
    contentInput: {
      fontSize: 17,
      color: theme.colors.text,
      lineHeight: 24,
      minHeight: 300,
    },
    contentDisplay: {
      minHeight: 300,
      paddingVertical: 8,
    },
    contentText: {
      fontSize: 17,
      color: theme.colors.text,
      lineHeight: 24,
    },
    heading1: {
      fontSize: 28,
      fontWeight: "bold",
      color: theme.colors.text,
      lineHeight: 34,
      marginVertical: 4,
    },
    heading2: {
      fontSize: 24,
      fontWeight: "bold",
      color: theme.colors.text,
      lineHeight: 30,
      marginVertical: 3,
    },
    heading3: {
      fontSize: 20,
      fontWeight: "600",
      color: theme.colors.text,
      lineHeight: 26,
      marginVertical: 2,
    },
    listItem: {
      fontSize: 17,
      color: theme.colors.text,
      lineHeight: 24,
      marginVertical: 1,
    },
    placeholderText: {
      fontSize: 17,
      color: theme.colors.placeholder,
      lineHeight: 24,
    },
    mentionContainer: {
      flex: 1,
    },
    inputWrapper: {
      position: "relative",
    },
    inputContainer: {
      position: "relative",
    },
    richTextContainer: {
      flexDirection: "row",
      flexWrap: "wrap",
      alignItems: "center",
      fontSize: 17,
      lineHeight: 24,
    },
    richTextOverlay: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      zIndex: 1,
      backgroundColor: "transparent",
      paddingVertical: 0,
      paddingHorizontal: 0,
      margin: 0,
    },
    richTextEditor: {
      flex: 1,
      minHeight: 300,
      fontSize: 17,
      lineHeight: 24,
    },
    toolbar: {
      backgroundColor: theme.colors.surface,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
      paddingVertical: 8,
    },
  });

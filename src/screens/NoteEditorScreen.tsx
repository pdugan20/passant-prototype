import React, { useState, useEffect, useRef } from 'react';
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
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useNotes } from '../context/NotesContext';
import * as Haptics from 'expo-haptics';
import { EMOJI_CATEGORIES, getEmojiCategory } from '../constants/emojiCategories';
import { FEATURE_FLAGS } from '../config/featureFlags';
import SuggestionPills from '../components/SuggestionPills';
import RichTextRenderer from '../components/RichTextRenderer';
import { MentionInput } from 'react-native-controlled-mentions';

export default function NoteEditorScreen() {
  const navigation = useNavigation();
  const route = useRoute<any>();
  const { noteId } = route.params || {};
  const { addNote, updateNote, getNote, deleteNote } = useNotes();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState('🍽️');
  const [isEditingTitle, setIsEditingTitle] = useState(!noteId);
  const [isEditingContent, setIsEditingContent] = useState(false);
  const [availableEmojis, setAvailableEmojis] = useState(EMOJI_CATEGORIES.restaurant);

  const contentInputRef = useRef<any>(null);
  const titleInputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (noteId) {
      const note = getNote(noteId);
      if (note) {
        setTitle(note.title);
        setContent(note.content);
        setSelectedEmoji(note.emoji || '🍽️');
        const emojis = getEmojiCategory(note.title);
        setAvailableEmojis(emojis);
      }
    } else {
      // Wait for screen animation to complete before focusing
      setTimeout(() => titleInputRef.current?.focus(), 500);
    }
  }, [noteId]);

  useEffect(() => {
    const emojis = getEmojiCategory(title);
    setAvailableEmojis(emojis);
    
    // If current emoji is not in the new category, select the first one
    if (!emojis.includes(selectedEmoji) && emojis.length > 0) {
      setSelectedEmoji(emojis[0]);
    }
  }, [title]);

  const handleSave = async () => {
    if (!title.trim() && !content.trim()) {
      return; // Don't save empty notes
    }

    const noteData = {
      title: title.trim() || 'Untitled',
      content: content.trim(),
      emoji: selectedEmoji,
    };

    if (noteId) {
      await updateNote(noteId, noteData);
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
    Alert.alert('Delete Note', 'Are you sure you want to delete this note?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          if (noteId) {
            await deleteNote(noteId);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            navigation.goBack();
          }
        },
      },
    ]);
  };

  const handleTitleSubmit = () => {
    setIsEditingTitle(false);
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

  const handleContentChange = (text: string) => {
    // Auto-detect bullet points
    let processed = text;
    processed = processed.replace(/^- /gm, '• ');
    processed = processed.replace(/^\* /gm, '• ');
    
    // Auto-detect numbered lists
    processed = processed.replace(/^(\d+)\. /gm, '$1. ');
    
    setContent(processed);
  };

  const handleSuggestionPress = (suggestionText: string) => {
    if (!title) {
      setTitle(suggestionText);
      // Update emoji based on the suggestion
      const emojis = getEmojiCategory(suggestionText);
      setAvailableEmojis(emojis);
      if (!emojis.includes(selectedEmoji) && emojis.length > 0) {
        setSelectedEmoji(emojis[0]);
      }
    }
  };

  const inputAccessoryViewID = 'suggestionPills';

  // Mention suggestions for react-native-controlled-mentions
  const mentionSuggestions = [
    { id: '1', name: 'Pike Place Market' },
    { id: '2', name: 'Space Needle' },
    { id: '3', name: 'Central Park' },
    { id: '4', name: 'Blue Moon Tavern' },
    { id: '5', name: 'Starbucks Reserve' },
    { id: '6', name: 'The Pink Door' },
    { id: '7', name: 'John Smith' },
    { id: '8', name: 'Sarah Johnson' },
    { id: '9', name: 'Golden Gate Bridge' },
    { id: '10', name: 'Times Square' },
  ];

  const renderSuggestions = ({ keyword, onSuggestionPress }: any) => {
    if (keyword == null) {
      return null;
    }

    const suggestions = mentionSuggestions
      .filter(suggestion => suggestion.name.toLowerCase().includes(keyword.toLowerCase()))
      .slice(0, 5);

    return (
      <View style={styles.suggestionsContainer}>
        {suggestions.map(suggestion => (
          <TouchableOpacity
            key={suggestion.id}
            style={styles.suggestionItem}
            onPress={() => onSuggestionPress(suggestion)}
          >
            <Text style={styles.suggestionText}>{suggestion.name}</Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.headerButton}>
          <Ionicons name='chevron-back' size={28} color='#007AFF' />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => {
            Alert.alert('Options', '', [
              ...(noteId
                ? [
                    {
                      text: 'Delete Note',
                      style: 'destructive' as const,
                      onPress: handleDelete,
                    },
                  ]
                : []),
              {
                text: 'Cancel',
                style: 'cancel' as const,
              },
            ]);
          }}
        >
          <Ionicons
            name='ellipsis-horizontal-circle'
            size={24}
            color='#007AFF'
          />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} keyboardShouldPersistTaps='handled'>
        {FEATURE_FLAGS.noteEditor.showEmojiPicker && (
          <View style={styles.emojiSelector}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
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
            placeholder={FEATURE_FLAGS.noteEditor.showHintText ? 'Title' : ''}
            placeholderTextColor='#C7C7CC'
            onSubmitEditing={handleTitleSubmit}
            returnKeyType='next'
            blurOnSubmit={false}
            submitBehavior='submit'
            onFocus={() => setIsEditingTitle(true)}
            multiline={true}
            inputAccessoryViewID={inputAccessoryViewID}
          />

          <TextInput
            ref={contentInputRef}
            style={styles.contentInput}
            value={content}
            onChangeText={handleContentChange}
            placeholder={FEATURE_FLAGS.noteEditor.showHintText ? 'Start typing...' : ''}
            placeholderTextColor='#C7C7CC'
            multiline
            textAlignVertical='top'
            scrollEnabled={false}
            onFocus={() => {
              setIsEditingTitle(false);
              setIsEditingContent(true);
            }}
            onBlur={() => setIsEditingContent(false)}
            inputAccessoryViewID={inputAccessoryViewID}
          />
        </View>
      </ScrollView>
      
      {Platform.OS === 'ios' && (
        <InputAccessoryView nativeID={inputAccessoryViewID}>
          <SuggestionPills onSuggestionPress={handleSuggestionPress} />
        </InputAccessoryView>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 60 : 30,
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  headerButton: {
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  emojiSelector: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  emojiButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  emojiButtonSelected: {
    backgroundColor: '#007AFF',
  },
  emojiText: {
    fontSize: 24,
  },
  editorContainer: {
    flex: 1,
    padding: 20,
  },
  titleInput: {
    fontSize: 34,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 16,
    lineHeight: 41,
  },
  contentInput: {
    fontSize: 17,
    color: '#000',
    lineHeight: 24,
    minHeight: 300,
  },
  contentDisplay: {
    minHeight: 300,
    paddingVertical: 8,
  },
  contentText: {
    fontSize: 17,
    color: '#000',
    lineHeight: 24,
  },
  placeholderText: {
    fontSize: 17,
    color: '#C7C7CC',
    lineHeight: 24,
  },
  suggestionsContainer: {
    backgroundColor: 'white',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    maxHeight: 200,
    marginTop: 5,
  },
  suggestionItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  suggestionText: {
    fontSize: 16,
    color: '#000',
    fontWeight: '500',
  },
  mentionContainer: {
    flex: 1,
  },
});

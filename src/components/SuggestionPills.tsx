import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

interface Suggestion {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
}

interface SuggestionPillsProps {
  onSuggestionPress: (text: string) => void;
}

const SUGGESTIONS: Suggestion[] = [
  {
    id: '1',
    icon: 'restaurant',
    text: 'Best Italian restaurants in Seattle'
  },
  {
    id: '2', 
    icon: 'wine',
    text: 'My favorite dive bars'
  },
  {
    id: '3',
    icon: 'library',
    text: 'Great Museums for kids'
  },
  {
    id: '4',
    icon: 'cafe',
    text: 'Coffee shops with wifi'
  },
  {
    id: '5',
    icon: 'airplane',
    text: 'Weekend getaway destinations'
  },
  {
    id: '6',
    icon: 'storefront',
    text: 'Local farmers markets'
  },
  {
    id: '7',
    icon: 'fitness',
    text: 'Best hiking trails nearby'
  },
  {
    id: '8',
    icon: 'musical-notes',
    text: 'Live music venues'
  },
  {
    id: '9',
    icon: 'car',
    text: 'Road trip stops'
  },
  {
    id: '10',
    icon: 'gift',
    text: 'Unique gift shops'
  },
  {
    id: '11',
    icon: 'pizza',
    text: 'Late night food spots'
  },
  {
    id: '12',
    icon: 'home',
    text: 'Home improvement ideas'
  }
];

export default function SuggestionPills({ onSuggestionPress }: SuggestionPillsProps) {
  const handlePress = (text: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSuggestionPress(text);
  };

  return (
    <View style={styles.container}>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {SUGGESTIONS.map((suggestion) => (
          <TouchableOpacity
            key={suggestion.id}
            style={styles.pill}
            onPress={() => handlePress(suggestion.text)}
            activeOpacity={0.7}
          >
            <Ionicons 
              name={suggestion.icon} 
              size={16} 
              color="#007AFF" 
              style={styles.icon}
            />
            <Text style={styles.text}>{suggestion.text}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F8F9FA',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  icon: {
    marginRight: 6,
  },
  text: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
});
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface MentionPillProps {
  text: string;
  type?: 'location' | 'person' | 'restaurant';
}

const getIconForType = (type: string) => {
  switch (type) {
    case 'location':
      return 'location';
    case 'person':
      return 'person';
    case 'restaurant':
      return 'restaurant';
    default:
      return 'at';
  }
};

export default function MentionPill({ text, type = 'location' }: MentionPillProps) {
  return (
    <View style={styles.pill}>
      <Ionicons 
        name={getIconForType(type)} 
        size={12} 
        color="#007AFF" 
        style={styles.icon}
      />
      <Text style={styles.text}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    borderColor: '#007AFF',
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
    color: '#007AFF',
    fontWeight: '500',
  },
});
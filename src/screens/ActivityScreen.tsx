import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNotes } from '../context/NotesContext';
import * as Haptics from 'expo-haptics';

export default function ActivityScreen() {
  const { notes, clearAllNotes } = useNotes();

  const handleReset = () => {
    Alert.alert(
      'Reset Prototype',
      `This will delete all ${notes.length} saved notes and reset the app to its initial state. This cannot be undone.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            await clearAllNotes();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ],
    );
  };

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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  resetButton: {
    position: 'absolute',
    bottom: 50,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  resetText: {
    color: '#FF3B30',
    fontSize: 16,
    textDecorationLine: 'underline',
  },
});

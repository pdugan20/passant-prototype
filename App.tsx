import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';
import { NotesProvider } from './src/context/NotesContext';

export default function App() {
  return (
    <SafeAreaProvider>
      <NotesProvider>
        <AppNavigator />
        <StatusBar style="auto" />
      </NotesProvider>
    </SafeAreaProvider>
  );
}

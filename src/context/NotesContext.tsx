import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Note } from "../types/Note";

interface NotesContextType {
  notes: Note[];
  addNote: (
    note: Omit<Note, "id" | "createdAt" | "updatedAt">,
  ) => Promise<void>;
  updateNote: (id: string, updates: Partial<Note>) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
  getNote: (id: string) => Note | undefined;
  togglePrivacy: (id: string) => Promise<void>;
  clearAllNotes: () => Promise<void>;
  loadDummyData: () => Promise<void>;
}

const NotesContext = createContext<NotesContextType | undefined>(undefined);

const STORAGE_KEY = "@notes";

export function NotesProvider({ children }: { children: ReactNode }) {
  const [notes, setNotes] = useState<Note[]>([]);

  useEffect(() => {
    loadNotes();
  }, []);

  const loadNotes = async () => {
    try {
      const storedNotes = await AsyncStorage.getItem(STORAGE_KEY);
      if (storedNotes) {
        const parsed = JSON.parse(storedNotes);
        setNotes(
          parsed.map((note: any) => ({
            ...note,
            isPrivate: note.isPrivate ?? false, // Default to public for existing notes
            createdAt: new Date(note.createdAt),
            updatedAt: new Date(note.updatedAt),
          })),
        );
      } else {
        // Load dummy data by default if no notes exist
        await loadDummyData();
      }
    } catch (error) {
      console.error("Failed to load notes:", error);
    }
  };

  const saveNotes = async (updatedNotes: Note[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedNotes));
    } catch (error) {
      console.error("Failed to save notes:", error);
    }
  };

  const addNote = async (
    noteData: Omit<Note, "id" | "createdAt" | "updatedAt">,
  ) => {
    const newNote: Note = {
      ...noteData,
      isPrivate: noteData.isPrivate ?? false, // Default to public
      id: Date.now().toString(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const updatedNotes = [newNote, ...notes];
    setNotes(updatedNotes);
    await saveNotes(updatedNotes);
  };

  const updateNote = async (id: string, updates: Partial<Note>) => {
    const updatedNotes = notes.map((note) =>
      note.id === id ? { ...note, ...updates, updatedAt: new Date() } : note,
    );
    setNotes(updatedNotes);
    await saveNotes(updatedNotes);
  };

  const deleteNote = async (id: string) => {
    const updatedNotes = notes.filter((note) => note.id !== id);
    setNotes(updatedNotes);
    await saveNotes(updatedNotes);
  };

  const getNote = (id: string) => {
    return notes.find((note) => note.id === id);
  };

  const togglePrivacy = async (id: string) => {
    const updatedNotes = notes.map((note) =>
      note.id === id
        ? { ...note, isPrivate: !note.isPrivate, updatedAt: new Date() }
        : note,
    );
    setNotes(updatedNotes);
    await saveNotes(updatedNotes);
  };

  const clearAllNotes = async () => {
    // Completely clear AsyncStorage and reload fresh dummy data
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
      await loadDummyData();
    } catch (error) {
      console.error("Failed to clear AsyncStorage:", error);
    }
  };

  const loadDummyData = async () => {
    const now = new Date();
    const dummyNotes = [
      // 2 lists from past week
      {
        id: "dummy1",
        title: "Best Seattle Breweries",
        content:
          "  • {@}[Fremont Brewing](4)\n  • {@}[Holy Mountain Brewing](20)\n\nGreat atmosphere and amazing IPAs!",
        emoji: "🍺",
        isPrivate: false,
        createdAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
        updatedAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
      },
      {
        id: "dummy2",
        title: "Weekend Coffee Spots",
        content:
          "  • {@}[Capitol Cider](17)\n  • {@}[Unicorn](6)\n\nPerfect for weekend mornings and laptop work.",
        emoji: "☕",
        isPrivate: false,
        createdAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
        updatedAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
      },
      // 3 lists from month prior
      {
        id: "dummy3",
        title: "Date Night Restaurants",
        content:
          "  • {@}[Canon](1)\n  • {@}[The Walrus and the Carpenter](3)\n  • {@}[Tavern Law](13)\n\nMake reservations well in advance!",
        emoji: "🥂",
        isPrivate: false,
        createdAt: new Date(now.getTime() - 35 * 24 * 60 * 60 * 1000), // 35 days ago
        updatedAt: new Date(now.getTime() - 35 * 24 * 60 * 60 * 1000),
      },
      {
        id: "dummy4",
        title: "Happy Hour Spots",
        content:
          "  • {@}[Bathtub Gin & Co](2)\n  • {@}[Navy Strength](8)\n  • {@}[Rob Roy](9)\n\nBest deals are between 4-6 PM weekdays.",
        emoji: "🍸",
        isPrivate: false,
        createdAt: new Date(now.getTime() - 40 * 24 * 60 * 60 * 1000), // 40 days ago
        updatedAt: new Date(now.getTime() - 40 * 24 * 60 * 60 * 1000),
      },
      {
        id: "dummy5",
        title: "Live Music Venues",
        content:
          "  • {@}[The Crocodile](11)\n  • {@}[Witness Bar](14)\n\nCheck their calendars for upcoming shows!",
        emoji: "🎵",
        isPrivate: true,
        createdAt: new Date(now.getTime() - 42 * 24 * 60 * 60 * 1000), // 42 days ago
        updatedAt: new Date(now.getTime() - 42 * 24 * 60 * 60 * 1000),
      },
    ];
    setNotes(dummyNotes);
    await saveNotes(dummyNotes);
  };

  return (
    <NotesContext.Provider
      value={{
        notes,
        addNote,
        updateNote,
        deleteNote,
        getNote,
        togglePrivacy,
        clearAllNotes,
        loadDummyData,
      }}
    >
      {children}
    </NotesContext.Provider>
  );
}

export function useNotes() {
  const context = useContext(NotesContext);
  if (!context) {
    throw new Error("useNotes must be used within a NotesProvider");
  }
  return context;
}

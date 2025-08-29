# Notes App

A modern React Native notes application built with Expo, featuring location mentions, animated suggestion pills, and a beautiful dark/light theme system.

## Features

- 📝 **Rich Text Editing** - Create and edit notes with title and content
- 📍 **Location Mentions** - Add location mentions with `@` symbol and typeahead suggestions
- 🎨 **Animated UI** - Smooth animations for suggestion pills and interactions
- 🌙 **Dark/Light Theme** - Toggle between light and dark modes
- 📱 **Grid/List Views** - Switch between grid and list layouts for note browsing
- 💫 **Suggestion Pills** - Pre-built templates for common note types (restaurants, bars, museums, etc.)
- 🗂️ **Smart Organization** - Notes automatically organized by date (Today, This Month, etc.)
- ✨ **Haptic Feedback** - Native iOS haptic feedback for interactions
- 🎯 **Auto-formatting** - Markdown-style bullet point continuation

## Tech Stack

- **React Native** with Expo (~53.0.22)
- **TypeScript** for type safety
- **React Navigation** for navigation
- **Expo Vector Icons** for iconography
- **SF Symbols** via expo-symbols for iOS native icons
- **AsyncStorage** for data persistence
- **Controlled Mentions** for @ mentions functionality
- **ESLint + Prettier** for code formatting

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- iOS Simulator or physical iOS device
- Expo CLI

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd notes-app
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm start
   ```

4. Run on iOS:
   ```bash
   npm run ios
   ```

### Scripts

- `npm start` - Start Expo development server for iOS
- `npm run ios` - Start iOS simulator
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint errors automatically
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check code formatting

## Project Structure

```
src/
├── components/     # UI components
├── context/        # React contexts  
├── screens/        # Screen components
├── navigation/     # Navigation setup
├── constants/      # App constants
└── config/         # Configuration
```

## Key Features

### Suggestion Pills
Interactive suggestion pills appear above the keyboard when creating new notes, offering pre-built templates for restaurants, bars, museums, coffee shops, weekend getaways, and more.

### Location Mentions
Type `@` to trigger location mention typeahead with real-time search suggestions and pill-style rendering in notes.

### Smart Formatting
- Auto-conversion of `- ` and `* ` to bullet points (`•`)
- Automatic bullet point continuation on Enter
- Intelligent indentation handling

### Theme System
Dynamic light/dark theme switching with consistent color palette and automatic status bar styling.

## iOS-Only Configuration

This app is configured specifically for iOS development with SF Symbols, iOS-specific haptic feedback, and optimized design patterns.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting: `npm run lint`
5. Format code: `npm run format`
6. Submit a pull request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
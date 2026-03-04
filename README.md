# Passant Prototype

[![CI](https://github.com/pdugan20/passant-prototype/workflows/CI/badge.svg)](https://github.com/pdugan20/passant-prototype/actions)
[![React Native](https://img.shields.io/badge/React_Native-0.81-61DAFB?logo=react&logoColor=white)](https://reactnative.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow?logo=opensourceinitiative&logoColor=white)](https://opensource.org/licenses/MIT)

Prototype Passant iOS app with AI-powered list creation. React Native/Expo with location mentions, animated suggestion pills, and dark/light theme support.

## Features

- **Location Mentions** - Type `@` to trigger full-width typeahead with addresses
- **Suggestion Pills** - Pre-built templates for restaurants, bars, museums, and more
- **Smart Formatting** - Auto-conversion of markdown-style bullets with continuation
- **Dark/Light Theme** - Dynamic theme switching with consistent color palette
- **Grid/List Views** - Switch between layouts for note browsing
- **Haptic Feedback** - Native iOS haptic feedback for interactions

## Quick Start

```bash
git clone https://github.com/pdugan20/passant-prototype.git
cd passant-prototype
npm install
npm start
```

## Development

```bash
npm run lint          # Run ESLint
npm run format        # Format code with Prettier
npm run typecheck     # TypeScript type checking
npm run check-all     # Run all quality checks
```

Pre-commit hooks enforce formatting, linting, and type checking. Run `npm run setup-hooks` after cloning.

## Project Structure

```text
src/
├── components/     # UI components (MentionPill, RichTextRenderer, SuggestionPills)
├── context/        # React contexts (NotesContext, ThemeContext)
├── screens/        # Screen components
├── navigation/     # Navigation setup (bottom tabs + native stack)
├── constants/      # App constants
├── config/         # Configuration
└── types/          # TypeScript type definitions
```

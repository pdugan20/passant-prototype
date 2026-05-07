# Passant Prototype

[![CI](https://github.com/pdugan20/passant-prototype/workflows/CI/badge.svg)](https://github.com/pdugan20/passant-prototype/actions)
[![React Native](https://img.shields.io/badge/React_Native-0.81-61DAFB?logo=react&logoColor=white)](https://reactnative.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow?logo=opensourceinitiative&logoColor=white)](https://opensource.org/licenses/MIT)

A React Native/Expo prototype of the Passant iOS app, exploring AI-powered list creation. Type `@` to mention locations from a typeahead, tap suggestion pills for templated content (restaurants, bars, museums), and auto-convert markdown bullets as you type — all with dark/light theming and native haptics.

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

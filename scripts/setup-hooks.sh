#!/bin/bash

# Setup script for git hooks
# Configures git to use local .githooks directory

echo "🔧 Setting up git hooks..."

# Configure git to use local .githooks directory
git config core.hooksPath .githooks

echo "✅ Git hooks configured successfully!"
echo "📝 Pre-commit hook will now run on every commit"
echo "💡 To bypass the hook (not recommended), use: git commit --no-verify"
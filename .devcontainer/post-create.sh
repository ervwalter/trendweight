#!/bin/bash

# Post-creation script for TrendWeight devcontainer
set -e

echo "🚀 Running post-create setup..."

# Install Ruby (needed for tmuxinator)
echo "📦 Installing Ruby..."
sudo apt-get update
sudo apt-get install -y ruby ruby-dev

# Install tmuxinator
echo "📦 Installing tmuxinator..."
sudo gem install tmuxinator

# Create tmuxinator config directory
echo "📁 Setting up tmuxinator config directory..."
mkdir -p ~/.config/tmuxinator

# Install Claude Code
echo "📦 Installing Claude Code..."
npm install -g @anthropic-ai/claude-code

# Setup direnv shell integration
echo "🔧 Setting up direnv shell integration..."
# Add direnv hook to bash profile
if ! grep -q "direnv hook bash" ~/.bashrc; then
    echo 'eval "$(direnv hook bash)"' >> ~/.bashrc
fi
# Add direnv hook to zsh profile (if zsh is available)
if command -v zsh >/dev/null 2>&1 && [ -f ~/.zshrc ]; then
    if ! grep -q "direnv hook zsh" ~/.zshrc; then
        echo 'eval "$(direnv hook zsh)"' >> ~/.zshrc
    fi
fi

echo "✅ Post-create setup completed!"

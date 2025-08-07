#!/bin/bash

# This script helps migrate hardcoded colors to semantic equivalents
# Run from apps/web directory

echo "Starting color migration..."

# Background colors
echo "Replacing background colors..."
find src -name "*.tsx" -type f -exec sed -i '' 's/bg-white/bg-background/g' {} +
find src -name "*.tsx" -type f -exec sed -i '' 's/bg-gray-50/bg-muted/g' {} +
find src -name "*.tsx" -type f -exec sed -i '' 's/bg-gray-100/bg-muted/g' {} +
find src -name "*.tsx" -type f -exec sed -i '' 's/bg-gray-200/bg-accent/g' {} +
find src -name "*.tsx" -type f -exec sed -i '' 's/bg-black/bg-foreground/g' {} +

# Brand colors to primary
echo "Replacing brand colors..."
find src -name "*.tsx" -type f -exec sed -i '' 's/bg-brand-50/bg-primary\/5/g' {} +
find src -name "*.tsx" -type f -exec sed -i '' 's/bg-brand-100/bg-primary\/10/g' {} +
find src -name "*.tsx" -type f -exec sed -i '' 's/bg-brand-300/bg-primary\/30/g' {} +
find src -name "*.tsx" -type f -exec sed -i '' 's/bg-brand-400/bg-primary\/40/g' {} +
find src -name "*.tsx" -type f -exec sed -i '' 's/bg-brand-500/bg-primary/g' {} +
find src -name "*.tsx" -type f -exec sed -i '' 's/bg-brand-600/bg-primary/g' {} +
find src -name "*.tsx" -type f -exec sed -i '' 's/bg-brand-700/bg-primary/g' {} +
find src -name "*.tsx" -type f -exec sed -i '' 's/bg-brand-800/bg-primary/g' {} +

find src -name "*.tsx" -type f -exec sed -i '' 's/text-brand-500/text-primary/g' {} +
find src -name "*.tsx" -type f -exec sed -i '' 's/text-brand-600/text-primary/g' {} +
find src -name "*.tsx" -type f -exec sed -i '' 's/text-brand-700/text-primary/g' {} +
find src -name "*.tsx" -type f -exec sed -i '' 's/text-brand-800/text-primary/g' {} +

find src -name "*.tsx" -type f -exec sed -i '' 's/border-brand-100/border-primary\/20/g' {} +
find src -name "*.tsx" -type f -exec sed -i '' 's/border-brand-500/border-primary/g' {} +

# Status colors
echo "Replacing status colors..."
find src -name "*.tsx" -type f -exec sed -i '' 's/bg-green-100/bg-success\/10/g' {} +
find src -name "*.tsx" -type f -exec sed -i '' 's/bg-green-600/bg-success/g' {} +
find src -name "*.tsx" -type f -exec sed -i '' 's/bg-green-700/bg-success/g' {} +
find src -name "*.tsx" -type f -exec sed -i '' 's/bg-green-800/bg-success/g' {} +
find src -name "*.tsx" -type f -exec sed -i '' 's/text-green-500/text-success/g' {} +
find src -name "*.tsx" -type f -exec sed -i '' 's/text-green-600/text-success/g' {} +

find src -name "*.tsx" -type f -exec sed -i '' 's/bg-red-50/bg-destructive\/10/g' {} +
find src -name "*.tsx" -type f -exec sed -i '' 's/bg-red-500/bg-destructive/g' {} +
find src -name "*.tsx" -type f -exec sed -i '' 's/text-red-600/text-destructive/g' {} +
find src -name "*.tsx" -type f -exec sed -i '' 's/text-red-700/text-destructive/g' {} +

find src -name "*.tsx" -type f -exec sed -i '' 's/bg-amber-50/bg-warning\/10/g' {} +
find src -name "*.tsx" -type f -exec sed -i '' 's/bg-amber-600/bg-warning/g' {} +
find src -name "*.tsx" -type f -exec sed -i '' 's/bg-amber-700/bg-warning/g' {} +
find src -name "*.tsx" -type f -exec sed -i '' 's/bg-amber-800/bg-warning/g' {} +
find src -name "*.tsx" -type f -exec sed -i '' 's/text-amber-600/text-warning/g' {} +
find src -name "*.tsx" -type f -exec sed -i '' 's/text-amber-800/text-warning/g' {} +
find src -name "*.tsx" -type f -exec sed -i '' 's/text-yellow-600/text-warning/g' {} +
find src -name "*.tsx" -type f -exec sed -i '' 's/ring-amber-500/ring-warning/g' {} +

find src -name "*.tsx" -type f -exec sed -i '' 's/text-blue-600/text-info/g' {} +

# Text colors
echo "Replacing text colors..."
find src -name "*.tsx" -type f -exec sed -i '' 's/text-black/text-foreground/g' {} +
find src -name "*.tsx" -type f -exec sed -i '' 's/text-gray-400/text-muted-foreground/g' {} +
find src -name "*.tsx" -type f -exec sed -i '' 's/text-gray-500/text-muted-foreground/g' {} +
find src -name "*.tsx" -type f -exec sed -i '' 's/text-gray-600/text-muted-foreground/g' {} +
find src -name "*.tsx" -type f -exec sed -i '' 's/text-gray-700/text-foreground\/80/g' {} +
find src -name "*.tsx" -type f -exec sed -i '' 's/text-gray-800/text-foreground\/90/g' {} +
find src -name "*.tsx" -type f -exec sed -i '' 's/text-gray-900/text-foreground/g' {} +

# Border colors
echo "Replacing border colors..."
find src -name "*.tsx" -type f -exec sed -i '' 's/border-gray-200/border-border/g' {} +
find src -name "*.tsx" -type f -exec sed -i '' 's/border-gray-300/border-border/g' {} +
find src -name "*.tsx" -type f -exec sed -i '' 's/border-slate-300/border-border/g' {} +
find src -name "*.tsx" -type f -exec sed -i '' 's/border-red-100/border-destructive\/20/g' {} +
find src -name "*.tsx" -type f -exec sed -i '' 's/border-red-200/border-destructive\/30/g' {} +
find src -name "*.tsx" -type f -exec sed -i '' 's/border-amber-200/border-warning\/30/g' {} +

# Special case for text-white (needs context awareness)
echo "Note: text-white replacements need manual review"
echo "  - text-white on primary backgrounds → text-primary-foreground"
echo "  - text-white on dark backgrounds → text-background"

echo "Color migration complete! Please review changes and run tests."
# TrendWeight Code Style Guide

> Version: 1.0.0
> Last Updated: 2025-08-06
> Extends: @~/.agent-os/standards/code-style.md

## Context

This file extends the global code style standards for TrendWeight-specific conventions. These rules take precedence over the global standards when there are conflicts.

## Frontend File Naming Conventions

### TypeScript/React Files
- **All frontend files**: Use kebab-case for consistency with modern web standards and shadcn/ui conventions
- **Components**: `user-profile.tsx`, `navigation-header.tsx`, `data-table.tsx`
- **Utilities**: `auth-guard.ts`, `api-client.ts`, `format-helpers.ts`
- **Tests**: `user-profile.test.tsx`, `api-client.test.ts`
- **Types**: `api-types.ts`, `chart-config.ts`

### Examples
```
✅ Good (kebab-case)
src/components/dashboard/weight-chart.tsx
src/lib/utils/date-formatter.ts
src/components/settings/profile-form.tsx
src/hooks/use-weight-data.ts

❌ Avoid (PascalCase - legacy style)
src/components/dashboard/WeightChart.tsx
src/lib/utils/DateFormatter.ts
```

### Legacy Files
- Existing PascalCase files (Button.tsx, etc.) can remain as-is
- When creating new files, always use kebab-case
- When significantly refactoring existing files, consider renaming to kebab-case

## Component Export Conventions

### Named Exports (Preferred)
Use named exports with PascalCase component names, even when the file is kebab-case:

```typescript
// File: user-profile.tsx
export function UserProfile() {
  return <div>...</div>;
}

// Import
import { UserProfile } from './user-profile';
```

### Default Exports (Legacy)
Some existing files may use default exports - these are acceptable but named exports are preferred for new code:

```typescript
// File: weight-chart.tsx
export default function WeightChart() {
  return <div>...</div>;
}

// Import
import WeightChart from './weight-chart';
```

## Implementation Notes

- This change aligns with industry standards and shadcn/ui conventions
- All new frontend files should use kebab-case naming
- Component names in JSX remain PascalCase regardless of filename
- Existing files do not need immediate renaming - rename during major refactoring
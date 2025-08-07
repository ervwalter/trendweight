# Spec Requirements Document

> Spec: shadcn-migration
> Created: 2025-08-06
> Status: Planning

## Overview

Migrate TrendWeight from the current custom Tailwind v4 + Radix UI implementation to shadcn/ui for more consistent UI styling and improved future maintainability. This migration will replace inconsistent Tailwind class usage with a standardized component library while maintaining existing functionality and design aesthetics.

## User Stories

### Developer Experience Story

As a developer, I want to use shadcn components throughout the application, so that I don't have to remember specific Tailwind class combinations for consistent styling and can focus on building features rather than maintaining custom UI code.

This will eliminate the current inconsistency where different parts of the application use different approaches (custom components, inline Tailwind classes, Radix UI primitives) for similar UI elements, making the codebase more maintainable and reducing the cognitive load for future development.

### Design Consistency Story

As a designer/product owner, I want consistent visual styling across all UI components, so that the application provides a cohesive user experience and maintaining design standards becomes automatic rather than manual.

Currently, card-like elements use different combinations of classes (`bg-white border border-gray-200 shadow-sm rounded-lg` vs variations), which can lead to visual inconsistencies. shadcn will enforce consistent styling patterns.

### Dark Mode Support Story

As a user, I want to toggle between light and dark modes, so that I can use the application comfortably in different lighting conditions and according to my personal preferences.

This will provide a modern user experience that reduces eye strain in low-light environments and aligns with user expectations from contemporary web applications. The implementation will use CSS variables to ensure all shadcn components automatically adapt to the selected theme.

## Spec Scope

1. **Component Library Migration** - Replace all custom src/components/ui components with shadcn equivalents where available
2. **Semantic Color System** - Convert ALL hardcoded colors (bg-white, text-gray-900, etc.) to semantic CSS variables that adapt to theme
3. **Dark Mode Implementation** - Add theme switching capability with persistent user preference storage  
4. **Card Pattern Standardization** - Convert all card-like UI patterns to use shadcn Card component
5. **Form Elements Unification** - Migrate form inputs, selects, and buttons to shadcn components  
6. **Dialog and Modal Consolidation** - Replace custom ConfirmDialog with shadcn AlertDialog components
7. **Data Table Migration** - Replace custom table implementations with shadcn Table components
8. **Loading State Standardization** - Replace custom skeleton animations with shadcn Skeleton component
9. **Icon Library Unification** - Migrate from react-icons to lucide-react for consistency with shadcn
10. **Component Cleanup** - Move non-shadcn custom components out of ui/ folder to preserve shadcn convention

## Out of Scope

- Visual design changes or new styling (maintain current appearance)
- Functional changes to existing components (preserve all existing behavior)
- Migration of complex custom components that don't have shadcn equivalents (e.g., charts, progress indicators)
- Changes to backend API or data structures

## Expected Deliverable

1. Complete shadcn/ui setup with proper configuration for TrendWeight's existing design tokens
2. Functional dark mode with theme toggle in the application header and persistent user preference
3. All existing src/components/ui components replaced with shadcn equivalents or moved to appropriate folders
4. All card-like patterns throughout the application using consistent shadcn Card component
5. Comprehensive test coverage maintained with all existing tests passing including dark mode toggle tests
6. Visual consistency improvements - application should maintain core functionality while achieving better visual consistency through shadcn standardization (minor visual differences acceptable if they improve consistency)

## Spec Documentation

- Tasks: @.agent-os/specs/2025-08-06-shadcn-migration/tasks.md
- Technical Specification: @.agent-os/specs/2025-08-06-shadcn-migration/sub-specs/technical-spec.md
- Tests Specification: @.agent-os/specs/2025-08-06-shadcn-migration/sub-specs/tests.md
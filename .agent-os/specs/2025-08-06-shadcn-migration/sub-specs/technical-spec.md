# Technical Specification

This is the technical specification for the spec detailed in @.agent-os/specs/2025-08-06-shadcn-migration/spec.md

> Created: 2025-08-06
> Version: 1.0.0

## Technical Requirements

- **Tailwind Configuration**: Extend existing Tailwind v4 config to work with shadcn's requirements
- **Design Token Mapping**: Map TrendWeight's existing brand colors (brand-500, brand-600, etc.) to shadcn's CSS variable system
- **Dark Mode Support**: Implement theme switching using CSS variables with support for light, dark, and system preference modes
- **Theme Persistence**: Store user's theme preference in localStorage and sync across browser tabs
- **Standard shadcn Implementation**: Use shadcn components with their standard APIs rather than maintaining backward compatibility, requiring updates to existing component usage
- **No Wrapper Components**: Do NOT create wrapper components in `components/ui/` to maintain backwards compatibility. Update consuming pages/components to use the new shadcn components directly. Wrapper components should only be created in rare cases and must be placed outside the `components/ui/` folder if needed.
- **TypeScript Integration**: Full TypeScript support with proper type definitions for all migrated components
- **Testing Compatibility**: All existing component tests must continue to pass with minimal modifications
- **Bundle Size Optimization**: Remove unused Radix UI dependencies after migration to reduce bundle size
- **Class Variance Authority**: Implement CVA patterns for component variants to maintain existing Button and other component variant systems

## Approach Options

**Option A:** Gradual Migration with Side-by-Side Components
- Pros: Lower risk, can test incrementally, easier rollback
- Cons: Temporary code duplication, longer migration timeline, potential confusion

**Option B:** Complete Direct Migration (Selected)
- Pros: Clean cutover, forces complete testing, maintains consistency, eliminates technical debt
- Cons: Higher initial risk, requires comprehensive testing, more breaking changes
- **Implementation**: Direct replacement of all components without feature flags or gradual migration

**Option C:** Component-by-Component Replacement
- Pros: Minimal risk per component, easy to track progress
- Cons: Very long timeline, potential inconsistency during migration

**Rationale:** Option B is selected because TrendWeight has comprehensive test coverage and a relatively small number of UI components. A direct migration approach eliminates technical debt immediately and results in a cleaner, more maintainable codebase with standard shadcn patterns.

## External Dependencies

- **shadcn/ui** - Complete UI component library with Tailwind + Radix integration
  - **Justification:** Industry-standard component library with excellent TypeScript support, active maintenance, and extensive community
  
- **class-variance-authority (CVA)** - Used by shadcn for variant management
  - **Justification:** Required by shadcn for component variant systems, works alongside tailwind-merge for dynamic class handling
  - **Note:** CVA supplements tailwind-merge rather than replacing it; both are needed for proper shadcn functionality
  
- **@radix-ui/react-slot** - Already installed, used by shadcn components
  - **Justification:** Core dependency for component composition patterns
  
- **lucide-react** - Icon library used by shadcn components
  - **Justification:** Required by shadcn components; also provides opportunity to unify icon usage across the application, potentially replacing react-icons for consistency

## Component Mapping Strategy

### Direct Component Replacements
- **Button** → shadcn Button (adapt to shadcn's standard variants)
- **ConfirmDialog** → shadcn AlertDialog
- **Switch** → shadcn Switch
- **Select** → shadcn Select (replace react-select dependency)
- **Heading** → Evaluate shadcn Typography or maintain as custom
- **Pagination** → shadcn Pagination component
- **ToggleButtonGroup** → shadcn Toggle Group component

### Pattern Replacements with Multiple Components
- **Card-like divs** → shadcn Card, CardHeader, CardContent, CardFooter
- **Toast notifications** → shadcn Toast (replace current Radix Toast implementation)
- **Data Tables** → shadcn Table components for ScaleReadingsTable and RecentReadings table
- **Loading States** → shadcn Skeleton component (replace custom skeleton animations in DashboardPlaceholder)
- **Progress Indicators** → Evaluate shadcn Progress vs existing @bprogress/react (for goal progress in settings)

### Custom Components to Relocate
- **ExternalLink** → Move to src/components/common/ (utility component, no shadcn equivalent)

### Additional Opportunities for Improvement
- **Alert patterns** → Consider shadcn Alert component for notices/warnings if any exist
- **Badge patterns** → shadcn Badge component for status indicators
- **Separator elements** → shadcn Separator for consistent dividers

## Icon Strategy

### Icon Library Unification

**Current State**: Multiple react-icons packages used (react-icons/fa, react-icons/fi, react-icons/hi)
- FaCheck, FaGithub, FaRss from Font Awesome
- FiCopy, FiCheck from Feather Icons  
- HiMenu, HiX, HiCheckCircle, HiOutlineHeart, etc. from Heroicons

**Proposed Approach**: Migrate to lucide-react for consistency with shadcn
- **Justification**: Lucide provides comprehensive icon set with consistent design language
- **Migration Strategy**: Map existing icons to lucide equivalents where possible
- **Fallback**: Keep react-icons for icons without lucide equivalents (minimize usage)

### Icon Mapping Examples
- `HiMenu` → `Menu` from lucide-react
- `HiX` → `X` from lucide-react  
- `HiCheck` → `Check` from lucide-react
- `HiDownload` → `Download` from lucide-react
- `HiChevronLeft/Right` → `ChevronLeft/Right` from lucide-react

## Dark Mode Implementation (Following shadcn/ui Vite Guide)

### Theme Provider Setup
- **Provider Component**: Implement `components/theme-provider.tsx` following shadcn/ui Vite pattern
- **Theme Types**: Support "light", "dark", and "system" modes
- **System Detection**: Use `window.matchMedia('(prefers-color-scheme: dark)')` for system preference
- **Storage Key**: Use `vite-ui-theme` in localStorage (or `trendweight-theme` for branding)
- **Class Application**: Apply theme class directly to `document.documentElement`
- **Context Hook**: Export `useTheme` hook for consuming theme state

### Mode Toggle Component
- **Location**: Add theme toggle in application header/navigation
- **Implementation**: Use shadcn DropdownMenu with Sun/Moon/Monitor icons from lucide-react
- **Keyboard Support**: Full accessibility with keyboard navigation
- **Visual Feedback**: Show current theme state with appropriate icon

### CSS Variable Strategy (OKLCH Color Model)
```css
@layer base {
  :root {
    /* Using OKLCH for better color consistency */
    --background: oklch(100% 0 0);
    --foreground: oklch(14.5% 0 0);
    --card: oklch(100% 0 0);
    --card-foreground: oklch(14.5% 0 0);
    --popover: oklch(100% 0 0);
    --popover-foreground: oklch(14.5% 0 0);
    --primary: /* Map from brand-500 in OKLCH */;
    --primary-foreground: oklch(98.5% 0 0);
    --secondary: oklch(96.1% 0 0);
    --secondary-foreground: oklch(14.5% 0 0);
    --muted: oklch(96.1% 0 0);
    --muted-foreground: oklch(45.5% 0.02 264.52);
    --accent: oklch(96.1% 0 0);
    --accent-foreground: oklch(14.5% 0 0);
    --destructive: oklch(59.2% 0.258 27.35);
    --destructive-foreground: oklch(98.5% 0 0);
    --border: oklch(90% 0 0);
    --input: oklch(90% 0 0);
    --ring: /* Map from brand color */;
    --radius: 0.5rem;
  }

  .dark {
    --background: oklch(14.5% 0 0);
    --foreground: oklch(98.5% 0 0);
    --card: oklch(14.5% 0 0);
    --card-foreground: oklch(98.5% 0 0);
    --popover: oklch(14.5% 0 0);
    --popover-foreground: oklch(98.5% 0 0);
    --primary: /* Map from brand-400 for better contrast in dark mode */;
    --primary-foreground: oklch(14.5% 0 0);
    --secondary: oklch(21.7% 0 0);
    --secondary-foreground: oklch(98.5% 0 0);
    --muted: oklch(21.7% 0 0);
    --muted-foreground: oklch(64.5% 0 0);
    --accent: oklch(21.7% 0 0);
    --accent-foreground: oklch(98.5% 0 0);
    --destructive: oklch(52.8% 0.253 25.18);
    --destructive-foreground: oklch(98.5% 0 0);
    --border: oklch(21.7% 0 0);
    --input: oklch(21.7% 0 0);
    --ring: oklch(78.5% 0.074 71.77);
  }
}
```

### Tailwind Configuration Updates
- **Dark Mode Strategy**: Use `class` strategy in tailwind.config.js (this only controls when the `.dark` class is applied)
- **Color Extensions**: Map CSS variables to Tailwind utilities
- **OKLCH Support**: Ensure Tailwind v4 OKLCH color support is configured

### Semantic Color Strategy (Critical Requirement)
- **NO `dark:` prefixes**: Components should NOT use `dark:bg-gray-800` style classes
- **Semantic Variables Only**: Use semantic color utilities like `bg-background`, `text-foreground`, `border-border`
- **Color Migration Required**: ALL existing hardcoded colors must be converted to semantic variables:
  - `bg-white` → `bg-background` or `bg-card`
  - `text-gray-900` → `text-foreground`
  - `border-gray-200` → `border-border`
  - `bg-gray-50` → `bg-muted`
  - `text-gray-600` → `text-muted-foreground`
  - Brand colors → `bg-primary`, `text-primary-foreground`
- **Exceptional Cases**: Direct color usage only allowed for:
  - One-off decorative elements that don't change with theme
  - Status colors that remain constant (though prefer semantic like `bg-destructive`)
  
### Component Adaptation
- All shadcn components automatically adapt via CSS variables
- Custom components must use semantic CSS variables for ALL colors
- Existing components need color refactoring to remove hardcoded Tailwind colors
- Charts (Highcharts) will need custom theme configuration for dark mode
- Ensure WCAG AA contrast ratios in both themes

## Configuration Requirements

### Tailwind CSS Variables
```css
:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --primary: /* Map from brand-500 (primary color) */;
  --primary-foreground: 210 40% 98%;
  /* Additional mappings - open to changing other brand color variations */
  /* Dark mode primary may use different variation for better contrast */
}
```

### Component Configuration
- Maintain existing size variants (sm, md, lg, xl)
- Preserve existing color scheme and brand colors
- Ensure responsive behavior matches current implementation
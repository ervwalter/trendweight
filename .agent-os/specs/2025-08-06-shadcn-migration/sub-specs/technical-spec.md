# Technical Specification

This is the technical specification for the spec detailed in @.agent-os/specs/2025-08-06-shadcn-migration/spec.md

> Created: 2025-08-06
> Version: 1.0.0

## Technical Requirements

- **Tailwind Configuration**: Extend existing Tailwind v4 config to work with shadcn's requirements
- **Design Token Mapping**: Map TrendWeight's existing brand colors (brand-500, brand-600, etc.) to shadcn's CSS variable system
- **Standard shadcn Implementation**: Use shadcn components with their standard APIs rather than maintaining backward compatibility, requiring updates to existing component usage
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
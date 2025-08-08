# Tests Specification

This is the tests coverage details for the spec detailed in @.agent-os/specs/2025-08-06-shadcn-migration/spec.md

> Created: 2025-08-06
> Version: 1.0.0

## Test Coverage

### Unit Tests

**Button Component**
- All existing Button.test.tsx tests must continue to pass
- Variant rendering (primary, secondary, ghost, success, destructive, warning)
- Size variations (sm, md, lg, xl)
- Disabled state behavior
- asChild prop functionality
- Custom className merging

**Select Component**
- Select.test.tsx migration to new shadcn Select component
- Option selection behavior
- Error state display
- Accessibility attributes
- Custom styling preservation

**Switch Component**
- Switch.test.tsx behavior preservation
- Checked/unchecked states
- Disabled state handling
- onChange event handling

**ConfirmDialog Component**
- ConfirmDialog.test.tsx migration to AlertDialog
- Dialog open/close behavior
- Confirm/cancel action handling
- Accessibility and focus management

**ToggleButtonGroup Component**
- ToggleButtonGroup.test.tsx functionality
- Multiple selection modes
- Individual button states
- Group behavior and styling

**Heading Component**
- Heading.test.tsx semantic HTML output
- Size variants and responsive behavior
- Custom styling application

**Pagination Component**
- Pagination.test.tsx functionality with shadcn Pagination
- Page navigation behavior
- Previous/next button states
- Current page highlighting

**Table Components**
- ScaleReadingsTable component with shadcn Table components
- RecentReadings table conversion
- Proper table semantics and accessibility
- Data sorting and display functionality

### Integration Tests

**Form Integration**
- Form components work together seamlessly
- Form submission with new Select components
- Form validation display with new components
- Error state handling across form elements

**Card Pattern Usage**
- All card-like components render with consistent styling using shadcn Card
- Settings page card sections
- Migration component cards  
- Dashboard NoDataCard component
- Download section cards

**Table Integration**
- ScaleReadingsTable renders data correctly with shadcn Table components
- RecentReadings table maintains functionality
- Table responsive behavior on different screen sizes
- Proper table accessibility attributes

**Loading State Integration**
- DashboardPlaceholder uses shadcn Skeleton components
- Loading states appear correctly during data fetching
- Skeleton animations match content structure

**Icon Integration**
- All lucide-react icons render correctly
- Icon sizes and styling preserved from react-icons equivalents
- Icons maintain proper accessibility attributes

**Dialog Workflows**
- Confirmation dialogs throughout the application
- Modal behavior and backdrop interactions
- Focus management and keyboard navigation

**Dark Mode and Theme System**
- ThemeProvider correctly manages theme state
- Theme persists to localStorage and retrieves on reload
- System preference detection works correctly
- Theme changes apply to all components immediately
- ModeToggle component shows correct icon for current theme
- Dropdown menu allows selection of light/dark/system modes
- Theme syncs across browser tabs via storage events

**Semantic Color System**
- All components use semantic color classes (no hardcoded colors)
- Colors correctly change when theme switches
- Contrast ratios meet WCAG AA standards in both themes
- Charts and visualizations adapt to dark mode
- No `dark:` prefixes used except in exceptional cases
- All bg-white, text-gray-*, border-gray-* replaced with semantic equivalents

### Visual Regression Tests

**Component Appearance**
- All components maintain visual appearance identical to current implementation
- Button variants look identical across all sizes
- Card components have same spacing, borders, and shadows
- Dialog components have same positioning and styling

**Responsive Behavior**
- All components maintain responsive behavior on mobile/tablet/desktop
- Button sizes adapt correctly on different screen sizes
- Card layouts remain responsive

### Mocking Requirements

**External Dependencies**
- Mock shadcn components during test setup if needed
- Preserve existing MSW mocks for API interactions
- Mock any new icon dependencies (lucide-react) if used

**Component Testing Strategy**
- Use Testing Library's component testing approach
- Preserve all existing test patterns and assertions
- Add new tests only for shadcn-specific functionality that differs from current implementation

### Performance Tests

**Bundle Size Verification**
- Verify removal of unused Radix UI dependencies
- Confirm shadcn components don't significantly increase bundle size
- Test tree-shaking effectiveness for unused shadcn components

**Runtime Performance**
- Ensure no performance regressions in component rendering
- Verify form interaction performance remains unchanged
- Test dialog open/close animation performance
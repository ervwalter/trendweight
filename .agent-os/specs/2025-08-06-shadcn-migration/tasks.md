# Spec Tasks

These are the tasks to be completed for the spec detailed in @.agent-os/specs/2025-08-06-shadcn-migration/spec.md

> Created: 2025-08-06
> Status: Ready for Implementation

## Tasks

- [x] 1. shadcn/ui Installation and Configuration
  - [x] 1.1 Write tests for shadcn installation and configuration
  - [x] 1.2 Install shadcn/ui CLI and initialize project
  - [x] 1.3 Configure Tailwind CSS variables mapping brand-500 to primary
  - [x] 1.4 Install required dependencies (class-variance-authority, lucide-react)
  - [x] 1.5 Set up proper TypeScript configuration for shadcn components
  - [x] 1.6 Verify all tests pass after installation

- [x] 2. Core UI Component Migration
  - [x] 2.1 Write tests for Button component migration to shadcn
  - [x] 2.2 Replace custom Button with shadcn Button component
  - [x] 2.3 Update all Button usage throughout codebase to match shadcn API
  - [x] 2.4 Migrate Select component from react-select to shadcn Select
  - [x] 2.5 Update Select usage and remove react-select dependency
  - [x] 2.6 Replace Switch component with shadcn Switch
  - [x] 2.7 Replace ConfirmDialog with shadcn AlertDialog
  - [x] 2.8 Verify all core component tests pass

- [x] 3. Form and Input Components Migration
  - [x] 3.1 Write tests for form component integrations
  - [x] 3.2 Install and configure shadcn Input components if needed
  - [x] 3.3 Update form implementations to use new Select component
  - [x] 3.4 Test form validation and error handling with new components
  - [x] 3.5 Verify all form-related tests pass

- [x] 4. Layout and Navigation Components (Modified: Combined with Task 6)
  - [x] 4.1 Write tests for DataTable with built-in pagination
  - [x] 4.2 Install shadcn Table and Toggle Group components
  - [x] 4.3 Replace ScaleReadingsTable with DataTable using TanStack Table
  - [x] 4.4 Replace ToggleButtonGroup with shadcn Toggle Group
  - [x] 4.5 Test toggle group functionality and styling
  - [x] 4.6 Verify all navigation component tests pass

- [x] 5. Card Pattern Standardization
  - [x] 5.1 Write tests for Card component usage patterns
  - [x] 5.2 Install shadcn Card components (Card, CardHeader, CardContent, CardFooter)
  - [x] 5.3 Replace card-like divs in Settings page with shadcn Card
  - [x] 5.4 Update Migration component to use shadcn Card
  - [x] 5.5 Update NoDataCard component to use shadcn Card
  - [x] 5.6 Update DownloadSection cards to use shadcn Card
  - [x] 5.7 Search for and replace any remaining card patterns
  - [x] 5.8 Verify all card-related tests pass

- [x] 6. Data Table Migration (Combined with Task 4)
  - [x] 6.1 Write tests for Table component migrations
  - [x] 6.2 Install shadcn Table components (Table, TableHeader, TableBody, TableRow, TableCell)
  - [x] 6.3 Replace ScaleReadingsTable implementation with shadcn Table components + TanStack Table
  - [x] 6.4 Replace RecentReadings table with shadcn Table components
  - [x] 6.5 Ensure table accessibility and responsive behavior
  - [x] 6.6 Verify all table-related tests pass

- [x] 7. Loading States and Progress Migration
  - [x] 7.1 Write tests for Skeleton component replacement
  - [x] 7.2 Install shadcn Skeleton component
  - [x] 7.3 Replace DashboardPlaceholder custom skeleton with shadcn Skeleton
  - [x] 7.4 Evaluate shadcn Progress vs @bprogress/react for goal progress
  - [x] 7.5 Update loading states throughout application
  - [x] 7.6 Verify all loading state tests pass

- [x] 8. Icon Library Unification
  - [x] 8.1 Write tests for icon replacements
  - [x] 8.2 Create icon mapping from react-icons to lucide-react equivalents
  - [x] 8.3 Replace HiMenu, HiX, HiCheck, and other common icons with lucide equivalents
  - [x] 8.4 Update icon imports throughout codebase
  - [x] 8.5 Remove unused react-icons dependencies
  - [x] 8.6 Verify all icon-related tests pass

- [x] 9. Toast and Dialog System Migration
  - [x] 9.1 Write tests for Toast system replacement
  - [x] 9.2 Replace Radix Toast implementation with shadcn Toast (using Sonner)
  - [x] 9.3 Update ToastProvider with shadcn toast system
  - [x] 9.4 Test all dialog and toast interactions
  - [x] 9.5 Verify all toast and dialog tests pass

- [x] 10. Dark Mode Infrastructure
  - [x] 10.1 Write tests for theme provider and mode toggle
  - [x] 10.2 Create ThemeProvider component following shadcn/ui Vite pattern
  - [x] 10.3 Implement useTheme hook for consuming theme state
  - [x] 10.4 Create ModeToggle component with dropdown menu
  - [x] 10.5 Add theme toggle to application header/navigation
  - [x] 10.6 Configure CSS variables for light and dark themes in OKLCH format
  - [x] 10.7 Update Tailwind config for dark mode class strategy
  - [x] 10.8 Test theme persistence and system preference detection
  - [x] 10.9 Verify theme switching works across all pages

- [x] 11. Semantic Color Migration
  - [x] 11.1 Write tests for semantic color usage
  - [x] 11.2 Audit all components for hardcoded color classes
  - [x] 11.3 Replace bg-white/bg-gray-* with semantic equivalents (bg-background, bg-card, bg-muted)
  - [x] 11.4 Replace text-gray-*/text-black with semantic equivalents (text-foreground, text-muted-foreground)
  - [x] 11.5 Replace border-gray-* with border-border
  - [x] 11.6 Update brand color usage to use primary/secondary semantic colors
  - [x] 11.7 Update status colors (success, error, warning) to semantic variables
  - [x] 11.8 Configure Highcharts themes for dark mode support
  - [x] 11.9 Verify all components adapt correctly to theme changes

- [ ] 12. Component Cleanup and Organization
  - [ ] 12.1 Write tests for component organization
  - [ ] 12.2 Move ExternalLink to src/components/common/
  - [ ] 12.3 Remove old custom components from src/components/ui/
  - [ ] 12.4 Update import paths for relocated components
  - [ ] 12.5 Verify src/components/ui/ only contains shadcn components
  - [ ] 12.6 Run comprehensive test suite to ensure all tests pass

- [ ] 13. Bundle Optimization and Dependencies
  - [ ] 13.1 Remove unused Radix UI dependencies
  - [ ] 13.2 Remove unused react-icons packages
  - [ ] 13.3 Verify tree-shaking effectiveness for shadcn components
  - [ ] 13.4 Run bundle analysis to confirm size optimization
  - [ ] 13.5 Update package.json dependencies
  - [ ] 13.6 Verify final build and all tests pass
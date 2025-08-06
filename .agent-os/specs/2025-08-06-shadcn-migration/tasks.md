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

- [ ] 2. Core UI Component Migration
  - [ ] 2.1 Write tests for Button component migration to shadcn
  - [ ] 2.2 Replace custom Button with shadcn Button component
  - [ ] 2.3 Update all Button usage throughout codebase to match shadcn API
  - [ ] 2.4 Migrate Select component from react-select to shadcn Select
  - [ ] 2.5 Update Select usage and remove react-select dependency
  - [ ] 2.6 Replace Switch component with shadcn Switch
  - [ ] 2.7 Replace ConfirmDialog with shadcn AlertDialog
  - [ ] 2.8 Verify all core component tests pass

- [ ] 3. Form and Input Components Migration
  - [ ] 3.1 Write tests for form component integrations
  - [ ] 3.2 Install and configure shadcn Input components if needed
  - [ ] 3.3 Update form implementations to use new Select component
  - [ ] 3.4 Test form validation and error handling with new components
  - [ ] 3.5 Verify all form-related tests pass

- [ ] 4. Layout and Navigation Components
  - [ ] 4.1 Write tests for Pagination component replacement
  - [ ] 4.2 Replace custom Pagination with shadcn Pagination component
  - [ ] 4.3 Update pagination usage in components that use it
  - [ ] 4.4 Replace ToggleButtonGroup with shadcn Toggle Group
  - [ ] 4.5 Test toggle group functionality and styling
  - [ ] 4.6 Verify all navigation component tests pass

- [ ] 5. Card Pattern Standardization
  - [ ] 5.1 Write tests for Card component usage patterns
  - [ ] 5.2 Install shadcn Card components (Card, CardHeader, CardContent, CardFooter)
  - [ ] 5.3 Replace card-like divs in Settings page with shadcn Card
  - [ ] 5.4 Update Migration component to use shadcn Card
  - [ ] 5.5 Update NoDataCard component to use shadcn Card
  - [ ] 5.6 Update DownloadSection cards to use shadcn Card
  - [ ] 5.7 Search for and replace any remaining card patterns
  - [ ] 5.8 Verify all card-related tests pass

- [ ] 6. Data Table Migration
  - [ ] 6.1 Write tests for Table component migrations
  - [ ] 6.2 Install shadcn Table components (Table, TableHeader, TableBody, TableRow, TableCell)
  - [ ] 6.3 Replace ScaleReadingsTable implementation with shadcn Table components
  - [ ] 6.4 Replace RecentReadings table with shadcn Table components
  - [ ] 6.5 Ensure table accessibility and responsive behavior
  - [ ] 6.6 Verify all table-related tests pass

- [ ] 7. Loading States and Progress Migration
  - [ ] 7.1 Write tests for Skeleton component replacement
  - [ ] 7.2 Install shadcn Skeleton component
  - [ ] 7.3 Replace DashboardPlaceholder custom skeleton with shadcn Skeleton
  - [ ] 7.4 Evaluate shadcn Progress vs @bprogress/react for goal progress
  - [ ] 7.5 Update loading states throughout application
  - [ ] 7.6 Verify all loading state tests pass

- [ ] 8. Icon Library Unification
  - [ ] 8.1 Write tests for icon replacements
  - [ ] 8.2 Create icon mapping from react-icons to lucide-react equivalents
  - [ ] 8.3 Replace HiMenu, HiX, HiCheck, and other common icons with lucide equivalents
  - [ ] 8.4 Update icon imports throughout codebase
  - [ ] 8.5 Remove unused react-icons dependencies
  - [ ] 8.6 Verify all icon-related tests pass

- [ ] 9. Toast and Dialog System Migration
  - [ ] 9.1 Write tests for Toast system replacement
  - [ ] 9.2 Replace Radix Toast implementation with shadcn Toast
  - [ ] 9.3 Update ToastProvider with shadcn toast system
  - [ ] 9.4 Test all dialog and toast interactions
  - [ ] 9.5 Verify all toast and dialog tests pass

- [ ] 10. Component Cleanup and Organization
  - [ ] 10.1 Write tests for component organization
  - [ ] 10.2 Move ExternalLink to src/components/common/
  - [ ] 10.3 Remove old custom components from src/components/ui/
  - [ ] 10.4 Update import paths for relocated components
  - [ ] 10.5 Verify src/components/ui/ only contains shadcn components
  - [ ] 10.6 Run comprehensive test suite to ensure all tests pass

- [ ] 11. Bundle Optimization and Dependencies
  - [ ] 11.1 Remove unused Radix UI dependencies
  - [ ] 11.2 Remove unused react-icons packages
  - [ ] 11.3 Verify tree-shaking effectiveness for shadcn components
  - [ ] 11.4 Run bundle analysis to confirm size optimization
  - [ ] 11.5 Update package.json dependencies
  - [ ] 11.6 Verify final build and all tests pass
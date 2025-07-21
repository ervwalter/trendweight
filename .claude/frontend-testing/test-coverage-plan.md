# Frontend Test Coverage Plan

## Overview
Target: 75% overall coverage with focus on complex business logic and critical user paths.

## Important Testing Guidelines
**ALWAYS use MSW (Mock Service Worker) for HTTP mocking** - Do not manually mock fetch or API functions. See TESTING.md for detailed MSW usage guidelines.

## Phase 1: Critical Business Logic Tests

### Dashboard Computations (`src/lib/dashboard/computations/`)
- [x] `trend-calculations.ts` - Weight trend algorithm tests ✅ 100% coverage
  - [x] Test calculateWeightTrend function
  - [x] Test edge cases (single data point, gaps in data)
  - [x] Test trend calculation accuracy
- [x] `stats.ts` - Statistical calculation tests ✅ 97.89% coverage
  - [x] Test calculateStats function
  - [x] Test averages, min/max calculations
  - [x] Test period-based calculations
- [x] `interpolation.ts` - Data interpolation tests ✅ 100% coverage
  - [x] Test interpolateData function
  - [x] Test gap filling logic
  - [x] Test boundary conditions
- [x] `grouping.ts` - Data grouping tests ✅ 100% coverage
  - [x] Test groupDataByPeriod function
  - [x] Test daily/weekly/monthly grouping
- [x] `measurements.ts` - Measurement processing tests ✅ 100% coverage
  - [x] Test processMeasurements function
  - [x] Test data validation
- [x] `conversion.ts` - Unit conversion tests ✅ 100% coverage
  - [x] Test weight unit conversions (kg/lbs)
  - [x] Test rounding precision
- [x] `data-points.ts` - Data point transformation tests ✅ 100% coverage
  - [x] Test mode-based data extraction
  - [x] Test filtering and sorting logic

### Chart Logic (`src/lib/charts/`)
- [ ] `create-chart-series.ts` - Series generation tests
  - [ ] Test createWeightSeries function
  - [ ] Test createTrendSeries function
  - [ ] Test data point formatting
- [ ] `data-transformers.ts` - Data transformation tests
  - [ ] Test transformChartData function
  - [ ] Test date formatting
  - [ ] Test null/undefined handling
- [ ] `use-chart-options.ts` - Hook tests
  - [ ] Test chart configuration generation
  - [ ] Test responsive behavior
  - [ ] Test theme integration

### API Layer (`src/lib/api/`)
- [x] `client.ts` - API client tests ✅ 100% coverage (+ fixed header merging bug!)
  - [x] Test successful requests
  - [x] Test error handling (401, 403, 404, 500)
  - [x] Test request interceptors
  - [x] Test auth header injection
- [x] `queries.ts` - React Query hook tests ✅ 100% coverage (15 tests)
  - [x] Test useProfile, useSettings
  - [x] Test useDashboardQueries
  - [x] Test useProviderLinks, useSharingSettings
  - [x] Test error states and loading states
- [x] `mutations.ts` - Mutation hook tests ✅ 100% coverage (22 tests)
  - [x] Test useUpdateProfile
  - [x] Test provider mutations (disconnect, resync, reconnect)
  - [x] Test sharing mutations (toggle, generate token)
  - [x] Test optimistic updates and rollback on error

## Phase 2: Core Feature Tests

### Authentication System
- [x] `AuthProvider.tsx` - Provider tests ✅ 100% coverage (18 tests)
  - [x] Test authentication flow
  - [x] Test social login (Google, Microsoft, Apple)
  - [x] Test email login
  - [x] Test logout functionality
  - [x] Test auth state changes
- [x] `useAuth.ts` - Hook tests ✅ 100% coverage (4 tests)
  - [x] Test auth context usage
  - [x] Test error when used outside provider
- [x] `authGuard.ts` - Route protection tests ✅ 100% coverage (4 tests)
  - [x] Test redirect logic
  - [x] Test authenticated route access
- [x] `authSuspense.ts` - Suspense manager tests ✅ 100% coverage (12 tests)
  - [x] Test promise management
  - [x] Test subscriber notifications
  - [x] Test initialization flow

### Dashboard Components
- [ ] `Dashboard.tsx` - Component integration tests
  - [ ] Test data loading states
  - [ ] Test error states
  - [ ] Test empty state
  - [ ] Test data display
- [ ] `Stats.tsx` - Display logic tests
  - [ ] Test stat calculations
  - [ ] Test formatting
  - [ ] Test responsive layout
- [ ] `Currently.tsx` - Current weight display tests
  - [ ] Test weight formatting
  - [ ] Test trend indicators
- [ ] `RecentReadings.tsx` - Table functionality tests
  - [ ] Test sorting
  - [ ] Test pagination
  - [ ] Test data formatting

### Forms & Settings
- [ ] Settings form tests
  - [ ] Test form validation
  - [ ] Test submission flow
  - [ ] Test error handling
- [ ] Provider connection forms
  - [ ] Test OAuth flow initiation
  - [ ] Test error states

## Phase 3: UI Component Tests

### Core Components (`src/components/ui/`)
- [ ] `Button.tsx` - Interaction tests
- [ ] `Select.tsx` - Selection logic tests
- [ ] `Input.tsx` - Input validation tests
- [ ] `Dialog.tsx` - Modal behavior tests
- [ ] `Tabs.tsx` - Tab switching tests
- [ ] `Table.tsx` - Table functionality tests

### Layout Components
- [ ] `Header.tsx` - Navigation tests
- [ ] `Footer.tsx` - Link tests
- [ ] `Layout.tsx` - Responsive behavior tests

### Error Handling
- [ ] `ErrorBoundary.tsx` - Error catching tests
- [ ] `ErrorPage.tsx` - Error display tests

## Phase 4: Integration Tests

### User Flows
- [ ] Complete authentication flow
  - [ ] Login → Dashboard → Logout
- [ ] Settings update flow
  - [ ] Navigate to settings → Update → Verify changes
- [ ] Provider connection flow
  - [ ] Connect provider → Sync data → View results
- [ ] Data export flow
  - [ ] Navigate to export → Select format → Download

### E2E Critical Paths
- [ ] New user onboarding
- [ ] Daily weight entry workflow
- [ ] Provider sync workflow

## Testing Guidelines

### What to Test
1. **Complex Logic**: Any function with conditional logic, loops, or calculations
2. **User Interactions**: Form submissions, button clicks, navigation
3. **API Integration**: Loading states, error handling, data transformation
4. **Edge Cases**: Empty data, single data points, extreme values
5. **Error Scenarios**: Network failures, invalid data, auth failures

### What Not to Test
1. Simple presentational components with no logic
2. Third-party library internals
3. CSS/styling (unless it affects functionality)
4. Framework code (React, React Router internals)

### Test Structure
```typescript
describe('ComponentName', () => {
  describe('feature/scenario', () => {
    it('should behave correctly when...', () => {
      // Arrange
      // Act
      // Assert
    });
  });
});
```

### Coverage Goals
- Business Logic: 90%+
- API Layer: 85%+
- Core Components: 80%+
- UI Components: 70%+
- Overall Target: 75%+
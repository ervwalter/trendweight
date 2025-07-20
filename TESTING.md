# TrendWeight Testing Guide

This guide covers the testing infrastructure, patterns, and best practices for the TrendWeight application.

## Overview

TrendWeight uses a comprehensive testing strategy with:
- **Backend**: xUnit for .NET Core API testing
- **Frontend**: Vitest for React component and hook testing
- **CI/CD**: Automated testing on all pull requests and commits

## Backend Testing (C# / .NET)

### Test Infrastructure

The backend uses the following testing libraries:
- **xUnit**: Test framework
- **Moq**: Mocking framework
- **FluentAssertions**: Assertion library
- **Microsoft.AspNetCore.Mvc.Testing**: Integration testing

### Running Backend Tests

```bash
# From the repository root
cd apps/api
dotnet test

# With coverage
dotnet test --collect:"XPlat Code Coverage"

# Watch mode
dotnet watch test
```

### Backend Test Structure

```
apps/api/TrendWeight.Tests/
├── Features/
│   ├── Profile/
│   │   └── Services/
│   │       └── ProfileServiceTests.cs
│   ├── ProviderLinks/
│   │   └── Services/
│   │       └── ProviderLinkServiceTests.cs
│   └── [Other Features]/
├── Fixtures/
│   ├── TestBase.cs
│   └── IntegrationTestBase.cs
└── Helpers/
```

### Backend Testing Patterns

#### Unit Testing Services

```csharp
public class ProfileServiceTests : TestBase
{
    private readonly Mock<ISupabaseService> _supabaseServiceMock;
    private readonly ProfileService _sut;

    public ProfileServiceTests()
    {
        _supabaseServiceMock = new Mock<ISupabaseService>();
        _sut = new ProfileService(_supabaseServiceMock.Object, ...);
    }

    [Fact]
    public async Task GetByIdAsync_WithValidGuid_ReturnsProfile()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var expectedProfile = CreateTestProfile(userId);
        _supabaseServiceMock.Setup(x => x.GetByIdAsync<DbProfile>(userId))
            .ReturnsAsync(expectedProfile);

        // Act
        var result = await _sut.GetByIdAsync(userId);

        // Assert
        result.Should().NotBeNull();
        result!.Uid.Should().Be(userId);
    }
}
```

#### Integration Testing Controllers

```csharp
public class ProfileControllerIntegrationTests : IntegrationTestBase
{
    public ProfileControllerIntegrationTests(TestWebApplicationFactory factory) 
        : base(factory) { }

    [Fact]
    public async Task GetProfile_ReturnsUserProfile()
    {
        // Arrange
        var userId = "test-user-id";
        
        // Act
        var response = await Client.GetAsync($"/api/profile/{userId}");
        
        // Assert
        response.Should().BeSuccessful();
    }
}
```

### Backend Best Practices

1. **Use Descriptive Test Names**: Follow the pattern `MethodName_Scenario_ExpectedBehavior`
2. **Arrange-Act-Assert**: Structure tests clearly with these three sections
3. **Mock External Dependencies**: Use Moq to mock Supabase, external APIs, etc.
4. **Test Edge Cases**: Include tests for null values, empty collections, exceptions
5. **Use Test Builders**: Create helper methods to construct test data

## Frontend Testing (TypeScript / React)

### Test Infrastructure

The frontend uses the following testing libraries:
- **Vitest**: Test runner (faster alternative to Jest)
- **React Testing Library**: Component testing
- **@testing-library/user-event**: User interaction simulation
- **MSW**: API mocking (when needed)

### Running Frontend Tests

```bash
# From the repository root
cd apps/web
npm test              # Run tests in watch mode
npm test -- --run     # Run tests once
npm run test:coverage # Run with coverage report
npm run test:ui       # Open Vitest UI
```

### Frontend Test Structure

```
apps/web/
├── src/
│   ├── components/
│   │   └── ui/
│   │       ├── Button.tsx
│   │       └── Button.test.tsx
│   ├── lib/
│   │   └── hooks/
│   │       ├── usePersistedState.ts
│   │       └── usePersistedState.test.ts
│   └── test/
│       ├── setup.ts
│       └── test-utils.tsx
└── vitest.config.ts
```

### Frontend Testing Patterns

#### Component Testing

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@/test/test-utils';
import userEvent from '@testing-library/user-event';
import { Button } from './Button';

describe('Button', () => {
  it('handles click events', async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();
    
    render(<Button onClick={handleClick}>Click me</Button>);
    await user.click(screen.getByRole('button'));
    
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

#### Hook Testing

```typescript
import { renderHook, act } from '@testing-library/react';
import { usePersistedState } from './usePersistedState';

describe('usePersistedState', () => {
  it('persists value to localStorage', () => {
    const { result } = renderHook(() => 
      usePersistedState('key', 'initial')
    );
    
    act(() => {
      result.current[1]('newValue');
    });
    
    expect(localStorage.getItem('key')).toBe('"newValue"');
  });
});
```

### Frontend Best Practices

1. **Test User Behavior**: Focus on how users interact with components
2. **Avoid Implementation Details**: Don't test internal state or methods
3. **Use Semantic Queries**: Prefer `getByRole`, `getByLabelText` over `getByTestId`
4. **Mock Sparingly**: Only mock what's necessary (API calls, browser APIs)
5. **Keep Tests Simple**: Each test should verify one behavior

## Test Coverage

### Coverage Goals

- **Minimum Coverage**: 70% for critical paths
- **Target Coverage**: 80%+ for business logic
- **Focus Areas**: Services, custom hooks, utility functions

### Viewing Coverage Reports

```bash
# Backend coverage (generates HTML report)
cd apps/api
dotnet test --collect:"XPlat Code Coverage"

# Frontend coverage (generates HTML report in coverage/)
cd apps/web
npm run test:coverage
open coverage/index.html  # View in browser
```

### Coverage Configuration

Frontend coverage is configured in `vitest.config.ts`:
- Reports are generated in the `coverage/` directory
- HTML, JSON, and text reporters are enabled
- Test files and generated code are excluded

## CI/CD Integration

All tests run automatically on:
- Pull requests to `main`
- Commits to any branch
- Release tags

The CI pipeline:
1. Runs backend tests with coverage
2. Runs frontend tests with coverage
3. Uploads coverage artifacts
4. Only builds Docker images if all tests pass

## Writing New Tests

### When to Write Tests

Write tests for:
- New features
- Bug fixes (regression tests)
- Complex business logic
- Custom hooks
- Utility functions
- API endpoints

### Test File Naming

- Backend: `[ClassName]Tests.cs`
- Frontend: `[ComponentName].test.tsx` or `[hookName].test.ts`

### Test Organization

- Group related tests using `describe` blocks
- Use clear, descriptive test names
- Keep tests focused and independent
- Avoid sharing state between tests

## Common Testing Scenarios

### Testing Async Operations

```typescript
it('loads data asynchronously', async () => {
  render(<DataComponent />);
  
  // Wait for loading to complete
  await waitFor(() => {
    expect(screen.getByText('Data loaded')).toBeInTheDocument();
  });
});
```

### Testing Error States

```csharp
[Fact]
public async Task GetProfile_WhenNotFound_ReturnsNull()
{
    // Arrange
    _mockService.Setup(x => x.GetByIdAsync<DbProfile>(It.IsAny<Guid>()))
        .ReturnsAsync((DbProfile?)null);
    
    // Act
    var result = await _sut.GetByIdAsync(Guid.NewGuid());
    
    // Assert
    result.Should().BeNull();
}
```

### Testing Form Interactions

```typescript
it('submits form with valid data', async () => {
  const user = userEvent.setup();
  const onSubmit = vi.fn();
  
  render(<Form onSubmit={onSubmit} />);
  
  await user.type(screen.getByLabelText('Name'), 'John Doe');
  await user.click(screen.getByRole('button', { name: 'Submit' }));
  
  expect(onSubmit).toHaveBeenCalledWith({ name: 'John Doe' });
});
```

## Troubleshooting

### Common Issues

1. **Act Warnings**: Wrap state updates in `act()` or use `userEvent`
2. **Async Timeouts**: Increase timeout for slow operations
3. **Module Mocks**: Clear mocks between tests with `vi.clearAllMocks()`
4. **Coverage Gaps**: Check excluded patterns in config files

### Debugging Tests

```typescript
// Frontend - use screen.debug()
it('renders correctly', () => {
  render(<Component />);
  screen.debug(); // Prints DOM to console
});

// Backend - use test output
[Fact]
public void DebugTest()
{
    var result = DoSomething();
    _output.WriteLine($"Result: {result}");
}
```

## Resources

- [xUnit Documentation](https://xunit.net/)
- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [FluentAssertions](https://fluentassertions.com/)
- [Moq Quick Start](https://github.com/moq/moq4/wiki/Quickstart)

## Test Coverage Task List

This section tracks all areas that need test coverage. Check off items as they are completed.

### Backend (C#/.NET) - Current Coverage: 8.79%

#### Controllers (8/8 tested) ✅ COMPLETE
- [x] `ProfileController` - All endpoints (GET, PUT, POST generate-token, POST complete-migration, DELETE)
- [x] `MeasurementsController` - GET endpoints (authenticated and sharing code)
- [x] `DataRefreshController` - POST refresh endpoints (tests updated to use concrete response types)
- [x] `ProvidersController` - GET, DELETE, POST resync endpoints (17 tests)
- [x] `SharingController` - GET, POST toggle endpoints (10 tests)
- [x] `WithingsLinkController` - OAuth flow endpoints (11 tests)
- [x] `FitbitLinkController` - OAuth flow endpoints (10 tests)
- [x] `AppleCallbackController` - Apple OAuth callback (6 tests)

#### Services (Partial coverage)
- [x] `ProfileService` - Basic CRUD tests (needs expansion for edge cases)
- [x] `ProviderLinkService` - Basic tests (needs expansion)
- [ ] `MeasurementService` - All measurement operations
- [ ] `DataRefreshService` - Provider data refresh logic
- [ ] `SharingService` - Sharing functionality
- [ ] `WithingsService` - Withings API integration
- [ ] `FitbitService` - Fitbit API integration
- [ ] `AuthenticationService` - Auth token validation
- [ ] `MigrationService` - User migration logic
- [ ] `SupabaseService` - Database operations

#### Authentication & Authorization
- [x] `SupabaseTokenService` - JWT token validation and claims mapping (9 tests)
- [ ] `BaseAuthController` - Auth helper methods
- [ ] User authentication flows
- [ ] Authorization policies
- [ ] API key authentication

#### Data Processing
- [ ] Weight conversion utilities (kg/lbs)
- [ ] Trend calculation algorithms
- [ ] Data interpolation logic
- [ ] Date/time handling with timezones
- [ ] CSV export functionality

#### Integration Tests
- [ ] Full API endpoint integration tests using WebApplicationFactory
- [ ] Database integration tests
- [ ] External API integration tests (Withings, Fitbit)
- [ ] OAuth flow integration tests

### Frontend (React/TypeScript) - Current Coverage: 1.19%

#### UI Components (2/15 tested)
- [x] `Button` - Complete tests
- [x] `Switch` - Complete tests
- [ ] `ConfirmDialog` - Dialog interactions, confirmation flow
- [ ] `Heading` - All heading levels (h1-h6)
- [ ] `Pagination` - Page navigation, bounds checking
- [ ] `Select` - Selection, search, multi-select
- [ ] `Toast` - Notification display, auto-dismiss
- [ ] `ToastProvider` - Context provider functionality
- [ ] `ToggleButton` - Toggle state, group integration
- [ ] `ToggleButtonGroup` - Group selection logic

#### Route Components (0/23 tested)
- [ ] `__root.tsx` - Root layout, error boundary
- [ ] `index.tsx` - Home page, unauthenticated state
- [ ] `dashboard.tsx` - Main dashboard, data display
- [ ] `login.tsx` - Login form, validation
- [ ] `settings.tsx` - Settings form, updates
- [ ] `initial-setup.tsx` - Setup wizard flow
- [ ] `migration.tsx` - Migration process
- [ ] `u.$sharingCode.tsx` - Public profile view
- [ ] `download.tsx` - Data export functionality
- [ ] `link.tsx` - Provider linking
- [ ] `about.tsx` - Static content
- [ ] `faq.tsx` - FAQ accordion
- [ ] `privacy.tsx` - Privacy policy
- [ ] `build.tsx` - Build info display
- [ ] `demo.tsx` - Demo mode
- [ ] `math.tsx` - Math explanations
- [ ] `tipjar.tsx` - Donation page
- [ ] `check-email.tsx` - Email verification prompt
- [ ] `account-deleted.tsx` - Deletion confirmation
- [ ] `auth.verify.tsx` - Email verification handler
- [ ] `auth.apple.callback.tsx` - Apple auth callback
- [ ] `oauth/fitbit/callback.tsx` - Fitbit OAuth callback
- [ ] `oauth/withings/callback.tsx` - Withings OAuth callback

#### Dashboard Components (0/13 tested)
- [ ] `Dashboard.tsx` - Main dashboard container
- [ ] `Chart.tsx` - Chart rendering, interactions
- [ ] `Stats.tsx` - Statistics calculations, display
- [ ] `Currently.tsx` - Current weight display
- [ ] `Deltas.tsx` - Weight change calculations
- [ ] `RecentReadings.tsx` - Reading list, pagination
- [ ] `Buttons.tsx` - Action buttons
- [ ] `ProviderSyncError.tsx` - Error display
- [ ] `ProviderSyncErrors.tsx` - Multiple errors
- [ ] `NoDataCard.tsx` - Empty state
- [ ] `DashboardPlaceholder.tsx` - Loading state
- [ ] `ChangeArrow.tsx` - Trend indicators
- [ ] `HelpLink.tsx` - Help tooltip

#### Settings Components (0/10 tested)
- [ ] `SettingsLayout.tsx` - Settings navigation
- [ ] `ProfileSection.tsx` - Profile form
- [ ] `BasicProfileSettings.tsx` - Basic settings
- [ ] `GoalSection.tsx` - Goal configuration
- [ ] `SharingSection.tsx` - Sharing toggle, token
- [ ] `ConnectedAccountsSection.tsx` - Provider management
- [ ] `DownloadSection.tsx` - Export options
- [ ] `AdvancedSection.tsx` - Advanced options
- [ ] `AccountManagementSection.tsx` - Account actions
- [ ] `DangerZoneSection.tsx` - Deletion flow

#### Layout Components (0/6 tested)
- [ ] `Layout.tsx` - Main layout wrapper
- [ ] `Header.tsx` - Navigation, user menu
- [ ] `Footer.tsx` - Footer links
- [ ] `Container.tsx` - Responsive container
- [ ] `Logo.tsx` - Logo rendering
- [ ] `ErrorBoundary.tsx` - Error handling
- [ ] `NotFound.tsx` - 404 page

#### Hooks (1/4 tested)
- [x] `usePersistedState` - Complete tests
- [ ] `useMediaQuery` - Breakpoint detection
- [ ] `useNavigationGuard` - Navigation blocking
- [ ] `useToast` - Toast notifications

#### API Integration (0% tested)
- [ ] `queries.ts` - All query hooks
  - [ ] `useProfile` - Profile fetching
  - [ ] `useData` - Measurement data
  - [ ] `useProviderLinks` - Provider info
  - [ ] `useSharing` - Sharing settings
- [ ] `mutations.ts` - All mutation hooks
  - [ ] `useUpdateProfile` - Profile updates
  - [ ] `useDisconnectProvider` - Provider removal
  - [ ] `useResyncProvider` - Data refresh
  - [ ] `useToggleSharing` - Sharing toggle
  - [ ] `useGenerateToken` - Token generation
  - [ ] `useCompleteMigration` - Migration completion
  - [ ] `useDeleteAccount` - Account deletion
  - [ ] `useRefreshData` - Manual refresh
- [ ] `client.ts` - API client, error handling

#### Utility Functions (0% tested)
- [ ] Date utilities (`dates.ts`)
- [ ] Number formatting (`numbers.ts`)
- [ ] Weight conversion (`conversion.ts`)
- [ ] Trend calculations (`trend-calculations.ts`)
- [ ] Data grouping (`grouping.ts`)
- [ ] Interpolation (`interpolation.ts`)
- [ ] Stats computations (`stats.ts`)
- [ ] Chart data transformers (`data-transformers.ts`)
- [ ] CSV export (`csvExport.ts`)
- [ ] Locale utilities (`locale.ts`)
- [ ] Page title helper (`pageTitle.ts`)

#### Authentication (0% tested)
- [ ] `AuthProvider.tsx` - Auth context provider
- [ ] `useAuth.ts` - Auth hook
- [ ] `authGuard.ts` - Route protection
- [ ] `authSuspense.ts` - Auth loading states
- [ ] `useAppleSignIn.ts` - Apple sign-in

#### Progress Management (0% tested)
- [ ] `ProgressManager.tsx` - Progress tracking
- [ ] `BackgroundQueryProgress.tsx` - Query progress
- [ ] Progress utilities

### Integration & E2E Tests (0% implemented)

#### Critical User Flows
- [ ] New user registration and setup
- [ ] Provider connection flow (Withings/Fitbit)
- [ ] Daily weight sync and trend calculation
- [ ] Profile settings update
- [ ] Data export/download
- [ ] Account deletion
- [ ] Public profile sharing
- [ ] Migration from legacy system

#### API Integration Tests
- [ ] Full request/response cycle
- [ ] Authentication flow
- [ ] Error handling
- [ ] Rate limiting
- [ ] CORS handling

### Test Infrastructure Improvements
- [ ] Add MSW for API mocking in frontend tests
- [ ] Set up test data factories/builders
- [ ] Configure coverage thresholds in CI
- [ ] Add visual regression testing for charts
- [ ] Set up database seeding for integration tests
- [ ] Add performance benchmarks for critical paths

### Coverage Goals
- **Phase 1 (Current)**: Establish basic test infrastructure ✓
- **Phase 2**: Achieve 30% coverage on critical paths
- **Phase 3**: Achieve 60% overall coverage
- **Phase 4**: Achieve 80% coverage on business logic
- **Phase 5**: Maintain 80%+ with CI enforcement
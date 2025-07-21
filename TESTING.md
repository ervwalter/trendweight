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

### Recent Architectural Changes

The backend architecture was refactored to eliminate circular dependencies:
- Introduced `MeasurementSyncService` to orchestrate syncing between providers and storage
- Providers no longer depend on `SourceDataService`
- Clear separation of concerns between data fetching and storage
- Tests have been updated to reflect these architectural changes

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
- **MSW (Mock Service Worker)**: HTTP request mocking - **ALWAYS use MSW for API mocking**

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
│   ├── test/
│   │   ├── setup.ts          # Global test setup
│   │   ├── test-utils.tsx    # Custom render and utilities
│   │   └── mocks/
│   │       ├── server.ts     # MSW server setup
│   │       └── handlers.ts   # MSW request handlers
│   ├── components/
│   │   └── ui/
│   │       ├── Button.tsx
│   │       └── Button.test.tsx
│   └── lib/
│       └── feature/
│           ├── component.tsx
│           └── component.test.tsx  # Co-located tests
└── vitest.config.ts
```

### Test File Naming
- Unit tests: `*.test.ts` or `*.test.tsx`
- Integration tests: `*.integration.test.ts`
- E2E tests: `*.e2e.test.ts` (if added later)

### Frontend Testing Patterns

#### MSW (Mock Service Worker) Setup

**IMPORTANT**: Always use MSW for mocking HTTP requests, not manual fetch mocking.

```typescript
// ❌ DON'T do this:
global.fetch = vi.fn();

// ✅ DO this:
import { server } from '@/test/mocks/server';
import { http, HttpResponse } from 'msw';

server.use(
  http.get('/api/endpoint', () => {
    return HttpResponse.json({ data: 'test' });
  })
);
```

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

#### Testing with MSW

```typescript
describe('API Integration', () => {
  it('should handle successful API call', async () => {
    server.use(
      http.get('/api/data', () => {
        return HttpResponse.json({ value: 42 });
      })
    );

    render(<MyComponent />);
    
    await waitFor(() => {
      expect(screen.getByText('Value: 42')).toBeInTheDocument();
    });
  });

  it('should handle API error', async () => {
    server.use(
      http.get('/api/data', () => {
        return HttpResponse.json(
          { error: 'Server error' },
          { status: 500 }
        );
      })
    );

    render(<MyComponent />);
    
    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument();
    });
  });
});
```

### Frontend Best Practices

1. **Use MSW for All HTTP Mocking**: Always use MSW for mocking HTTP requests
2. **Test User Behavior**: Focus on how users interact with components, not implementation details
3. **Use Testing Utilities**: Always use the custom render function from `test-utils.tsx`
4. **Use Semantic Queries**: Prefer `getByRole`, `getByLabelText` over `getByTestId`
5. **Keep Tests Simple**: Each test should verify one behavior
6. **Test Error States**: Always test error states and edge cases
7. **Avoid Arbitrary Waits**: Use `waitFor` instead of arbitrary timeouts

## Test Coverage

### Current Coverage Status

- **Backend**: 65% line coverage, 52% branch coverage (239 tests)
- **Frontend**: 27.26% overall coverage, with excellent coverage in:
  - Dashboard computations: 99.36%
  - API layer: 96.87%
  - Auth layer: 82.74%

### Coverage Goals

- **Overall Target**: 75%
- **Critical Business Logic**: 90%+
- **API Layer**: 85%+ (already achieved)
- **Components**: 70%+
- **Utilities**: 90%+

### Coverage Priorities

1. **High Priority**
   - Business logic (calculations, transformations)
   - API error handling
   - Critical user paths
   - Data validation

2. **Medium Priority**
   - UI components with logic
   - Form validation
   - Navigation guards

3. **Low Priority**
   - Simple presentational components
   - Third-party integrations
   - Styling-only components

### Viewing Coverage Reports

```bash
# Backend coverage
cd apps/api
dotnet test /p:CollectCoverage=true /p:CoverletOutputFormat=opencover

# Frontend coverage (generates HTML report in coverage/)
cd apps/web
npm run test:coverage
open coverage/index.html  # View in browser
```

### Coverage Configuration

Backend coverage uses Coverlet for .NET:
- OpenCover format for detailed reporting
- Excludes generated code and migrations

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

#### Frontend Debugging
```typescript
// Use screen.debug() to see current DOM
it('renders correctly', () => {
  render(<Component />);
  screen.debug(); // Prints DOM to console
});

// Use Testing Playground
it('finds elements', () => {
  render(<Component />);
  screen.logTestingPlaygroundURL(); // Opens in browser
});

// Focus on single test
it.only('run only this test', () => {
  // test code
});

// Skip coverage for faster debugging
npm test -- --no-coverage
```

#### Backend Debugging
```csharp
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
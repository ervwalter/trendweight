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
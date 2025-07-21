# Frontend Testing Guidelines

## Overview
This document outlines the testing strategy and guidelines for the TrendWeight frontend application.

## Testing Stack
- **Test Runner**: Vitest
- **Testing Library**: React Testing Library
- **Assertion Library**: Vitest (built-in)
- **HTTP Mocking**: MSW (Mock Service Worker)
- **Coverage**: Vitest with v8 provider

## Key Principles

### 1. Use MSW for All HTTP Mocking
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

### 2. Test User Behavior, Not Implementation
Focus on testing what users see and do, not internal implementation details.

```typescript
// ❌ DON'T test state directly
expect(component.state.isLoading).toBe(true);

// ✅ DO test user-visible behavior
expect(screen.getByText(/loading/i)).toBeInTheDocument();
```

### 3. Use Testing Utilities
Always use the custom render function from `test-utils.tsx` which includes all necessary providers:

```typescript
import { render, screen } from '@/test/test-utils';

// This includes QueryClient, Router, and other providers
render(<MyComponent />);
```

## Test Structure

### Directory Structure
```
src/
├── test/
│   ├── setup.ts          # Global test setup
│   ├── test-utils.tsx    # Custom render and utilities
│   └── mocks/
│       ├── server.ts     # MSW server setup
│       └── handlers.ts   # MSW request handlers
├── lib/
│   └── feature/
│       ├── component.tsx
│       └── component.test.tsx  # Co-located tests
```

### Test File Naming
- Unit tests: `*.test.ts` or `*.test.tsx`
- Integration tests: `*.integration.test.ts`
- E2E tests: `*.e2e.test.ts` (if added later)

## MSW Setup and Usage

### Setup Files
1. **server.ts**: Configures the MSW server
2. **handlers.ts**: Contains default handlers and factory functions
3. **setup.ts**: Starts/stops MSW server for tests

### Using MSW in Tests

#### Basic Example
```typescript
import { server } from '@/test/mocks/server';
import { http, HttpResponse } from 'msw';

describe('MyComponent', () => {
  it('should handle successful API call', async () => {
    // Override default handler for this test
    server.use(
      http.get('/api/data', () => {
        return HttpResponse.json({ value: 42 });
      })
    );

    render(<MyComponent />);
    
    // Wait for data to load
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

#### Using Handler Factories
```typescript
import { apiHandlers } from '@/test/mocks/handlers';

// Use pre-defined handler factories
server.use(
  apiHandlers.success('/api/users', [{ id: 1, name: 'John' }]),
  apiHandlers.unauthorized('/api/admin')
);
```

### Testing API Client
When testing the API client or components that make API calls:

1. **Always mock at the HTTP level** with MSW
2. **Never mock the API client functions directly**
3. **Test the full request/response cycle**

```typescript
// Testing API error handling
it('should handle 401 errors', async () => {
  server.use(
    http.get('/api/protected', () => {
      return HttpResponse.json(
        { error: 'Unauthorized', errorCode: 'AUTH_REQUIRED' },
        { status: 401 }
      );
    })
  );

  // Test component behavior when API returns 401
  const { result } = renderHook(() => useProtectedData());
  
  await waitFor(() => {
    expect(result.current.error).toMatchObject({
      status: 401,
      message: 'Unauthorized',
      errorCode: 'AUTH_REQUIRED'
    });
  });
});
```

## Test Categories

### 1. Unit Tests
Test individual functions and components in isolation.

**What to test:**
- Pure functions (calculations, transformations)
- Individual components
- Custom hooks
- Utilities

**Example:**
```typescript
describe('convertWeight', () => {
  it('should convert kg to lbs', () => {
    expect(convertWeight(100, 'kg', 'lbs')).toBeCloseTo(220.462);
  });
});
```

### 2. Integration Tests
Test how multiple parts work together.

**What to test:**
- Component + API interactions
- Complex user workflows
- State management with API calls

**Example:**
```typescript
describe('Dashboard Integration', () => {
  it('should load and display weight data', async () => {
    server.use(
      http.get('/api/weight', () => {
        return HttpResponse.json({
          measurements: [{ date: '2024-01-01', weight: 75 }]
        });
      })
    );

    render(<Dashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('75 kg')).toBeInTheDocument();
    });
  });
});
```

### 3. Component Tests
Test React components with user interactions.

**What to test:**
- Rendering with different props
- User interactions (clicks, form inputs)
- Conditional rendering
- Error states
- Loading states

## Coverage Goals

### Target Coverage
- Overall: 75%
- Critical Business Logic: 90%+
- API Layer: 85%+
- Components: 70%+
- Utilities: 90%+

### What to Prioritize
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

## Common Testing Patterns

### Testing Async Operations
```typescript
it('should load data asynchronously', async () => {
  server.use(
    http.get('/api/data', async () => {
      // Simulate network delay
      await delay(100);
      return HttpResponse.json({ data: 'test' });
    })
  );

  render(<AsyncComponent />);
  
  // Check loading state
  expect(screen.getByText(/loading/i)).toBeInTheDocument();
  
  // Wait for data
  await waitFor(() => {
    expect(screen.getByText('test')).toBeInTheDocument();
  });
  
  // Loading should be gone
  expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
});
```

### Testing Error Boundaries
```typescript
it('should catch and display errors', () => {
  const ThrowError = () => {
    throw new Error('Test error');
  };

  render(
    <ErrorBoundary>
      <ThrowError />
    </ErrorBoundary>
  );

  expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
});
```

### Testing Forms
```typescript
it('should submit form with validation', async () => {
  const user = userEvent.setup();
  
  server.use(
    http.post('/api/settings', async ({ request }) => {
      const data = await request.json();
      return HttpResponse.json({ success: true, ...data });
    })
  );

  render(<SettingsForm />);
  
  const input = screen.getByLabelText(/name/i);
  await user.clear(input);
  await user.type(input, 'John Doe');
  
  await user.click(screen.getByRole('button', { name: /save/i }));
  
  await waitFor(() => {
    expect(screen.getByText(/saved successfully/i)).toBeInTheDocument();
  });
});
```

## Running Tests

### Commands
```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm test -- --coverage

# Run specific test file
npm test -- client.test.ts

# Run tests matching pattern
npm test -- --grep "should handle error"

# Run tests with UI
npm run test:ui
```

### Debugging Tests
1. Use `screen.debug()` to see current DOM
2. Use `screen.logTestingPlaygroundURL()` for Testing Playground
3. Add `test.only()` to run single test
4. Use `--no-coverage` when debugging for faster runs

## Best Practices

### Do's
- ✅ Test user-visible behavior
- ✅ Use MSW for all HTTP mocking
- ✅ Write descriptive test names
- ✅ Test error states and edge cases
- ✅ Use data-testid sparingly
- ✅ Group related tests with describe blocks
- ✅ Clean up after tests (MSW handles this automatically)

### Don'ts
- ❌ Don't test implementation details
- ❌ Don't mock what you don't own (except HTTP with MSW)
- ❌ Don't test third-party libraries
- ❌ Don't use arbitrary wait times
- ❌ Don't test styles or CSS classes
- ❌ Don't manually mock fetch or API client functions

## Maintenance

### Updating MSW Handlers
When adding new API endpoints:
1. Add handler factory to `handlers.ts`
2. Use in tests via `server.use()`
3. Consider adding to default handlers if commonly used

### Keeping Tests Fast
1. Use MSW's in-memory mocking (no network calls)
2. Minimize setup/teardown
3. Don't test the same thing multiple times
4. Use focused, specific assertions

### Test Organization
1. One test file per component/module
2. Group related tests with `describe`
3. Use clear test names that describe the behavior
4. Keep tests close to the code they test
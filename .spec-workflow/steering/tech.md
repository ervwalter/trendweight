# Technical Steering

## Architecture Overview

### System Architecture
```
┌─────────────────────────────────────────────────────────┐
│                     Client Layer                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │  React SPA (Vite + TypeScript + TanStack Router) │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                Authentication Layer                      │
│  ┌──────────────────────────────────────────────────┐   │
│  │          Clerk (JWT-based Auth)                  │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                      API Layer                           │
│  ┌──────────────────────────────────────────────────┐   │
│  │    ASP.NET Core 9.0 Web API (Feature-Based)     │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                            │
                ┌───────────┴───────────┐
                ▼                       ▼
┌──────────────────────┐    ┌──────────────────────┐
│   Data Layer         │    │  External Services  │
│  (Supabase/Postgres) │    │ (Withings, Fitbit)  │
└──────────────────────┘    └──────────────────────┘
```

### Technology Stack Choices

#### Frontend Stack
- **React 19**: Modern UI library with concurrent features
- **TypeScript**: Type safety and better developer experience  
- **Vite**: Fast build tool with HMR
- **TanStack Router**: Type-safe routing with data loading
- **TanStack Query**: Server state management with caching
- **Tailwind CSS v4**: Utility-first CSS with custom properties
- **shadcn/ui**: Pre-built accessible components built on Radix UI primitives

#### Backend Stack
- **ASP.NET Core 9.0**: High-performance, cross-platform framework
- **.NET 9**: Latest runtime with performance improvements
- **C# 13**: Modern language features and nullable reference types
- **Supabase C# SDK**: Database operations and data access

#### Infrastructure
- **Supabase**: Managed PostgreSQL with JSONB support
- **Clerk**: Managed authentication with social providers
- **Docker**: Containerization for consistent deployments
- **GitHub Actions**: CI/CD pipeline automation

### Integration Patterns

#### API Communication
- RESTful JSON APIs with consistent structure
- JWT bearer tokens for authentication
- Request/response correlation IDs for tracing
- Rate limiting (100 req/min per user)

#### Provider Integration
- OAuth 2.0 for Withings/Fitbit authorization
- Token refresh automation
- Provider-agnostic data model

#### Database Patterns
- JSONB for flexible schema evolution
- UUID primary keys for distributed systems
- ISO 8601 text timestamps for timezone clarity
- Optimistic concurrency with updated_at fields
- Supabase C# SDK for all database operations

## Development Standards

### Coding Conventions

#### C# Standards
- Feature folder organization
- Async/await for all I/O operations
- Dependency injection for all services
- IOptions pattern for configuration
- Nullable reference types enabled
- Guard clauses for public methods
- Meaningful exception messages

#### TypeScript Standards
- Strict mode enabled
- No `any` types (use `unknown` when needed)
- Functional components with hooks
- Custom hooks for reusable logic
- Interfaces over type aliases for objects
- Explicit return types for functions
- Destructuring for cleaner code

#### File Naming
- Frontend: kebab-case (`user-profile.tsx`)
- Backend: PascalCase (`UserProfileService.cs`)
- Tests: `*.test.ts` or `*Tests.cs`
- Types: `*.types.ts` for shared interfaces

### Testing Requirements

#### Unit Testing
- Minimum 80% code coverage for business logic
- xUnit for C# backend tests
- Vitest for TypeScript frontend tests
- Mock external dependencies
- Test edge cases and error conditions

#### Integration Testing
- API endpoint testing with test database
- Provider integration with mock responses
- Authentication flow validation
- Database transaction testing

### Security Guidelines

#### Authentication & Authorization
- JWT validation on all protected endpoints
- Clerk JWKS endpoint for key rotation
- User ID mapping for internal references

#### Data Protection
- HTTPS only in production
- Encrypted OAuth tokens in database
- No sensitive data in logs
- SQL injection prevention via Supabase SDK
- XSS prevention via React sanitization

#### API Security
- Rate limiting per user
- CORS disabled (same-origin only)
- Input validation on all endpoints
- Generic error messages for 500s
- Correlation IDs for error tracking

### Performance Standards

#### Frontend Performance
- Lighthouse score > 90
- First Contentful Paint < 1.5s
- Time to Interactive < 3.5s
- Code splitting by route
- Image lazy loading
- Bundle size monitoring

#### Backend Performance
- API response time < 200ms (p95) for most endpoints
- Database queries < 100ms (p95)
- Efficient JSONB queries
- Connection pooling
- Response caching where appropriate
- Note: Provider sync endpoints are slower due to external API dependencies

#### Scalability Considerations
- Stateless API design
- Horizontal scaling capability
- Database indexing strategy
- Efficient batch operations

## Technology Choices

### Programming Languages and Versions
- **C# 13** with .NET 9.0
- **TypeScript** with strict mode
- **SQL** (PostgreSQL 15+) - used only in exceptional cases
- **HTML5** and **CSS3** (via Tailwind)

### Frameworks and Libraries

#### Core Frontend Libraries
- react
- @tanstack/react-router
- @tanstack/react-query
- @clerk/clerk-react
- tailwindcss
- shadcn/ui components

#### Core Backend Libraries
- ASP.NET Core 9.0
- Supabase.Client (for all database operations)
- System.Text.Json
- Microsoft.Extensions.*

### Deployment Infrastructure
- **Docker** containers (Alpine Linux base)
- **GitHub Container Registry** for image storage
- **DigitalOcean App Platform** (or similar PaaS)
- **Cloudflare** for CDN and DDoS protection
- **Supabase Cloud** for managed database

## Patterns & Best Practices

### Recommended Code Patterns

#### Service Layer Pattern
```csharp
// Thin controllers delegate to services
public class MeasurementsController : BaseAuthController {
    public async Task<IActionResult> GetMeasurements() {
        var data = await _measurementService.GetUserMeasurementsAsync(UserId);
        return Ok(data);
    }
}
```

#### Custom Hook Pattern with External Query Options
```typescript
// Query options defined outside the hook
export const queryOptions = {
  profile: (sharingCode?: string) => ({
    queryKey: ["profile", sharingCode].filter(Boolean),
    queryFn: async () => apiRequest<ProfileResponse>("/profile"),
    staleTime: 5 * 60 * 1000,
  }),
};

// Hook uses the external query options
export function useProfile() {
  return useQuery(queryOptions.profile());
}
```

#### Feature Folder Structure
```
/Features/
  /Measurements/
    MeasurementsController.cs
    MeasurementService.cs
    MeasurementModels.cs
```

### Error Handling Approaches
- Global exception middleware in API
- Error boundaries in React components
- Consistent error response format
- User-friendly error messages
- Correlation IDs for debugging
- Graceful degradation strategies

### Logging and Monitoring
- Structured logging with correlation IDs
- Log levels: Error, Warning, Info, Debug
- No sensitive data in logs
- Performance metrics collection
- Error rate monitoring
- API endpoint metrics

### Documentation Standards
- XML documentation for public C# APIs
- JSDoc comments for TypeScript utilities
- README files for complex features
- Architecture decision records (ADRs)
- API documentation (OpenAPI/Swagger)
- Inline comments only when necessary

## Data Management

### Database Design Principles
- Normalize where it makes sense
- JSONB for flexible, evolving schemas
- UUIDs for distributed systems
- Efficient indexing strategies
- No soft deletes - hard delete when needed

### Caching Strategy
- TanStack Query for client-side caching
- 5-minute cache for measurement data
- Cache invalidation on mutations

### Data Migration Approach
- Database migrations via SQL scripts
- Backward compatible changes when possible
- Data validation post-migration

## API Design Principles

### RESTful Conventions
- Proper HTTP verbs (GET, POST, PUT, DELETE)
- Meaningful resource URLs
- Consistent response formats
- Proper status codes

### Response Handling
- Return appropriate HTTP status codes
- Include meaningful error messages
- Use correlation IDs for tracking
- Consistent JSON structure
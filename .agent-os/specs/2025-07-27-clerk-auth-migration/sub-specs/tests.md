# Tests Specification

This is the tests coverage details for the spec detailed in @.agent-os/specs/2025-07-27-clerk-auth-migration/spec.md

> Created: 2025-07-27
> Version: 1.0.0

## Test Coverage

### Unit Tests

**ClerkTokenService**
- Should validate a valid Clerk JWT token
- Should reject expired tokens
- Should reject tokens with invalid signatures
- Should extract email claim correctly
- Should extract userId claim correctly
- Should handle missing claims gracefully
- Should validate token audience and issuer

**UserAccountMappingService**
- Should retrieve existing user mapping by external ID
- Should return null for non-existent mappings
- Should create new user mapping with generated GUID
- Should prevent duplicate external ID mappings
- Should handle concurrent mapping creation
- Should retrieve user account by internal ID

**ClerkAuthenticationHandler**
- Should authenticate valid Bearer token
- Should return NoResult when Authorization header missing
- Should return NoResult for non-Bearer tokens
- Should fail authentication for invalid tokens
- Should create ClaimsPrincipal with correct claims
- Should handle first-time user creation

### Integration Tests

**Authentication Flow**
- Valid Clerk token should authenticate successfully
- Should create user mapping on first authentication
- Should reuse existing mapping on subsequent authentications
- Should maintain user context through request pipeline

**API Endpoints**
- Protected endpoints should require valid Clerk token
- Should return 401 for missing authentication
- Should return 401 for expired tokens
- User-specific data should be correctly scoped to authenticated user

**Database Operations**
- User mapping creation should be atomic
- Concurrent user creation should not create duplicates
- Mapping lookups should use indexes efficiently

### Feature Tests

**End-to-End Sign In Flow**
- User clicks sign in button
- Clerk SignIn component displays
- User enters email and receives OTP code
- User enters code and authentication completes
- Frontend receives JWT and includes in API calls
- Backend validates JWT and serves user data

**Provider Sign In Flows**
- Google OAuth flow completes successfully
- Microsoft OAuth flow completes successfully  
- Apple Sign-In flow completes successfully
- All providers create correct user mappings

**Existing User Migration**
- Existing Supabase users can sign in with Clerk
- Historical data remains accessible
- No data loss during migration

### Mocking Requirements

**External Services**
- **Clerk JWKS Endpoint:** Mock the public key retrieval for JWT validation
- **Database Queries:** Mock Dapper queries for unit tests
- **HTTP Client:** Mock HttpClient for JWKS fetching

**Frontend Mocking**
- **Clerk Provider:** Mock useUser, useAuth hooks for component tests
- **API Responses:** Use MSW to mock backend responses
- **OAuth Redirects:** Mock OAuth provider redirects in tests

### Test Data

**Sample Clerk JWT:**
```json
{
  "azp": "http://localhost:5173",
  "exp": 1739398300,
  "iat": 1739398272,
  "iss": "https://example.clerk.accounts.dev",
  "nbf": 1739398220,
  "sub": "user_abc123xyz",
  "email": "test@example.com",
  "userId": "user_abc123xyz"
}
```

**Sample User Mappings:**
```json
[
  {
    "uid": "550e8400-e29b-41d4-a716-446655440000",
    "external_id": "user_abc123xyz",
    "provider": "clerk",
    "email": "test@example.com"
  }
]
```

### Performance Tests

- Token validation should complete in under 50ms
- User mapping lookup should complete in under 10ms
- First-time user creation should complete in under 100ms
- Cached validations should complete in under 5ms
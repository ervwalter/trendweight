# API Specification

This is the API specification for the spec detailed in @.agent-os/specs/2025-07-27-clerk-auth-migration/spec.md

> Created: 2025-07-27
> Version: 1.0.0

## Endpoints

No new API endpoints are required. All existing endpoints remain unchanged from a client perspective.

## Controllers

### Modified Authentication Flow

All controllers inheriting from `BaseAuthController` will continue to work with the same interface, but the authentication pipeline will:

1. Validate the Clerk JWT instead of Supabase JWT
2. Extract the Clerk user ID from claims
3. Look up the internal GUID from the user_accounts mapping table
4. Set the same claims that existing controllers expect

### New Services

#### IClerkTokenService

**Purpose:** Validate Clerk JWTs and extract claims

**Methods:**
- `TokenValidationResult ValidateTokenAndExtractClaims(string token)`
  - Validates the JWT signature using Clerk's JWKS
  - Checks token expiration and other standard claims
  - Extracts email and userId from custom claims
  - Returns a ClaimsPrincipal with mapped claims

#### IUserAccountMappingService

**Purpose:** Map between external auth provider IDs and internal GUIDs

**Methods:**
- `Task<Guid?> GetInternalUserIdAsync(string externalId, string provider)`
  - Looks up internal GUID from external ID
  - Returns null if no mapping exists
  
- `Task<Guid> GetOrCreateUserMappingAsync(string externalId, string provider, string email)`
  - Checks for existing mapping first
  - If no mapping exists:
    - Queries auth.users by email for existing Supabase user
    - Uses existing GUID if found, generates new GUID if not
    - Creates user_accounts entry
    - Creates profiles entry only for truly new users
  - Returns the internal user ID (existing or new)
  
- `Task<UserAccount?> GetUserAccountAsync(Guid uid)`
  - Retrieves user account details by internal ID
  - Used for admin/debugging purposes

## Purpose

### Authentication Pipeline

1. **JWT Extraction**: Extract Bearer token from Authorization header (unchanged)
2. **Token Validation**: Validate token using ClerkTokenService instead of SupabaseTokenService
3. **User Resolution**: Map Clerk user ID to internal GUID via UserAccountMappingService
4. **Claims Creation**: Create ClaimsPrincipal with same claims structure as before
5. **Request Processing**: Continue with normal request processing

### Error Handling

- **Invalid Token**: Return 401 Unauthorized (same as before)
- **No User Mapping**: Automatically create new user account and mapping:
  - Check auth.users table for existing Supabase user with same email
  - If existing user found: Use their existing GUID
  - If no existing user: Generate new internal GUID
  - Create `user_accounts` entry with appropriate GUID
  - Create `profiles` entry only if truly new user
  - Continue processing with user context
  - This is NOT an error - it's the normal first-time user flow
- **Expired Token**: Return 401 with appropriate error message
- **Network Errors**: Return 503 if unable to validate token due to JWKS fetch failure

### Backward Compatibility

The authentication changes are transparent to API consumers:
- Same Authorization header format (Bearer token)
- Same response formats for all endpoints
- Same error codes and messages
- No changes to API contracts

### Claims Mapping

Clerk claims will be mapped to existing claim types:

```csharp
// Clerk JWT claims
{
  "email": "user@example.com",
  "userId": "user_abc123xyz"
}

// Mapped to application claims
{
  ClaimTypes.NameIdentifier: "internal-guid-here",
  ClaimTypes.Email: "user@example.com",
  "supabase:uid": "internal-guid-here" // For compatibility
}
```
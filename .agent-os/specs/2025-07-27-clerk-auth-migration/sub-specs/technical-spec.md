# Technical Specification

This is the technical specification for the spec detailed in @.agent-os/specs/2025-07-27-clerk-auth-migration/spec.md

> Created: 2025-07-27
> Version: 1.0.0

## Technical Requirements

### Frontend Requirements

- Replace Supabase Auth Provider with Clerk Provider
- Implement Clerk's SignIn component with custom styling to match TrendWeight theme
- Use Clerk control components (SignedIn, SignedOut) for conditional rendering
- Email OTP functionality will be handled by Clerk's SignIn component (supports Email code/magic link)
- Update auth guards to use Clerk's authentication state
- Configure Apple Sign-In through Clerk's native integration (remove Apple.js)
- Maintain existing redirect logic after successful authentication

### Backend Requirements

- Implement Clerk JWT validation using Clerk's .NET SDK or manual JWT validation
- Extract user ID and email from Clerk JWT claims
- Map Clerk user IDs to internal GUIDs via new mapping table
- Preserve existing controller authorization structure
- Maintain backward compatibility with existing GUID-based queries

### Integration Requirements

- Configure Clerk to include email and user ID in JWT claims
- Set up proper CORS and authentication headers
- Ensure JWT is passed as Bearer token in all API requests
- Handle user creation flow for first-time Clerk users

### Performance Criteria

- Authentication should complete within 2 seconds
- User ID mapping lookup should be cached for performance
- JWT validation should not add more than 50ms to request processing

## Approach Options

**Option A: Use Clerk .NET SDK**
- Pros: Official support, easier implementation, automatic updates
- Cons: Additional dependency, less control over validation logic

**Option B: Manual JWT Validation** (Selected)
- Pros: Full control, no additional dependencies, can customize validation
- Cons: More complex implementation, manual security updates needed

**Rationale:** Manual JWT validation provides better control and aligns with the existing pattern used for Supabase JWT validation. We can reuse much of the existing infrastructure.

## External Dependencies

- **@clerk/clerk-react** - Clerk's React SDK for frontend components
  - **Justification:** Required for SignIn component and auth state management
  
- **Clerk Backend API** - For validating sessions server-side
  - **Justification:** Can use JWKS endpoint for key rotation without SDK

## Implementation Details

### Clerk Configuration Required

1. **Clerk Dashboard Setup**
   - Create new Clerk application
   - Enable authentication methods: Email (with Email code), Google, Microsoft, Apple
   - Disable sign-up (TrendWeight is invite-only)
   - Configure JWT template with custom claims:
     ```json
     {
       "email": "{{user.primary_email_address}}",
       "userId": "{{user.id}}"
     }
     ```

2. **Environment Variables**
   - `CLERK_PUBLISHABLE_KEY` - Frontend public key
   - `CLERK_SECRET_KEY` - Backend secret key (if using SDK)
   - `CLERK_JWKS_URL` - JWKS endpoint for manual validation

3. **Redirect URLs**
   - Configure OAuth redirect URLs for each provider
   - Set after-sign-in URL to `/dashboard`

### Frontend Architecture Changes

#### Provider Setup

**ClerkProvider Configuration** (`apps/web/src/main.tsx`):
```typescript
<ClerkProvider 
  publishableKey={import.meta.env.VITE_CLERK_PUBLISHABLE_KEY}
  afterSignInUrl="/dashboard"
  signInUrl="/login"
>
  <RouterProvider router={router} />
</ClerkProvider>
```

#### Authentication Hook

**New useAuth Hook** (`apps/web/src/lib/auth/useAuth.ts`):
- Wraps Clerk's `useUser()` and `useAuth()` hooks
- Provides interface similar to existing Supabase auth:
  ```typescript
  interface AuthState {
    user: User | null;  // Our User type with uid, email, displayName
    isInitializing: boolean;
    isLoggedIn: boolean;
    signOut: () => Promise<void>;
  }
  ```
- Maps Clerk user to our User type (email from Clerk, uid from API call)

#### Route Structure

**Routes to Update**:

1. **`/login` Route** (`apps/web/src/routes/login.tsx`):
   - Minimal route file following pattern
   - Renders `<LoginPage />` component
   
2. **Login Component** (`apps/web/src/components/auth/Login.tsx`):
   - Replaces current OTP/social login implementation
   - Renders Clerk's `<SignIn />` component with custom styling
   - Removes: Email input, OTP verification, social login buttons
   - Keeps: Layout, branding, "Stay signed in" context

3. **Auth Callback Routes** - DELETE these routes:
   - `/auth/verify` - No longer needed with Clerk
   - `/auth/apple/callback` - Clerk handles internally

4. **Dynamic Routes** (show different content based on auth):
   - `/` (index route) - Uses `useAuth()` to show landing or redirect
   - Header component - Uses `useAuth()` for sign in/out buttons

5. **Protected Route Guard** (`apps/web/src/lib/auth/authGuard.ts`):
   - Update to use Clerk's auth state
   - Check `isLoaded` and `userId` from `useAuth()`
   - Maintain same redirect behavior

#### Component Updates

**Header Component** (`apps/web/src/components/Header.tsx`):
```typescript
const { isLoggedIn, signOut } = useAuth();

// Show "Sign In" or "Sign Out" based on isLoggedIn
// Remove current Supabase session checks
```

**Landing Page** (`apps/web/src/components/home/Landing.tsx`):
```typescript
const { isLoggedIn } = useAuth();

// Conditionally show content or redirect based on auth
```

#### Files to Delete

**Auth Library Files** (`apps/web/src/lib/auth/`):
- `AuthProvider.tsx` - Replaced by ClerkProvider
- `AuthProvider.test.tsx` - Tests for deleted provider
- `AuthProvider.otp.test.tsx` - OTP-specific tests
- `authContext.ts` - Context replaced by Clerk
- `authSuspense.ts` - No longer needed with Clerk
- `authSuspense.test.ts` - Tests for deleted file
- `useAppleSignIn.ts` - Apple handles through Clerk now
- `useAuth.test.tsx` - Will be rewritten for new hook

**Auth Component Files** (`apps/web/src/components/auth/`):
- `AppleCallback.tsx` - Clerk handles Apple callbacks
- `AppleCallback.test.tsx` - Tests for deleted component
- `OtpLogin.tsx` - Clerk SignIn handles OTP
- `OtpLogin.test.tsx` - Tests for deleted component
- `Verify.tsx` - No separate verify step with Clerk
- `Verify.test.tsx` - Tests for deleted component
- `Login.tsx` - Will be completely rewritten, not deleted
- `Login.test.tsx` - Will be rewritten for new implementation

**Route Files to Delete**:
- `routes/auth.verify.tsx` - No verify callback needed
- `routes/auth.apple.callback.tsx` - Clerk handles internally

**Other Files to Update/Clean**:
- `index.html` - Remove Apple.js script tag
- `types/apple.d.ts` - Remove Apple ID type definitions
- `lib/supabase/client.ts` - Remove auth-related exports
- Remove Supabase auth imports from all files

**Environment Variables to Remove**:
- `VITE_SUPABASE_URL` - Keep for database
- `VITE_SUPABASE_ANON_KEY` - No longer needed for auth
- Apple Sign-In related configs

#### API Integration

**Token Management** (`apps/web/src/lib/api/client.ts`):
```typescript
import { useAuth } from '@clerk/clerk-react';

// Update API client to get token from Clerk
const { getToken } = useAuth();
const token = await getToken();

// Include in Authorization header as before
headers: {
  'Authorization': token ? `Bearer ${token}` : '',
}
```

#### Clerk SignIn Component Styling

**Custom Appearance** (`apps/web/src/components/auth/Login.tsx`):
```typescript
<SignIn
  appearance={{
    elements: {
      formButtonPrimary: 'bg-brand-600 hover:bg-brand-700',
      card: 'shadow-none',
      headerTitle: 'hidden',
      headerSubtitle: 'hidden',
    },
    variables: {
      colorPrimary: '#4F46E5', // brand-600
      borderRadius: '0.5rem',
    }
  }}
  routing="path"
  path="/login"
/>
```

#### Authentication State Flow

1. **Initial Load**: 
   - ClerkProvider initializes
   - useAuth hook returns `isInitializing: true`
   - Routes show loading state

2. **Signed Out**:
   - useAuth returns `user: null, isLoggedIn: false`
   - Header shows "Sign In" button
   - Protected routes redirect to `/login`

3. **Signed In**:
   - Clerk validates session
   - useAuth returns user data from Clerk
   - API calls include Clerk JWT
   - Backend validates and maps to internal user

4. **Sign Out**:
   - Call Clerk's signOut()
   - Clear any local state
   - Redirect to home page

### Backend Architecture Changes

1. Create new `ClerkAuthenticationHandler` similar to existing Supabase handler
2. Implement `IClerkTokenService` for JWT validation
3. Add user mapping service for GUID resolution
4. Update `BaseAuthController` to work with new auth system

### First-Time User Flow

When a valid Clerk JWT is presented but no user_accounts mapping exists:

1. **JWT Validation**: Validate the Clerk JWT normally
2. **Mapping Lookup**: Check user_accounts for existing mapping
3. **Existing User Check**: If no mapping exists:
   - Extract email from Clerk JWT
   - Query auth.users table by email to find existing Supabase user
   - If found: Use the existing Supabase UID
   - If not found: Generate new internal GUID
4. **Account Creation**:
   - Create user_accounts entry with Clerk user ID, email, and appropriate GUID
   - If new user (no Supabase match), also create profiles entry
   - If existing user, profiles entry already exists
5. **Continue**: Process request normally with user context

This ensures seamless migration for existing users while also supporting truly new users.

### Migration Strategy

1. **Phase 1**: Implement user mapping table and service
2. **Phase 2**: Add Clerk backend validation alongside Supabase
3. **Phase 3**: Update frontend to use Clerk components
4. **Phase 4**: Remove Supabase auth code
5. **Phase 5**: Migrate existing users (manual or automated process)
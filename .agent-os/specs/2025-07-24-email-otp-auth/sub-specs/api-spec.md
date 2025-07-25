# API Specification

This is the API specification for the spec detailed in @.agent-os/specs/2025-07-24-email-otp-auth/spec.md

> Created: 2025-01-24
> Version: 1.0.0

## Frontend Supabase Integration

The frontend will directly use Supabase Auth client for OTP operations:

### Send OTP
```typescript
const { data, error } = await supabase.auth.signInWithOtp({
  email: userEmail,
  options: {
    shouldCreateUser: true  // Allow automatic account creation on first login
  }
})
```

### Verify OTP
```typescript
const { data: { session }, error } = await supabase.auth.verifyOtp({
  email: userEmail,
  token: otpCode,
  type: 'email'
})
```

## Backend Integration

### Existing Auth Endpoints

The backend will continue to validate JWT tokens issued by Supabase after OTP verification. No new API endpoints are needed since the frontend will interact directly with Supabase Auth.

### Token Validation

The existing `SupabaseAuthenticationHandler` will continue to:
- Validate JWT tokens from Supabase
- Extract user claims
- Authorize API requests

## Implementation Notes

### Frontend Updates

1. **Login Component** - Update to support OTP flow
   - Add state to track whether OTP has been sent
   - Show OTP input field after sending code
   - Handle OTP verification response
   - Redirect to dashboard on success

2. **Auth Context** - Ensure it handles OTP session properly
   - Process session from OTP verification
   - Store auth token for API calls

### Email Template Configuration

Configure Supabase email template for OTP:
- Subject: "Your TrendWeight login code"
- Body should prominently display `{{ .Token }}`
- Include expiration notice (1 hour)
- Clear instructions for entering the code

### Error Handling

Frontend should handle these Supabase auth errors:
- Rate limit exceeded (60-second cooldown)
- Invalid OTP code
- Expired OTP (after 1 hour)
- Network errors
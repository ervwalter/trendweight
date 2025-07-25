# Tests Specification

This is the tests coverage details for the spec detailed in @.agent-os/specs/2025-07-24-email-otp-auth/spec.md

> Created: 2025-01-24
> Version: 1.0.0

## Test Coverage

### Unit Tests

**Login Component**
- Shows email input field initially
- Validates email format before sending OTP
- Displays loading state while sending OTP
- Transitions to OTP input after successful send
- Shows error message for rate limit (60 seconds)
- Validates OTP format (6 digits)
- Handles successful OTP verification
- Handles invalid OTP error
- Handles expired OTP error
- Preserves email between send and verify steps

**Auth Context**
- Processes session from OTP verification correctly
- Stores auth token for API usage
- Updates isLoggedIn state after OTP login

### Integration Tests

**OTP Login Flow**
- User can enter email and receive success response
- User can enter OTP and complete login
- Rate limiting prevents rapid OTP requests
- Invalid OTP codes are rejected
- Session persists after OTP login
- OAuth login still works via /auth/verify

### Mocking Requirements

- **Supabase Auth Client:** Mock signInWithOtp and verifyOtp methods
- **Supabase Session:** Mock session response after OTP verification
- **Error Responses:** Mock rate limit and invalid OTP errors

## Test Implementation Notes

### Frontend Tests

Use MSW to mock Supabase auth responses:
```typescript
// Mock successful OTP send
server.use(
  http.post('*/auth/v1/otp', () => {
    return HttpResponse.json({ /* success response */ })
  })
)

// Mock OTP verification
server.use(
  http.post('*/auth/v1/verify', () => {
    return HttpResponse.json({ 
      access_token: 'mock-token',
      user: { /* user data */ }
    })
  })
)
```

### Component Testing

Test the login component state transitions:
1. Initial state: email input visible
2. After email submit: OTP input visible
3. After OTP verify: redirect to dashboard

### Error Scenario Testing

- Test rate limit error display and retry behavior
- Test invalid OTP error handling
- Test network error fallback
- Ensure OAuth flow remains unaffected
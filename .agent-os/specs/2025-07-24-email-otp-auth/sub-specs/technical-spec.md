# Technical Specification

This is the technical specification for the spec detailed in @.agent-os/specs/2025-07-24-email-otp-auth/spec.md

> Created: 2025-01-24
> Version: 1.0.0

## Technical Requirements

- Generate cryptographically secure 6-digit OTP codes
- Store OTP codes with expiration (10 minutes) and attempt tracking
- Rate limit OTP generation (max 5 per hour per email)
- Rate limit OTP validation attempts (max 5 attempts per code)
- Update login UI to show OTP input field after email submission
- Send OTP via email with clear instructions and code formatting
- Maintain existing JWT token generation after successful OTP validation
- Keep /auth/verify endpoint unchanged for OAuth providers

## Approach Options

**Option A:** Use Supabase Built-in OTP Authentication (Selected)
- Pros: Built-in rate limiting (60 seconds), automatic expiration (1 hour), no custom storage needed, battle-tested implementation
- Cons: Less control over rate limiting specifics, limited to Supabase's OTP format

**Option B:** Custom OTP Table in Database
- Pros: Full control over schema, custom rate limiting, audit trail capability
- Cons: Additional database table required, need to implement security features ourselves

**Rationale:** Option A leverages Supabase's existing secure OTP implementation, which already includes rate limiting, expiration, and secure token generation. This reduces complexity and potential security vulnerabilities while providing a proven solution.

## External Dependencies

No new external dependencies required. Will use:
- Existing Supabase email sending capabilities
- Built-in crypto libraries for secure random number generation
- Existing JWT/auth infrastructure after OTP validation

## Implementation Details

### Supabase OTP Configuration
- OTP codes are automatically 6-digit numeric codes
- Built-in rate limiting: Users can request OTP once every 60 seconds
- OTPs expire after 1 hour (configurable up to 24 hours)
- Supabase handles secure token generation and storage

### Frontend Flow
1. User enters email on login page
2. Frontend calls `supabase.auth.signInWithOtp({ email })`
3. UI transitions to show OTP input field
4. User enters 6-digit code received via email
5. Frontend calls `supabase.auth.verifyOtp({ email, token, type: 'email' })`
6. On success, receive session and redirect to dashboard

### Backend Integration
- The API will proxy Supabase auth calls to maintain consistency
- Backend validates JWT tokens issued by Supabase after OTP verification
- No custom OTP storage or generation needed

### Email Template Updates
- Update Supabase email template to include `{{ .Token }}` variable
- Format email with clear instructions and prominent display of 6-digit code
- Include expiration notice (1 hour)

### Security Considerations
- Supabase's built-in rate limiting prevents abuse (60-second cooldown)
- OTP codes expire after 1 hour
- No custom security implementation needed
- Supabase handles all OTP validation securely
- Set `shouldCreateUser: true` to allow automatic account creation on first login (users sign up by logging in)
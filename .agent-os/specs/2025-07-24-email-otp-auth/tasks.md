# Spec Tasks

These are the tasks to be completed for the spec detailed in @.agent-os/specs/2025-07-24-email-otp-auth/spec.md

> Created: 2025-01-24
> Status: Ready for Implementation

## Tasks

- [ ] 1. Update Supabase email templates for OTP
  - [ ] 1.1 Configure OTP email template in Supabase dashboard
  - [ ] 1.2 Add clear subject line "Your TrendWeight login code"
  - [ ] 1.3 Format email body with prominent {{ .Token }} display
  - [ ] 1.4 Include 1-hour expiration notice
  - [ ] 1.5 Test email delivery and formatting

- [ ] 2. Update login component for OTP flow
  - [ ] 2.1 Write tests for email input and OTP input states
  - [ ] 2.2 Add state management for OTP flow stages
  - [ ] 2.3 Implement email submission with signInWithOtp
  - [ ] 2.4 Create OTP input UI that appears after email sent
  - [ ] 2.5 Implement OTP verification with verifyOtp
  - [ ] 2.6 Add proper error handling for all edge cases
  - [ ] 2.7 Ensure smooth transition between states
  - [ ] 2.8 Verify all tests pass

- [ ] 3. Update auth context and session handling
  - [ ] 3.1 Write tests for OTP session processing
  - [ ] 3.2 Ensure auth context handles OTP login sessions
  - [ ] 3.3 Verify token storage works with OTP flow
  - [ ] 3.4 Test that existing OAuth flows remain unaffected
  - [ ] 3.5 Verify all tests pass

- [ ] 4. Add comprehensive error handling
  - [ ] 4.1 Write tests for error scenarios
  - [ ] 4.2 Handle rate limit errors (60-second cooldown)
  - [ ] 4.3 Handle invalid OTP errors with clear messaging
  - [ ] 4.4 Handle expired OTP errors
  - [ ] 4.5 Add retry functionality where appropriate
  - [ ] 4.6 Verify all tests pass

- [ ] 5. End-to-end testing and cleanup
  - [ ] 5.1 Test complete OTP login flow manually
  - [ ] 5.2 Verify OAuth flows still work correctly
  - [ ] 5.3 Test with various email providers
  - [ ] 5.4 Ensure corporate email scanners don't trigger OTP
  - [ ] 5.5 Remove any references to magic links in UI
  - [ ] 5.6 Update any relevant documentation
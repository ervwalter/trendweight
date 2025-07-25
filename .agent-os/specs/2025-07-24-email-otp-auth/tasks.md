# Spec Tasks

These are the tasks to be completed for the spec detailed in @.agent-os/specs/2025-07-24-email-otp-auth/spec.md

> Created: 2025-01-24
> Status: Ready for Implementation

## Tasks

- [x] 1. Prepare Supabase email template change (Deploy Last)
  - [x] 1.1 Document template change: Add {{ .Token }} as footnote to existing magic link template
  - [x] 1.2 Create deployment notes for last-minute template update
  - [x] 1.3 Plan for proper template formatting after initial verification
  - [x] 1.4 Note: Template will be updated in production AFTER code deployment

- [x] 2. Update login component for OTP flow
  - [x] 2.1 Write tests for email input and OTP input states
  - [x] 2.2 Add state management for OTP flow stages
  - [x] 2.3 Implement email submission with signInWithOtp
  - [x] 2.4 Create OTP input UI that appears after email sent
  - [x] 2.5 Implement OTP verification with verifyOtp
  - [x] 2.6 Add proper error handling for all edge cases
  - [x] 2.7 Ensure smooth transition between states
  - [x] 2.8 Verify all tests pass

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
  - [ ] 5.4 Test cross-device authentication flow (read code on one device, enter on another)
  - [ ] 5.5 Remove any references to magic links in UI
  - [ ] 5.6 Update any relevant documentation
  - [ ] 5.7 Apply template change to production (add {{ .Token }} as footnote)
  - [ ] 5.8 Verify OTP codes appear in emails
  - [ ] 5.9 Clean up email template formatting after verification
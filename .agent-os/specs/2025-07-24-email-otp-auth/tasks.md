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

- [x] 3. Update auth context and session handling
  - [x] 3.1 Write tests for OTP session processing
  - [x] 3.2 Ensure auth context handles OTP login sessions
  - [x] 3.3 Verify token storage works with OTP flow
  - [x] 3.4 Test that existing OAuth flows remain unaffected
  - [x] 3.5 Verify all tests pass

- [x] 4. Add comprehensive error handling
  - [x] 4.1 Write tests for error scenarios
  - [x] 4.2 Handle rate limit errors (60-second cooldown)
  - [x] 4.3 Handle invalid OTP errors with clear messaging
  - [x] 4.4 Handle expired OTP errors
  - [x] 4.5 Add retry functionality where appropriate
  - [x] 4.6 Verify all tests pass

- [ ] 5. Fix OTP UI issues
  - [ ] 5.1 Move OtpLogin component out of Login component to avoid showing Welcome header
  - [ ] 5.2 Add back button as top element in email stage (no Welcome header above)
  - [ ] 5.3 Add descriptive message under "Sign in with Email" header
  - [ ] 5.4 Update OTP stage message to be more direct about sending code
  - [ ] 5.5 Add proper cooldown timer for "Send new code" button
  - [ ] 5.6 Style success message differently from error messages
  - [ ] 5.7 Make success message persist longer or until user interaction
  - [ ] 5.8 Verify all UI changes work correctly

- [ ] 6. End-to-end testing and cleanup
  - [ ] 6.1 Test complete OTP login flow manually
  - [ ] 6.2 Verify OAuth flows still work correctly
  - [ ] 6.3 Test with various email providers
  - [ ] 6.4 Test cross-device authentication flow (read code on one device, enter on another)
  - [ ] 6.5 Remove any references to magic links in UI
  - [ ] 6.6 Update any relevant documentation
  - [ ] 6.7 Apply template change to production (add {{ .Token }} as footnote)
  - [ ] 6.8 Verify OTP codes appear in emails
  - [ ] 6.9 Clean up email template formatting after verification
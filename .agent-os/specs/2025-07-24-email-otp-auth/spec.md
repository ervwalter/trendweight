# Spec Requirements Document

> Spec: Email OTP Authentication
> Created: 2025-01-24
> Status: Planning

## Overview

Replace magic link email authentication with OTP (One-Time Password) codes to provide a better and more flexible user experience. OTP codes allow users to read the code on one device and enter it on another, making cross-device authentication much easier.

## User Stories

### Cross-Device Authentication

As a user who reads email on one device but wants to log in on another, I want to receive a 6-digit OTP code instead of a magic link, so that I can easily transfer the code between devices.

Magic links require the user to click the link on the same device where they want to be logged in, which can be inconvenient. For example, if I want to log in on my phone but check email on my computer, I'd have to forward the email or find another workaround. With OTP codes, I can simply read the code on any device and type it where I need to log in.

### Simplified Login Experience

As a user, I want a simple OTP code login experience, so that I can quickly access my account with a familiar authentication pattern.

Users will enter their email address on the login page, receive a 6-digit code via email, and enter that code on the same page to complete authentication. This provides a familiar, secure authentication flow that many users already understand from other services.

## Spec Scope

1. **OTP Generation and Delivery** - Generate secure 6-digit OTP codes and send via email instead of magic links
2. **Login Page OTP Flow** - Update login page to accept OTP codes after email submission
3. **Backend OTP Validation** - Implement secure OTP validation with expiration and rate limiting
4. **Email Template Updates** - Create new email templates for OTP delivery with clear instructions
5. **Preserve OAuth Flows** - Keep existing /auth/verify page for OAuth provider redirects

## Out of Scope

- Changes to OAuth authentication flows (Google, Microsoft, Apple)
- Changes to existing JWT token handling after successful authentication
- Migration of existing users or sessions
- SMS or other OTP delivery methods

## Expected Deliverable

1. Users can enter their email and receive a 6-digit OTP code that can be easily transferred between devices
2. The login page shows an OTP input field after email submission with clear instructions
3. OAuth authentication continues to work unchanged through the /auth/verify page

## Spec Documentation

- Tasks: @.agent-os/specs/2025-07-24-email-otp-auth/tasks.md
- Technical Specification: @.agent-os/specs/2025-07-24-email-otp-auth/sub-specs/technical-spec.md
- API Specification: @.agent-os/specs/2025-07-24-email-otp-auth/sub-specs/api-spec.md
- Tests Specification: @.agent-os/specs/2025-07-24-email-otp-auth/sub-specs/tests.md
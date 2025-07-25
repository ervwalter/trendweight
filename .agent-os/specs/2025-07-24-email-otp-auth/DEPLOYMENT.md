# OTP Email Template Deployment Guide

## Overview
This document provides step-by-step instructions for updating the Supabase email template to support OTP codes while maintaining backward compatibility with existing magic links.

## Deployment Timeline
1. Deploy all application code changes first
2. Update email template last (after code is live)
3. Verify OTP functionality
4. Clean up template formatting

## Step 1: Initial Template Update (Minimal Change)

### Location
Supabase Dashboard → Authentication → Email Templates → Magic Link

### Current Template
The existing template sends magic links. We will add the OTP code as a footnote without removing the magic link functionality.

### Change to Make
Add the following line at the very end of the email body:

```
P.S. Your login code is: {{ .Token }}
```

This minimal change:
- Preserves existing magic link functionality
- Adds OTP code for new authentication flow
- Can be reverted instantly if issues arise

## Step 2: Verification Process

After applying the template change:

1. Test login with a test email address
2. Verify email contains both:
   - Working magic link (for backward compatibility)
   - 6-digit OTP code in the P.S. section
3. Confirm OTP code works in the new login flow
4. Confirm magic link still works for users who haven't updated

## Step 3: Template Cleanup (After Verification)

Once OTP functionality is confirmed working:

### Updated Template Format
```
Subject: Your TrendWeight login code

Hi there,

Your login code for TrendWeight is:

{{ .Token }}

This code will expire in 1 hour. If you didn't request this code, you can safely ignore this email.

Thanks,
The TrendWeight Team
```

### Remove
- All references to magic links
- Click here instructions
- Device-specific warnings

## Rollback Plan

If issues occur at any stage:

1. **Stage 1 (Initial Update)**: Remove the P.S. line
2. **Stage 3 (Cleanup)**: Restore the original magic link template

## Important Notes

- The `{{ .Token }}` variable is automatically populated by Supabase for OTP requests
- The same template is used for both magic links and OTP codes
- During transition, some users may see both link and code
- OTP codes are always 6 digits
- Codes expire after 1 hour (Supabase default)

## Testing Checklist

- [ ] Template updated with P.S. line
- [ ] Test email received
- [ ] OTP code visible in email
- [ ] OTP code works in login flow
- [ ] Magic link still functional
- [ ] No errors in Supabase logs
- [ ] Template cleaned up after verification
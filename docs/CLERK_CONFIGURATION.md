# Clerk Configuration Guide

This guide documents the required Clerk configuration settings for TrendWeight.

## Prerequisites

1. Create a Clerk account at https://clerk.com
2. Create a new application in the Clerk Dashboard

## OAuth Provider Configuration

TrendWeight supports authentication through the following providers. Each must be configured in the Clerk Dashboard under **User & Authentication > Social Connections**:

### Google OAuth

1. Enable Google as a social connection
2. Configure OAuth consent screen with your app information
3. Add authorized redirect URIs:
   - Development: `https://your-dev-domain.clerk.accounts.dev/v1/oauth_callback`
   - Production: `https://your-prod-domain.clerk.accounts.dev/v1/oauth_callback`

### Microsoft OAuth

1. Enable Microsoft as a social connection
2. Register app in Azure AD
3. Configure redirect URIs as above

### Apple OAuth

1. Enable Apple as a social connection
2. Configure Apple Developer account with Sign in with Apple
3. Add Services ID and configure redirect URIs

### Email Authentication

1. Enable Email Code authentication method
2. Configure email templates in Clerk Dashboard
3. Customize branding to match TrendWeight

## Environment Variables

### Frontend (Vite)

```bash
# Your Clerk publishable key (found in Clerk Dashboard > API Keys)
VITE_CLERK_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxx
```

### Backend (ASP.NET Core)

```bash
# Your Clerk instance domain (found in Clerk Dashboard > API Keys)
Clerk__Authority=https://your-instance.clerk.accounts.dev

# Your Clerk secret key (found in Clerk Dashboard > API Keys)
Clerk__SecretKey=sk_test_xxxxxxxxxxxxx
```

## Session Configuration

In Clerk Dashboard > Sessions:

1. **Session lifetime**: 7 days (recommended)
2. **Inactivity timeout**: 24 hours
3. **Multi-session**: Disabled (TrendWeight doesn't support multiple active sessions)

### Customize session token

In the Sessions settings, click "Edit" under Customize session token and add the email claim:

```json
{
  "email": "{{user.primary_email_address}}"
}
```

This ensures the email is included in the JWT token that TrendWeight uses for user identification.

## User Management

### User Profile Fields

Configure the following fields in **User & Authentication > User Profile**:

- **Email**: Required, used as primary identifier
- **Name**: Optional, displayed in UI if provided
- **Profile Image**: Optional, not currently used by TrendWeight

### Sign-up Restrictions

- **Allow sign-ups**: Yes (required for new users)
- **Require email verification**: Yes (recommended for security)
- **Allowed email domains**: None (allow all domains)

## Security Settings

### JWT Validation

TrendWeight validates the following claims in the JWT tokens:

- `iss` (issuer): Must match Clerk authority
- `sub` (subject): User ID used for mapping
- `email`: User's email address (configured in session token settings)
- `exp` (expiration): Token must not be expired
- `nbf` (not before): Token must be valid

### CORS Configuration

No additional CORS configuration needed in Clerk. CORS is handled by the application.

## Production Checklist

Before deploying to production:

1. [ ] Switch from test keys to production keys
2. [ ] Update all redirect URIs to production domain
3. [ ] Configure production instance domain
4. [ ] Enable appropriate security features:
   - [ ] Bot protection
   - [ ] Rate limiting
   - [ ] Session security policies
5. [ ] Set up monitoring and alerts
6. [ ] Configure backup authentication methods

## Webhook Configuration (Optional)

If using webhooks for user sync:

1. Create webhook endpoint in Clerk Dashboard
2. Set endpoint URL: `https://yourdomain.com/api/webhooks/clerk`
3. Select events:
   - `user.created`
   - `user.updated`
   - `user.deleted`
4. Copy signing secret to environment variables

## Troubleshooting

### Common Issues

1. **"Invalid token" errors**
   - Verify Clerk authority URL matches exactly
   - Check that secret key is correct
   - Ensure system clocks are synchronized

2. **OAuth redirect errors**
   - Verify redirect URIs are properly configured
   - Check that production URLs use HTTPS

3. **Email delivery issues**
   - Check Clerk email logs
   - Verify sender domain is configured

### Support Resources

- Clerk Documentation: https://clerk.com/docs
- Clerk Support: support@clerk.com
- TrendWeight Issues: https://github.com/ervwalter/trendweight/issues
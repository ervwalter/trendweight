# Quick Deployment Reference

## Email Template Change (Production)

### Step 1: Add to existing template
```
P.S. Your login code is: {{ .Token }}
```

### Step 2: Test
- Send test login email
- Verify code appears
- Test code in new OTP flow

### Step 3: Clean up (after verification)
Replace entire template with:

```
Subject: Your TrendWeight login code

Hi there,

Your login code for TrendWeight is:

{{ .Token }}

This code will expire in 1 hour. If you didn't request this code, you can safely ignore this email.

Thanks,
The TrendWeight Team
```

## Key Points
- Deploy code first, template last
- Start with minimal change (P.S. line)
- Verify before full cleanup
- Magic links remain functional during transition
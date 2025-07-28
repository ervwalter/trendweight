# Database Schema

This is the database schema implementation for the spec detailed in @.agent-os/specs/2025-07-27-clerk-auth-migration/spec.md

> Created: 2025-07-27
> Version: 1.0.0

## Changes

### New Tables

#### user_accounts
Stores the mapping between external authentication provider user IDs and internal GUIDs.

```sql
-- Create user_accounts table for mapping external auth IDs to internal GUIDs
CREATE TABLE IF NOT EXISTS public.user_accounts (
    uid UUID NOT NULL DEFAULT uuid_generate_v4(),
    external_id VARCHAR NOT NULL,
    provider VARCHAR NOT NULL DEFAULT 'clerk',
    email VARCHAR NOT NULL,
    created_at TEXT DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
    updated_at TEXT DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
    CONSTRAINT user_accounts_pkey PRIMARY KEY (uid),
    CONSTRAINT user_accounts_external_provider_unique UNIQUE (external_id, provider)
);

-- Create indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_user_accounts_external ON public.user_accounts USING btree (external_id, provider);
CREATE INDEX IF NOT EXISTS idx_user_accounts_email ON public.user_accounts USING btree (email);

-- Enable RLS
ALTER TABLE public.user_accounts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (admin-only access)
CREATE POLICY "Deny all access - admin only through service role" 
    ON public.user_accounts 
    FOR ALL 
    TO authenticated 
    USING (false);

CREATE POLICY "Deny all access for anon users" 
    ON public.user_accounts 
    FOR ALL 
    TO anon 
    USING (false);

-- Grant permissions to service role
GRANT ALL ON public.user_accounts TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_accounts TO authenticated, anon;
```

### Modifications

No modifications to existing tables. The existing schema remains unchanged to ensure data integrity and backward compatibility.

### Migrations

```sql
-- Migration script for existing users (to be run manually or via automated process)
-- This creates user_accounts entries for existing Supabase auth users

INSERT INTO public.user_accounts (uid, external_id, provider, email, created_at, updated_at)
SELECT 
    p.uid,
    p.uid::text, -- For existing users, their Supabase UID becomes their external_id
    'supabase' as provider,
    p.email,
    p.created_at,
    p.updated_at
FROM public.profiles p
LEFT JOIN public.user_accounts ua ON ua.uid = p.uid
WHERE ua.uid IS NULL; -- Only insert if not already mapped
```

## Specifications

### Table Details

**user_accounts**
- `uid`: UUID - Internal user identifier (Primary Key)
- `external_id`: VARCHAR - External provider's user ID (e.g., Clerk user ID)
- `provider`: VARCHAR - Authentication provider name ('clerk', 'supabase', etc.)
- `email`: VARCHAR - User's email address for reference
- `created_at`: TEXT - ISO 8601 timestamp of account creation
- `updated_at`: TEXT - ISO 8601 timestamp of last update

### Indexes and Constraints

1. **Primary Key**: `uid` - Ensures each internal user ID is unique
2. **Unique Constraint**: `(external_id, provider)` - Prevents duplicate mappings
3. **Index**: `(external_id, provider)` - Fast lookup from external ID to internal ID
4. **Index**: `email` - Enables email-based lookups if needed

### Foreign Key Relationships

Note: We intentionally do NOT create a foreign key from `user_accounts.uid` to `profiles.uid` because:
1. It would create a circular dependency
2. We want to support creating the mapping before the profile exists
3. The application logic will ensure consistency

## Rationale

### Why a Separate Mapping Table?

1. **Flexibility**: Supports multiple auth providers without changing existing schema
2. **Data Integrity**: Preserves all existing GUID-based relationships
3. **Migration Path**: Allows gradual migration from Supabase to Clerk
4. **Provider Independence**: Easy to switch providers in the future

### Why Not Modify Existing Tables?

1. **Risk Mitigation**: No risk of data loss or corruption
2. **Backward Compatibility**: Existing queries continue to work
3. **Clean Separation**: Auth concerns separated from business data

### Performance Considerations

1. **Indexed Lookups**: O(1) lookup from external ID to internal GUID
2. **Caching Opportunity**: Mapping can be cached in application layer
3. **Minimal Overhead**: Single additional query per authentication
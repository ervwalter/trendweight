# TrendWeight Database Schema

This document describes the database schema for TrendWeight's Supabase backend.

## Overview

The database consists of five main tables that handle user profiles, authentication mapping, weight tracking data from fitness providers (Fitbit and Withings), and legacy data migration.

## Tables

### profiles
Stores user profile information and settings.

| Column | Type | Description |
|--------|------|-------------|
| uid | UUID | Primary key (no foreign key constraint) |
| email | VARCHAR | User's email address |
| profile | JSONB | User settings and preferences |
| created_at | TEXT | ISO 8601 timestamp (default: now()) |
| updated_at | TEXT | ISO 8601 timestamp (default: now()) |

**JSONB Profile Structure:**
```json
{
  "firstName": string,        // User's first name
  "useMetric": boolean,       // true for metric units, false for imperial
  "goalStart": string,        // ISO date string for goal start
  "goalWeight": number,       // Goal weight in user's preferred units
  "goalRate": number,         // Weight loss rate per week
  "sharingEnabled": boolean,  // Whether sharing is enabled
  "sharingCode": string,      // Unique code for shared dashboards
  "dayStartOffset": number    // Hours offset for day boundaries
}
```

### provider_links
Stores OAuth tokens and connection details for fitness providers.

| Column | Type | Description |
|--------|------|-------------|
| uid | UUID | User ID (foreign key to profiles) |
| provider | VARCHAR | Provider name ('fitbit' or 'withings') |
| token | JSONB | OAuth token data (encrypted) |
| update_reason | TEXT | Optional reason for last token update |
| updated_at | TEXT | ISO 8601 timestamp of last update |

**Primary Key:** (uid, provider)

### source_data
Stores raw weight measurement data from providers.

| Column | Type | Description |
|--------|------|-------------|
| uid | UUID | User ID (foreign key to profiles) |
| provider | VARCHAR | Provider name ('fitbit' or 'withings') |
| measurements | JSONB | Array of weight measurements |
| last_sync | TEXT | ISO 8601 timestamp of last sync |
| updated_at | TEXT | ISO 8601 timestamp of last update |

**Primary Key:** (uid, provider)

**JSONB Measurements Structure:**
```json
[
  {
    "date": "2024-01-23",      // YYYY-MM-DD format
    "time": "06:30:00",        // HH:mm:ss format
    "weight": 80.5,            // Weight in kg
    "fatRatio": 0.225          // Optional body fat ratio (0-1)
  }
]
```

### user_accounts
Maps external authentication provider IDs to internal user IDs.

| Column | Type | Description |
|--------|------|-------------|
| uid | UUID | Internal user ID (primary key, auto-generated) |
| external_id | VARCHAR | External provider's user ID |
| provider | VARCHAR | Auth provider name (default: 'clerk') |
| created_at | TEXT | ISO 8601 timestamp with UTC timezone |
| updated_at | TEXT | ISO 8601 timestamp with UTC timezone |

**Unique Constraint:** (external_id, provider)

### legacy_profiles
Stores migrated data from the legacy TrendWeight system.

| Column | Type | Description |
|--------|------|-------------|
| email | VARCHAR | Primary key - user's email |
| username | VARCHAR | User's login username for lookup |
| first_name | VARCHAR | User's first name |
| use_metric | BOOLEAN | True for metric units |
| start_date | DATE | Goal start date |
| goal_weight | DECIMAL | Goal weight |
| planned_pounds_per_week | DECIMAL | Weight loss rate (already converted for metric) |
| day_start_offset | INTEGER | Hours offset for day boundaries |
| private_url_key | VARCHAR | Legacy sharing key |
| device_type | VARCHAR | Legacy device type |
| refresh_token | VARCHAR | OAuth refresh token |
| measurements | JSONB | Pre-converted RawMeasurement array |
| created_at | TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMP | Last update timestamp |

## Security

### Row Level Security (RLS)
All tables have RLS enabled with policies that deny all access except through the service role. This means:
- No direct access from client applications
- All data access must go through the API backend
- The API uses the service role key to access data on behalf of authenticated users

### Realtime Broadcast Policies
The `realtime.messages` table has RLS policies for broadcast subscriptions:
- **sync-progress channels**: Anonymous and authenticated users can subscribe to `sync-progress:*` channels
- Progress data is non-sensitive (UI feedback only)
- Backend broadcasts using service role (bypasses RLS)

### Indexes
- `idx_users_email` - For efficient email lookups on profiles table
- `idx_vendor_links_updated` - For tracking recently updated provider links
- `idx_source_data_updated` - For tracking recently synced data
- `idx_user_accounts_external` - For efficient lookups by external ID and provider
- `idx_legacy_profiles_email` - For email lookups on legacy profiles
- `idx_legacy_profiles_username` - For username lookups on legacy profiles

## Data Conventions

1. **Timestamps**: All timestamps are stored as ISO 8601 strings in TEXT columns
2. **Weights**: All weights are stored in kilograms (kg) regardless of user preference
3. **Providers**: Currently supports 'fitbit' and 'withings' as provider values
4. **Foreign Keys**: All relationships cascade on delete to maintain referential integrity

## Setup Instructions

To set up this schema in a new Supabase project:

1. Create a new Supabase project at https://supabase.com
2. Go to the SQL Editor in the Supabase dashboard
3. Run the contents of `schema.sql`
4. Configure your API backend with:
   - `SUPABASE_URL` - Your project URL
   - `SUPABASE_SERVICE_KEY` - Your service role key (keep this secret!)

## Notes

- The schema uses JSONB columns for flexibility in storing provider-specific data
- All user data access is controlled through the API layer, not direct database access
- The service role key should never be exposed to client applications
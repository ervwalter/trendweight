# TrendWeight Database Schema

This document describes the database schema for TrendWeight's Supabase backend.

## Overview

The database consists of three main tables that handle user profiles and weight tracking data from fitness providers (Fitbit and Withings).

## Tables

### profiles
Stores user profile information and settings.

| Column | Type | Description |
|--------|------|-------------|
| uid | UUID | Primary key, references auth.users(id) |
| email | VARCHAR | User's email address |
| profile | JSONB | User settings and preferences |
| created_at | TEXT | ISO 8601 timestamp of creation |
| updated_at | TEXT | ISO 8601 timestamp of last update |

**JSONB Profile Structure:**
```json
{
  "metric": boolean,          // true for metric units, false for imperial
  "username": string,         // optional public username
  "bio": string,             // optional user bio
  "isPublic": boolean,       // whether profile is publicly visible
  "syncing": boolean,        // whether data sync is in progress
  "lastSync": string         // ISO 8601 timestamp of last sync
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
    "weight": 80.5,            // Weight in kg
    "bodyfat": 22.5            // Optional body fat percentage
  }
]
```

## Security

### Row Level Security (RLS)
All tables have RLS enabled with policies that deny all access except through the service role. This means:
- No direct access from client applications
- All data access must go through the API backend
- The API uses the service role key to access data on behalf of authenticated users

### Indexes
- `idx_users_email` - For efficient email lookups
- `idx_vendor_links_updated` - For tracking recently updated provider links
- `idx_source_data_updated` - For tracking recently synced data

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
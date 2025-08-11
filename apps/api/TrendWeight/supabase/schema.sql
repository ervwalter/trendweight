-- TrendWeight Database Schema
-- Generated from Supabase project
-- 
-- This file contains the complete database schema for TrendWeight.
-- To use this with a new Supabase project:
-- 1. Create a new Supabase project
-- 2. Run this SQL script in the SQL editor
-- 3. The RLS policies are set to deny all access except through service role

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create user_accounts table for mapping external auth IDs to internal GUIDs
CREATE TABLE IF NOT EXISTS public.user_accounts (
    uid UUID NOT NULL DEFAULT uuid_generate_v4(),
    external_id VARCHAR NOT NULL,
    provider VARCHAR NOT NULL DEFAULT 'clerk',
    created_at TEXT DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
    updated_at TEXT DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
    CONSTRAINT user_accounts_pkey PRIMARY KEY (uid),
    CONSTRAINT user_accounts_external_provider_unique UNIQUE (external_id, provider)
);

-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
    uid UUID NOT NULL,
    email VARCHAR NOT NULL,
    profile JSONB NOT NULL,
    created_at TEXT DEFAULT now(),
    updated_at TEXT DEFAULT now(),
    CONSTRAINT profiles_pkey PRIMARY KEY (uid)
    -- No foreign key constraint - profiles is independent
);

-- Create provider_links table
CREATE TABLE IF NOT EXISTS public.provider_links (
    uid UUID NOT NULL,
    provider VARCHAR NOT NULL,
    token JSONB NOT NULL,
    update_reason TEXT,
    updated_at TEXT DEFAULT now(),
    CONSTRAINT vendor_links_pkey PRIMARY KEY (uid, provider),
    CONSTRAINT provider_links_uid_fkey FOREIGN KEY (uid) 
        REFERENCES public.profiles(uid) ON DELETE CASCADE
);

-- Create source_data table
CREATE TABLE IF NOT EXISTS public.source_data (
    uid UUID NOT NULL,
    provider VARCHAR NOT NULL,
    measurements JSONB NOT NULL DEFAULT '[]'::jsonb,
    last_sync TEXT,
    updated_at TEXT DEFAULT now(),
    CONSTRAINT source_data_pkey PRIMARY KEY (uid, provider),
    CONSTRAINT source_data_uid_fkey FOREIGN KEY (uid) 
        REFERENCES public.profiles(uid) ON DELETE CASCADE
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON public.profiles USING btree (email);
CREATE INDEX IF NOT EXISTS idx_user_accounts_external ON public.user_accounts USING btree (external_id, provider);
CREATE INDEX IF NOT EXISTS idx_vendor_links_updated ON public.provider_links USING btree (updated_at);
CREATE INDEX IF NOT EXISTS idx_source_data_updated ON public.source_data USING btree (updated_at);


-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.source_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_accounts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- All tables are admin-only (service role access only)

-- Drop existing policies if they exist, then create new ones

-- Profiles table policies
DROP POLICY IF EXISTS "Deny all access - admin only through service role" ON public.profiles;
DROP POLICY IF EXISTS "Deny all access for anon users" ON public.profiles;
CREATE POLICY "Deny all access - admin only through service role" 
    ON public.profiles 
    FOR ALL 
    TO authenticated 
    USING (false);
CREATE POLICY "Deny all access for anon users" 
    ON public.profiles 
    FOR ALL 
    TO anon 
    USING (false);

-- Provider links table policies
DROP POLICY IF EXISTS "Deny all access - admin only through service role" ON public.provider_links;
DROP POLICY IF EXISTS "Deny all access for anon users" ON public.provider_links;
CREATE POLICY "Deny all access - admin only through service role" 
    ON public.provider_links 
    FOR ALL 
    TO authenticated 
    USING (false);
CREATE POLICY "Deny all access for anon users" 
    ON public.provider_links 
    FOR ALL 
    TO anon 
    USING (false);

-- Source data table policies
DROP POLICY IF EXISTS "Deny all access - admin only through service role" ON public.source_data;
DROP POLICY IF EXISTS "Deny all access for anon users" ON public.source_data;
CREATE POLICY "Deny all access - admin only through service role" 
    ON public.source_data 
    FOR ALL 
    TO authenticated 
    USING (false);
CREATE POLICY "Deny all access for anon users" 
    ON public.source_data 
    FOR ALL 
    TO anon 
    USING (false);

-- User accounts table policies
DROP POLICY IF EXISTS "Deny all access - admin only through service role" ON public.user_accounts;
DROP POLICY IF EXISTS "Deny all access for anon users" ON public.user_accounts;
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
GRANT ALL ON public.profiles TO service_role;
GRANT ALL ON public.provider_links TO service_role;
GRANT ALL ON public.source_data TO service_role;
GRANT ALL ON public.user_accounts TO service_role;

-- ============================================================================
-- Realtime Broadcast Security Policies
-- ============================================================================

-- Enable RLS on realtime.messages table to control channel subscriptions
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

-- Allow anyone to subscribe to sync progress channels (for receiving broadcasts)
-- Channel format: sync-progress:{progress-id}
-- Progress data is not sensitive (just UI feedback) and progressId is a random GUID
-- The backend broadcasts using service role which bypasses RLS, so no INSERT policy is needed
CREATE POLICY "Allow anonymous sync-progress subscriptions"
    ON realtime.messages
    FOR SELECT
    TO anon, authenticated
    USING (
        extension = 'broadcast' 
        AND topic LIKE 'sync-progress:%'
    );

-- Create legacy_profiles table for migrated legacy data
CREATE TABLE IF NOT EXISTS public.legacy_profiles (
    email VARCHAR PRIMARY KEY,
    username VARCHAR, -- User's login username for lookup purposes
    first_name VARCHAR,
    use_metric BOOLEAN,
    start_date DATE,
    goal_weight DECIMAL,
    planned_pounds_per_week DECIMAL, -- Already converted for metric users (divided by 2)
    day_start_offset INTEGER,
    private_url_key VARCHAR,
    device_type VARCHAR,
    refresh_token VARCHAR, -- OAuth refresh token (used for both Withings and Fitbit)
    measurements JSONB DEFAULT '[]'::jsonb, -- Pre-converted RawMeasurement format
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes on legacy_profiles
CREATE INDEX IF NOT EXISTS idx_legacy_profiles_email ON public.legacy_profiles USING btree (email);
CREATE INDEX IF NOT EXISTS idx_legacy_profiles_username ON public.legacy_profiles USING btree (username);

-- Enable RLS on legacy_profiles table
ALTER TABLE public.legacy_profiles ENABLE ROW LEVEL SECURITY;

-- Legacy profiles table policies
DROP POLICY IF EXISTS "Deny all access - admin only through service role" ON public.legacy_profiles;
DROP POLICY IF EXISTS "Deny all access for anon users" ON public.legacy_profiles;
CREATE POLICY "Deny all access - admin only through service role" 
    ON public.legacy_profiles 
    FOR ALL 
    TO authenticated 
    USING (false);
CREATE POLICY "Deny all access for anon users" 
    ON public.legacy_profiles 
    FOR ALL 
    TO anon 
    USING (false);

-- Grant permissions to service role for legacy_profiles
GRANT ALL ON public.legacy_profiles TO service_role;

-- Grant basic permissions to authenticated and anon roles (required by Supabase)
-- Note: RLS policies will still deny access
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.provider_links TO authenticated, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.source_data TO authenticated, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_accounts TO authenticated, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.legacy_profiles TO authenticated, anon;
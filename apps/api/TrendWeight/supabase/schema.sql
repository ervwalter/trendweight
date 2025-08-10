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

-- Create sync_progress table for realtime sync status
CREATE TABLE IF NOT EXISTS public.sync_progress (
    id UUID PRIMARY KEY, -- Provided by frontend (progressId)
    uid UUID NOT NULL,
    external_id TEXT NOT NULL, -- Clerk sub
    provider TEXT NOT NULL DEFAULT 'all' CHECK (provider IN ('fitbit','withings','all')),
    status TEXT NOT NULL CHECK (status IN ('running','succeeded','failed')),
    providers JSONB NULL, -- Array of provider progress objects
    percent INT NULL, -- 0..100 when determinable
    message TEXT NULL,
    started_at TEXT DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
    updated_at TEXT DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
    CONSTRAINT sync_progress_percent_range CHECK (percent IS NULL OR (percent BETWEEN 0 AND 100))
);

-- Indexes for sync_progress
CREATE INDEX IF NOT EXISTS idx_sync_progress_external_id ON public.sync_progress USING btree (external_id);
CREATE INDEX IF NOT EXISTS idx_sync_progress_uid ON public.sync_progress USING btree (uid);
CREATE INDEX IF NOT EXISTS idx_sync_progress_status ON public.sync_progress USING btree (status);

-- Trigger to auto-update updated_at on row changes (stores ISO 8601 UTC as TEXT)
CREATE OR REPLACE FUNCTION public.set_text_updated_at()
RETURNS trigger AS $$
BEGIN
    NEW.updated_at := to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_progress_set_updated_at ON public.sync_progress;
CREATE TRIGGER trg_sync_progress_set_updated_at
BEFORE UPDATE ON public.sync_progress
FOR EACH ROW
EXECUTE FUNCTION public.set_text_updated_at();

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.source_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_progress ENABLE ROW LEVEL SECURITY;

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

-- sync_progress table policies
DROP POLICY IF EXISTS "Deny all access - admin only through service role" ON public.sync_progress;
DROP POLICY IF EXISTS "Deny all access for anon users" ON public.sync_progress;
DROP POLICY IF EXISTS "Select own progress rows" ON public.sync_progress;
-- Deny all by default (authenticated) - only specific SELECT allowed
CREATE POLICY "Deny all access - admin only through service role" 
    ON public.sync_progress 
    FOR ALL 
    TO authenticated 
    USING (false);
-- Explicitly deny anon
CREATE POLICY "Deny all access for anon users" 
    ON public.sync_progress 
    FOR ALL 
    TO anon 
    USING (false);
-- Allow authenticated users to select only their own rows (RLS for Realtime)
CREATE POLICY "Select own progress rows"
    ON public.sync_progress
    FOR SELECT
    TO authenticated
    USING (external_id = (auth.jwt() ->> 'sub'));

-- Grant permissions to service role
GRANT ALL ON public.profiles TO service_role;
GRANT ALL ON public.provider_links TO service_role;
GRANT ALL ON public.source_data TO service_role;
GRANT ALL ON public.user_accounts TO service_role;
GRANT ALL ON public.sync_progress TO service_role;

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
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sync_progress TO authenticated, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.legacy_profiles TO authenticated, anon;
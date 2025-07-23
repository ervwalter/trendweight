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

-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
    uid UUID NOT NULL,
    email VARCHAR NOT NULL,
    profile JSONB NOT NULL,
    created_at TEXT DEFAULT now(),
    updated_at TEXT DEFAULT now(),
    CONSTRAINT profiles_pkey PRIMARY KEY (uid),
    CONSTRAINT profiles_uid_auth_users_fkey FOREIGN KEY (uid) 
        REFERENCES auth.users(id) ON DELETE CASCADE
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
CREATE INDEX IF NOT EXISTS idx_vendor_links_updated ON public.provider_links USING btree (updated_at);
CREATE INDEX IF NOT EXISTS idx_source_data_updated ON public.source_data USING btree (updated_at);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.source_data ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- All tables are admin-only (service role access only)

-- Profiles table policies
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

-- Grant permissions to service role
GRANT ALL ON public.profiles TO service_role;
GRANT ALL ON public.provider_links TO service_role;
GRANT ALL ON public.source_data TO service_role;

-- Grant basic permissions to authenticated and anon roles (required by Supabase)
-- Note: RLS policies will still deny access
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.provider_links TO authenticated, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.source_data TO authenticated, anon;
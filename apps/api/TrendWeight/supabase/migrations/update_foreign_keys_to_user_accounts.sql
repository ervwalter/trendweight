-- Migration: Remove foreign key from profiles to auth.users
-- This migration removes the dependency on Supabase auth.users table
-- provider_links and source_data continue to reference profiles with CASCADE DELETE
-- This allows us to delete users by manually deleting from user_accounts and profiles

-- Step 1: Drop the foreign key constraint from profiles to auth.users
ALTER TABLE public.profiles 
    DROP CONSTRAINT IF EXISTS profiles_uid_auth_users_fkey;

-- Note: We are NOT adding a foreign key from profiles to user_accounts because:
-- 1. Existing users don't have user_accounts entries yet
-- 2. We want to be able to delete users by deleting from both tables manually
-- 
-- The cascade relationships remain:
-- - provider_links -> profiles (CASCADE DELETE)
-- - source_data -> profiles (CASCADE DELETE)
-- 
-- So deleting from profiles will still clean up provider_links and source_data
-- Migration: Remove foreign key from profiles to auth.users
-- This migration removes the dependency on Supabase auth.users table
-- provider_links and source_data continue to reference profiles with CASCADE DELETE
-- This allows us to delete users by manually deleting from user_accounts and profiles

ALTER TABLE public.profiles 
    DROP CONSTRAINT IF EXISTS profiles_uid_auth_users_fkey;


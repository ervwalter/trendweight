-- Migration: Drop email column from user_accounts table
-- Date: 2025-01-29
-- Reason: Email is never read from user_accounts table, only written. 
--         Email is kept in profiles table for legacy migration lookups.

-- Drop the email column
ALTER TABLE user_accounts 
DROP COLUMN IF EXISTS email;

-- Drop the index on email if it exists
DROP INDEX IF EXISTS idx_user_accounts_email;
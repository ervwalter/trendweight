-- Expression index for the anonymous sharing-code lookup (GET /api/data/{sharingCode}).
-- Mirrors idx_profiles_api_key_hash: profile JSONB keys are PascalCase to match the
-- C# ProfileData serialization. Without this every public share-page hit scanned
-- the whole profiles table.
CREATE INDEX IF NOT EXISTS idx_profiles_sharing_token
    ON public.profiles ((profile->>'SharingToken'))
    WHERE profile->>'SharingToken' IS NOT NULL;

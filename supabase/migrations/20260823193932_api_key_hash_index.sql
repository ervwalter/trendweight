-- Expression index for API key lookup. Profile JSONB keys are PascalCase
-- (matching the C# ProfileData serialization), and most profiles will never
-- have an API key, so a partial index keeps it small.
CREATE INDEX IF NOT EXISTS idx_profiles_api_key_hash
    ON public.profiles ((profile->>'ApiKeyHash'))
    WHERE profile->>'ApiKeyHash' IS NOT NULL;

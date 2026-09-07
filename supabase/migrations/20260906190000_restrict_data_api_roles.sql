-- The API reaches these tables only through the service role. The browser's
-- publishable key is used solely to subscribe to Realtime sync-progress
-- broadcasts, which are advisory status messages. Note that the frontend opens
-- a public channel, so the baseline's "Allow anonymous sync-progress
-- subscriptions" policy on realtime.messages (evaluated only for private
-- channels) is not what limits the key; the revocation below is.
-- The baseline dump still granted anon/authenticated every table privilege
-- (including TRUNCATE, TRIGGER, and REFERENCES, which row-level security does
-- not govern) and default privileges on any future table, sequence, or
-- function. Revoke all of it; service_role keeps its grants.

REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public FROM anon, authenticated;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
    REVOKE ALL PRIVILEGES ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
    REVOKE ALL PRIVILEGES ON SEQUENCES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
    REVOKE ALL PRIVILEGES ON FUNCTIONS FROM anon, authenticated;

-- The original comment described behaviour that never existed: the row is not
-- deleted. MeasurementSyncService ignores the incremental window when the flag
-- is set, and SourceDataService replaces the measurements and clears the flag
-- in the same write once the full fetch succeeds.
COMMENT ON COLUMN public.source_data.force_full_sync IS
    'When true, the next sync fetches the provider''s full history instead of the incremental window. Existing readings are kept until that fetch succeeds; the replacement measurements are then written and this flag cleared in the same update. The row is never deleted.';

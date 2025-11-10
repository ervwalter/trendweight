-- Add force_full_sync flag to source_data table
-- This flag allows triggering a full resync for specific provider data
-- by clearing existing data before the next sync

ALTER TABLE public.source_data
ADD COLUMN IF NOT EXISTS force_full_sync BOOLEAN DEFAULT FALSE;

-- Add comment explaining the purpose
COMMENT ON COLUMN public.source_data.force_full_sync IS
'When true, triggers deletion of this source_data row before next sync, causing a full resync. Auto-clears when new data is written.';

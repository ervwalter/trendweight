-- Records when a provider link was first created. updated_at is rewritten on every
-- token refresh (roughly every 3 hours for Withings), so it cannot serve as the
-- "connected since" date shown in settings. No default and no backfill: the API
-- falls back to updated_at for rows that predate this column.
ALTER TABLE public.provider_links
    ADD COLUMN IF NOT EXISTS created_at text;

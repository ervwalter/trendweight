-- Housekeeping: pg_net was enabled in the baseline dump but nothing in this
-- project calls it. It lives in its own migration, after the privilege
-- revocation in 20260906190000_restrict_data_api_roles.sql, because pg_net is a
-- platform-managed extension on hosted Supabase and the drop may be refused
-- there (supautils ownership, Database Webhooks depending on the net schema).
-- If it fails, only this file fails; the REVOKEs stay applied. Nothing depends
-- on the drop succeeding, so it is safe to skip or delete this migration on a
-- project that refuses it.
DROP EXTENSION IF EXISTS pg_net;

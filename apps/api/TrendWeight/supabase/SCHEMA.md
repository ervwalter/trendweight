# Database schema reference

The canonical, versioned schema is [supabase/migrations](../../../../supabase/migrations).
The SQL and old migration files beside this document are historical artifacts;
do not apply them directly to a live database or use them to initialize a new one.
See [architecture](../../../../docs/ARCHITECTURE.md) for the migration workflow.

| Table             | Purpose and boundaries                                               |
| ----------------- | -------------------------------------------------------------------- |
| `profiles`        | Internal UUID, email and profile JSON; API-key hash expression index |
| `provider_links`  | Provider OAuth token JSON; composite user/provider primary key       |
| `source_data`     | Raw measurement arrays, last sync and forced-full-sync flag          |
| `user_accounts`   | Unique external-provider identity mapped to internal UUID            |
| `legacy_profiles` | Legacy profile and measurement import data                           |

Provider links and source data reference profiles with cascading deletion. The
committed schema enables RLS and denies anon/authenticated table access; backend
access uses the privileged service role. This describes committed SQL, not a
verification of live project policy state.

OAuth tokens are stored as readable JSON by the application. There is no
application-level token encryption in this code; do not confuse hosting/storage
encryption with protection from someone holding a service-role credential.

Profile JSON uses the property names serialized by
[ProfileData](../Features/Profile/Models/ProfileData.cs), including `ApiKeyHash`
and `SharingToken`. Do not change their casing without a migration and compatible
query changes. Raw readings use kilograms and fat ratios, independent of display
units. See [data models](../Infrastructure/DataAccess/Models) for exact formats.

A forced full sync retains stored readings until the complete provider fetch
succeeds, then writes its replacement and clears the flag. Realtime progress is
advisory broadcast data, separate from table access; check live Realtime policies
when configuring a project.

Backend configuration names are `Supabase__Url`, `Supabase__AnonKey` and
`Supabase__ServiceKey`. The service key is secret. Never place it in a frontend
`VITE_*` variable, build argument, log, or client bundle.

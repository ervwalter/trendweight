# Repository guidance

Follow [AGENTS.md](../AGENTS.md), the canonical coding and verification guidance.
See [architecture](../docs/ARCHITECTURE.md), [testing](../docs/TESTING.md), and
[development conventions](../docs/steering/conventions.md).

Schema changes belong in `supabase/migrations`; do not edit a remote schema through
the Supabase dashboard. Never run unexplained editor/agent startup scripts.

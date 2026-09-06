# Development conventions

[AGENTS.md](../../AGENTS.md) is the canonical source for coding rules, commands,
pre-commit checks, and operational boundaries. Avoid copying those rules into
tool-specific files, where they can drift.

Frontend feature components contain rendering and hooks; route definitions wire
authentication, loaders, and components together. Pass the route context's query
client to loaders. Do not introduce process-global account data caches.

Keep numeric presentation separate from data serialization: localized/grouped
numbers belong in the UI, while CSV/API fields need stable machine-readable formats.

Backend features own their services and request/response models. Authentication
scheme choice is explicit: internal APIs use Clerk, public v1 APIs use API keys,
and sharing endpoints gate access on enabled sharing codes. Prefer focused tests
of these contracts over tests that merely repeat an implementation.

Use one concern per commit. Explain the trigger, corrected behavior, and relevant
validation; unrelated fixes should have separate checkpoints. Significant new
functionality uses `feat:`, while corrections use `fix:`. See
[testing](../TESTING.md) for test commands and expectations.

# Requirements Document

## Introduction

Improve the dashboard loading experience by showing live sync progress during the normal refresh process. Progress must reflect provider-specific steps (Fitbit chunks, Withings pages) and work across multiple backend replicas. Supabase Realtime (Postgres Changes) will be used to stream progress updates under RLS enforced with Clerk-issued JWTs.

## Alignment with Product Vision

- TrendWeight should feel fast and reliable even when providers are slow or rate-limited.
- Show users what's happening (progress, waiting on provider) instead of a generic spinner/bar.
- Maintain existing refresh behavior but add visibility into sync progress.

## Requirements

### R1. Live progress during existing refresh flow

**User Story:** As a signed-in user, I want to see live progress when my dashboard is refreshing data, so that I know what's happening and how long it might take.

#### Acceptance Criteria

1. WHEN the dashboard requests data AND refresh is needed per existing logic THEN the system SHALL create a progress row and return progressId in the response.
2. WHEN sync progress occurs THEN the backend SHALL update the progress row with provider-specific status and completion metrics.
3. WHEN sync completes THEN the API SHALL return updated data and mark progress as complete.
4. The existing refresh timing and staleness logic SHALL remain unchanged.

### R2. Multi-replica safe progress tracking

**User Story:** As a system operator, I want progress tracking to work reliably across multiple replicas, so that progress updates are consistent and don't interfere with each other.

#### Acceptance Criteria

1. WHEN multiple replicas serve requests THEN progress updates SHALL be safely written to shared Postgres storage.
2. WHEN a sync process updates progress THEN other replicas SHALL see the updates via Supabase Realtime.
3. WHEN a worker instance crashes mid-sync THEN progress SHALL be marked as failed and can be retried on next request.

### R3. Realtime progress via Supabase Postgres Changes

**User Story:** As a user, I want to see live sync progress updates, so that I know what the system is doing and when it will finish.

#### Acceptance Criteria

1. WHEN a sync starts THEN the backend SHALL create a progress row identified by progressId with status=running.
2. WHEN progress updates occur THEN the backend SHALL update the row with provider-specific fields and timestamps.
3. WHEN the row changes THEN clients subscribed via Supabase Realtime Postgres Changes SHALL receive updates subject to RLS.
4. IF Realtime is unavailable THEN the UI SHALL fall back to polling a REST progress endpoint (optional for first iteration).

### R4. Provider-specific progress semantics

**User Story:** As a user, I want meaningful progress per provider, so that the progress bar accurately reflects the underlying work.

#### Acceptance Criteria

1. FOR Fitbit syncs THEN progress SHALL report completed chunks out of estimated total chunks (determinate progress).
2. FOR Withings syncs THEN progress SHALL report pages fetched and whether more pages remain (indeterminate with page count).
3. WHEN rate limits are hit THEN progress SHALL display waiting status with estimated reset time.
4. WHEN provider auth fails THEN progress SHALL show error state with actionable message.

### R5. Row Level Security with Clerk Authentication

**User Story:** As a security-conscious system, progress data must be isolated per user, so that users only see their own progress and cannot access other users' sync status.

#### Acceptance Criteria

1. WHEN progress rows are created THEN they SHALL include both internal uid and Clerk external_id for RLS.
2. WHEN clients query progress THEN RLS policies SHALL verify external_id matches auth.jwt() >> 'sub'.
3. WHEN using Supabase Realtime THEN subscriptions SHALL be filtered by RLS automatically.
4. Clerk-issued JWTs SHALL be accepted by Supabase for third-party authentication without custom token minting.

### R6. Frontend Integration

**User Story:** As a user, I want progress to display seamlessly in the dashboard, so that I can monitor sync status without additional navigation.

#### Acceptance Criteria

1. WHEN data is refreshing THEN a progress panel SHALL appear showing per-provider status.
2. WHEN progress updates arrive THEN the panel SHALL update in real-time without page refresh.
3. WHEN sync completes successfully THEN the panel SHALL disappear and data SHALL refresh automatically.
4. WHEN sync fails THEN the panel SHALL show error state with retry option.

## Non-Requirements (Future Enhancements)

- Fast-return mode: immediate response with cached data (deferred to future iteration)
- Progress persistence beyond session: progress rows can be cleaned up after completion
- Historical progress tracking: only current active syncs need progress visibility

## Success Metrics

- Users can see progress instead of generic loading states
- Progress updates reflect actual provider work (chunks, pages, rate limits)
- Multi-replica deployments work without progress conflicts
- Realtime updates work with Clerk authentication and RLS

## Technical Constraints

- Must work with existing Clerk authentication (no new auth systems)
- Must integrate with current MeasurementSyncService flow
- Must be compatible with Kubernetes multi-replica deployment
- Should reuse existing Supabase Postgres and Realtime infrastructure
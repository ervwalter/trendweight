# Spec Requirements Document

> Spec: Start Date Settings
> Created: 2025-07-25
> Status: Planning

## Overview

Implement start date configuration in onboarding and add a new setting to control how the start date is used for data filtering, allowing users to either hide data before the start date entirely or just use it for calculating progress.

## User Stories

### Start Date Configuration During Onboarding

As a new user, I want to set my start date during the initial setup process, so that I can immediately begin tracking my progress from the correct baseline date.

When I first sign up for TrendWeight, after entering my name and unit preference, I should be asked to set my "Start Date" - the baseline date for measuring my weight loss progress. This date will be used to calculate how much weight I've lost since starting my journey.

### Flexible Start Date Filtering

As an existing user with historical weight data, I want to choose whether to show or hide earlier weight data before my start date, so that I can control how my weight history is displayed.

When I choose "Show" for earlier weight data, I'll see all my historical measurements on the chart, but my progress calculations will still be based on my start date. When I choose "Hide", I'll only see data from my start date forward, giving me a "clean slate" view. Either way, my total weight change and progress toward my goal are always calculated from my start date.

## Spec Scope

1. **Start Date in Initial Setup** - Add start date field to the InitialSetup component alongside existing profile settings
2. **Earlier Weight Data Setting** - New toggle to control whether to show or hide data before the start date
3. **Reusable Settings Components** - Extract goal settings UI into shared components for use in both InitialSetup and Settings pages
4. **Client-Side Data Filtering** - Filter measurements based on start date when "hide data" mode is enabled
5. **Settings Persistence** - Store the new display mode preference in the user's profile

## Out of Scope

- Server-side data filtering (all filtering happens client-side)
- Changing how start date affects goal calculations (existing behavior remains)
- Migration of existing users' settings
- Bulk data operations or deletion

## Expected Deliverable

1. New users can set their start date during initial onboarding
2. Users can toggle between "Show" and "Hide" for earlier weight data
3. When "Hide" is selected, charts and data exports only show measurements from the start date forward

## Spec Documentation

- Tasks: @.agent-os/specs/2025-07-25-start-date-settings/tasks.md
- Technical Specification: @.agent-os/specs/2025-07-25-start-date-settings/sub-specs/technical-spec.md
- Database Schema: @.agent-os/specs/2025-07-25-start-date-settings/sub-specs/database-schema.md
- API Specification: @.agent-os/specs/2025-07-25-start-date-settings/sub-specs/api-spec.md
- Tests Specification: @.agent-os/specs/2025-07-25-start-date-settings/sub-specs/tests.md
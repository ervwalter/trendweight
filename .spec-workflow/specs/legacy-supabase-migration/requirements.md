# Requirements Document

## Introduction

This feature eliminates the dependency on MSSQL for legacy TrendWeight data access by migrating to use a pre-populated Supabase table. The legacy_profiles table in Supabase now contains all relevant legacy user data, allowing us to remove the MSSQL connection entirely while maintaining support for existing users who migrated from TrendWeight classic.

## Alignment with Product Vision

This migration supports our product goals by:
- **Infrastructure Simplification**: Consolidates all data in a single managed Supabase instance
- **System Modernization**: Removes legacy MSSQL dependency, simplifying our architecture
- **Performance Improvement**: Reduces latency by querying local Supabase instead of remote MSSQL
- **Maintenance Reduction**: Eliminates MSSQL connection management, credentials, and firewall requirements
- **Deployment Simplification**: Removes external database dependency for easier deployment

## Requirements

### Requirement 1: Legacy Data Service Migration

**User Story:** As a system administrator, I want all legacy data queries to use the Supabase legacy_profiles table, so that we can eliminate the MSSQL dependency

#### Acceptance Criteria

1. WHEN the system needs to check for legacy profile data THEN it SHALL query the Supabase legacy_profiles table instead of MSSQL
2. IF a legacy profile exists in Supabase with matching email THEN the system SHALL use that data for migration
3. WHEN retrieving legacy measurements THEN the system SHALL use the JSONB measurements field from the Supabase table directly
4. IF the Supabase query fails THEN the system SHALL handle it gracefully and log the error
5. WHEN all legacy data services are migrated THEN the MSSQL connection string SHALL be removed from configuration

### Requirement 2: Updated Migration Logic

**User Story:** As a developer, I want the legacy migration service to work with the new Supabase data structure, so that legacy user imports continue to function

#### Acceptance Criteria

1. WHEN reading profile data from Supabase THEN the system SHALL map email, username, first_name, use_metric, start_date, goal_weight, planned_pounds_per_week, day_start_offset, private_url_key, device_type, and refresh_token fields appropriately
2. WHEN migrating measurements THEN the system SHALL copy the measurements JSONB array directly to source_data as the data is already in the correct format (Date, Time, Weight in kg, FatRatio)
3. IF measurements field is null or empty array THEN the system SHALL return an empty list of measurements
4. WHEN all weights are already converted to kg in the legacy_profiles table THEN no unit conversion SHALL be performed
5. IF the refresh_token field is present THEN it SHALL be handled as plain text (not encrypted)

### Requirement 3: Account Deletion Integration

**User Story:** As a user, I want my legacy data to be deleted when I delete my account, so that no personal data remains in the system

#### Acceptance Criteria

1. WHEN a user deletes their account THEN the system SHALL check for associated legacy data in the legacy_profiles table
2. IF legacy data exists for the user's email THEN the system SHALL delete that record from legacy_profiles
3. WHEN deletion is attempted THEN the system SHALL log the action for audit purposes
4. IF the legacy data deletion fails THEN the system SHALL log the error but continue with other deletions
5. WHEN account deletion is complete THEN no legacy data SHALL remain for that user's email address

### Requirement 4: Direct Data Transfer

**User Story:** As a system, I want to transfer legacy measurements directly to source_data without transformation, so that the migration is efficient and accurate

#### Acceptance Criteria

1. WHEN CheckAndMigrateIfNeededAsync is called THEN it SHALL query Supabase legacy_profiles table by email
2. IF a legacy profile is found THEN the system SHALL proceed with the migration logic
3. WHEN migrating measurements THEN the system SHALL copy the measurements JSONB array directly to the source_data table without parsing individual fields
4. IF no legacy profile exists in Supabase THEN the system SHALL return null/false as appropriate
5. WHEN migration completes successfully THEN the provider link SHALL be created as before with provider = "legacy"

### Requirement 5: Configuration Cleanup

**User Story:** As a developer, I want all MSSQL-related configuration removed, so that the codebase is cleaner and deployment is simpler

#### Acceptance Criteria

1. WHEN the migration is complete THEN the LegacyDbConnectionString SHALL be removed from AppOptions
2. WHEN the migration is complete THEN Microsoft.Data.SqlClient package SHALL be removed from dependencies
3. WHEN the migration is complete THEN Dapper package SHALL be removed if not used elsewhere
4. IF environment variables contain MSSQL settings THEN they SHALL be removed from all environments
5. WHEN deployment occurs THEN no MSSQL connection requirements SHALL exist

## Non-Functional Requirements

### Code Architecture and Modularity
- **Single Responsibility Principle**: The new SupabaseLegacyDbService should have a single purpose of accessing legacy data from Supabase
- **Modular Design**: Keep the ILegacyDbService interface unchanged to maintain compatibility
- **Dependency Management**: Remove MSSQL-specific dependencies after migration
- **Clear Interfaces**: Maintain the existing service interface for seamless replacement

### Performance
- Query performance should be equal or better than MSSQL queries
- Direct JSONB transfer eliminates parsing overhead
- Connection pooling through Supabase SDK should be utilized
- Response times for legacy profile lookup should remain under 100ms

### Security
- No SQL injection vulnerabilities through proper use of Supabase SDK
- Refresh tokens handled as plain text (matching existing behavior)
- Legacy data deletion must be irreversible and complete
- Audit logging for all legacy data access and deletion operations

### Reliability
- Service should handle Supabase connection failures gracefully
- Null/missing data should not cause exceptions
- Migration should continue even if some data is missing
- System should function normally even if legacy_profiles table is empty

### Usability
- No user-facing changes - legacy data migration should work identically
- Error messages should be clear and actionable for developers
- Logging should provide sufficient detail for troubleshooting
- No manual intervention required for standard operations
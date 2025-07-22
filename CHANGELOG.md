# Changelog

## [3.0.0](https://github.com/ervwalter/trendweight/compare/v2.0.0...v3.0.0) (2025-07-22)


### ⚠ BREAKING CHANGES

* SourceDataService methods SetResyncRequestedAsync and IsResyncRequestedAsync have been removed. Any code depending on these methods must be updated.
* Removed /api/data/refresh endpoints. Data refresh now happens automatically when fetching measurements via GET /api/measurements.

### Features

* add API rate limiting for authenticated users ([cc6039d](https://github.com/ervwalter/trendweight/commit/cc6039d65691df2b289a6d2d0194eb30720f60bc))
* add Cloudflare Turnstile CAPTCHA to authentication ([9f6c6ae](https://github.com/ervwalter/trendweight/commit/9f6c6ae58683f8dd22a57755dde2d2cccacc9450))
* add comprehensive test coverage for measurement sync services ([80dd5e4](https://github.com/ervwalter/trendweight/commit/80dd5e4b60b416c3c5f4618e21a2940467b60cb2))
* add dashboard help link and improve math explanation ([778b29f](https://github.com/ervwalter/trendweight/commit/778b29f6ffade88bb9d0705e803d23d780b038ed))
* add demo mode with sample data for dashboard ([1c9eccd](https://github.com/ervwalter/trendweight/commit/1c9eccd0ef1d6ea75e319fec3b698f612411a3b9))
* add download page for viewing and exporting scale readings ([993819c](https://github.com/ervwalter/trendweight/commit/993819c438de63463ef517daa23cd25f76a48616))
* add GitHub Sponsors integration ([ff14486](https://github.com/ervwalter/trendweight/commit/ff14486dc1a64a0dd7d57f6115e115e344716ea1))
* add initial setup flow with profile creation ([0894dc0](https://github.com/ervwalter/trendweight/commit/0894dc06cc44d89ab21299fd63defeecca41cee5))
* add JWT clock skew tolerance ([082a0f7](https://github.com/ervwalter/trendweight/commit/082a0f7dafe84fd16b048e36116bc29d8cd9d12c))
* add math explanation page with interactive table of contents ([f9b16d4](https://github.com/ervwalter/trendweight/commit/f9b16d454b50fc4f89700846d6cf7803afdfd3ea))
* add OAuth error handling with dashboard recovery UI ([4efa442](https://github.com/ervwalter/trendweight/commit/4efa44205716d69f5966a55146e6f557fa69ea06))
* add Plausible analytics tracking ([159c96d](https://github.com/ervwalter/trendweight/commit/159c96ddecf538d709ab44f7015c7c31523f7136))
* add PWA support for iOS Add to Home Screen ([59b0863](https://github.com/ervwalter/trendweight/commit/59b086372e92e759d97cf1b7478d26302881fed4))
* add title and suspenseFallback props to Layout component ([9f4b276](https://github.com/ervwalter/trendweight/commit/9f4b27602922e460d4fc8b7d6248968f7e9c1218))
* add unified AppOptions configuration class ([082a0f7](https://github.com/ervwalter/trendweight/commit/082a0f7dafe84fd16b048e36116bc29d8cd9d12c))
* **api:** Complete backend cleanup and Firestore to Supabase migration ([50bbb40](https://github.com/ervwalter/trendweight/commit/50bbb407a6f82da89602fe6ccdf1c26f6f31608e))
* **api:** implement automatic camelCase serialization for API and Firestore ([0f875b3](https://github.com/ervwalter/trendweight/commit/0f875b34b42ddcf71e3d49a56db1761da68b2657))
* Complete migration from Firebase Auth to Supabase Auth ([7e0bbb8](https://github.com/ervwalter/trendweight/commit/7e0bbb8f8709c570fdd458e16644decbf05bfa42))
* Complete static pages implementation with improved UI fidelity ([bc8dc41](https://github.com/ervwalter/trendweight/commit/bc8dc41b28d6412739de7e4837947524f6b7419c))
* create Button component with multiple variants and sizes ([e5ace77](https://github.com/ervwalter/trendweight/commit/e5ace772998a0887cf20c3e44b95d0131c0ef1e3))
* enhance build page with support tools and changelog display ([55b491d](https://github.com/ervwalter/trendweight/commit/55b491d824493d583a90ac6347d41183b024e5ba))
* enhance error handling with correlation IDs and error codes ([cc6039d](https://github.com/ervwalter/trendweight/commit/cc6039d65691df2b289a6d2d0194eb30720f60bc))
* implement complete account deletion functionality ([1f14a10](https://github.com/ervwalter/trendweight/commit/1f14a104c87bb22693c9b447cc190093a6aee59c))
* Implement Firebase auth and core models for C# API ([791bef2](https://github.com/ervwalter/trendweight/commit/791bef257aa24bb1fea2594731f08bbc45096a44))
* Implement Firebase authentication with email link and social logins ([7483767](https://github.com/ervwalter/trendweight/commit/748376792e264e4a69bcbc56b31578a5a219862e))
* Implement frontend migration from Next.js to Vite ([2fea0f8](https://github.com/ervwalter/trendweight/commit/2fea0f8d914563d51280bd19724e7e5a6432f109))
* implement interactive explore mode for dashboard charts ([dcb7c31](https://github.com/ervwalter/trendweight/commit/dcb7c317ed0b63a8555d2e2639550607c126d6cd))
* implement legacy user migration from classic TrendWeight ([22b77f5](https://github.com/ervwalter/trendweight/commit/22b77f57b86c356f2f4c2b4f828fe2040984207f))
* implement secure dashboard sharing functionality ([7d30057](https://github.com/ervwalter/trendweight/commit/7d30057c2b3db6816ad283259a16048399497b7d))
* implement shared dashboard URLs with third-person view ([2e40281](https://github.com/ervwalter/trendweight/commit/2e40281a2753306a8b31ce9bf4d093476547ae6e))
* improve dashboard UI and chart display ([512e6aa](https://github.com/ervwalter/trendweight/commit/512e6aae73727cb42730f9389d6becccbef6c8d3))
* improve login flow and mobile chart display ([f621620](https://github.com/ervwalter/trendweight/commit/f6216209084d13cd581ece632693f4d665c461de))


### Bug Fixes

* add prerelease versioning strategy ([5c78f96](https://github.com/ervwalter/trendweight/commit/5c78f964a9f10ecffdbe3f5b69ffd881e6a7add9))
* cache JsonSerializerOptions to resolve CA1869 warning ([2bf208e](https://github.com/ervwalter/trendweight/commit/2bf208e37e90f01679dd1d4b214a26aa87ea9256))
* **ci:** enable Docker push for tagged releases ([20740d3](https://github.com/ervwalter/trendweight/commit/20740d305a2d74f9b5b1af2b001f5aa3a719e1c5))
* **ci:** require PAT for Release Please to trigger tag workflows ([9cd9bd7](https://github.com/ervwalter/trendweight/commit/9cd9bd704435c3b9fb7ecdeada2b505d55b526ec))
* **ci:** update to non-deprecated googleapis/release-please-action ([5c78f96](https://github.com/ervwalter/trendweight/commit/5c78f964a9f10ecffdbe3f5b69ffd881e6a7add9))
* configure Release Please for proper alpha versioning ([5c78f96](https://github.com/ervwalter/trendweight/commit/5c78f964a9f10ecffdbe3f5b69ffd881e6a7add9))
* correct data sync business logic in SourceDataService ([80dd5e4](https://github.com/ervwalter/trendweight/commit/80dd5e4b60b416c3c5f4618e21a2940467b60cb2))
* correct PrimaryKey attribute syntax in DbProfile model ([cc6039d](https://github.com/ervwalter/trendweight/commit/cc6039d65691df2b289a6d2d0194eb30720f60bc))
* **deps:** pin dependencies ([c98665e](https://github.com/ervwalter/trendweight/commit/c98665ea4f55f1bd56ed710466951ad4587a1a5f))
* **deps:** pin dependencies ([f16e973](https://github.com/ervwalter/trendweight/commit/f16e9730f54abfe1971f8bd31d15a234d3c69aec))
* **deps:** update all non-major dependencies ([adb61ca](https://github.com/ervwalter/trendweight/commit/adb61ca7007c53fd9a9304eb9e8af743d6232cea))
* **deps:** update all non-major dependencies ([b595c55](https://github.com/ervwalter/trendweight/commit/b595c550e04af0995ba076946894c47f6b8c3021))
* **deps:** update all non-major dependencies ([0395aca](https://github.com/ervwalter/trendweight/commit/0395acae29a4d1062380c9080936ccd2d0e1c257))
* **deps:** update all non-major dependencies ([326e31c](https://github.com/ervwalter/trendweight/commit/326e31c195c20dc8f6942313257da25548fc708a))
* **deps:** update all non-major dependencies ([0ab2d98](https://github.com/ervwalter/trendweight/commit/0ab2d983c45f088a39d849a3dbeb08d1ae825a63))
* **deps:** update all non-major dependencies ([54073c7](https://github.com/ervwalter/trendweight/commit/54073c735eb385a03f73f2a089cb3cfb0101743e))
* **deps:** update all non-major dependencies ([39c33e7](https://github.com/ervwalter/trendweight/commit/39c33e79ec2b36db000ff2efe3f909752a822b21))
* **deps:** update all non-major dependencies ([c5c0dc1](https://github.com/ervwalter/trendweight/commit/c5c0dc1d98ddce7915a4e3ca49ae044c982c9eec))
* **deps:** update all non-major dependencies ([cbc5553](https://github.com/ervwalter/trendweight/commit/cbc5553bb91a0521f12dac1ea6f7f2e3ab8b90cd))
* **deps:** update dependency framer-motion to v10 ([299c23b](https://github.com/ervwalter/trendweight/commit/299c23bdb3b48cc7ac7fe19e70840381439ffab9))
* **deps:** update dependency framer-motion to v8 ([584b480](https://github.com/ervwalter/trendweight/commit/584b4806ca74b314af9c0e9d0bb1a99819d89dcb))
* **deps:** update dependency framer-motion to v9 ([1d304a3](https://github.com/ervwalter/trendweight/commit/1d304a30c3e260f78d0adebc3b4151fecbe5a34c))
* **deps:** update dependency jsonwebtoken to v9 [security] ([5149cf9](https://github.com/ervwalter/trendweight/commit/5149cf93af3a7dea84f7eadfddb257b39b3640e9))
* **deps:** update dependency typescript to v5 ([76d376f](https://github.com/ervwalter/trendweight/commit/76d376f5306b6328fc4c52a02698d87aca9cfc76))
* **deps:** update npm patch dependencies ([#227](https://github.com/ervwalter/trendweight/issues/227)) ([d5d9a9f](https://github.com/ervwalter/trendweight/commit/d5d9a9f5679dbf74ce9e67c890b1bc264f10d4cf))
* **deps:** update npm patch dependencies to v1.125.6 ([#237](https://github.com/ervwalter/trendweight/issues/237)) ([33f3a93](https://github.com/ervwalter/trendweight/commit/33f3a93d16fb580562b4de074a737c1224d95ae6))
* ensure interpolation functions handle unsorted input ([2f90a32](https://github.com/ervwalter/trendweight/commit/2f90a32b2cd46058a2461b29273092aa5b0c8c9a))
* implement incremental sync for provider data refreshes ([bf9bb67](https://github.com/ervwalter/trendweight/commit/bf9bb679438cdfd8caf8b5c0b7b0c87dc4d67b9d))
* implement proper data merging for provider measurements ([6a78bcd](https://github.com/ervwalter/trendweight/commit/6a78bcdc7546de667166892dafcbd3311b7392e3))
* improve OAuth callback error handling and make token exchange idempotent ([fd61711](https://github.com/ervwalter/trendweight/commit/fd61711aecc478772923b5d0304ac268897caa98))
* improve SupabaseService error handling ([082a0f7](https://github.com/ervwalter/trendweight/commit/082a0f7dafe84fd16b048e36116bc29d8cd9d12c))
* move changelog-sections to root level for proper scope filtering ([3b160dc](https://github.com/ervwalter/trendweight/commit/3b160dc1b07ae9f136d1a5983e8b5a07775489fb))
* OAuth redirect to auth/verify for proper verification ([da254af](https://github.com/ervwalter/trendweight/commit/da254af4fc363e724425674cc5c29844efa07f42))
* push Docker images when building from release tags ([f98aa5a](https://github.com/ervwalter/trendweight/commit/f98aa5aa88b2c32309b8cf58ea988dcff17d65ec))
* remove bootstrap-sha that was causing all commits to be included ([5c78f96](https://github.com/ervwalter/trendweight/commit/5c78f964a9f10ecffdbe3f5b69ffd881e6a7add9))
* remove component prefix to match existing tag format ([0d95017](https://github.com/ervwalter/trendweight/commit/0d9501726c5d68cc2e63e773e20e40d4900ecb7e))
* remove default HTTPS port from authorization URLs ([98b58d7](https://github.com/ervwalter/trendweight/commit/98b58d778b086b9ac3f33152edccbb8a1011f31f))
* remove hardcoded API key from client.ts ([082a0f7](https://github.com/ervwalter/trendweight/commit/082a0f7dafe84fd16b048e36116bc29d8cd9d12c))
* remove unused isAuthError variable in ProviderSyncError ([e5ace77](https://github.com/ervwalter/trendweight/commit/e5ace772998a0887cf20c3e44b95d0131c0ef1e3))
* remove unused timezone field and add settings help text ([5b0b41d](https://github.com/ervwalter/trendweight/commit/5b0b41d5c9700c18931f6558dcdc610e16b3c384))
* resolve circular dependency causing API hang ([09b10f4](https://github.com/ervwalter/trendweight/commit/09b10f4c2dcd7a261395a18d776a82966e90b370))
* resolve code analysis warnings from enhanced .NET checks ([e88e241](https://github.com/ervwalter/trendweight/commit/e88e241b07735fba17a181b76624097b5bc90fc3))
* resolve Docker build issue and ESLint warnings ([cbe56e3](https://github.com/ervwalter/trendweight/commit/cbe56e388a29e8c26e9a996ccea7f57004f2ff61))
* resolve linter warnings and improve code quality ([d235801](https://github.com/ervwalter/trendweight/commit/d2358010eb492f7fe3183d8003bdc61a860a3259))
* resolve OAuth token expiration timezone issues ([d660ccb](https://github.com/ervwalter/trendweight/commit/d660ccbc88c9dab05988a92b97e9f7b4d0d11ce7))
* resolve test framework CI/CD issues ([2c6c5a5](https://github.com/ervwalter/trendweight/commit/2c6c5a591354f071549b0a580d92c7345a9af17d))
* restore PrimaryKey attribute parameters in DbProfile model ([12bbe75](https://github.com/ervwalter/trendweight/commit/12bbe75d0457bf86d3dd6706baa73a8c943fae49))
* run Docker container as non-root user for security ([cc6039d](https://github.com/ervwalter/trendweight/commit/cc6039d65691df2b289a6d2d0194eb30720f60bc))
* simplify provider service registration in DI container ([2bf208e](https://github.com/ervwalter/trendweight/commit/2bf208e37e90f01679dd1d4b214a26aa87ea9256))
* update CLAUDE.md with testing instructions ([1489412](https://github.com/ervwalter/trendweight/commit/14894128571bf7cabefe4fbe687e192e58a4cd11))
* update Dockerfile for npm workspaces compatibility ([f8d343b](https://github.com/ervwalter/trendweight/commit/f8d343be8ba40ec26d60c32cccf69a35aa1c3eb4))
* update tests for fluentassertions v8 compatibility ([f90e003](https://github.com/ervwalter/trendweight/commit/f90e003d3ab6e905ff494111c3a8d15837162929))
* update tests to use IServiceProvider ([09b10f4](https://github.com/ervwalter/trendweight/commit/09b10f4c2dcd7a261395a18d776a82966e90b370))
* use proper Link components for internal navigation ([cc6039d](https://github.com/ervwalter/trendweight/commit/cc6039d65691df2b289a6d2d0194eb30720f60bc))


### Documentation

* Add critical rule about reading legacy code before implementation ([0eb6571](https://github.com/ervwalter/trendweight/commit/0eb6571e6ac9a34a15de78772b70ae24176679ae))
* add frontend testing guidelines with MSW patterns ([2f90a32](https://github.com/ervwalter/trendweight/commit/2f90a32b2cd46058a2461b29273092aa5b0c8c9a))
* add mandatory route pattern guidelines to CLAUDE.md ([9f4b276](https://github.com/ervwalter/trendweight/commit/9f4b27602922e460d4fc8b7d6248968f7e9c1218))
* add testing guidelines for authentication handlers ([98b58d7](https://github.com/ervwalter/trendweight/commit/98b58d778b086b9ac3f33152edccbb8a1011f31f))
* add troubleshooting for permission errors ([5c78f96](https://github.com/ervwalter/trendweight/commit/5c78f964a9f10ecffdbe3f5b69ffd881e6a7add9))
* add UI component usage guidelines to CLAUDE.md and ARCHITECTURE.md ([e5ace77](https://github.com/ervwalter/trendweight/commit/e5ace772998a0887cf20c3e44b95d0131c0ef1e3))
* consolidate documentation to eliminate duplication ([d35e8c1](https://github.com/ervwalter/trendweight/commit/d35e8c1467148999c0abe6fc91f3ce3e5493fb98))
* consolidate testing documentation with MSW guidance ([c4094ce](https://github.com/ervwalter/trendweight/commit/c4094ce7e446a74b230f0a9ba4404ba1b8efe34c))
* Revise approach to start with frontend instead of API ([47c8cbc](https://github.com/ervwalter/trendweight/commit/47c8cbcadcbcddabeb392506067d53523a1470f9))
* show documentation changes in changelog ([0d95017](https://github.com/ervwalter/trendweight/commit/0d9501726c5d68cc2e63e773e20e40d4900ecb7e))
* simplify ARCHITECTURE.md and CLAUDE.md ([082a0f7](https://github.com/ervwalter/trendweight/commit/082a0f7dafe84fd16b048e36116bc29d8cd9d12c))
* update ARCHITECTURE.md with new measurement sync architecture ([bf9bb67](https://github.com/ervwalter/trendweight/commit/bf9bb679438cdfd8caf8b5c0b7b0c87dc4d67b9d))
* update CLAUDE.md with timestamp handling and auto-update rule ([486c352](https://github.com/ervwalter/trendweight/commit/486c352f9d1bcf8937a21260d5e3aceaafa4f445))
* Update migration plan to reflect Phase 1 completion and learnings ([1ee605e](https://github.com/ervwalter/trendweight/commit/1ee605e103539ad5479e9138909fa50d29c6dbb4))
* Update migration plan with Phase 2 progress and auth approach ([1ae80c9](https://github.com/ervwalter/trendweight/commit/1ae80c916b6d0aa09b769ec993ca4ce42186a116))
* update project status to reflect completed data export feature ([993819c](https://github.com/ervwalter/trendweight/commit/993819c438de63463ef517daa23cd25f76a48616))
* update RELEASE.md with prerelease mode documentation ([ccfbc58](https://github.com/ervwalter/trendweight/commit/ccfbc58850c14d4b64d3b445a4b24d09c528e33f))
* update testing documentation ([ccba776](https://github.com/ervwalter/trendweight/commit/ccba776b6594add9398d934e0ff764a4daf5a5a9))
* update TESTING.md with current coverage stats ([1489412](https://github.com/ervwalter/trendweight/commit/14894128571bf7cabefe4fbe687e192e58a4cd11))
* Update to new migration plan with fresh architecture approach ([96fb6ab](https://github.com/ervwalter/trendweight/commit/96fb6abdb52a3c1b2e56bc88f297284d6dce2626))


### Code Refactoring

* clean up codebase and extract magic numbers to constants ([d35e8c1](https://github.com/ervwalter/trendweight/commit/d35e8c1467148999c0abe6fc91f3ce3e5493fb98))
* clean up unused code and type assertions ([082a0f7](https://github.com/ervwalter/trendweight/commit/082a0f7dafe84fd16b048e36116bc29d8cd9d12c))
* componentize build.tsx page into focused sections ([2bf208e](https://github.com/ervwalter/trendweight/commit/2bf208e37e90f01679dd1d4b214a26aa87ea9256))
* componentize login.tsx authentication sections ([2bf208e](https://github.com/ervwalter/trendweight/commit/2bf208e37e90f01679dd1d4b214a26aa87ea9256))
* consolidate configuration and improve service architecture ([082a0f7](https://github.com/ervwalter/trendweight/commit/082a0f7dafe84fd16b048e36116bc29d8cd9d12c))
* consolidate data refresh logic into MeasurementsController ([09b10f4](https://github.com/ervwalter/trendweight/commit/09b10f4c2dcd7a261395a18d776a82966e90b370))
* decompose complex measurements.ts into focused modules ([cc6039d](https://github.com/ervwalter/trendweight/commit/cc6039d65691df2b289a6d2d0194eb30720f60bc))
* enhance controller error handling consistency ([ccba776](https://github.com/ervwalter/trendweight/commit/ccba776b6594add9398d934e0ff764a4daf5a5a9))
* extract business logic from ProfileController to services ([2bf208e](https://github.com/ervwalter/trendweight/commit/2bf208e37e90f01679dd1d4b214a26aa87ea9256))
* extract chart option builders to separate modules ([cc6039d](https://github.com/ervwalter/trendweight/commit/cc6039d65691df2b289a6d2d0194eb30720f60bc))
* extract JWT validation logic into testable service ([98b58d7](https://github.com/ervwalter/trendweight/commit/98b58d778b086b9ac3f33152edccbb8a1011f31f))
* implement local date/time storage for measurements and restructure documentation ([c0e7a06](https://github.com/ervwalter/trendweight/commit/c0e7a069beb30947f343d94737a069aba0256485))
* implement minimal route pattern across all routes ([9f4b276](https://github.com/ervwalter/trendweight/commit/9f4b27602922e460d4fc8b7d6248968f7e9c1218))
* improve codebase maintainability and security ([cc6039d](https://github.com/ervwalter/trendweight/commit/cc6039d65691df2b289a6d2d0194eb30720f60bc))
* introduce MeasurementSyncService to eliminate circular dependencies ([bf9bb67](https://github.com/ervwalter/trendweight/commit/bf9bb679438cdfd8caf8b5c0b7b0c87dc4d67b9d))
* move config classes to Infrastructure/Configuration ([082a0f7](https://github.com/ervwalter/trendweight/commit/082a0f7dafe84fd16b048e36116bc29d8cd9d12c))
* redesign error boundary with professional UI ([cc6039d](https://github.com/ervwalter/trendweight/commit/cc6039d65691df2b289a6d2d0194eb30720f60bc))
* remove ResyncRequested flag and simplify sync logic ([bf9bb67](https://github.com/ervwalter/trendweight/commit/bf9bb679438cdfd8caf8b5c0b7b0c87dc4d67b9d))
* remove unnecessary CORS configuration ([d35e8c1](https://github.com/ervwalter/trendweight/commit/d35e8c1467148999c0abe6fc91f3ce3e5493fb98))
* remove unused code and interfaces ([d35e8c1](https://github.com/ervwalter/trendweight/commit/d35e8c1467148999c0abe6fc91f3ce3e5493fb98))
* Reorganize repository as monorepo ([f91c63b](https://github.com/ervwalter/trendweight/commit/f91c63b581623bc43232dce69a6fc723fd38e628))
* replace direct heading tags with Heading component ([c23b00c](https://github.com/ervwalter/trendweight/commit/c23b00c9f306a82536cc38bf5b5becf857892658))
* simplify footer version link to always use /build page ([9eecd60](https://github.com/ervwalter/trendweight/commit/9eecd6053bf3cbcceaae4ce04bf30e76b2a32c6b))
* standardize API response architecture ([ccba776](https://github.com/ervwalter/trendweight/commit/ccba776b6594add9398d934e0ff764a4daf5a5a9))
* standardize UI components across application ([e5ace77](https://github.com/ervwalter/trendweight/commit/e5ace772998a0887cf20c3e44b95d0131c0ef1e3))
* unify toggle button components and move to ui folder ([993819c](https://github.com/ervwalter/trendweight/commit/993819c438de63463ef517daa23cd25f76a48616))
* update TESTING.md documentation ([80dd5e4](https://github.com/ervwalter/trendweight/commit/80dd5e4b60b416c3c5f4618e21a2940467b60cb2))


### Tests

* add comprehensive backend test coverage and fix critical data sync bug ([80dd5e4](https://github.com/ervwalter/trendweight/commit/80dd5e4b60b416c3c5f4618e21a2940467b60cb2))
* add comprehensive backend tests for providers and authentication ([98b58d7](https://github.com/ervwalter/trendweight/commit/98b58d778b086b9ac3f33152edccbb8a1011f31f))
* add comprehensive controller test suites ([ccba776](https://github.com/ervwalter/trendweight/commit/ccba776b6594add9398d934e0ff764a4daf5a5a9))
* Add comprehensive E2E tests and fix test configurations ([ae95a81](https://github.com/ervwalter/trendweight/commit/ae95a81690e5d61d999c585985496eb806858fb0))
* add comprehensive frontend test coverage ([e65815d](https://github.com/ervwalter/trendweight/commit/e65815dd279ecb1d0d9bdd0fd6e21cc6d0c056ff))
* add comprehensive test coverage for frontend ([c4094ce](https://github.com/ervwalter/trendweight/commit/c4094ce7e446a74b230f0a9ba4404ba1b8efe34c))
* add comprehensive test coverage for frontend ([2f90a32](https://github.com/ervwalter/trendweight/commit/2f90a32b2cd46058a2461b29273092aa5b0c8c9a))
* add comprehensive testing infrastructure for frontend and backend ([8939bb1](https://github.com/ervwalter/trendweight/commit/8939bb1ddc3a0baf122d7abc5401ff73992aadb1))
* add comprehensive tests for data sync merging logic ([1489412](https://github.com/ervwalter/trendweight/commit/14894128571bf7cabefe4fbe687e192e58a4cd11))
* Add comprehensive unit and integration tests ([992c7aa](https://github.com/ervwalter/trendweight/commit/992c7aaa87dc758a880fdef7651c64b079afd60d))
* add comprehensive unit tests for all backend controllers ([ccba776](https://github.com/ervwalter/trendweight/commit/ccba776b6594add9398d934e0ff764a4daf5a5a9))
* add critical data merging scenarios ([80dd5e4](https://github.com/ervwalter/trendweight/commit/80dd5e4b60b416c3c5f4618e21a2940467b60cb2))
* Fix failing unit tests ([f98cc8b](https://github.com/ervwalter/trendweight/commit/f98cc8b2708579d5429b54e8014d5455f891cee5))
* mock supabase client to fix CI test failures ([0d9c66f](https://github.com/ervwalter/trendweight/commit/0d9c66f41508053828c7f74f35a9c3123479775f))
* Set up Jest configuration and initial unit tests ([6b7069a](https://github.com/ervwalter/trendweight/commit/6b7069a12654e14a2f4ce4db2615263882a8a5a0))
* Set up Playwright for E2E testing ([b35a9e2](https://github.com/ervwalter/trendweight/commit/b35a9e2bafffadeadfc8e353aa93a40ad1bb403e))


### Dependencies

* update dependency fluentassertions to v8 ([f90e003](https://github.com/ervwalter/trendweight/commit/f90e003d3ab6e905ff494111c3a8d15837162929))
* update dependency fluentassertions to v8 ([#256](https://github.com/ervwalter/trendweight/issues/256)) ([f90e003](https://github.com/ervwalter/trendweight/commit/f90e003d3ab6e905ff494111c3a8d15837162929))
* update dependency typescript-eslint to v8.38.0 ([#258](https://github.com/ervwalter/trendweight/issues/258)) ([0e9f250](https://github.com/ervwalter/trendweight/commit/0e9f250a10ee51f5f981ab15ecc587394bfc1ac2))
* update dependency xunit.runner.visualstudio to v3 ([#257](https://github.com/ervwalter/trendweight/issues/257)) ([4082c44](https://github.com/ervwalter/trendweight/commit/4082c447643a31280c9bc8ee06904c1293097040))
* update npm dependencies ([be20f27](https://github.com/ervwalter/trendweight/commit/be20f2788e4ebef0fa1b033d65da7c75838f645b))
* update npm dependencies ([#253](https://github.com/ervwalter/trendweight/issues/253)) ([e91a607](https://github.com/ervwalter/trendweight/commit/e91a6077a433a78bba097fdc8588bcc298844c4c))
* update nuget dependencies ([#255](https://github.com/ervwalter/trendweight/issues/255)) ([19fbbe0](https://github.com/ervwalter/trendweight/commit/19fbbe038bae035d05cbecfa75b91e74c0c5fd2b))

## [2.0.0-alpha.7](https://github.com/ervwalter/trendweight/compare/v2.0.0-alpha.6...v2.0.0-alpha.7) (2025-07-21)


### ⚠ BREAKING CHANGES

* SourceDataService methods SetResyncRequestedAsync and IsResyncRequestedAsync have been removed. Any code depending on these methods must be updated.
* Removed /api/data/refresh endpoints. Data refresh now happens automatically when fetching measurements via GET /api/measurements.

### Features

* add API rate limiting for authenticated users ([cc6039d](https://github.com/ervwalter/trendweight/commit/cc6039d65691df2b289a6d2d0194eb30720f60bc))
* add comprehensive test coverage for measurement sync services ([80dd5e4](https://github.com/ervwalter/trendweight/commit/80dd5e4b60b416c3c5f4618e21a2940467b60cb2))
* add JWT clock skew tolerance ([082a0f7](https://github.com/ervwalter/trendweight/commit/082a0f7dafe84fd16b048e36116bc29d8cd9d12c))
* add unified AppOptions configuration class ([082a0f7](https://github.com/ervwalter/trendweight/commit/082a0f7dafe84fd16b048e36116bc29d8cd9d12c))
* enhance error handling with correlation IDs and error codes ([cc6039d](https://github.com/ervwalter/trendweight/commit/cc6039d65691df2b289a6d2d0194eb30720f60bc))


### Bug Fixes

* cache JsonSerializerOptions to resolve CA1869 warning ([2bf208e](https://github.com/ervwalter/trendweight/commit/2bf208e37e90f01679dd1d4b214a26aa87ea9256))
* correct data sync business logic in SourceDataService ([80dd5e4](https://github.com/ervwalter/trendweight/commit/80dd5e4b60b416c3c5f4618e21a2940467b60cb2))
* correct PrimaryKey attribute syntax in DbProfile model ([cc6039d](https://github.com/ervwalter/trendweight/commit/cc6039d65691df2b289a6d2d0194eb30720f60bc))
* implement incremental sync for provider data refreshes ([bf9bb67](https://github.com/ervwalter/trendweight/commit/bf9bb679438cdfd8caf8b5c0b7b0c87dc4d67b9d))
* improve SupabaseService error handling ([082a0f7](https://github.com/ervwalter/trendweight/commit/082a0f7dafe84fd16b048e36116bc29d8cd9d12c))
* remove default HTTPS port from authorization URLs ([98b58d7](https://github.com/ervwalter/trendweight/commit/98b58d778b086b9ac3f33152edccbb8a1011f31f))
* remove hardcoded API key from client.ts ([082a0f7](https://github.com/ervwalter/trendweight/commit/082a0f7dafe84fd16b048e36116bc29d8cd9d12c))
* resolve circular dependency causing API hang ([09b10f4](https://github.com/ervwalter/trendweight/commit/09b10f4c2dcd7a261395a18d776a82966e90b370))
* resolve Docker build issue and ESLint warnings ([cbe56e3](https://github.com/ervwalter/trendweight/commit/cbe56e388a29e8c26e9a996ccea7f57004f2ff61))
* resolve test framework CI/CD issues ([2c6c5a5](https://github.com/ervwalter/trendweight/commit/2c6c5a591354f071549b0a580d92c7345a9af17d))
* restore PrimaryKey attribute parameters in DbProfile model ([12bbe75](https://github.com/ervwalter/trendweight/commit/12bbe75d0457bf86d3dd6706baa73a8c943fae49))
* run Docker container as non-root user for security ([cc6039d](https://github.com/ervwalter/trendweight/commit/cc6039d65691df2b289a6d2d0194eb30720f60bc))
* simplify provider service registration in DI container ([2bf208e](https://github.com/ervwalter/trendweight/commit/2bf208e37e90f01679dd1d4b214a26aa87ea9256))
* update CLAUDE.md with testing instructions ([1489412](https://github.com/ervwalter/trendweight/commit/14894128571bf7cabefe4fbe687e192e58a4cd11))
* update tests for fluentassertions v8 compatibility ([f90e003](https://github.com/ervwalter/trendweight/commit/f90e003d3ab6e905ff494111c3a8d15837162929))
* update tests to use IServiceProvider ([09b10f4](https://github.com/ervwalter/trendweight/commit/09b10f4c2dcd7a261395a18d776a82966e90b370))
* use proper Link components for internal navigation ([cc6039d](https://github.com/ervwalter/trendweight/commit/cc6039d65691df2b289a6d2d0194eb30720f60bc))


### Documentation

* add testing guidelines for authentication handlers ([98b58d7](https://github.com/ervwalter/trendweight/commit/98b58d778b086b9ac3f33152edccbb8a1011f31f))
* consolidate documentation to eliminate duplication ([d35e8c1](https://github.com/ervwalter/trendweight/commit/d35e8c1467148999c0abe6fc91f3ce3e5493fb98))
* simplify ARCHITECTURE.md and CLAUDE.md ([082a0f7](https://github.com/ervwalter/trendweight/commit/082a0f7dafe84fd16b048e36116bc29d8cd9d12c))
* update ARCHITECTURE.md with new measurement sync architecture ([bf9bb67](https://github.com/ervwalter/trendweight/commit/bf9bb679438cdfd8caf8b5c0b7b0c87dc4d67b9d))
* update testing documentation ([ccba776](https://github.com/ervwalter/trendweight/commit/ccba776b6594add9398d934e0ff764a4daf5a5a9))
* update TESTING.md with current coverage stats ([1489412](https://github.com/ervwalter/trendweight/commit/14894128571bf7cabefe4fbe687e192e58a4cd11))


### Code Refactoring

* clean up codebase and extract magic numbers to constants ([d35e8c1](https://github.com/ervwalter/trendweight/commit/d35e8c1467148999c0abe6fc91f3ce3e5493fb98))
* clean up unused code and type assertions ([082a0f7](https://github.com/ervwalter/trendweight/commit/082a0f7dafe84fd16b048e36116bc29d8cd9d12c))
* componentize build.tsx page into focused sections ([2bf208e](https://github.com/ervwalter/trendweight/commit/2bf208e37e90f01679dd1d4b214a26aa87ea9256))
* componentize login.tsx authentication sections ([2bf208e](https://github.com/ervwalter/trendweight/commit/2bf208e37e90f01679dd1d4b214a26aa87ea9256))
* consolidate configuration and improve service architecture ([082a0f7](https://github.com/ervwalter/trendweight/commit/082a0f7dafe84fd16b048e36116bc29d8cd9d12c))
* consolidate data refresh logic into MeasurementsController ([09b10f4](https://github.com/ervwalter/trendweight/commit/09b10f4c2dcd7a261395a18d776a82966e90b370))
* decompose complex measurements.ts into focused modules ([cc6039d](https://github.com/ervwalter/trendweight/commit/cc6039d65691df2b289a6d2d0194eb30720f60bc))
* enhance controller error handling consistency ([ccba776](https://github.com/ervwalter/trendweight/commit/ccba776b6594add9398d934e0ff764a4daf5a5a9))
* extract business logic from ProfileController to services ([2bf208e](https://github.com/ervwalter/trendweight/commit/2bf208e37e90f01679dd1d4b214a26aa87ea9256))
* extract chart option builders to separate modules ([cc6039d](https://github.com/ervwalter/trendweight/commit/cc6039d65691df2b289a6d2d0194eb30720f60bc))
* extract JWT validation logic into testable service ([98b58d7](https://github.com/ervwalter/trendweight/commit/98b58d778b086b9ac3f33152edccbb8a1011f31f))
* improve codebase maintainability and security ([cc6039d](https://github.com/ervwalter/trendweight/commit/cc6039d65691df2b289a6d2d0194eb30720f60bc))
* introduce MeasurementSyncService to eliminate circular dependencies ([bf9bb67](https://github.com/ervwalter/trendweight/commit/bf9bb679438cdfd8caf8b5c0b7b0c87dc4d67b9d))
* move config classes to Infrastructure/Configuration ([082a0f7](https://github.com/ervwalter/trendweight/commit/082a0f7dafe84fd16b048e36116bc29d8cd9d12c))
* redesign error boundary with professional UI ([cc6039d](https://github.com/ervwalter/trendweight/commit/cc6039d65691df2b289a6d2d0194eb30720f60bc))
* remove ResyncRequested flag and simplify sync logic ([bf9bb67](https://github.com/ervwalter/trendweight/commit/bf9bb679438cdfd8caf8b5c0b7b0c87dc4d67b9d))
* remove unnecessary CORS configuration ([d35e8c1](https://github.com/ervwalter/trendweight/commit/d35e8c1467148999c0abe6fc91f3ce3e5493fb98))
* remove unused code and interfaces ([d35e8c1](https://github.com/ervwalter/trendweight/commit/d35e8c1467148999c0abe6fc91f3ce3e5493fb98))
* standardize API response architecture ([ccba776](https://github.com/ervwalter/trendweight/commit/ccba776b6594add9398d934e0ff764a4daf5a5a9))
* update TESTING.md documentation ([80dd5e4](https://github.com/ervwalter/trendweight/commit/80dd5e4b60b416c3c5f4618e21a2940467b60cb2))


### Tests

* add comprehensive backend test coverage and fix critical data sync bug ([80dd5e4](https://github.com/ervwalter/trendweight/commit/80dd5e4b60b416c3c5f4618e21a2940467b60cb2))
* add comprehensive backend tests for providers and authentication ([98b58d7](https://github.com/ervwalter/trendweight/commit/98b58d778b086b9ac3f33152edccbb8a1011f31f))
* add comprehensive controller test suites ([ccba776](https://github.com/ervwalter/trendweight/commit/ccba776b6594add9398d934e0ff764a4daf5a5a9))
* add comprehensive testing infrastructure for frontend and backend ([8939bb1](https://github.com/ervwalter/trendweight/commit/8939bb1ddc3a0baf122d7abc5401ff73992aadb1))
* add comprehensive tests for data sync merging logic ([1489412](https://github.com/ervwalter/trendweight/commit/14894128571bf7cabefe4fbe687e192e58a4cd11))
* add comprehensive unit tests for all backend controllers ([ccba776](https://github.com/ervwalter/trendweight/commit/ccba776b6594add9398d934e0ff764a4daf5a5a9))
* add critical data merging scenarios ([80dd5e4](https://github.com/ervwalter/trendweight/commit/80dd5e4b60b416c3c5f4618e21a2940467b60cb2))


### Dependencies

* update dependency fluentassertions to v8 ([f90e003](https://github.com/ervwalter/trendweight/commit/f90e003d3ab6e905ff494111c3a8d15837162929))
* update dependency fluentassertions to v8 ([#256](https://github.com/ervwalter/trendweight/issues/256)) ([f90e003](https://github.com/ervwalter/trendweight/commit/f90e003d3ab6e905ff494111c3a8d15837162929))
* update dependency xunit.runner.visualstudio to v3 ([#257](https://github.com/ervwalter/trendweight/issues/257)) ([4082c44](https://github.com/ervwalter/trendweight/commit/4082c447643a31280c9bc8ee06904c1293097040))
* update npm dependencies ([#253](https://github.com/ervwalter/trendweight/issues/253)) ([e91a607](https://github.com/ervwalter/trendweight/commit/e91a6077a433a78bba097fdc8588bcc298844c4c))
* update nuget dependencies ([#255](https://github.com/ervwalter/trendweight/issues/255)) ([19fbbe0](https://github.com/ervwalter/trendweight/commit/19fbbe038bae035d05cbecfa75b91e74c0c5fd2b))

## [2.0.0-alpha.6](https://github.com/ervwalter/trendweight/compare/v2.0.0-alpha.5...v2.0.0-alpha.6) (2025-07-18)


### Features

* add Cloudflare Turnstile CAPTCHA to authentication ([9f6c6ae](https://github.com/ervwalter/trendweight/commit/9f6c6ae58683f8dd22a57755dde2d2cccacc9450))
* add download page for viewing and exporting scale readings ([993819c](https://github.com/ervwalter/trendweight/commit/993819c438de63463ef517daa23cd25f76a48616))
* implement complete account deletion functionality ([1f14a10](https://github.com/ervwalter/trendweight/commit/1f14a104c87bb22693c9b447cc190093a6aee59c))
* implement interactive explore mode for dashboard charts ([dcb7c31](https://github.com/ervwalter/trendweight/commit/dcb7c317ed0b63a8555d2e2639550607c126d6cd))
* implement legacy user migration from classic TrendWeight ([22b77f5](https://github.com/ervwalter/trendweight/commit/22b77f57b86c356f2f4c2b4f828fe2040984207f))
* implement secure dashboard sharing functionality ([7d30057](https://github.com/ervwalter/trendweight/commit/7d30057c2b3db6816ad283259a16048399497b7d))


### Bug Fixes

* improve OAuth callback error handling and make token exchange idempotent ([fd61711](https://github.com/ervwalter/trendweight/commit/fd61711aecc478772923b5d0304ac268897caa98))


### Documentation

* update project status to reflect completed data export feature ([993819c](https://github.com/ervwalter/trendweight/commit/993819c438de63463ef517daa23cd25f76a48616))


### Code Refactoring

* simplify footer version link to always use /build page ([9eecd60](https://github.com/ervwalter/trendweight/commit/9eecd6053bf3cbcceaae4ce04bf30e76b2a32c6b))
* unify toggle button components and move to ui folder ([993819c](https://github.com/ervwalter/trendweight/commit/993819c438de63463ef517daa23cd25f76a48616))

## [2.0.0-alpha.5](https://github.com/ervwalter/trendweight/compare/v2.0.0-alpha.4...v2.0.0-alpha.5) (2025-07-15)


### Features

* create Button component with multiple variants and sizes ([e5ace77](https://github.com/ervwalter/trendweight/commit/e5ace772998a0887cf20c3e44b95d0131c0ef1e3))
* enhance build page with support tools and changelog display ([55b491d](https://github.com/ervwalter/trendweight/commit/55b491d824493d583a90ac6347d41183b024e5ba))
* implement shared dashboard URLs with third-person view ([2e40281](https://github.com/ervwalter/trendweight/commit/2e40281a2753306a8b31ce9bf4d093476547ae6e))
* improve dashboard UI and chart display ([512e6aa](https://github.com/ervwalter/trendweight/commit/512e6aae73727cb42730f9389d6becccbef6c8d3))


### Bug Fixes

* remove unused isAuthError variable in ProviderSyncError ([e5ace77](https://github.com/ervwalter/trendweight/commit/e5ace772998a0887cf20c3e44b95d0131c0ef1e3))


### Documentation

* add UI component usage guidelines to CLAUDE.md and ARCHITECTURE.md ([e5ace77](https://github.com/ervwalter/trendweight/commit/e5ace772998a0887cf20c3e44b95d0131c0ef1e3))


### Code Refactoring

* replace direct heading tags with Heading component ([c23b00c](https://github.com/ervwalter/trendweight/commit/c23b00c9f306a82536cc38bf5b5becf857892658))
* standardize UI components across application ([e5ace77](https://github.com/ervwalter/trendweight/commit/e5ace772998a0887cf20c3e44b95d0131c0ef1e3))


### Dependencies

* update npm dependencies ([be20f27](https://github.com/ervwalter/trendweight/commit/be20f2788e4ebef0fa1b033d65da7c75838f645b))

## [2.0.0-alpha.4](https://github.com/ervwalter/trendweight/compare/v2.0.0-alpha.3...v2.0.0-alpha.4) (2025-07-14)


### Bug Fixes

* **ci:** require PAT for Release Please to trigger tag workflows ([9cd9bd7](https://github.com/ervwalter/trendweight/commit/9cd9bd704435c3b9fb7ecdeada2b505d55b526ec))

## [2.0.0-alpha.3](https://github.com/ervwalter/trendweight/compare/v2.0.0-alpha.2...v2.0.0-alpha.3) (2025-07-14)


### Bug Fixes

* **ci:** enable Docker push for tagged releases ([20740d3](https://github.com/ervwalter/trendweight/commit/20740d305a2d74f9b5b1af2b001f5aa3a719e1c5))
* push Docker images when building from release tags ([f98aa5a](https://github.com/ervwalter/trendweight/commit/f98aa5aa88b2c32309b8cf58ea988dcff17d65ec))

## [2.0.0-alpha.2](https://github.com/ervwalter/trendweight/compare/v2.0.0-alpha.1...v2.0.0-alpha.2) (2025-07-14)


### Features

* add dashboard help link and improve math explanation ([778b29f](https://github.com/ervwalter/trendweight/commit/778b29f6ffade88bb9d0705e803d23d780b038ed))
* add demo mode with sample data for dashboard ([1c9eccd](https://github.com/ervwalter/trendweight/commit/1c9eccd0ef1d6ea75e319fec3b698f612411a3b9))
* add GitHub Sponsors integration ([ff14486](https://github.com/ervwalter/trendweight/commit/ff14486dc1a64a0dd7d57f6115e115e344716ea1))
* add initial setup flow with profile creation ([0894dc0](https://github.com/ervwalter/trendweight/commit/0894dc06cc44d89ab21299fd63defeecca41cee5))
* add math explanation page with interactive table of contents ([f9b16d4](https://github.com/ervwalter/trendweight/commit/f9b16d454b50fc4f89700846d6cf7803afdfd3ea))
* add OAuth error handling with dashboard recovery UI ([4efa442](https://github.com/ervwalter/trendweight/commit/4efa44205716d69f5966a55146e6f557fa69ea06))
* add Plausible analytics tracking ([159c96d](https://github.com/ervwalter/trendweight/commit/159c96ddecf538d709ab44f7015c7c31523f7136))
* add PWA support for iOS Add to Home Screen ([59b0863](https://github.com/ervwalter/trendweight/commit/59b086372e92e759d97cf1b7478d26302881fed4))
* improve login flow and mobile chart display ([f621620](https://github.com/ervwalter/trendweight/commit/f6216209084d13cd581ece632693f4d665c461de))


### Bug Fixes

* add prerelease versioning strategy ([5c78f96](https://github.com/ervwalter/trendweight/commit/5c78f964a9f10ecffdbe3f5b69ffd881e6a7add9))
* **ci:** update to non-deprecated googleapis/release-please-action ([5c78f96](https://github.com/ervwalter/trendweight/commit/5c78f964a9f10ecffdbe3f5b69ffd881e6a7add9))
* configure Release Please for proper alpha versioning ([5c78f96](https://github.com/ervwalter/trendweight/commit/5c78f964a9f10ecffdbe3f5b69ffd881e6a7add9))
* move changelog-sections to root level for proper scope filtering ([3b160dc](https://github.com/ervwalter/trendweight/commit/3b160dc1b07ae9f136d1a5983e8b5a07775489fb))
* OAuth redirect to auth/verify for proper verification ([da254af](https://github.com/ervwalter/trendweight/commit/da254af4fc363e724425674cc5c29844efa07f42))
* remove bootstrap-sha that was causing all commits to be included ([5c78f96](https://github.com/ervwalter/trendweight/commit/5c78f964a9f10ecffdbe3f5b69ffd881e6a7add9))
* remove component prefix to match existing tag format ([0d95017](https://github.com/ervwalter/trendweight/commit/0d9501726c5d68cc2e63e773e20e40d4900ecb7e))
* remove unused timezone field and add settings help text ([5b0b41d](https://github.com/ervwalter/trendweight/commit/5b0b41d5c9700c18931f6558dcdc610e16b3c384))
* resolve code analysis warnings from enhanced .NET checks ([e88e241](https://github.com/ervwalter/trendweight/commit/e88e241b07735fba17a181b76624097b5bc90fc3))
* resolve linter warnings and improve code quality ([d235801](https://github.com/ervwalter/trendweight/commit/d2358010eb492f7fe3183d8003bdc61a860a3259))
* resolve OAuth token expiration timezone issues ([d660ccb](https://github.com/ervwalter/trendweight/commit/d660ccbc88c9dab05988a92b97e9f7b4d0d11ce7))
* update Dockerfile for npm workspaces compatibility ([f8d343b](https://github.com/ervwalter/trendweight/commit/f8d343be8ba40ec26d60c32cccf69a35aa1c3eb4))


### Documentation

* add troubleshooting for permission errors ([5c78f96](https://github.com/ervwalter/trendweight/commit/5c78f964a9f10ecffdbe3f5b69ffd881e6a7add9))
* show documentation changes in changelog ([0d95017](https://github.com/ervwalter/trendweight/commit/0d9501726c5d68cc2e63e773e20e40d4900ecb7e))

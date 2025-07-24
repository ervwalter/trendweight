# Changelog

## [2.1.7](https://github.com/ervwalter/trendweight/compare/v2.1.6...v2.1.7) (2025-07-24)


### Fixes

* Fix architecture link ([#271](https://github.com/ervwalter/trendweight/issues/271)) ([344341e](https://github.com/ervwalter/trendweight/commit/344341eb1cf343619f07f83e114c0f4accaa10ce))
* simplify auth verification flow to prevent race conditions ([8359ea2](https://github.com/ervwalter/trendweight/commit/8359ea2a5deb3cc7cbb002443130a4cd08e823b9))
* update ShowCalories to true for legacy profile migration ([adf0aa8](https://github.com/ervwalter/trendweight/commit/adf0aa87ddd845541e4950c027b68cbd153751f4))
* **withings:** detect invalid refresh token errors with status 503 ([2957189](https://github.com/ervwalter/trendweight/commit/2957189a5ce8d9241bb0afcaa48b957801c31178))


### Tests

* add test case for 503 invalid refresh token error ([2957189](https://github.com/ervwalter/trendweight/commit/2957189a5ce8d9241bb0afcaa48b957801c31178))

## [2.1.6](https://github.com/ervwalter/trendweight/compare/v2.1.5...v2.1.6) (2025-07-23)


### Fixes

* update PWA start_url to point to dashboard ([ab95320](https://github.com/ervwalter/trendweight/commit/ab95320a7a75731d1bdfa944660340125a085fe6))

## [2.1.5](https://github.com/ervwalter/trendweight/compare/v2.1.4...v2.1.5) (2025-07-23)


### Dependencies

* update domain in script tag for production environment ([cd72ea2](https://github.com/ervwalter/trendweight/commit/cd72ea254b379c44a1090380b080cf77bfcdf96e))

## [2.1.4](https://github.com/ervwalter/trendweight/compare/v2.1.3...v2.1.4) (2025-07-23)


### Fixes

* improve error handling across the application ([187fb7c](https://github.com/ervwalter/trendweight/commit/187fb7c4bd010fe72b74d0ade65d781ff7400b36))
* **TipJar:** adjust iframe dimensions for better display ([abf6858](https://github.com/ervwalter/trendweight/commit/abf6858601b72aef63cb67202022e3093d8cddd0))


### Performance Improvements

* optimize static asset caching and build process ([9a7854e](https://github.com/ervwalter/trendweight/commit/9a7854e652effb910fdb25ba3acfb2f3c534add2))


### Documentation

* update contributing text ([1f9d27d](https://github.com/ervwalter/trendweight/commit/1f9d27d091ded43bbf80fc90fd9bd3f9896e110e))
* update testing documentation with console suppression guidance ([187fb7c](https://github.com/ervwalter/trendweight/commit/187fb7c4bd010fe72b74d0ade65d781ff7400b36))


### Refactoring

* consolidate error display logic into ErrorUI component ([187fb7c](https://github.com/ervwalter/trendweight/commit/187fb7c4bd010fe72b74d0ade65d781ff7400b36))


### Tests

* improve test reliability with proper console mocking ([187fb7c](https://github.com/ervwalter/trendweight/commit/187fb7c4bd010fe72b74d0ade65d781ff7400b36))


### Dependencies

* update dependency @supabase/supabase-js to v2.52.1 ([#267](https://github.com/ervwalter/trendweight/issues/267)) ([5ea8028](https://github.com/ervwalter/trendweight/commit/5ea802895a194a6a73c1fc0ab184f657c9133a70))

## [2.1.3](https://github.com/ervwalter/trendweight/compare/v2.1.2...v2.1.3) (2025-07-23)


### Fixes

* prevent font loading flicker for logo text ([077de97](https://github.com/ervwalter/trendweight/commit/077de97da5aca7b83997a9fad391bf0b374a6f5a))


### Documentation

* add database schema export for Supabase ([df369e5](https://github.com/ervwalter/trendweight/commit/df369e5278b3b2776d32a685a95a61a44def43fa))


### Dependencies

* update npm dependencies to v1.129.8 ([#265](https://github.com/ervwalter/trendweight/issues/265)) ([37d1f02](https://github.com/ervwalter/trendweight/commit/37d1f021c91c58e35ff4c4529e1ae4037f1d74a9))

## [2.1.2](https://github.com/ervwalter/trendweight/compare/v2.1.1...v2.1.2) (2025-07-23)


### Fixes

* improve auth validation and error handling ([77be07a](https://github.com/ervwalter/trendweight/commit/77be07a3ecb9f6ce5f4100a918f4501bb7abd45d))
* improve migration page messaging ([77be07a](https://github.com/ervwalter/trendweight/commit/77be07a3ecb9f6ce5f4100a918f4501bb7abd45d))
* remove flaky retry logic from OAuth callbacks ([77be07a](https://github.com/ervwalter/trendweight/commit/77be07a3ecb9f6ce5f4100a918f4501bb7abd45d))
* show provider sync errors when no measurement data exists ([db492e0](https://github.com/ervwalter/trendweight/commit/db492e045c9bdec8ee836d39941baecce700a9be))
* simplify account deletion with CASCADE DELETE ([77be07a](https://github.com/ervwalter/trendweight/commit/77be07a3ecb9f6ce5f4100a918f4501bb7abd45d))
* validate sessions on frontend startup ([77be07a](https://github.com/ervwalter/trendweight/commit/77be07a3ecb9f6ce5f4100a918f4501bb7abd45d))

## [2.1.1](https://github.com/ervwalter/trendweight/compare/v2.1.0...v2.1.1) (2025-07-23)


### Fixes

* remove Layout wrapper from OAuthCallbackUI component ([7004760](https://github.com/ervwalter/trendweight/commit/70047604bcfc0e459e4d69f29547853e32a7e335))
* switch Docker runtime from Alpine to Debian for SQL Server support ([7004760](https://github.com/ervwalter/trendweight/commit/70047604bcfc0e459e4d69f29547853e32a7e335))

## [2.1.0](https://github.com/ervwalter/trendweight/compare/v2.0.0...v2.1.0) (2025-07-23)


### Features

* add new version notice for migrated users ([ad17a1e](https://github.com/ervwalter/trendweight/commit/ad17a1e5fb590f27fdc6ba2c475f9caf1db21c73))
* **api:** add legacy chart URL redirect handler ([831a620](https://github.com/ervwalter/trendweight/commit/831a620629e0521651bd284c7507444b302335e9))


### Fixes

* extract useCompleteMigration hook for better testability ([990e493](https://github.com/ervwalter/trendweight/commit/990e493a894dc6271e461562892fa027c092078d))
* prevent information leakage in sharing code validation ([b6d60c8](https://github.com/ervwalter/trendweight/commit/b6d60c8f7b7af330de4e15be3dd514624cbe78d9))
* update site links and improve responsive UI elements ([831a620](https://github.com/ervwalter/trendweight/commit/831a620629e0521651bd284c7507444b302335e9))


### Documentation

* simplify development workflow instructions ([3991048](https://github.com/ervwalter/trendweight/commit/39910488165691c2575c784aa7229cb6cc73e0f7))
* update markdown file path references to docs folder ([47d1014](https://github.com/ervwalter/trendweight/commit/47d1014dd93764f5c74dd3f112669649bc24d628))
* update release documentation to focus on current state ([b8a030d](https://github.com/ervwalter/trendweight/commit/b8a030d5799c181f17aa558da8c2686388873d14))


### Refactoring

* complete migration of static assets to public root ([0bd368b](https://github.com/ervwalter/trendweight/commit/0bd368b2dd0bbcf7afb483170108af101a3289aa))
* create ExternalLink component for consistent external URLs ([ad17a1e](https://github.com/ervwalter/trendweight/commit/ad17a1e5fb590f27fdc6ba2c475f9caf1db21c73))
* implement self-hosted analytics proxy ([3991048](https://github.com/ervwalter/trendweight/commit/39910488165691c2575c784aa7229cb6cc73e0f7))
* reorganize documentation files ([3991048](https://github.com/ervwalter/trendweight/commit/39910488165691c2575c784aa7229cb6cc73e0f7))
* reorganize public assets structure ([831a620](https://github.com/ervwalter/trendweight/commit/831a620629e0521651bd284c7507444b302335e9))
* simplify frontend interfaces by consolidating ProfileData ([6fd74c1](https://github.com/ervwalter/trendweight/commit/6fd74c10b2056bdca18acbb6ac3515b42d4055d8))


### Tests

* add comprehensive frontend test coverage ([990e493](https://github.com/ervwalter/trendweight/commit/990e493a894dc6271e461562892fa027c092078d))
* fix React act warnings and suppress expected console errors ([f172d36](https://github.com/ervwalter/trendweight/commit/f172d360558e0d9587b5ca10fe2931d0323c1eab))


### Dependencies

* update npm dependencies to v1.129.7 ([#260](https://github.com/ervwalter/trendweight/issues/260)) ([4f7b872](https://github.com/ervwalter/trendweight/commit/4f7b872f61ca20a272bee1af68e415463e6b4b54))

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

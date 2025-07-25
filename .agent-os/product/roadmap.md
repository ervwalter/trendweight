# Product Roadmap

> Last Updated: 2025-01-24
> Version: 1.0.0
> Status: Active Development

## Phase 0: Already Completed

The following features have been implemented:

- [x] Core weight trend calculation with exponentially weighted moving averages
- [x] Withings smart scale integration with OAuth
- [x] Fitbit smart scale integration with OAuth
- [x] User authentication with Supabase Auth (email, Google, Microsoft, Apple)
- [x] Responsive dashboard with weight trend charts
- [x] Public profile sharing with custom URLs
- [x] Goal setting and progress tracking
- [x] Metric and imperial unit support
- [x] Data export functionality
- [x] FAQ and help documentation
- [x] Privacy policy compliance
- [x] Demo mode with sample data
- [x] Basic legacy user migration support
- [x] PWA manifest for mobile installation
- [x] Comprehensive test coverage

## Phase 1: Enhanced Legacy Support (Current)

**Goal:** Improve migration experience for users from classic TrendWeight
**Success Criteria:** 90% of legacy users successfully migrated with historical data

### Must-Have Features

- [ ] Legacy data provider - Import historical measurements from old SQL Server `M`
- [ ] Enhanced migration wizard - Better UX for account linking `S`
- [ ] Data validation - Ensure imported data integrity `S`

### Should-Have Features

- [ ] Migration status dashboard - Show progress of data import `S`
- [ ] Rollback capability - Allow users to undo migration if needed `M`

### Dependencies

- Access to legacy SQL Server database
- User consent for data migration

## Phase 2: User Experience Improvements (Next)

**Goal:** Enhance the user experience based on feedback
**Success Criteria:** Reduced support tickets, improved user satisfaction

### Must-Have Features

- [ ] Hide data before start date - New setting to filter old measurements `S`
- [ ] Better loading indicators - Replace skeleton with progress for long syncs `M`
- [ ] Sync status details - Show which provider is syncing and progress `S`
- [ ] Error recovery - Better handling of sync failures with retry options `M`

### Should-Have Features

- [ ] Batch operations - Select multiple measurements to hide/delete `M`
- [ ] Sync scheduling - Allow users to control when syncs happen `L`

### Dependencies

- User feedback on current pain points

## Phase 3: Data Analysis Features

**Goal:** Provide deeper insights into weight trends
**Success Criteria:** Users report better understanding of their progress

### Must-Have Features

- [ ] Trend predictions - Show projected weight based on current trend `L`
- [ ] Pattern detection - Identify weekly/monthly patterns `L`
- [ ] Milestone notifications - Alert when goals are reached `M`
- [ ] Advanced statistics - More detailed analysis options `M`

### Should-Have Features

- [ ] Custom date ranges - Analyze specific time periods `S`
- [ ] Comparison views - Compare different time periods side-by-side `M`
- [ ] Export improvements - More format options (JSON, etc.) `S`

### Dependencies

- Sufficient historical data for meaningful analysis

## Phase 4: Platform Expansion

**Goal:** Support more devices and integrations
**Success Criteria:** Increased user base from new platforms

### Must-Have Features

- [ ] Apple Health integration - Sync weight from iOS devices `XL`
- [ ] Google Fit integration - Sync weight from Android devices `XL`
- [ ] Garmin scale support - Add another popular scale brand `L`
- [ ] Mobile app - Native iOS/Android apps `XL`

### Should-Have Features

- [ ] Webhook API - Allow other apps to push data `L`
- [ ] IFTTT integration - Automation support `M`
- [ ] Shortcuts support - iOS/Android quick actions `M`

### Dependencies

- API rate limits and partnership agreements
- Mobile development resources

## Phase 5: Premium Features

**Goal:** Sustainable monetization through optional premium tier
**Success Criteria:** 5% conversion to premium

### Must-Have Features

- [ ] Advanced analytics - Detailed body composition trends `L`
- [ ] Multiple goals - Track different objectives simultaneously `M`
- [ ] Data backup - Personal data export automation `M`
- [ ] Priority support - Faster response times `S`

### Should-Have Features

- [ ] Custom themes - Personalization options `S`
- [ ] API access - Personal data API for power users `L`
- [ ] Family accounts - Track multiple people `XL`

### Dependencies

- Payment processing integration
- Clear value proposition for premium tier
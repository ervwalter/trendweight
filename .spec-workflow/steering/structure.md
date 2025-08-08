# Structure Steering

## Project Organization

### Directory Structure
```
trendweight/
├── .github/                    # CI/CD workflows
│   └── workflows/              # GitHub Actions pipelines
├── .spec-workflow/             # Spec-driven development workspace
│   ├── steering/               # Steering documents (this file)
│   └── specs/                  # Feature specifications
├── apps/                       # Application workspaces
│   ├── api/                    # C# ASP.NET Core backend
│   │   ├── TrendWeight/        # Main API project
│   │   │   ├── Features/       # Feature-based organization
│   │   │   ├── Infrastructure/ # Cross-cutting concerns
│   │   │   └── Program.cs      # Application entry point
│   │   └── TrendWeight.sln     # Solution file
│   └── web/                    # React TypeScript frontend
│       ├── src/                
│       │   ├── components/     # Feature-based UI components
│       │   ├── lib/            # Feature-based utilities and hooks
│       │   ├── routes/         # TanStack Router pages
│       │   └── types/          # TypeScript type definitions
│       ├── public/             # Static assets
│       └── index.html          # SPA entry point
├── docs/                       # Project documentation
│   ├── ARCHITECTURE.md         # System architecture details
│   └── README.md               # Project overview
├── scripts/                    # Build and deployment scripts
├── .env.example                # Environment variable template
├── .tmuxinator.yml             # Development environment config
├── CLAUDE.md                   # AI assistant instructions
├── docker-compose.yml          # Local development services
├── Dockerfile                  # Production container definition
├── package.json                # Monorepo workspace configuration
├── README.md                   # Project quick start guide
└── turbo.json                  # Turborepo build configuration
```

### File Naming Conventions

#### Frontend Files (TypeScript/React)
- **Components**: kebab-case (`user-profile.tsx`)
- **Component internals**: PascalCase (`UserProfile`)
- **Utilities**: kebab-case (`format-weight.ts`)
- **Types**: kebab-case with `.types.ts` (`user.types.ts`)
- **Tests**: Same name with `.test.ts` or `.test.tsx` alongside source files
- **Routes**: Match URL structure (`settings.tsx` for `/settings`)

#### Backend Files (C#/.NET)
- **Classes/Interfaces**: PascalCase (`MeasurementService.cs`)
- **Database Models**: PascalCase with `Db` prefix (`DbMeasurement.cs`)
- **Feature Folders**: PascalCase (`Measurements/`)
- **Test Projects**: Separate `TrendWeight.Tests` project
- **Test Files**: `ClassNameTests.cs` in test project

#### Configuration Files
- **Environment**: `.env`, `.env.local`, `.env.production`
- **JSON configs**: lowercase with hyphens (`turbo.json`)
- **YAML configs**: lowercase with hyphens (`docker-compose.yml`)
- **Markdown docs**: UPPERCASE for root (`README.md`, `CLAUDE.md`)

### Module Organization

#### Frontend Module Structure (Feature-Based)
```
src/
├── components/          # Feature-based UI components
│   ├── auth/           # Authentication components
│   ├── dashboard/      # Dashboard and chart components
│   ├── settings/       # Settings page components
│   ├── providers/      # OAuth callback components
│   ├── download/       # Data export components
│   ├── home/           # Landing page components
│   ├── ui/             # Base UI primitives (Button, Select, etc)
│   └── common/         # Shared components (Heading, ExternalLink)
├── lib/                # Feature-based utilities
│   ├── api/            # API client and hooks
│   ├── auth/           # Authentication utilities
│   ├── dashboard/      # Dashboard computations and chart logic
│   ├── download/       # CSV export utilities
│   ├── hooks/          # Shared React hooks
│   ├── utils/          # General helper functions
│   └── progress/       # Progress indication system
├── routes/             # Page components (TanStack Router)
└── types/              # TypeScript definitions
```

#### Backend Module Structure (Feature-Based)
```
TrendWeight/
├── Common/             # Shared models at project root
│   └── Models/         # Common response models
├── Features/           # Feature-based organization
│   ├── Auth/           # Authentication infrastructure
│   ├── Common/         # Shared base classes and models
│   ├── Measurements/   # Weight data management
│   │   ├── Models/     # Data models
│   │   └── Services/   # Business logic
│   ├── Profile/        # User profile management
│   │   ├── Models/     # Profile data structures
│   │   └── Services/   # Profile business logic
│   ├── ProviderLinks/  # OAuth token management
│   │   └── Services/   # Token storage and retrieval
│   ├── Providers/      # External integrations
│   │   ├── Fitbit/     # Fitbit API integration
│   │   ├── Withings/   # Withings API integration
│   │   └── Models/     # Shared provider models
│   └── Sharing/        # Public profile sharing
├── Infrastructure/     # Cross-cutting concerns
│   ├── Auth/           # JWT authentication handlers
│   ├── Configuration/  # App configuration models
│   ├── DataAccess/     # Supabase data layer
│   │   └── Models/     # Database entity models (Db prefix)
│   ├── Extensions/     # Service registration extensions
│   ├── Middleware/     # HTTP pipeline middleware
│   └── Services/       # Infrastructure services
├── Properties/         # Launch settings
├── supabase/           # Database migrations and schema
└── Program.cs          # Application entry point
```

### Configuration Management
- **Frontend config**: Environment variables prefixed with `VITE_`
- **Backend config**: `appsettings.{Environment}.json` files
- **Docker config**: Build args and runtime environment variables
- **Local overrides**: `.env.local` (git-ignored)
- **Secrets**: Never committed, use environment variables

## Development Workflow

### Git Branching Strategy
- **main**: Production-ready code (protected branch)
- **Feature branches**: Created directly from main
  - No subfolder organization
  - Examples: `clerk-auth`, `start-date-settings`, `shadcn-migration`
- **Renovate branches**: Auto-created for dependency updates

### Commit Message Format

#### Standard Format
```
type(scope): description

[optional body]

[optional footer]
```

#### Common Types
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `chore`: Maintenance tasks
- `deps`: Dependency updates
- `test`: Test additions or changes
- `refactor`: Code refactoring
- `style`: Code style changes
- `perf`: Performance improvements

#### Examples
- `feat(auth): add social login support`
- `fix(charts): resolve timezone display issue`
- `chore(deps): update React to v19`
- `docs(api): add endpoint documentation`

#### Release Please Format
When using Release Please for automated releases:
```
chore(main): release X.Y.Z

feat: feature description
fix: bug fix description
```

### Code Review Process

#### Pull Request Requirements
1. **Title**: Clear description of changes
2. **Description**: Why (not what) the change was made
3. **Testing**: Evidence of testing (screenshots, test results)
4. **Breaking Changes**: Clearly marked if applicable

#### Review Checklist
- [ ] Code follows project conventions
- [ ] Tests added/updated as needed
- [ ] Documentation updated if needed
- [ ] No console.logs or debugging code
- [ ] Security implications considered
- [ ] Performance impact assessed
- [ ] Accessibility maintained

### Testing Workflow

#### Frontend Testing
- **Test Location**: Tests live alongside the code they test
- **File naming**: `component.test.tsx` or `utility.test.ts`
- **Framework**: Vitest with React Testing Library
- **Mocking**: Use MSW for HTTP mocking (never mock fetch directly)
- **Console suppression**: `vi.spyOn(console, "error").mockImplementation(() => {})`

#### Backend Testing
- **Test Location**: Separate `TrendWeight.Tests` project
- **Framework**: xUnit
- **Organization**: Feature-based test classes
- **Focus**: Business logic in services, not framework integration

#### Test Execution
```bash
# Run all tests
npm run test

# Run frontend tests only
npm run test --workspace=apps/web

# Run backend tests
dotnet test apps/api/TrendWeight.sln
```

### Development Environment

#### Important Notes for AI Assistants
- **Development servers are ALWAYS running** - Never start/restart them
- **Port configuration**:
  - Frontend: http://localhost:5173
  - Backend: http://localhost:5199  (which is proxied automatically by the frontend dev server)
- **Hot reload is automatic** - Code changes apply immediately

#### Deployment Process

##### Local Development
1. Clone repository
2. Copy `.env.example` to `.env`
3. Configure environment variables
4. Run `npm install`
5. Run `npm run dev` (servers managed by tmuxinator)

##### Production Deployment
1. Push to `main` branch
2. CI/CD runs automated checks
3. Docker image built and pushed
4. Platform auto-deploys from registry
5. Health checks verify deployment

## Documentation Structure

### Where to Find What
- **Project Overview**: `README.md`
- **Architecture Details**: `docs/ARCHITECTURE.md`
- **AI Guidance**: `CLAUDE.md` (project-specific AI instructions)
- **Component Documentation**: Inline JSDoc/XML comments
- **Steering Documents**: `.spec-workflow/steering/`
- **Feature Specs**: `.spec-workflow/specs/{feature-name}/`

### How to Update Docs
1. **Code Changes**: Update inline documentation
2. **Architecture Changes**: Update `ARCHITECTURE.md`
3. **AI Guidance**: Update `CLAUDE.md` for AI-specific patterns
4. **Breaking Changes**: Document in commit message
5. **New Features**: Update README if user-facing

### Spec Organization
```
.spec-workflow/
├── steering/           # Project-wide guidelines
│   ├── product.md     # Product vision and goals
│   ├── tech.md        # Technical standards
│   └── structure.md   # This file
└── specs/             # Feature specifications
    └── {feature-name}/
        ├── requirements.md
        ├── design.md
        └── tasks.md
```

### Bug Tracking Process
1. **Issue Creation**: Document the bug clearly
2. **Branch Creation**: Create feature branch from main
3. **Implementation**: Follow coding standards
4. **Testing**: Add regression tests
5. **Review**: Standard PR process
6. **Merge**: Into main branch

## Project Conventions

### Decision-Making Process
1. **Proposal**: Document the proposed change
2. **Implementation**: Create feature branch
3. **Testing**: Validate implementation
4. **Review**: Code review if needed
5. **Merge**: Into main branch

### Knowledge Sharing
- **Code Comments**: Explain "why" not "what"
- **PR Descriptions**: Share context and reasoning
- **Documentation**: Keep current with code
- **CLAUDE.md**: Document AI-specific patterns and lessons learned

## Build and Release Process

### Build Pipeline
```
CI Pipeline:
├── Install Dependencies
├── Type Checking (npm run check)
├── Linting
├── Unit Tests (npm run test)
├── Build Applications
├── Build Docker Image
└── Push to Registry
```

### Release Process
- Automated via Release Please when configured
- Manual version bumps in package.json
- Git tags for releases
- Docker images tagged with version

### Version Numbering
- **Format**: `MAJOR.MINOR.PATCH`
- **Major**: Breaking changes
- **Minor**: New features
- **Patch**: Bug fixes
- **Pre-release**: `-alpha.N`, `-beta.N`, `-rc.N`

## Development Environment Setup

### Required Tools
- **Node.js**: v18+ (use nvm for version management)
- **.NET SDK**: 9.0+
- **Docker Desktop**: Latest version
- **VS Code**: With recommended extensions
- **Git**: 2.30+
- **Tmuxinator**: For dev server management

### Recommended VS Code Extensions
- C# Dev Kit
- ESLint
- Prettier
- Tailwind CSS IntelliSense
- GitLens
- Docker

### Environment Configuration
```bash
# Development
NODE_ENV=development
VITE_API_URL=http://localhost:5199

# Production
NODE_ENV=production
VITE_API_URL=https://api.trendweight.com
```

## Quality Standards

### Code Quality Metrics
- **Test Coverage**: Target 80% for business logic
- **Linting**: Zero errors via `npm run check`
- **Type Coverage**: 100% TypeScript strict mode
- **Bundle Size**: Monitor and optimize
- **Performance**: Meet defined benchmarks

### Definition of Done
- [ ] Code complete and working
- [ ] Tests written and passing
- [ ] Documentation updated
- [ ] Code reviewed (if applicable)
- [ ] Lint and type checks passing (`npm run check`)
- [ ] Acceptance criteria met

## Maintenance Guidelines

### Dependency Updates
- **Renovate Bot**: Automated dependency PRs
- **Security updates**: Prioritize immediately
- **Minor updates**: Review and test
- **Major updates**: Careful testing required

### Technical Debt Management
- **Tracking**: Document in code comments or issues
- **Prioritization**: Balance with features
- **Refactoring**: Include in feature work when possible
- **Documentation**: Update as you go

### Monitoring
- **Build status**: CI/CD pipeline health
- **Error tracking**: Via application logs
- **Performance**: User-reported issues
- **Dependencies**: Renovate bot notifications

## Command Reference

### Essential Commands (from repo root)
```bash
# Check code (TypeScript + lint)
npm run check

# Run tests
npm run test

# Format code
npm run format

# Build for production
npm run build

# Docker operations
npm run docker:build
npm run docker:run
```

### Note for AI Assistants
- Always run commands from repository root
- Turborepo handles workspace optimization automatically
- Never run commands in workspace subdirectories
- Development servers are always running (tmuxinator managed)
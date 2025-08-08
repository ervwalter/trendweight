# TrendWeight Development Instructions

**ALWAYS follow these instructions first and only fall back to additional search and context gathering if the information in these instructions is incomplete or found to be in error.**

TrendWeight is a modern web application for tracking weight trends by integrating with smart scales from Withings and Fitbit. It uses a React + TypeScript frontend with Vite and a C# ASP.NET Core 9.0 backend API, organized as a monorepo with npm workspaces and Turborepo.

## Working Effectively

### Prerequisites and Setup
CRITICAL: Install these exact prerequisites in this order:

1. **Install Node.js 22**:
   ```bash
   wget https://nodejs.org/dist/v22.17.1/node-v22.17.1-linux-x64.tar.xz
   tar -xf node-v22.17.1-linux-x64.tar.xz
   sudo rm -rf /usr/local/node*
   sudo mv node-v22.17.1-linux-x64 /usr/local/node
   sudo ln -sf /usr/local/node/bin/node /usr/local/bin/node
   sudo ln -sf /usr/local/node/bin/npm /usr/local/bin/npm
   ```

2. **Install .NET 9 SDK**:
   ```bash
   curl -sSL https://dot.net/v1/dotnet-install.sh | bash /dev/stdin --channel 9.0 --install-dir $HOME/.dotnet
   export PATH="$HOME/.dotnet:$PATH"
   ```

3. **Install tmux and tmuxinator** (for development servers):
   ```bash
   sudo apt-get install -y tmux
   sudo gem install tmuxinator
   export EDITOR=nano
   export SHELL=bash
   ```

### Bootstrap, Build, and Test
CRITICAL TIMING WARNINGS: NEVER CANCEL any of these commands. They take significant time to complete.

1. **Install dependencies** -- takes 2 minutes:
   ```bash
   npm install
   ```

2. **Build the application** -- takes 1 minute. NEVER CANCEL. Set timeout to 90+ minutes for safety:
   ```bash
   npm run build
   ```

3. **Run tests** -- takes 52 seconds. NEVER CANCEL. Set timeout to 30+ minutes:
   ```bash
   npm test
   ```

4. **Run checks** (TypeScript + linting) -- takes 17 seconds:
   ```bash
   npm run check
   ```

5. **Format code** -- takes 24 seconds:
   ```bash
   npm run format
   ```

### Development Servers

#### Option 1: Using tmuxinator (recommended)
```bash
npm run dev
```
This starts both frontend (http://localhost:5173) and backend (http://localhost:5199) in a tmux session.

To stop:
```bash
npm run dev:stop
```

#### Option 2: Manual startup (if tmuxinator issues)
Start in separate terminals:

**Frontend:**
```bash
cd apps/web
npm run dev
```

**Backend:**
```bash
cd apps/api/TrendWeight
export PATH="$HOME/.dotnet:$PATH"
dotnet watch --no-hot-reload
```

### Environment Configuration
REQUIRED: Create a `.env` file in the repository root with these variables:
```bash
cp .env.example .env
```

Edit `.env` to include:
- `VITE_CLERK_PUBLISHABLE_KEY` - Clerk authentication key
- `Supabase__Url` - Supabase database URL
- `Supabase__ServiceKey` - Supabase service role key
- `Clerk__SecretKey` - Clerk secret key
- `Clerk__Authority` - Clerk authority URL
- `Jwt__SigningKey` - JWT signing key (minimum 32 characters)

## Validation

### Manual Testing Requirements
ALWAYS manually validate changes by:

1. **Test both servers start successfully**:
   - Frontend: `curl http://localhost:5173/` should return HTML
   - Backend: `curl http://localhost:5199/api/health` should return health status JSON

2. **Run complete end-to-end scenarios**:
   - Navigate to the application in a browser
   - Test key user workflows like authentication, data viewing, settings

3. **Always run before committing**:
   ```bash
   npm run format && npm run check:ci && npm test
   ```

### CI/CD Compatibility
The project uses GitHub Actions that expect:
- Node.js 22
- .NET 9 SDK
- All tests passing
- All lint checks passing
- Successful build completion

## Docker

### Build Docker Image
Docker builds take significant time but work for production deployment:
```bash
docker build -t trendweight:latest --build-arg VITE_CLERK_PUBLISHABLE_KEY=your_key .
```

Note: Docker build may fail in some environments due to npm issues in Alpine containers. This is a known limitation.

### Run Docker Container
```bash
docker run -p 8080:8080 \
  -e Supabase__Url=your_url \
  -e Supabase__ServiceKey=your_key \
  -e Clerk__SecretKey=your_secret \
  -e Clerk__Authority=your_authority \
  trendweight:latest
```

## Key Projects and Structure

### Repository Layout
```
/
├── apps/
│   ├── api/              # C# ASP.NET Core 9.0 API
│   │   ├── TrendWeight/     # Main API project
│   │   └── TrendWeight.Tests/ # API tests
│   └── web/              # React + TypeScript frontend
├── .env.example          # Environment variables template
├── package.json          # Root workspace configuration
├── turbo.json           # Turborepo configuration
└── .tmuxinator.yml      # Development server setup
```

### Frontend (apps/web)
- **Framework**: React 19 + TypeScript + Vite 7
- **Routing**: TanStack Router with file-based routing
- **UI**: Tailwind CSS + Radix UI components
- **Auth**: Clerk authentication
- **Testing**: Vitest + Testing Library
- **Build time**: ~30 seconds
- **Test time**: ~45 seconds

### Backend (apps/api)
- **Framework**: ASP.NET Core 9.0
- **Database**: Supabase (PostgreSQL)
- **Auth**: Clerk JWT validation
- **Testing**: xUnit
- **Build time**: ~30 seconds  
- **Test time**: ~5 seconds

## Common Commands Reference

### Build and Test
```bash
npm run build          # Build all workspaces (1 minute)
npm run test           # Run all tests (52 seconds)
npm run check          # TypeScript + lint checks (17 seconds)
npm run format         # Format all code (24 seconds)
npm run check:ci       # CI checks including format validation
```

### Development
```bash
npm run dev            # Start development servers with tmuxinator
npm run dev:stop       # Stop development servers
```

### Maintenance
```bash
npm run clean          # Clean build artifacts
npm run clean:all      # Deep clean including node_modules
npm outdated           # Check for package updates
```

## Troubleshooting

### Common Issues
1. **Build failures**: Ensure .NET 9 is installed and in PATH
2. **Test failures**: Run `npm run format` first, then tests
3. **Dev server issues**: Check `.env` file exists with required variables
4. **Docker build fails**: Use local development instead, Docker may have npm issues

### Performance Notes
- Turborepo provides intelligent caching for faster subsequent builds
- Frontend hot reload works in development
- Backend uses `dotnet watch` for automatic rebuilds
- All commands use workspaces for optimal dependency management

### Essential Files to Monitor
When making changes, always check these files:
- `turbo.json` - Build pipeline configuration
- `package.json` files in root and workspaces
- `.env` - Environment configuration
- Route files in `apps/web/src/routes/` - Follow minimal route pattern (see CLAUDE.md)

## Development Workflow Best Practices

1. **Always build and test before making changes** to understand baseline
2. **Use provided commands** - don't run workspace commands directly
3. **Check both frontend and backend** when making API changes
4. **Run format and check commands** before committing
5. **Test actual functionality** - don't just rely on builds passing
6. **Use long timeouts** for build commands to avoid premature cancellation
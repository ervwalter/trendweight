# TrendWeight

A web application for tracking weight trends by integrating with smart scales from Withings and Fitbit.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![ASP.NET Core](https://img.shields.io/badge/ASP.NET%20Core-10.0-blue.svg)](https://dotnet.microsoft.com/)
[![React](https://img.shields.io/badge/React-19-blue.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-blue.svg)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-purple.svg)](https://vitejs.dev/)

## Features

- 📊 Weight trend visualization with moving averages
- 🔄 Automatic sync with Withings and Fitbit smart scales
- 📱 Responsive design for mobile and desktop
- 🔐 Secure authentication with Clerk
- 📈 Goal tracking and progress monitoring
- 🌍 Metric and imperial unit support
- 🔗 Legacy user migration from classic TrendWeight

## Tech Stack

- **Frontend**: React + TypeScript + Vite + Tailwind CSS
- **Backend**: C# ASP.NET Core Web API
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Clerk with JWT

For detailed architecture information, see [ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 26 (matches the Docker build; npm version in `package.json`)
- [.NET 10 SDK](https://dotnet.microsoft.com/download/dotnet/10.0)
- `tmux` and `tmuxinator` for `npm run dev`, or use the individual workspace commands below
- A Supabase project (for database)
- A Clerk account (for authentication)

### Quick Start

1. Clone the repository:

   ```bash
   git clone https://github.com/trendweight/trendweight.git
   cd trendweight
   ```

2. Install dependencies:

   ```bash
   npm ci
   dotnet restore apps/api/TrendWeight.sln
   ```

3. Copy `.env.example` to `.env` and replace the placeholder values:

   ```bash
   cp .env.example .env
   ```

4. Export the configuration into your shell before starting development. Vite and
   ASP.NET do not automatically load the repository-root `.env` for both workspaces.
   The file is trusted shell input; quote values containing spaces, `$`, or semicolons.

   ```bash
   set -a
   source .env
   set +a
   ```

5. Start the development servers:

   ```bash
   npm run dev
   ```

   This starts both the frontend (http://localhost:5173) and backend (http://localhost:5199) servers.
   Without tmuxinator, use `npm run -w apps/web dev` and `npm run -w apps/api dev`
   in separate terminals, each with the configuration exported.

### Clerk Setup

1. Create a Clerk application at https://clerk.com

2. Configure the following social login providers in Clerk Dashboard:
   - Google OAuth
   - Microsoft OAuth
   - Apple OAuth

3. Set the following environment variables in your `.env` file:

   ```
   # Frontend (Vite)
   VITE_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
   VITE_SUPABASE_URL=https://your-project-ref.supabase.co
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

   # Backend (ASP.NET Core)
   Clerk__Authority=https://your-instance.clerk.accounts.dev
   Clerk__SecretKey=your_clerk_secret_key
   Supabase__Url=https://your-project-ref.supabase.co
   Supabase__AnonKey=your_supabase_anon_key
   Supabase__ServiceKey=your_supabase_service_role_key
   ```

4. Configure allowed redirect URLs in Clerk:
   - Development: `http://localhost:5173/*`
   - Production: `https://yourdomain.com/*`

## Development

### Available Scripts

- `npm run dev` - Start both frontend and backend in development mode
- `npm run dev:stop` - Stop the development servers
- `npm run build` - Build all workspaces for production
- `npm run test` - Run tests in all workspaces
- `npm run check` - Run TypeScript and lint checks
- `npm run check:ci` - Also verify formatting
- `npm run test:tooling` - Test local Docker helpers without running Docker
- `npm run -w apps/web test:coverage` - Frontend coverage report
- `npm run format` - Format code in all workspaces
- `npm run clean` - Clean all build artifacts and dependencies

### Docker

Build and run with Docker:

```bash
npm run docker:build
npm run docker:run
```

## Deployment

The application is designed to be deployed as a Docker container. The included Dockerfile creates a production-ready image that serves both the API and frontend.

Build the Docker image:

```bash
npm run docker:build
```

The container runs on port 8080. Browser configuration is embedded at build time; backend secrets are runtime environment variables. Configure trusted ingress proxies and allowed hostnames before production rollout. See [ARCHITECTURE.md](docs/ARCHITECTURE.md) for deployment details.

See [TESTING.md](docs/TESTING.md) for focused tests and verification boundaries.

## License

MIT License - see [LICENSE](LICENSE) for details.

## Contributing

Contributions are welcome. However, it's essentially a one-man show (me), and I'm pretty protective of the project—probably too overprotective. That said, if you have something you'd like to contribute, please open an issue and let's discuss.

## Contributors

<!-- readme: contributors,ervwalter/-,renovate-bot/- -start -->
<table>
	<tbody>
		<tr>
            <td align="center">
                <a href="https://github.com/isab3l">
                    <img src="https://avatars.githubusercontent.com/u/7023907?v=4" width="100;" alt="isab3l"/>
                    <br />
                    <sub><b>Isabel</b></sub>
                </a>
            </td>
            <td align="center">
                <a href="https://github.com/jamesstanleystewart">
                    <img src="https://avatars.githubusercontent.com/u/16391225?v=4" width="100;" alt="jamesstanleystewart"/>
                    <br />
                    <sub><b>James</b></sub>
                </a>
            </td>
            <td align="center">
                <a href="https://github.com/MitjaBezensek">
                    <img src="https://avatars.githubusercontent.com/u/2523721?v=4" width="100;" alt="MitjaBezensek"/>
                    <br />
                    <sub><b>Mitja Bezenšek</b></sub>
                </a>
            </td>
            <td align="center">
                <a href="https://github.com/Jah-yee">
                    <img src="https://avatars.githubusercontent.com/u/166608075?v=4" width="100;" alt="Jah-yee"/>
                    <br />
                    <sub><b>RoomWithOutRoof</b></sub>
                </a>
            </td>
		</tr>
	<tbody>
</table>
<!-- readme: contributors,ervwalter/-,renovate-bot/- -end -->

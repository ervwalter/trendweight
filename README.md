# TrendWeight

A web application for tracking weight trends by integrating with smart scales from Withings and Fitbit.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![ASP.NET Core](https://img.shields.io/badge/ASP.NET%20Core-9.0-blue.svg)](https://dotnet.microsoft.com/)
[![React](https://img.shields.io/badge/React-19.1-blue.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue.svg)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6.3-purple.svg)](https://vitejs.dev/)

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

- [Node.js](https://nodejs.org/) (v18 or higher)
- [.NET 9 SDK](https://dotnet.microsoft.com/download/dotnet/9.0)
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
   npm install
   ```

3. Copy `.env.example` to `.env` and configure your environment variables:

   ```bash
   cp .env.example .env
   ```

4. Start the development servers:

   ```bash
   npm run dev
   ```

   This starts both the frontend (http://localhost:5173) and backend (http://localhost:5199) servers.

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
   
   # Backend (ASP.NET Core)
   Clerk__Authority=https://your-instance.clerk.accounts.dev
   Clerk__SecretKey=your_clerk_secret_key
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
docker build -t trendweight:latest .
```

The container runs on port 8080 and requires environment variables for backend configuration. See [ARCHITECTURE.md](docs/ARCHITECTURE.md) for deployment details.

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
                <a href="https://github.com/MitjaBezensek">
                    <img src="https://avatars.githubusercontent.com/u/2523721?v=4" width="100;" alt="MitjaBezensek"/>
                    <br />
                    <sub><b>Mitja Bezenšek</b></sub>
                </a>
            </td>
		</tr>
	<tbody>
</table>
<!-- readme: contributors,ervwalter/-,renovate-bot/- -end -->

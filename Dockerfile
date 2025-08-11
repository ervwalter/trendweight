# Stage 1: Build frontend
FROM node:22-alpine AS frontend-build

WORKDIR /app

# Copy package files for all workspaces
COPY package*.json ./
COPY apps/web/package.json ./apps/web/
COPY apps/api/package.json ./apps/api/

# Install dependencies from root (npm workspaces)
RUN npm ci

# Copy frontend source
COPY apps/web/ ./apps/web/

# Build frontend with production environment variables
ARG VITE_CLERK_PUBLISHABLE_KEY
ENV VITE_CLERK_PUBLISHABLE_KEY=$VITE_CLERK_PUBLISHABLE_KEY

ARG VITE_SUPABASE_URL
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL

ARG VITE_SUPABASE_ANON_KEY
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY

# Build information arguments
ARG BUILD_TIME
ARG BUILD_COMMIT
ARG BUILD_BRANCH
ARG BUILD_VERSION
ARG BUILD_REPO

# Set build information as environment variables for Vite
ENV VITE_BUILD_TIME=$BUILD_TIME
ENV VITE_BUILD_COMMIT=$BUILD_COMMIT
ENV VITE_BUILD_BRANCH=$BUILD_BRANCH
ENV VITE_BUILD_VERSION=$BUILD_VERSION
ENV VITE_BUILD_REPO=$BUILD_REPO

# Build from the web workspace directory
WORKDIR /app/apps/web
RUN npm run build

# Stage 2: Build backend
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS backend-build

WORKDIR /src

# Copy backend source
COPY apps/api/ ./

# Copy frontend build to wwwroot BEFORE building the backend
# This is required for MapStaticAssets() to work
COPY --from=frontend-build /app/apps/web/dist ./TrendWeight/wwwroot

# Restore and build
RUN dotnet restore TrendWeight.sln
RUN dotnet publish TrendWeight/TrendWeight.csproj -c Release -o /app/publish

# Stage 3: Runtime
FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS runtime

WORKDIR /app

# Install curl for health checks
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

# Create non-root user and group
RUN groupadd -g 1000 appgroup && \
    useradd -u 1000 -g appgroup -m appuser

# Copy published backend (which now includes wwwroot with optimized static assets)
COPY --from=backend-build /app/publish .

# Change ownership of the app directory
RUN chown -R appuser:appgroup /app

# Switch to non-root user
USER 1000:1000

# Set environment variables
ENV ASPNETCORE_URLS=http://+:8080
ENV ASPNETCORE_ENVIRONMENT=Production

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8080/api/health || exit 1

# Run the application
ENTRYPOINT ["dotnet", "TrendWeight.dll"]
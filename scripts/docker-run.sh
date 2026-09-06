#!/bin/bash
set -euo pipefail

# Load the same local configuration used by docker:build. This is a trusted shell
# file; values containing spaces or semicolons must be quoted.
if [[ -f .env ]]; then
    set -a
    source .env
    set +a
fi

# Script to run TrendWeight Docker container with environment variables passed through

# List of environment variables to pass to the container
# Based on AppOptions configuration structure and .env.example
ENV_VARS=(
    # Supabase configuration
    "Supabase__Url"
    "Supabase__AnonKey"
    "Supabase__ServiceKey"
    
    # Clerk authentication configuration
    "Clerk__SecretKey"
    "Clerk__Authority"
    
    # OAuth state signing
    "Jwt__SigningKey"

    # Withings configuration
    "Withings__ClientId"
    "Withings__ClientSecret"
    
    # Fitbit configuration
    "Fitbit__ClientId"
    "Fitbit__ClientSecret"
    "Fitbit__Enabled"
    
    # Security configuration
    "AllowedHosts"
    "PublicBaseUrl"
    "ASPNETCORE_ENVIRONMENT"
    
    # Reverse proxy configuration (if using Plausible analytics)
    "ReverseProxy__Clusters__plausible__Destinations__plausible__Address"
)

# Build the docker run command with all environment variables
DOCKER_CMD=(docker run --rm -p 8080:8080)

# Add each environment variable if it exists
for var in "${ENV_VARS[@]}"; do
    if [[ -n "${!var:-}" ]]; then
        # Let Docker read the value from the environment. Never interpolate
        # secrets into shell source or expose them in command-line arguments.
        DOCKER_CMD+=(-e "$var")
    fi
done

# Add the image name
DOCKER_CMD+=(trendweight:local)

# Execute the command
exec "${DOCKER_CMD[@]}"

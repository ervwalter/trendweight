#!/bin/bash

# Script to run TrendWeight Docker container with environment variables passed through

# List of environment variables to pass to the container
# Based on AppOptions configuration structure and .env.example
ENV_VARS=(
    # Supabase configuration
    "Supabase__Url"
    "Supabase__ServiceKey"
    
    # Clerk authentication configuration
    "Clerk__SecretKey"
    "Clerk__Authority"
    
    # Legacy database connection
    "LegacyDbConnectionString"
    
    # Withings configuration
    "Withings__ClientId"
    "Withings__ClientSecret"
    
    # Fitbit configuration
    "Fitbit__ClientId"
    "Fitbit__ClientSecret"
    
    # Security configuration
    "AllowedHosts"
    
    # Reverse proxy configuration (if using Plausible analytics)
    "ReverseProxy__Clusters__plausible__Destinations__plausible__Address"
)

# Build the docker run command with all environment variables
DOCKER_CMD="docker run --rm -p 8080:8080"

# Add each environment variable if it exists
for var in "${ENV_VARS[@]}"; do
    if [ ! -z "${!var}" ]; then
        DOCKER_CMD="$DOCKER_CMD -e \"$var=${!var}\""
    fi
done

# Add the image name
DOCKER_CMD="$DOCKER_CMD trendweight:local"

# # Echo the command for debugging (optional - remove if not needed)
# echo "Running: $DOCKER_CMD"
# echo ""

# Execute the command
eval $DOCKER_CMD
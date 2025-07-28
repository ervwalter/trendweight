#!/bin/bash
set -e

# Load environment variables
set -a
source .env
set +a

# Build Docker image with all necessary build args
docker build \
  --build-arg VITE_CLERK_PUBLISHABLE_KEY="$VITE_CLERK_PUBLISHABLE_KEY" \
  --build-arg BUILD_TIME="$(date -u +"%Y-%m-%dT%H:%M:%SZ")" \
  --build-arg BUILD_COMMIT="$(git rev-parse HEAD)" \
  --build-arg BUILD_BRANCH="$(git rev-parse --abbrev-ref HEAD)" \
  --build-arg BUILD_VERSION="local" \
  --build-arg BUILD_REPO="$(git remote get-url origin 2>/dev/null | sed -E "s|^.*github.com[:/](.+)\.git$|\1|" || echo "")" \
  -t trendweight:local \
  .
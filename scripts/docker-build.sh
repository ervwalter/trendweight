#!/bin/bash
set -euo pipefail

# Load environment variables
if [[ -f .env ]]; then
  set -a
  source .env
  set +a
fi

: "${VITE_CLERK_PUBLISHABLE_KEY:?Set VITE_CLERK_PUBLISHABLE_KEY in .env or the environment}"
: "${VITE_SUPABASE_URL:?Set VITE_SUPABASE_URL in .env or the environment}"
: "${VITE_SUPABASE_ANON_KEY:?Set VITE_SUPABASE_ANON_KEY in .env or the environment}"

# owner/repo for the build page's commit and changelog links. Both
# https://github.com/owner/repo[.git] and git@github.com:owner/repo[.git]
# reduce to owner/repo; the value is empty when there is no origin remote.
BUILD_REPO="$(git remote get-url origin 2>/dev/null | sed -E -e 's|/+$||' -e 's|\.git$||' -e 's|^.*github\.com[:/]||' || echo "")"

# BUILD_VERSION defaults to "local"; the footer shows the commit for non-"v" values.
# Export BUILD_VERSION=vX.Y.Z to build a locally tagged release image.
docker build \
  --build-arg VITE_CLERK_PUBLISHABLE_KEY="$VITE_CLERK_PUBLISHABLE_KEY" \
  --build-arg VITE_SUPABASE_URL="$VITE_SUPABASE_URL" \
  --build-arg VITE_SUPABASE_ANON_KEY="$VITE_SUPABASE_ANON_KEY" \
  --build-arg BUILD_TIME="$(date -u +"%Y-%m-%dT%H:%M:%SZ")" \
  --build-arg BUILD_COMMIT="$(git rev-parse HEAD)" \
  --build-arg BUILD_BRANCH="$(git rev-parse --abbrev-ref HEAD)" \
  --build-arg BUILD_VERSION="${BUILD_VERSION:-local}" \
  --build-arg BUILD_REPO="$BUILD_REPO" \
  -t trendweight:local \
  .

# Release Process Documentation

This document describes the automated release process for TrendWeight using Release Please.

## Overview

TrendWeight uses [Release Please](https://github.com/googleapis/release-please) to automate:
- Changelog generation from commit messages
- Version bumping
- GitHub release creation
- Pull request management for releases

## Current Setup

### Release Strategy
- **Single release** for the entire monorepo (both web and API are released together)
- **Stable release** mode using semantic versioning
- **Conventional commits** drive the changelog generation

### Configuration Files

1. **`.github/workflows/release.yml`** - GitHub Action workflow
2. **`.github/release-config.json`** - Main configuration
3. **`.github/release-manifest.json`** - Current version tracking
4. **`version.txt`** - Simple version file for Docker builds and scripts

### Version Progression

Versions follow standard semantic versioning:
- `fix:` commits → patch bumps (2.0.0 → 2.0.1)
- `feat:` commits → minor bumps (2.0.1 → 2.1.0)
- Breaking changes (`feat!:` or `BREAKING CHANGE:`) → major bumps (2.0.0 → 3.0.0)

## Initial Setup (REQUIRED)

**Important**: You MUST create a Personal Access Token (PAT) for Release Please to work correctly:

1. Go to GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Generate a new token with `repo` scope
3. Add it as a repository secret named `RELEASE_PLEASE_TOKEN`

This is required because tags created with the default GITHUB_TOKEN don't trigger other workflows (like the CI workflow that builds Docker images).

## How It Works

1. **You push commits** to `main` with conventional commit messages:
   ```
   feat: add user dashboard widget
   fix: resolve login redirect issue
   ```

2. **Release Please creates/updates a PR** titled "chore(main): release X.Y.Z"
   - Updates `CHANGELOG.md` with categorized changes
   - Bumps version in `version.txt` file
   - Updates `apps/web/package.json` version

3. **The PR stays open** and updates automatically as you push more commits

4. **When you merge the PR**:
   - Creates git tag `vX.Y.Z`
   - Creates GitHub release with changelog
   - Commits the updated files to main
   - Triggers CI workflow to build Docker images with `latest-release` tag

## Using Prerelease Mode

The project can be switched to prerelease mode when needed (e.g., for major version development, beta testing, or unstable features).

### Enabling Prerelease Mode

To switch to prerelease versioning, update `.github/release-config.json`:
```json
{
  "packages": {
    ".": {
      "release-type": "simple",
      "prerelease": true,
      "prerelease-type": "alpha"  // or "beta", "rc", etc.
    }
  }
}
```

### Prerelease Version Progression

In prerelease mode, ALL commits increment only the prerelease number:
- `feat:` → 3.0.0-alpha.1 → 3.0.0-alpha.2
- `fix:` → 3.0.0-alpha.2 → 3.0.0-alpha.3
- `feat!:` → 3.0.0-alpha.3 → 3.0.0-alpha.4 (no major bump)

### Returning to Stable Releases

**Important**: Release Please cannot automatically remove prerelease suffixes. You must manually intervene.

To return to stable versioning:

1. **Update the configuration** in `.github/release-config.json`:
   - Remove or set `prerelease: false`
   - Remove `prerelease-type` field

2. **Manually update the version files** to remove the prerelease suffix:
   - Edit `.github/release-manifest.json`: Change `"3.0.0-alpha.X"` to `"3.0.0"`
   - Edit `version.txt`: Change `3.0.0-alpha.X` to `3.0.0`

3. **Commit the transition** (this will NOT create a Release Please PR):
   ```bash
   git add .github/release-config.json .github/release-manifest.json version.txt
   git commit -m "chore: release 3.0.0"
   git push
   ```

4. **Close any existing Release Please PR** that still has the alpha suffix

5. **Manually create the GitHub release**:
   - Go to GitHub → Releases → "Create a new release"
   - Create tag `v3.0.0` when publishing
   - Add release notes summarizing changes from all prerelease versions

After these steps, Release Please will handle future releases (3.0.1, 3.1.0, etc.) automatically in stable mode.

## Commit Message Guidelines

Use conventional commits format:

- `feat: add new feature` → Features section
- `fix: resolve bug` → Fixes section
- `perf: improve performance` → Performance Improvements section
- `refactor: reorganize code` → Refactoring section
- `docs: update README` → Documentation section
- `test: add unit tests` → Tests section
- `deps: update dependencies` → Dependencies section

## Manual Version Override

If needed, you can manually set the next version:

1. Update the `version.txt` file
2. Update `.github/release-manifest.json`
3. Commit with message: `chore: release X.Y.Z`

## Docker Integration

The `version.txt` file can be used in your Docker build:

```dockerfile
COPY version.txt /app/version.txt
ARG VERSION=$(cat /app/version.txt)
LABEL version=$VERSION
```

## Troubleshooting

### Release PR not created?
- Check GitHub Actions tab for errors
- Ensure conventional commit format is correct
- Verify branch protections allow PR creation

### Permission errors (can't create labels)?
See the "Initial Setup" section above - you need a PAT with `repo` scope.

### Version not bumping correctly?
- In prerelease mode: This is expected, only prerelease number increments
- Check your configuration settings in `.github/release-config.json`

### Need to skip a release?
Add `[skip-release]` to your commit message:
```
feat: work in progress [skip-release]
```

## Future Considerations

1. **Major Version Bumps**: Use `feat!:` or `BREAKING CHANGE:` in commit messages

2. **NPM Publishing**: Can be added to workflow:
   ```yaml
   - run: npm publish
     if: ${{ steps.release.outputs.release_created }}
   ```

3. **Docker Publishing**: Can trigger Docker build on release:
   ```yaml
   - name: Build and push Docker image
     if: ${{ steps.release.outputs.release_created }}
     run: |
       docker build -t trendweight:${{ steps.release.outputs.version }} .
       docker push trendweight:${{ steps.release.outputs.version }}
   ```

## Links

- [Release Please Documentation](https://github.com/googleapis/release-please)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [Our Release Config](./.github/release-config.json)
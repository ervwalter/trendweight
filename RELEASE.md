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

1. **`.github/workflows/release-please.yml`** - GitHub Action workflow
2. **`release-please-config.json`** - Main configuration
   - Contains `bootstrap-sha` pointing to the v2.0.0-alpha.1 tag
   - This ensures Release Please only includes commits after that tag
3. **`.release-please-manifest.json`** - Current version tracking
4. **`VERSION`** - Simple version file for Docker builds and scripts

### Version Progression

Versions follow standard semantic versioning patterns:
- `fix:` commits → patch bumps (2.0.0 → 2.0.1)
- `feat:` commits → minor bumps (2.0.1 → 2.1.0)
- Breaking changes → minor bumps (due to `bump-minor-pre-major: true`)

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
   - Bumps version in `VERSION` file
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

To switch to prerelease versioning, update `release-please-config.json`:
```json
{
  "prerelease": true,
  "prerelease-type": "alpha",  // or "beta", "rc", etc.
  "versioning": "prerelease",
  "bump-patch-for-minor-pre-major": true,
  // ... rest of config
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

1. **Update the configuration** in `release-please-config.json`:
   - Remove or set `prerelease: false`
   - Remove `prerelease-type` and `versioning` fields
   - Set `bump-patch-for-minor-pre-major: false` if you want standard semver behavior

2. **Manually update the version files** to remove the prerelease suffix:
   - Edit `.release-please-manifest.json`: Change `"3.0.0-alpha.X"` to `"3.0.0"`
   - Edit `VERSION`: Change `3.0.0-alpha.X` to `3.0.0`

3. **Commit the transition** (this will NOT create a Release Please PR):
   ```bash
   git add release-please-config.json .release-please-manifest.json VERSION
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

Use conventional commits with emoji prefixes (they work fine with Release Please):

- `✨ feat: add new feature` → Features section
- `🐛 fix: resolve bug` → Bug Fixes section
- `⚡️ perf: improve performance` → Performance section
- `♻️ refactor: reorganize code` → Hidden from changelog
- `📝 docs: update README` → Hidden from changelog
- `🧪 test: add unit tests` → Hidden from changelog

## Manual Version Override

If needed, you can manually set the next version:

1. Update the `VERSION` file
2. Update `.release-please-manifest.json`
3. Commit with message: `chore: release X.Y.Z`

## Docker Integration

The `VERSION` file can be used in your Docker build:

```dockerfile
COPY VERSION /app/VERSION
ARG VERSION=$(cat /app/VERSION)
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
- In stable mode: Check `bump-patch-for-minor-pre-major` setting

### Need to skip a release?
Add `[skip-release]` to your commit message:
```
feat: work in progress [skip-release]
```

## Future Considerations

1. **Major Version Bumps**: Currently disabled. To enable after v2.0.0:
   - Remove `"bump-minor-pre-major": true` from config
   - Use `feat!:` or `BREAKING CHANGE:` for major bumps

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
- [Our Release Config](./release-please-config.json)
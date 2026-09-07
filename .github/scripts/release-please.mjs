import { pathToFileURL } from "node:url";
import { GitHub, Manifest, registerChangelogNotes } from "release-please";
import { CompactDependencyNotes } from "./release-notes.mjs";

export async function runRelease(
  github,
  { dryRun = false, loadManifest = Manifest.fromManifest } = {},
) {
  // Override the registered renderer, keeping the standard manifest schema/config.
  registerChangelogNotes("default", () => new CompactDependencyNotes());
  const load = () =>
    loadManifest(
      github,
      "main",
      ".github/release-config.json",
      ".github/release-manifest.json",
    );
  const releases = await load();
  if (dryRun) {
    return {
      releases: await releases.buildReleases(),
      pullRequests: await releases.buildPullRequests(),
    };
  }
  await releases.createReleases();
  // Reload after tagging so PR creation sees the newly published release.
  await (await load()).createPullRequests();
}

const FAILURE_MESSAGE =
  "Release Please failed. Check configuration and preceding Release Please diagnostics.";

/**
 * CLI entry. Returns the process exit code instead of setting it so the
 * argument, environment and error handling can be exercised in tests.
 */
export async function main(
  argv,
  env,
  {
    createGitHub = GitHub.create,
    run = runRelease,
    stdout = console.log,
    stderr = console.error,
  } = {},
) {
  try {
    if (argv.some((arg) => arg !== "--dry-run"))
      throw new Error("Unsupported argument");
    const token = env.RELEASE_PLEASE_TOKEN;
    const repository = env.GITHUB_REPOSITORY;
    if (!token?.trim() || !/^[\w.-]+\/[\w.-]+$/.test(repository ?? "")) {
      throw new Error("Missing release configuration");
    }
    const [owner, repo] = repository.split("/");
    const github = await createGitHub({ owner, repo, token });
    const result = await run(github, { dryRun: argv.includes("--dry-run") });
    if (result) stdout(JSON.stringify(result, null, 2));
    return 0;
  } catch {
    // Do not dump API request objects, which may contain authorization headers.
    stderr(FAILURE_MESSAGE);
    return 1;
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  process.exitCode = await main(process.argv.slice(2), process.env);
}

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

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  try {
    const args = process.argv.slice(2);
    if (args.some((arg) => arg !== "--dry-run"))
      throw new Error("Unsupported argument");
    const token = process.env.RELEASE_PLEASE_TOKEN;
    const repository = process.env.GITHUB_REPOSITORY;
    if (!token?.trim() || !/^[\w.-]+\/[\w.-]+$/.test(repository ?? "")) {
      throw new Error("Missing release configuration");
    }
    const [owner, repo] = repository.split("/");
    const github = await GitHub.create({ owner, repo, token });
    const result = await runRelease(github, {
      dryRun: args.includes("--dry-run"),
    });
    if (result) console.log(JSON.stringify(result, null, 2));
  } catch {
    // Do not dump API request objects, which may contain authorization headers.
    console.error(
      "Release Please failed. Check configuration and preceding Release Please diagnostics.",
    );
    process.exitCode = 1;
  }
}

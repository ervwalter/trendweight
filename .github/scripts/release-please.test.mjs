import { Manifest, setLogger } from "release-please";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  buildChangelogNotes,
  registerChangelogNotes,
} from "release-please/build/src/factories/changelog-notes-factory.js";
import { Simple } from "release-please/build/src/strategies/simple.js";
import { parseConventionalCommits } from "release-please/build/src/commit.js";
import { Version } from "release-please/build/src/version.js";
import { TagName } from "release-please/build/src/util/tag-name.js";
import { DefaultChangelogNotes } from "release-please/build/src/changelog-notes/default.js";
import { CompactDependencyNotes } from "./release-notes.mjs";
import { main, runRelease } from "./release-please.mjs";

// Upstream's checkpoint logger writes directly to stdout; keep test IPC intact.
setLogger({ info() {}, debug() {}, warn() {}, error() {}, trace() {} });

const config = JSON.parse(
  readFileSync(new URL("../release-config.json", import.meta.url)),
);
const github = {
  repository: { owner: "example", repo: "example", defaultBranch: "main" },
};
const latest = {
  tag: new TagName(Version.parse("2.11.0")),
  sha: "a".repeat(40),
  notes: "",
};
const parse = (messages) =>
  parseConventionalCommits(
    messages.map((message, i) => ({
      message,
      sha: String(i + 1).repeat(40),
      files: ["package-lock.json"],
    })),
  );
function strategy(changelogNotes = new CompactDependencyNotes()) {
  return new Simple({
    github,
    targetBranch: "main",
    changelogNotes,
    changelogSections: config["changelog-sections"],
    extraFiles: config.packages["."]["extra-files"],
  });
}
const candidate = (messages, renderer) =>
  strategy(renderer).buildReleasePullRequest(parse(messages), latest);

async function notesFrom(pr) {
  const change = pr.updates.find((update) => update.path === "CHANGELOG.md");
  return change.updater.updateContent("# Changelog\n");
}

test("dependency-only changes produce one summary and a patch release", async () => {
  const pr = await candidate([
    "deps: update package-a to v2",
    "deps: update package-b to v3",
  ]);
  assert.equal(pr.version.toString(), "2.11.1");
  const notes = await notesFrom(pr);
  assert.equal(notes.match(/Updated dependencies\./g).length, 1);
  assert.doesNotMatch(notes, /package-a|package-b/);
  assert.match(pr.body.toString(), /Updated dependencies\./);
  const version = pr.updates.find((update) => update.path === "version.txt");
  assert.match(version.updater.updateContent("2.11.0"), /2\.11\.1/);
  const web = pr.updates.find(
    (update) => update.path === "apps/web/package.json",
  );
  assert.equal(
    JSON.parse(web.updater.updateContent('{"version":"2.11.0"}')).version,
    "2.11.1",
  );
});

test("mixed changes retain feature and fix notes and normal minor versioning", async () => {
  const pr = await candidate([
    "feat: add settings endpoint",
    "fix: preserve profile",
    "deps: update package-a",
  ]);
  assert.equal(pr.version.toString(), "2.12.0");
  const notes = await notesFrom(pr);
  assert.match(notes, /add settings endpoint/);
  assert.match(notes, /preserve profile/);
  assert.match(notes, /Updated dependencies/);
  assert.doesNotMatch(notes, /package-a/);
});

test("non-dependency notes are identical to the upstream renderer", async () => {
  const messages = ["fix: correct callback (#12)", "docs: explain setup"];
  const custom = await candidate(messages);
  const upstream = await candidate(messages, new DefaultChangelogNotes());
  assert.equal(await notesFrom(custom), await notesFrom(upstream));
});

test("hidden maintenance commits and empty history do not create releases", async () => {
  assert.equal(await candidate(["chore: tidy automation"]), undefined);
  assert.equal(await candidate([]), undefined);
});

test("breaking dependency updates retain migration notes and major versioning", async () => {
  const pr = await candidate([
    "deps!: update database driver\n\nBREAKING CHANGE: migrate driver configuration",
  ]);
  assert.equal(pr.version.toString(), "3.0.0");
  assert.match(await notesFrom(pr), /migrate driver configuration/);
  assert.match(await notesFrom(pr), /update database driver/);
});

test("breaking and routine dependency updates share one Dependencies section", async () => {
  const pr = await candidate([
    "deps!: update database driver\n\nBREAKING CHANGE: migrate driver configuration",
    "deps: update package-a",
  ]);
  assert.equal(pr.version.toString(), "3.0.0");
  const notes = await notesFrom(pr);
  assert.equal(notes.match(/### Dependencies/g).length, 1);
  assert.equal(notes.match(/Updated dependencies\./g).length, 1);
  assert.match(notes, /update database driver/);
  assert.doesNotMatch(notes, /package-a/);
  const section = notes.slice(notes.indexOf("### Dependencies"));
  assert.match(section, /Updated dependencies\./);
  assert.match(section, /update database driver/);
});

test("dry run only builds candidates, without publishing or opening PRs", async () => {
  const calls = [];
  const loadManifest = async (...args) => {
    assert.deepEqual(args, [
      github,
      "main",
      ".github/release-config.json",
      ".github/release-manifest.json",
    ]);
    return {
      buildReleases: async () => {
        calls.push("preview releases");
        return [];
      },
      buildPullRequests: async () => {
        calls.push("preview PRs");
        return [];
      },
      createReleases: () => assert.fail("must not publish"),
      createPullRequests: () => assert.fail("must not create PRs"),
    };
  };
  assert.deepEqual(await runRelease(github, { dryRun: true, loadManifest }), {
    releases: [],
    pullRequests: [],
  });
  assert.deepEqual(calls, ["preview releases", "preview PRs"]);
});

test("publishes merged releases before reloading and updating the next PR", async () => {
  const calls = [];
  const loadManifest = async () => {
    calls.push("load");
    return {
      createReleases: async () => {
        calls.push("release");
      },
      createPullRequests: async () => {
        calls.push("PR");
      },
    };
  };
  await runRelease(github, { loadManifest });
  assert.deepEqual(calls, ["load", "release", "load", "PR"]);
});

test("publication failure stops subsequent PR creation", async () => {
  const loadManifest = async () => ({
    createReleases: async () => {
      throw new Error("API unavailable");
    },
    createPullRequests: () => assert.fail("must stop after failure"),
  });
  await assert.rejects(runRelease(github, { loadManifest }), /API unavailable/);
});

for (const addedCommit of [
  "deps: update package-b",
  "chore: adjust automation",
]) {
  test(`refreshes an existing release PR after ${addedCommit} even with identical notes`, async () => {
    const original = await candidate(["deps: update package-a"]);
    const updated = await candidate(["deps: update package-a", addedCommit]);
    assert.equal(original.body.toString(), updated.body.toString());
    const writes = [];
    const fakeGithub = {
      ...github,
      getFileJson: async (path) =>
        path.endsWith("release-config.json") ? config : { ".": "2.11.0" },
      async *pullRequestIterator(_branch, state) {
        if (state === "OPEN")
          yield {
            number: 460,
            headBranchName: original.headRefName,
            body: original.body.toString(),
            labels: ["autorelease: pending"],
          };
      },
      updatePullRequest: async (number, pr, targetBranch) => {
        writes.push({ number, pr, targetBranch });
        return { number };
      },
      createPullRequest: () => assert.fail("must update the existing PR"),
    };
    const manifest = await Manifest.fromManifest(
      fakeGithub,
      "main",
      ".github/release-config.json",
      ".github/release-manifest.json",
    );
    // Candidate generation is exercised above; stub history traversal only.
    manifest.buildPullRequests = async () => [updated];
    await manifest.createPullRequests();
    assert.equal(
      writes.length,
      1,
      "unchanged notes must not skip the branch refresh",
    );
    assert.equal(writes[0].number, 460);
    assert.equal(writes[0].targetBranch, "main");
    assert.equal(writes[0].pr, updated);
  });
}

// Resolve the changelog renderer the way Manifest does when it builds a
// strategy (factory.js), so the test observes the registration itself.
const resolveDefaultRenderer = () =>
  buildChangelogNotes({
    type: "default",
    github,
    changelogSections: config["changelog-sections"],
  });

test("running a release replaces the registered default changelog renderer", async (t) => {
  // Reset to upstream first: an earlier runRelease in this file may already
  // have registered the compact renderer, which would mask a missing call.
  const restoreUpstream = () =>
    registerChangelogNotes(
      "default",
      (options) => new DefaultChangelogNotes(options),
    );
  restoreUpstream();
  t.after(restoreUpstream);
  assert.ok(resolveDefaultRenderer() instanceof DefaultChangelogNotes);
  const loadManifest = async () => ({
    buildReleases: async () => [],
    buildPullRequests: async () => [],
  });
  await runRelease(github, { dryRun: true, loadManifest });
  assert.ok(resolveDefaultRenderer() instanceof CompactDependencyNotes);
});

const FAILURE_MESSAGE =
  "Release Please failed. Check configuration and preceding Release Please diagnostics.";

function cli({ run = async () => undefined } = {}) {
  const calls = { createGitHub: [], run: [], stdout: [], stderr: [] };
  const githubClient = { fake: "github" };
  const fakes = {
    createGitHub: async (options) => {
      calls.createGitHub.push(options);
      return githubClient;
    },
    run: async (...args) => {
      calls.run.push(args);
      return run(...args);
    },
    stdout: (text) => calls.stdout.push(text),
    stderr: (text) => calls.stderr.push(text),
  };
  return { calls, githubClient, fakes };
}

const validEnv = {
  RELEASE_PLEASE_TOKEN: "synthetic-token",
  GITHUB_REPOSITORY: "example/trendweight",
};

test("main rejects unsupported arguments before touching GitHub", async () => {
  const { calls, fakes } = cli();
  assert.equal(await main(["--bogus"], validEnv, fakes), 1);
  assert.deepEqual(calls.createGitHub, []);
  assert.deepEqual(calls.run, []);
  assert.deepEqual(calls.stderr, [FAILURE_MESSAGE]);
});

test("main rejects a blank token before touching GitHub", async () => {
  const { calls, fakes } = cli();
  const env = { ...validEnv, RELEASE_PLEASE_TOKEN: "  " };
  assert.equal(await main([], env, fakes), 1);
  assert.deepEqual(calls.createGitHub, []);
  assert.deepEqual(calls.stderr, [FAILURE_MESSAGE]);
});

for (const repository of ["owner", "a/b/c", "a b/c"]) {
  test(`main rejects GITHUB_REPOSITORY ${JSON.stringify(repository)} before touching GitHub`, async () => {
    const { calls, fakes } = cli();
    const env = { ...validEnv, GITHUB_REPOSITORY: repository };
    assert.equal(await main([], env, fakes), 1);
    assert.deepEqual(calls.createGitHub, []);
    assert.deepEqual(calls.run, []);
    assert.deepEqual(calls.stderr, [FAILURE_MESSAGE]);
  });
}

test("main connects to the configured repository and runs a real release", async () => {
  const { calls, fakes, githubClient } = cli();
  assert.equal(await main([], validEnv, fakes), 0);
  assert.deepEqual(calls.createGitHub, [
    { owner: "example", repo: "trendweight", token: "synthetic-token" },
  ]);
  assert.deepEqual(calls.run, [[githubClient, { dryRun: false }]]);
  assert.deepEqual(calls.stdout, [], "nothing to print without a result");
  assert.deepEqual(calls.stderr, []);
});

test("main --dry-run prints the preview as formatted JSON", async () => {
  const result = { releases: [{ tag: "v2.11.1" }], pullRequests: [] };
  const { calls, fakes, githubClient } = cli({ run: async () => result });
  assert.equal(await main(["--dry-run"], validEnv, fakes), 0);
  assert.deepEqual(calls.run, [[githubClient, { dryRun: true }]]);
  assert.deepEqual(calls.stdout, [JSON.stringify(result, null, 2)]);
  assert.deepEqual(calls.stderr, []);
});

test("main reports a failed release without echoing the error", async () => {
  const { calls, fakes } = cli({
    run: async () => {
      throw new Error("Authorization: token secret");
    },
  });
  assert.equal(await main([], validEnv, fakes), 1);
  assert.deepEqual(calls.stderr, [FAILURE_MESSAGE]);
  assert.equal(calls.stderr.join("\n").includes("secret"), false);
  assert.deepEqual(calls.stdout, []);
});

test("the script's entry point wires main to the process exit code", () => {
  const scriptPath = fileURLToPath(
    new URL("./release-please.mjs", import.meta.url),
  );
  const result = spawnSync(process.execPath, [scriptPath, "--bogus"], {
    encoding: "utf8",
    env: { ...process.env, RELEASE_PLEASE_TOKEN: "", GITHUB_REPOSITORY: "" },
  });
  assert.equal(result.status, 1);
  assert.ok(result.stderr.includes(FAILURE_MESSAGE), result.stderr);
  assert.equal(result.stdout, "");
});

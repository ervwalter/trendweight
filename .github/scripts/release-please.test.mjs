import { setLogger } from "release-please";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { Simple } from "release-please/build/src/strategies/simple.js";
import { parseConventionalCommits } from "release-please/build/src/commit.js";
import { Version } from "release-please/build/src/version.js";
import { TagName } from "release-please/build/src/util/tag-name.js";
import { DefaultChangelogNotes } from "release-please/build/src/changelog-notes/default.js";
import { CompactDependencyNotes } from "./release-notes.mjs";
import { runRelease } from "./release-please.mjs";

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

import assert from "node:assert/strict";
import {
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { test } from "node:test";

const root = path.resolve(import.meta.dirname, "..");

const browserConfiguration = {
  VITE_CLERK_PUBLISHABLE_KEY: "pk_test_example",
  VITE_SUPABASE_URL: "https://example.supabase.co",
  VITE_SUPABASE_ANON_KEY: "public-example-key",
};

const ISO_UTC_SECONDS = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;

function fixture(t) {
  const directory = mkdtempSync(
    path.join(tmpdir(), "trendweight-docker-test-"),
  );
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const bin = path.join(directory, "bin");
  mkdirSync(bin);
  const output = path.join(directory, "docker-args.json");
  // The docker stub records its arguments and the environment it inherited,
  // so tests can check both what the script asks for and what docker can see.
  writeFileSync(
    path.join(bin, "docker"),
    `#!${process.execPath}\nimport('node:fs').then(fs => fs.writeFileSync(process.env.TEST_OUTPUT, JSON.stringify({ argv: process.argv.slice(2), env: process.env })));\n`,
    { mode: 0o755 },
  );
  // The git stub answers the three queries docker-build.sh makes. The origin
  // URL comes from TEST_ORIGIN_URL; TEST_NO_ORIGIN=1 simulates a checkout
  // without an origin remote, where `git remote get-url` exits non-zero.
  writeFileSync(
    path.join(bin, "git"),
    [
      "#!/bin/sh",
      'case "$1 $2" in',
      "  \"rev-parse HEAD\") printf '%s\\n' abc123 ;;",
      "  \"rev-parse --abbrev-ref\") printf '%s\\n' feature/x ;;",
      '  "remote get-url")',
      '    if [ "${TEST_NO_ORIGIN:-}" = "1" ]; then exit 1; fi',
      "    printf '%s\\n' \"${TEST_ORIGIN_URL:-https://github.com/example/trendweight.git}\" ;;",
      "  *) printf 'unexpected git invocation: %s\\n' \"$*\" >&2; exit 2 ;;",
      "esac",
      "",
    ].join("\n"),
    { mode: 0o755 },
  );
  const env = { PATH: `${bin}:/usr/bin:/bin`, TEST_OUTPUT: output };
  return {
    directory,
    run(script, extraEnv = {}) {
      rmSync(output, { force: true });
      const result = spawnSync(
        "/bin/bash",
        [path.join(root, "scripts", script)],
        {
          cwd: directory,
          env: { ...env, ...extraEnv },
          encoding: "utf8",
        },
      );
      const invoked = existsSync(output);
      const recorded = invoked
        ? JSON.parse(readFileSync(output, "utf8"))
        : { argv: [], env: {} };
      return { ...result, invoked, args: recorded.argv, env: recorded.env };
    },
  };
}

const dockerRun = (names) => [
  "run",
  "--rm",
  "-p",
  "8080:8080",
  ...names.flatMap((name) => ["-e", name]),
  "trendweight:local",
];

test("docker run passes secret names without evaluating or exposing values", (t) => {
  const setup = fixture(t);
  const secret = 'literal "quotes" $(exit 97) `exit 98` ; spaces';
  const result = setup.run("docker-run.sh", { Clerk__SecretKey: secret });
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(result.args, dockerRun(["Clerk__SecretKey"]));
  assert.equal(result.env.Clerk__SecretKey, secret);
  assert.equal(result.stdout.includes(secret), false);
  assert.equal(result.stderr.includes(secret), false);
});

test("docker run exports quoted .env values so docker can read them", (t) => {
  const setup = fixture(t);
  writeFileSync(
    path.join(setup.directory, ".env"),
    "AllowedHosts='localhost;127.0.0.1'\nSupabase__Url='https://example.supabase.co'\n",
  );
  const result = setup.run("docker-run.sh");
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(
    result.args,
    dockerRun(["Supabase__Url", "AllowedHosts"]),
    "only the variables present in .env are forwarded, in script order",
  );
  // `-e NAME` makes docker copy the value from its own environment, so the
  // sourced file must be exported (set -a), not merely read into the shell.
  assert.equal(result.env.Supabase__Url, "https://example.supabase.co");
  assert.equal(result.env.AllowedHosts, "localhost;127.0.0.1");
  assert.equal("Clerk__SecretKey" in result.env, false);
});

test("docker run forwards the public origin and optional development environment", (t) => {
  const result = fixture(t).run("docker-run.sh", {
    ASPNETCORE_ENVIRONMENT: "Development",
    PublicBaseUrl: "https://staging.trendweight.com",
    UNRELATED_VARIABLE: "must not be forwarded",
  });
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(
    result.args,
    dockerRun(["PublicBaseUrl", "ASPNETCORE_ENVIRONMENT"]),
  );
});

test("docker run forwards provider state signing and the Fitbit enable flag", (t) => {
  const secret = "synthetic-test-secret-not-a-real-credential";
  const result = fixture(t).run("docker-run.sh", {
    Jwt__SigningKey: secret,
    Fitbit__Enabled: "false",
  });
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(
    result.args,
    dockerRun(["Jwt__SigningKey", "Fitbit__Enabled"]),
  );
  assert.equal(result.env.Jwt__SigningKey, secret);
  assert.equal(result.stdout.includes(secret), false);
  assert.equal(result.stderr.includes(secret), false);
});

test("docker run forwards the rate limiting client address headers", (t) => {
  const result = fixture(t).run("docker-run.sh", {
    RateLimiting__ClientAddressHeaders: "do-connecting-ip;cf-connecting-ip",
  });
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(
    result.args,
    dockerRun(["RateLimiting__ClientAddressHeaders"]),
  );
  assert.equal(
    result.env.RateLimiting__ClientAddressHeaders,
    "do-connecting-ip;cf-connecting-ip",
  );
});

test("docker build passes browser configuration and git metadata as ordered build arguments", (t) => {
  const before = Date.now();
  const result = fixture(t).run("docker-build.sh", browserConfiguration);
  assert.equal(result.status, 0, result.stderr);
  const buildTime = result.args
    .find((arg) => arg.startsWith("BUILD_TIME="))
    ?.slice("BUILD_TIME=".length);
  assert.match(buildTime ?? "", ISO_UTC_SECONDS);
  const stamped = Date.parse(buildTime);
  assert.ok(
    stamped >= before - 1000 && stamped <= Date.now() + 1000,
    `BUILD_TIME ${buildTime} is not the current time`,
  );
  assert.deepEqual(result.args, [
    "build",
    "--build-arg",
    "VITE_CLERK_PUBLISHABLE_KEY=pk_test_example",
    "--build-arg",
    "VITE_SUPABASE_URL=https://example.supabase.co",
    "--build-arg",
    "VITE_SUPABASE_ANON_KEY=public-example-key",
    "--build-arg",
    `BUILD_TIME=${buildTime}`,
    "--build-arg",
    "BUILD_COMMIT=abc123",
    "--build-arg",
    "BUILD_BRANCH=feature/x",
    "--build-arg",
    "BUILD_VERSION=local",
    "--build-arg",
    "BUILD_REPO=example/trendweight",
    "-t",
    "trendweight:local",
    ".",
  ]);
});

test("docker build reads browser configuration from .env", (t) => {
  const setup = fixture(t);
  writeFileSync(
    path.join(setup.directory, ".env"),
    Object.entries(browserConfiguration)
      .map(([name, value]) => `${name}='${value}'`)
      .join("\n") + "\n",
  );
  const result = setup.run("docker-build.sh");
  assert.equal(result.status, 0, result.stderr);
  for (const [name, value] of Object.entries(browserConfiguration)) {
    assert.ok(
      result.args.includes(`${name}=${value}`),
      `${name} missing from ${JSON.stringify(result.args)}`,
    );
  }
});

for (const missing of Object.keys(browserConfiguration)) {
  test(`docker build fails before invoking docker when ${missing} is missing`, (t) => {
    const variables = { ...browserConfiguration };
    delete variables[missing];
    const result = fixture(t).run("docker-build.sh", variables);
    assert.notEqual(result.status, 0);
    assert.match(
      result.stderr,
      new RegExp(`${missing}: Set ${missing} in \\.env or the environment`),
    );
    assert.equal(result.invoked, false, "docker must not be invoked");
  });
}

test("docker build reduces the origin URL to owner/repo with or without a .git suffix", (t) => {
  const setup = fixture(t);
  const origins = [
    "https://github.com/example/trendweight.git",
    "https://github.com/example/trendweight",
    "https://github.com/example/trendweight/",
    "git@github.com:example/trendweight.git",
    "git@github.com:example/trendweight",
  ];
  for (const origin of origins) {
    const result = setup.run("docker-build.sh", {
      ...browserConfiguration,
      TEST_ORIGIN_URL: origin,
    });
    assert.equal(result.status, 0, result.stderr);
    assert.ok(
      result.args.includes("BUILD_REPO=example/trendweight"),
      `${origin} produced ${JSON.stringify(result.args.filter((a) => a.startsWith("BUILD_REPO=")))}`,
    );
  }
});

test("docker build keeps dots in repository names", (t) => {
  const result = fixture(t).run("docker-build.sh", {
    ...browserConfiguration,
    TEST_ORIGIN_URL: "https://github.com/example/trendweight.js.git",
  });
  assert.equal(result.status, 0, result.stderr);
  assert.ok(result.args.includes("BUILD_REPO=example/trendweight.js"));
});

test("docker build still succeeds with an empty BUILD_REPO when there is no origin remote", (t) => {
  const result = fixture(t).run("docker-build.sh", {
    ...browserConfiguration,
    TEST_NO_ORIGIN: "1",
  });
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(
    result.args.filter((arg) => arg.startsWith("BUILD_REPO=")),
    ["BUILD_REPO="],
  );
});

test("docker build defaults the version to local and honors an override", (t) => {
  const setup = fixture(t);
  const defaulted = setup.run("docker-build.sh", browserConfiguration);
  assert.equal(defaulted.status, 0, defaulted.stderr);
  assert.ok(defaulted.args.includes("BUILD_VERSION=local"));
  const overridden = setup.run("docker-build.sh", {
    ...browserConfiguration,
    BUILD_VERSION: "v9.9.9",
  });
  assert.equal(overridden.status, 0, overridden.stderr);
  assert.ok(overridden.args.includes("BUILD_VERSION=v9.9.9"));
});

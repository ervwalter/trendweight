import assert from "node:assert/strict";
import {
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

function fixture(t) {
  const directory = mkdtempSync(
    path.join(tmpdir(), "trendweight-docker-test-"),
  );
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const bin = path.join(directory, "bin");
  mkdirSync(bin);
  const output = path.join(directory, "docker-args.json");
  writeFileSync(
    path.join(bin, "docker"),
    `#!${process.execPath}\nimport('node:fs').then(fs => fs.writeFileSync(process.env.TEST_OUTPUT, JSON.stringify(process.argv.slice(2))));\n`,
    { mode: 0o755 },
  );
  writeFileSync(
    path.join(bin, "git"),
    "#!/bin/sh\nprintf '%s\\n' test-revision\n",
    { mode: 0o755 },
  );
  const env = { PATH: `${bin}:/usr/bin:/bin`, TEST_OUTPUT: output };
  return {
    directory,
    run(script, extraEnv = {}) {
      const result = spawnSync(
        "/bin/bash",
        [path.join(root, "scripts", script)],
        {
          cwd: directory,
          env: { ...env, ...extraEnv },
          encoding: "utf8",
        },
      );
      return {
        ...result,
        args:
          result.status === 0 ? JSON.parse(readFileSync(output, "utf8")) : [],
      };
    },
  };
}

test("docker run passes secret names without evaluating or exposing values", (t) => {
  const setup = fixture(t);
  const secret = 'literal "quotes" $(exit 97) `exit 98` ; spaces';
  const result = setup.run("docker-run.sh", { Clerk__SecretKey: secret });
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(result.args, [
    "run",
    "--rm",
    "-p",
    "8080:8080",
    "-e",
    "Clerk__SecretKey",
    "trendweight:local",
  ]);
  assert.equal(result.stdout.includes(secret), false);
  assert.equal(result.stderr.includes(secret), false);
});

test("docker run loads quoted local configuration and tolerates missing optional values", (t) => {
  const setup = fixture(t);
  writeFileSync(
    path.join(setup.directory, ".env"),
    "AllowedHosts='localhost;127.0.0.1'\nSupabase__Url='https://example.supabase.co'\n",
  );
  const result = setup.run("docker-run.sh");
  assert.equal(result.status, 0, result.stderr);
  assert.ok(result.args.includes("AllowedHosts"));
  assert.ok(result.args.includes("Supabase__Url"));
  assert.equal(result.args.includes("Clerk__SecretKey"), false);
});

test("docker build includes all browser configuration needed for startup", (t) => {
  const setup = fixture(t);
  const variables = {
    VITE_CLERK_PUBLISHABLE_KEY: "pk_test_example",
    VITE_SUPABASE_URL: "https://example.supabase.co",
    VITE_SUPABASE_ANON_KEY: "public-example-key",
  };
  const result = setup.run("docker-build.sh", variables);
  assert.equal(result.status, 0, result.stderr);
  for (const [name, value] of Object.entries(variables)) {
    assert.ok(result.args.includes(`${name}=${value}`));
  }
});

test("docker run forwards the public origin and optional development environment", (t) => {
  const result = fixture(t).run("docker-run.sh", {
    PublicBaseUrl: "https://staging.trendweight.com",
    ASPNETCORE_ENVIRONMENT: "Development",
  });
  assert.equal(result.status, 0, result.stderr);
  assert.ok(result.args.includes("PublicBaseUrl"));
  assert.ok(result.args.includes("ASPNETCORE_ENVIRONMENT"));
});

test("docker build fails early when required browser configuration is missing", (t) => {
  const setup = fixture(t);
  const result = setup.run("docker-build.sh", {
    VITE_CLERK_PUBLISHABLE_KEY: "pk_test_example",
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /VITE_SUPABASE_URL/);
});

test("docker run forwards provider state signing and the Fitbit enable flag", (t) => {
  const result = fixture(t).run("docker-run.sh", {
    Jwt__SigningKey: "synthetic-test-secret-not-a-real-credential",
    Fitbit__Enabled: "false",
  });
  assert.equal(result.status, 0, result.stderr);
  assert.ok(result.args.includes("Jwt__SigningKey"));
  assert.ok(result.args.includes("Fitbit__Enabled"));
  assert.equal(
    result.args.includes("synthetic-test-secret-not-a-real-credential"),
    false,
  );
});

test("docker build defaults the version to local and honors an override", (t) => {
  const setup = fixture(t);
  const variables = {
    VITE_CLERK_PUBLISHABLE_KEY: "pk_test_example",
    VITE_SUPABASE_URL: "https://example.supabase.co",
    VITE_SUPABASE_ANON_KEY: "public-example-key",
  };
  const defaulted = setup.run("docker-build.sh", variables);
  assert.equal(defaulted.status, 0, defaulted.stderr);
  assert.ok(defaulted.args.includes("BUILD_VERSION=local"));
  const overridden = setup.run("docker-build.sh", {
    ...variables,
    BUILD_VERSION: "v9.9.9",
  });
  assert.equal(overridden.status, 0, overridden.stderr);
  assert.ok(overridden.args.includes("BUILD_VERSION=v9.9.9"));
});

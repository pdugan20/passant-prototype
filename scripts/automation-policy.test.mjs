import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { basename, join } from "node:path";
import { test } from "node:test";
import { parse } from "yaml";

const root = join(import.meta.dirname, "..");
const workflowsDirectory = join(root, ".github", "workflows");
const dependabotConfig = join(root, ".github", "dependabot.yml");
const packageManifest = join(root, "package.json");

const workflowPermissions = {
  "ci.yml": { contents: "read" },
  "pr-lint.yml": { "pull-requests": "read" },
};

function read(path) {
  return readFileSync(path, "utf8");
}

function object(value, location) {
  assert.equal(typeof value, "object", `${location} must be a map`);
  assert.notEqual(value, null, `${location} must be a map`);
  assert.equal(Array.isArray(value), false, `${location} must be a map`);
  return value;
}

function workflowFiles() {
  return readdirSync(workflowsDirectory)
    .filter((entry) => /\.ya?ml$/.test(entry))
    .map((entry) => join(workflowsDirectory, entry));
}

function validateActionReferences(value, location) {
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      validateActionReferences(item, `${location}[${index}]`),
    );
    return;
  }

  if (typeof value !== "object" || value === null) return;

  for (const [key, child] of Object.entries(value)) {
    if (key === "uses") {
      assert.equal(typeof child, "string", `${location}.uses must be a string`);
      if (!child.startsWith("./") && !child.startsWith("docker://")) {
        assert.match(
          child,
          /^[^@\s]+@[0-9a-f]{40}$/,
          `${location}.uses must pin an external action to a full commit SHA`,
        );
      }
    }

    validateActionReferences(child, `${location}.${key}`);
  }
}

function validateNoMutationPath(source, location) {
  const forbidden = [
    /@latest\b/i,
    /\bgh\s+pr\s+(?:merge|review\b[^\n]*--approve)/i,
    /\bgh\s+api\b/i,
    /\bgraphql\b/i,
    /api\.github\.com/i,
    /enablePullRequestAutoMerge|mergePullRequest|addPullRequestReview/i,
    /enable-pull-request-automerge|auto-?approve/i,
  ];

  for (const pattern of forbidden) {
    assert.doesNotMatch(
      source,
      pattern,
      `${location} contains unsafe automation`,
    );
  }
}

function validateWorkflow(source, location) {
  const workflow = object(parse(source), location);
  const filename = basename(location);
  const expected = workflowPermissions[filename] ?? { contents: "read" };

  assert.deepEqual(
    object(workflow.permissions, `${location}.permissions`),
    expected,
    `${location} must declare its exact least-privilege permission map`,
  );
  validateActionReferences(workflow, location);
  validateNoMutationPath(source, location);

  const jobs = object(workflow.jobs, `${location}.jobs`);
  for (const [name, value] of Object.entries(jobs)) {
    const job = object(value, `${location}.jobs.${name}`);
    if (!("permissions" in job)) continue;
    const permissions = object(
      job.permissions,
      `${location}.jobs.${name}.permissions`,
    );
    for (const [scope, access] of Object.entries(permissions)) {
      assert.ok(
        access === "read" || access === "none",
        `${location}.jobs.${name}.permissions.${scope} must not escalate access`,
      );
    }
  }
}

function assertNodeJob(steps, jobName) {
  assert.ok(Array.isArray(steps), `${jobName}.steps must be a list`);
  const setupIndex = steps.findIndex(
    (step) =>
      object(step, `${jobName}.steps[]`).uses?.split("@")[0] ===
      "actions/setup-node",
  );
  const npmInstallIndex = steps.findIndex(
    (step) =>
      object(step, `${jobName}.steps[]`).run ===
      "npm install --global npm@11.5.2",
  );
  const npmVersionIndex = steps.findIndex(
    (step) =>
      object(step, `${jobName}.steps[]`).run ===
      'test "$(npm --version)" = "11.5.2"',
  );
  const npmCiIndex = steps.findIndex(
    (step) => object(step, `${jobName}.steps[]`).run === "npm ci",
  );

  assert.equal(
    object(steps[setupIndex], `${jobName} setup-node step`).with[
      "node-version"
    ],
    "22.18.0",
  );
  assert.ok(npmInstallIndex > setupIndex, `${jobName} must install exact npm`);
  assert.ok(
    npmVersionIndex > npmInstallIndex,
    `${jobName} must verify the npm runtime`,
  );
  assert.ok(
    npmCiIndex > npmVersionIndex,
    `${jobName} must verify npm before npm ci`,
  );
  return npmCiIndex;
}

test("all workflows are least-privilege, immutable, and mutation-free", () => {
  const files = workflowFiles();
  assert.ok(files.length > 0, "no workflow files found");
  for (const file of files) validateWorkflow(read(file), file);
});

test("the token-driven Dependabot auto-merge workflow is absent", () => {
  assert.equal(
    existsSync(join(workflowsDirectory, "dependabot-auto-merge.yml")),
    false,
  );
  assert.equal(
    existsSync(join(workflowsDirectory, "dependabot-auto-merge.yaml")),
    false,
  );
});

test("CI preserves stable contexts and installs deterministic tools", () => {
  const workflow = object(
    parse(read(join(workflowsDirectory, "ci.yml"))),
    "ci.yml",
  );
  const jobs = object(workflow.jobs, "ci.yml.jobs");
  assert.deepEqual(Object.keys(jobs), ["lint-and-typecheck", "claudelint"]);

  const app = object(jobs["lint-and-typecheck"], "lint-and-typecheck");
  const appInstallIndex = assertNodeJob(app.steps, "lint-and-typecheck");
  const policyIndex = app.steps.findIndex(
    (step) =>
      object(step, "lint-and-typecheck.steps[]").run ===
      "npm run test:automation-policy",
  );
  const formatIndex = app.steps.findIndex(
    (step) =>
      object(step, "lint-and-typecheck.steps[]").run === "npm run format:check",
  );
  assert.ok(policyIndex > appInstallIndex && policyIndex < formatIndex);

  const claude = object(jobs.claudelint, "claudelint");
  const claudeInstallIndex = assertNodeJob(claude.steps, "claudelint");
  const claudeLintIndex = claude.steps.findIndex(
    (step) => object(step, "claudelint.steps[]").run === "npm run lint:claude",
  );
  assert.ok(claudeLintIndex > claudeInstallIndex);
});

test("PR title validation preserves its required context", () => {
  const workflow = object(
    parse(read(join(workflowsDirectory, "pr-lint.yml"))),
    "pr-lint.yml",
  );
  const jobs = object(workflow.jobs, "pr-lint.yml.jobs");
  const title = object(
    jobs["validate-title"],
    "pr-lint.yml.jobs.validate-title",
  );
  assert.equal(title.name, "Validate PR Title");
});

test("Dependabot keeps patch/minor groups and isolates pre-1 dependencies", () => {
  const config = object(parse(read(dependabotConfig)), "dependabot.yml");
  assert.ok(
    Array.isArray(config.updates),
    "dependabot.yml.updates must be a list",
  );
  const updates = config.updates.map((value, index) =>
    object(value, `dependabot.yml.updates[${index}]`),
  );
  assert.deepEqual(
    updates.map((update) => update["package-ecosystem"]),
    ["npm", "github-actions"],
  );

  for (const update of updates) {
    assert.deepEqual(update.schedule, {
      interval: "weekly",
      day: "monday",
      time: "06:00",
      timezone: "America/New_York",
    });
    const groups = object(
      update.groups,
      `${update["package-ecosystem"]} groups`,
    );
    for (const [name, value] of Object.entries(groups)) {
      assert.deepEqual(
        object(value, `Dependabot group ${name}`)["update-types"],
        ["minor", "patch"],
        `Dependabot group ${name} must exclude majors`,
      );
    }
  }

  const npm = updates.find((update) => update["package-ecosystem"] === "npm");
  const actions = updates.find(
    (update) => update["package-ecosystem"] === "github-actions",
  );
  assert.equal(npm.directory, "/");
  assert.equal(actions.directory, "/");
  assert.equal(npm["open-pull-requests-limit"], 10);
  assert.equal(actions["open-pull-requests-limit"], 5);
  assert.deepEqual(npm["commit-message"], {
    prefix: "chore",
    include: "scope",
  });
  assert.deepEqual(actions["commit-message"], { prefix: "ci" });
  assert.deepEqual(npm.labels, ["dependencies", "npm"]);
  assert.deepEqual(actions.labels, ["dependencies", "github-actions"]);
  for (const update of updates) {
    assert.deepEqual(update.assignees, ["pdugan20"]);
    assert.deepEqual(update.reviewers, ["pdugan20"]);
  }
  assert.deepEqual(npm.ignore, [
    {
      "dependency-name": "*",
      "update-types": ["version-update:semver-major"],
    },
  ]);
  assert.deepEqual(
    object(npm.groups["dev-dependencies"], "dev group")["exclude-patterns"],
    ["@react-native/eslint-config"],
  );
  assert.deepEqual(
    object(npm.groups["production-dependencies"], "production group")[
      "exclude-patterns"
    ],
    ["@10play/tentap-editor", "react-native"],
  );
  assert.deepEqual(actions.groups["github-actions"].patterns, ["*"]);
});

test("the manifest declares exact local automation and toolchain contracts", () => {
  const manifest = JSON.parse(read(packageManifest));
  assert.deepEqual(manifest.engines, { node: "22.x", npm: "11.x" });
  assert.equal(manifest.packageManager, "npm@11.5.2");
  assert.equal(manifest.devDependencies?.["claude-code-lint"], "0.7.0");
  assert.equal(manifest.devDependencies?.yaml, "2.9.0");
  assert.equal(manifest.scripts?.["lint:claude"], "claudelint");
  assert.equal(
    manifest.scripts?.["test:automation-policy"],
    "node --test scripts/automation-policy.test.mjs",
  );
});

test("workflow validation fails closed for malformed or unsafe mechanisms", () => {
  const sha = "0123456789abcdef0123456789abcdef01234567";
  const fixture = (step) =>
    `permissions: { contents: read }\njobs: { test: { steps: [${step}] } }`;

  assert.doesNotThrow(() =>
    validateWorkflow(fixture(`{ uses: example/action@${sha} }`), "fixture.yml"),
  );
  assert.doesNotThrow(() =>
    validateWorkflow(fixture("{ uses: docker://alpine:3.22 }"), "fixture.yml"),
  );
  assert.throws(() => validateWorkflow("jobs: [", "fixture.yml"));
  assert.throws(() =>
    validateWorkflow("jobs: { test: { steps: [] } }", "fixture.yml"),
  );
  assert.throws(() =>
    validateWorkflow(
      "permissions: { contents: write }\njobs: { test: { steps: [] } }",
      "fixture.yml",
    ),
  );
  assert.throws(() =>
    validateWorkflow(fixture("{ uses: example/action@v1 }"), "fixture.yml"),
  );

  const unsafe = [
    `{ uses: peter-evans/enable-pull-request-automerge@${sha} }`,
    '{ run: "gh pr merge 1 --auto" }',
    '{ run: "gh pr review 1 --approve" }',
    '{ run: "gh api --method PUT repos/pdugan20/passant-prototype/pulls/1/merge" }',
    '{ run: "curl --request PUT https://api.github.com/repos/pdugan20/passant-prototype/pulls/1/merge" }',
    '{ run: "gh api graphql -f query=mutation" }',
  ];
  for (const step of unsafe) {
    assert.throws(() => validateWorkflow(fixture(step), "fixture.yml"));
  }
});

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

const approvedActions = new Map([
  ["actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1", "v7"],
  ["actions/setup-node@820762786026740c76f36085b0efc47a31fe5020", "v7"],
  [
    "amannn/action-semantic-pull-request@48f256284bd46cdaab1048c3721360e808335d50",
    "v6",
  ],
]);

const checkoutAction =
  "actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1";
const setupNodeAction =
  "actions/setup-node@820762786026740c76f36085b0efc47a31fe5020";
const semanticTitleAction =
  "amannn/action-semantic-pull-request@48f256284bd46cdaab1048c3721360e808335d50";

const approvedWorkflowSteps = {
  "ci.yml": new Map([
    ["workflow.jobs.lint-and-typecheck.steps[0]", { uses: checkoutAction }],
    [
      "workflow.jobs.lint-and-typecheck.steps[1]",
      {
        name: "Use Node.js 22.18.0",
        uses: setupNodeAction,
        with: { "node-version": "22.18.0", cache: "npm" },
      },
    ],
    [
      "workflow.jobs.lint-and-typecheck.steps[2]",
      {
        name: "Install npm 11.5.2",
        run: "npm install --global npm@11.5.2",
      },
    ],
    [
      "workflow.jobs.lint-and-typecheck.steps[3]",
      {
        name: "Verify npm version",
        run: 'test "$(npm --version)" = "11.5.2"',
      },
    ],
    [
      "workflow.jobs.lint-and-typecheck.steps[4]",
      { name: "Install dependencies", run: "npm ci" },
    ],
    [
      "workflow.jobs.lint-and-typecheck.steps[5]",
      {
        name: "Validate automation policy",
        run: "npm run test:automation-policy",
      },
    ],
    [
      "workflow.jobs.lint-and-typecheck.steps[6]",
      { name: "Check formatting", run: "npm run format:check" },
    ],
    [
      "workflow.jobs.lint-and-typecheck.steps[7]",
      { name: "Lint", run: "npm run lint" },
    ],
    [
      "workflow.jobs.lint-and-typecheck.steps[8]",
      { name: "Type check", run: "npm run typecheck" },
    ],
    ["workflow.jobs.claudelint.steps[0]", { uses: checkoutAction }],
    [
      "workflow.jobs.claudelint.steps[1]",
      {
        name: "Use Node.js 22.18.0",
        uses: setupNodeAction,
        with: { "node-version": "22.18.0", cache: "npm" },
      },
    ],
    [
      "workflow.jobs.claudelint.steps[2]",
      {
        name: "Install npm 11.5.2",
        run: "npm install --global npm@11.5.2",
      },
    ],
    [
      "workflow.jobs.claudelint.steps[3]",
      {
        name: "Verify npm version",
        run: 'test "$(npm --version)" = "11.5.2"',
      },
    ],
    [
      "workflow.jobs.claudelint.steps[4]",
      { name: "Install dependencies", run: "npm ci" },
    ],
    [
      "workflow.jobs.claudelint.steps[5]",
      { name: "Lint Claude Code config", run: "npm run lint:claude" },
    ],
  ]),
  "pr-lint.yml": new Map([
    [
      "workflow.jobs.validate-title.steps[0]",
      {
        uses: semanticTitleAction,
        with: {
          types:
            "feat\nfix\nperf\nrefactor\nrevert\ndocs\nstyle\ntest\nbuild\nci\nchore\ndeps\n",
          requireScope: false,
          subjectPattern: "^[a-z].*$",
          subjectPatternError:
            "The subject must start with a lowercase letter.\n",
        },
        env: { GITHUB_TOKEN: "${{ secrets.GITHUB_TOKEN }}" },
      },
    ],
  ]),
  "fixture.yml": new Map([
    ["workflow.jobs.test.steps[0]", { uses: checkoutAction }],
  ]),
};

const approvedCredentialExpressions = {
  "pr-lint.yml": [
    {
      location: "workflow.jobs.validate-title.steps[0].env.GITHUB_TOKEN",
      value: "${{ secrets.GITHUB_TOKEN }}",
      expressions: ["${{ secrets.GITHUB_TOKEN }}"],
    },
  ],
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

function extractWorkflowExpressions(value, location = "workflow value") {
  const expressions = [];
  let cursor = 0;

  while (cursor < value.length) {
    const start = value.indexOf("${{", cursor);
    if (start === -1) break;

    let quote = null;
    let end = -1;
    for (let index = start + 3; index < value.length; index += 1) {
      const character = value[index];

      if (quote !== null) {
        if (character === quote) {
          if (quote === "'" && value[index + 1] === "'") {
            index += 1;
          } else {
            quote = null;
          }
        } else if (quote === '"' && character === "\\") {
          index += 1;
        }
        continue;
      }

      if (character === "'" || character === '"') {
        quote = character;
      } else if (character === "}" && value[index + 1] === "}") {
        end = index + 2;
        break;
      }
    }

    assert.notEqual(end, -1, `${location} contains an unterminated expression`);
    expressions.push(value.slice(start, end));
    cursor = end;
  }

  return expressions;
}

function collectTrustInputs(value, location, inputs) {
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      collectTrustInputs(item, `${location}[${index}]`, inputs),
    );
    return;
  }

  if (typeof value !== "object" || value === null) return;

  if (/\.steps\[\d+\]$/.test(location)) {
    inputs.steps.push({ location, value });
  }

  for (const [key, child] of Object.entries(value)) {
    if (key === "uses") {
      assert.equal(typeof child, "string", `${location}.uses must be a string`);
      inputs.actions.push(child);
    }

    if (typeof child === "string") {
      const expressions = extractWorkflowExpressions(
        child,
        `${location}.${key}`,
      );
      if (expressions.length > 0) {
        inputs.credentials.push({
          location: `${location}.${key}`,
          value: child,
          expressions,
        });
      }
    }

    collectTrustInputs(child, `${location}.${key}`, inputs);
  }
}

function validateTrustSurface(workflow, source, filename, location) {
  const inputs = { actions: [], steps: [], credentials: [] };
  collectTrustInputs(workflow, "workflow", inputs);

  for (const action of inputs.actions) {
    assert.ok(
      approvedActions.has(action),
      `${location} uses unapproved action ${action}`,
    );
  }

  const annotatedActions = source
    .split("\n")
    .map((line) => line.match(/^\s*(?:-\s+)?uses:\s+(\S+)\s+#\s+(v\d+)\s*$/))
    .filter(Boolean)
    .map((match) => ({ action: match[1], version: match[2] }));
  assert.deepEqual(
    annotatedActions,
    inputs.actions.map((action) => ({
      action,
      version: approvedActions.get(action),
    })),
    `${location} action references must include their approved version comments`,
  );

  assert.deepEqual(
    inputs.steps,
    [...(approvedWorkflowSteps[filename] ?? new Map())].map(
      ([stepLocation, value]) => ({ location: stepLocation, value }),
    ),
    `${location} contains unapproved workflow step fields or values`,
  );

  assert.deepEqual(
    inputs.credentials,
    approvedCredentialExpressions[filename] ?? [],
    `${location} contains unapproved credential expressions`,
  );
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
  validateTrustSurface(workflow, source, filename, location);

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
  assert.deepEqual(manifest.engines, { node: "22.18.0", npm: "11.5.2" });
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
  const checkout = "actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1";
  const blockFixture = (step) =>
    `permissions:\n  contents: read\njobs:\n  test:\n    steps:\n      - ${step}\n`;
  const ciSource = read(join(workflowsDirectory, "ci.yml"));
  const prLintSource = read(join(workflowsDirectory, "pr-lint.yml"));

  assert.doesNotThrow(() =>
    validateWorkflow(blockFixture(`uses: ${checkout} # v7`), "fixture.yml"),
  );
  assert.throws(() =>
    validateWorkflow(blockFixture(`uses: ${checkout}`), "fixture.yml"),
  );
  assert.throws(() =>
    validateWorkflow(fixture(`{ uses: example/action@${sha} }`), "fixture.yml"),
  );
  assert.throws(() =>
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
  assert.throws(() =>
    validateWorkflow(
      blockFixture(
        `uses: pascalgn/automerge-action@${sha} # v1\n        env:\n          GITHUB_TOKEN: "\${{ secrets.AUTOMERGE_PAT }}"`,
      ),
      "fixture.yml",
    ),
  );
  assert.throws(() =>
    validateWorkflow(
      blockFixture(
        `uses: ${checkout} # v7\n        env:\n          GITHUB_TOKEN: "\${{ secrets.UNKNOWN_PAT }}"`,
      ),
      "fixture.yml",
    ),
  );
  assert.throws(() =>
    validateWorkflow(
      blockFixture(
        `uses: ${checkout} # v7\n        env:\n          GITHUB_TOKEN: "\${{ secrets['AUTOMERGE_PAT'] }}"`,
      ),
      "fixture.yml",
    ),
  );
  assert.throws(() =>
    validateWorkflow(
      blockFixture(
        `uses: ${checkout} # v7\n        env:\n          GITHUB_TOKEN: "\${{ vars.AUTOMERGE_PAT }}"`,
      ),
      "fixture.yml",
    ),
  );
  assert.throws(() =>
    validateWorkflow(
      blockFixture(
        `uses: ${checkout} # v7\n        env:\n          GITHUB_TOKEN: "\${{ secrets[format('{0}', 'AUTOMERGE_PAT')] }}"`,
      ),
      "fixture.yml",
    ),
  );
  assert.throws(() =>
    validateWorkflow(
      prLintSource.replace(
        "        with:\n",
        "        with:\n          githubBaseUrl: https://attacker.example\n",
      ),
      "pr-lint.yml",
    ),
  );
  assert.throws(() =>
    validateWorkflow(
      prLintSource.replace(
        / {10}types: \|\n(?: {12}[^\n]+\n)+/,
        '          types: ".*"\n',
      ),
      "pr-lint.yml",
    ),
  );

  const stepFieldBypasses = [
    "        shell: bash -c 'gh pr merge 1 --auto; exec bash {0}'",
    "        if: false",
    "        working-directory: /tmp",
    "        continue-on-error: true",
    "        env:\n          NODE_OPTIONS: --require=/tmp/payload.cjs",
  ];
  for (const field of stepFieldBypasses) {
    assert.throws(() =>
      validateWorkflow(
        ciSource.replace(
          "        run: npm ci",
          `        run: npm ci\n${field}`,
        ),
        "ci.yml",
      ),
    );
  }

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

test("workflow expression extraction handles braces inside format calls", () => {
  const expression = "${{ secrets[format('{0}', 'AUTOMERGE_PAT')] }}";
  assert.deepEqual(extractWorkflowExpressions(expression), [expression]);
});

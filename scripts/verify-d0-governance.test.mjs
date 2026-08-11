import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  extractAuthorityMap,
  verifyAuthorityMaps,
  verifyD0Governance,
} from "./verify-d0-governance.mjs";

const root = path.resolve(import.meta.dirname, "..");

const FIXTURE_FILES = [
  ".gitattributes",
  "AGENTS.md",
  ".codex/README.md",
  ".codex/agents/pm.toml",
  ".codex/agents/tech_lead.toml",
  ".agents/skills/UPSTREAM_PROVENANCE.md",
  ".agents/skills/create-architectural-decision-record/SKILL.md",
  "THIRD_PARTY_NOTICES.md",
  "docs/tech-governance.md",
  "docs/threat-model.md",
  "docs/adr/adr-0009-application-graph-v2-shared-contract.md",
  "docs/iterations/2026-08-10-prompt-to-polished-product-reset.md",
  "docs/superpowers/specs/2026-08-10-prompt-to-polished-restaurant-product-design.md",
  "docs/superpowers/plans/2026-08-10-prompt-to-polished-restaurant-product.md",
  "docs/superpowers/ledgers/2026-08-10-prompt-to-polished-restaurant-product.md",
  "docs/research/2026-08-10-product-builder-ui-ecosystem.md",
  "docs/agent-workstreams/2026-08-10-archeform-codex-iteration.md",
  "package.json",
  "apps/workbench/package.json",
  "apps/control-plane/package.json",
  "apps/compiler-worker/package.json",
  "pnpm-lock.yaml",
  "apps/workbench/Dockerfile",
  "apps/control-plane/Dockerfile",
  "apps/compiler-worker/Dockerfile",
  "infra/docker-compose.yml",
];

const SUPERPOWERS_DIRECTORIES = [
  "brainstorming",
  "dispatching-parallel-agents",
  "executing-plans",
  "finishing-a-development-branch",
  "receiving-code-review",
  "requesting-code-review",
  "subagent-driven-development",
  "systematic-debugging",
  "test-driven-development",
  "using-git-worktrees",
  "using-superpowers",
  "verification-before-completion",
  "writing-plans",
  "writing-skills",
];

function makeFixture(t) {
  const fixtureRoot = mkdtempSync(path.join(tmpdir(), "archeform-d0-"));
  t.after(() => rmSync(fixtureRoot, { recursive: true, force: true }));

  for (const relativePath of FIXTURE_FILES) {
    const target = path.join(fixtureRoot, relativePath);
    mkdirSync(path.dirname(target), { recursive: true });
    cpSync(path.join(root, relativePath), target);
  }
  for (const directory of SUPERPOWERS_DIRECTORIES) {
    const relativePath = `.agents/skills/${directory}`;
    cpSync(
      path.join(root, relativePath),
      path.join(fixtureRoot, relativePath),
      {
        recursive: true,
      },
    );
  }

  execFileSync("git", ["init", "--quiet"], { cwd: fixtureRoot });
  execFileSync("git", ["config", "core.autocrlf", "false"], {
    cwd: fixtureRoot,
  });
  execFileSync(
    "git",
    [
      "add",
      "--",
      ...SUPERPOWERS_DIRECTORIES.map(
        (directory) => `.agents/skills/${directory}/**`,
      ),
    ],
    { cwd: fixtureRoot, stdio: "ignore" },
  );
  return fixtureRoot;
}

function replaceFixtureText(fixtureRoot, relativePath, from, to) {
  const absolutePath = path.join(fixtureRoot, relativePath);
  const current = readFileSync(absolutePath, "utf8");
  assert.ok(current.includes(from), `${relativePath} must contain ${from}`);
  writeFileSync(absolutePath, current.replace(from, to));
}

function mutateFixtureText(fixtureRoot, relativePath, mutate) {
  const absolutePath = path.join(fixtureRoot, relativePath);
  const current = readFileSync(absolutePath, "utf8");
  const updated = mutate(current);
  assert.notEqual(
    updated,
    current,
    `${relativePath} mutation must change text`,
  );
  writeFileSync(absolutePath, updated);
}

function removeAcceptedLedgerTransition(fixtureRoot) {
  mutateFixtureText(
    fixtureRoot,
    "docs/superpowers/ledgers/2026-08-10-prompt-to-polished-restaurant-product.md",
    (current) => {
      const start = current.indexOf(
        "- Founder decision for the exact ADR-0009 accept/reject gate is recorded",
      );
      const end = current.indexOf("\n## Task 1 —", start);
      assert.ok(
        start >= 0 && end > start,
        "accepted ledger transition must exist",
      );
      return `${current.slice(0, start)}${current.slice(end + 1)}`;
    },
  );
}

function setAcceptedAdrToProposed(fixtureRoot) {
  mutateFixtureText(
    fixtureRoot,
    "docs/adr/adr-0009-application-graph-v2-shared-contract.md",
    (current) =>
      current
        .replace('status: "Accepted"', 'status: "Proposed"')
        .replace(/^decision_date:.*\n/m, "")
        .replace(/^decision_source:.*\n/m, "")
        .replace(
          "**Accepted — 2026-08-11. Decision source: founder chat.**",
          "**Proposed — founder accept/reject decision required.**",
        )
        .replace(
          /Decision: \*\*Accepted\*\*\.[\s\S]*?Founder response: `接受，继续`\./,
          "Decision: **not recorded**.",
        ),
  );
}

function setFixtureD0State(fixtureRoot, state) {
  const relativePath =
    "docs/superpowers/ledgers/2026-08-10-prompt-to-polished-restaurant-product.md";
  const absolutePath = path.join(fixtureRoot, relativePath);
  const current = readFileSync(absolutePath, "utf8");
  const updated = current.replace(
    /(## D0 — Record the product reset and freeze scope[\s\S]*?State: `)[^`]+(`\.)/,
    `$1${state}$2`,
  );
  assert.match(
    updated,
    new RegExp(
      `## D0 — Record the product reset and freeze scope[\\s\\S]*?State: \`${state}\`\\.`,
    ),
    `${relativePath} must expose the requested D0 state`,
  );
  writeFileSync(absolutePath, updated);
}

function replaceLedgerSectionText(fixtureRoot, heading, from, to) {
  mutateFixtureText(
    fixtureRoot,
    "docs/superpowers/ledgers/2026-08-10-prompt-to-polished-restaurant-product.md",
    (current) => {
      const start = current.indexOf(`## ${heading}`);
      const end = current.indexOf("\n## ", start + 3);
      assert.ok(start >= 0, `ledger section ${heading} must exist`);
      const section = current.slice(start, end < 0 ? undefined : end);
      assert.ok(
        section.includes(from),
        `ledger section ${heading} must contain ${from}`,
      );
      const updatedSection = section.replace(from, to);
      return `${current.slice(0, start)}${updatedSection}${
        end < 0 ? "" : current.slice(end)
      }`;
    },
  );
}

function appendLedgerSectionText(fixtureRoot, heading, text) {
  mutateFixtureText(
    fixtureRoot,
    "docs/superpowers/ledgers/2026-08-10-prompt-to-polished-restaurant-product.md",
    (current) => {
      const start = current.indexOf(`## ${heading}`);
      const end = current.indexOf("\n## ", start + 3);
      assert.ok(
        start >= 0 && end > start,
        `ledger section ${heading} must exist`,
      );
      return `${current.slice(0, end)}\n\n- ${text}${current.slice(end)}`;
    },
  );
}

function truncateLedgerSectionFrom(fixtureRoot, heading, marker) {
  mutateFixtureText(
    fixtureRoot,
    "docs/superpowers/ledgers/2026-08-10-prompt-to-polished-restaurant-product.md",
    (current) => {
      const sectionStart = current.indexOf(`## ${heading}`);
      const sectionEnd = current.indexOf("\n## ", sectionStart + 3);
      const markerStart = current.indexOf(marker, sectionStart);
      assert.ok(
        sectionStart >= 0 &&
          sectionEnd > sectionStart &&
          markerStart > sectionStart &&
          markerStart < sectionEnd,
        `ledger section ${heading} must contain ${marker}`,
      );
      return `${current.slice(0, markerStart)}${current.slice(sectionEnd)}`;
    },
  );
}

function prepareAuthorizedImplementingFixture(fixtureRoot) {
  setFixtureD0State(fixtureRoot, "implementing");
  truncateLedgerSectionFrom(
    fixtureRoot,
    "Task 0 — Seal Honest Requirement-to-Product Closure",
    "- PM re-accepts D0 on 2026-08-12.",
  );
}

function prepareReadyForQaFixture(fixtureRoot) {
  setFixtureD0State(fixtureRoot, "ready_for_qa");
  replaceLedgerSectionText(
    fixtureRoot,
    "Task 0 — Seal Honest Requirement-to-Product Closure",
    "Prettier, and diff/whitespace checks pass.\n- D0 advances to `ready_for_qa`.",
    "Prettier, and diff/whitespace checks pass. D0 advances to `ready_for_qa`.",
  );
  truncateLedgerSectionFrom(
    fixtureRoot,
    "Task 0 — Seal Honest Requirement-to-Product Closure",
    "- Terra QA stops before the full run and returns `FAIL`",
  );
}

function mutateGoldenProfileTable(fixtureRoot, mutate) {
  mutateFixtureText(fixtureRoot, "docs/tech-governance.md", (current) => {
    const startMarker = "<!-- d0-golden-profile:start -->";
    const endMarker = "<!-- d0-golden-profile:end -->";
    assert.ok(
      current.includes(startMarker),
      "Golden profile start marker must exist",
    );
    assert.ok(
      current.includes(endMarker),
      "Golden profile end marker must exist",
    );
    return mutate(current);
  });
}

function replaceGoldenProfileRowValue(fixtureRoot, rowId, from, to) {
  mutateGoldenProfileTable(fixtureRoot, (current) => {
    const rowPattern = new RegExp(
      `^\\|\\s*[^|\\n]+\\|\\s*${rowId}\\s*\\|[^\\n]*$`,
      "m",
    );
    const row = current.match(rowPattern)?.[0];
    assert.ok(row, `Golden profile row ${rowId} must exist`);
    assert.ok(
      row.includes(from),
      `Golden profile row ${rowId} must contain ${from}`,
    );
    return current.replace(row, row.replace(from, to));
  });
}

function assertIssue(issues, fragment) {
  assert.ok(
    issues.some((issue) => issue.includes(fragment)),
    `expected an issue containing "${fragment}", received: ${issues.join("; ")}`,
  );
}

test("the checked-in D0 governance contract is complete", () => {
  assert.deepEqual(verifyD0Governance(root), []);
});

test("governance rejects awaiting an already-recorded ADR-0009 founder decision", (t) => {
  const fixtureRoot = makeFixture(t);
  mutateFixtureText(
    fixtureRoot,
    "docs/tech-governance.md",
    (current) =>
      `${current}\nThe additive \`factory.application-graph/v2\` shared data contract is currently a proposal. D0 remains \`implementing\` until the founder decision gate is satisfied.\n`,
  );

  assertIssue(
    verifyD0Governance(fixtureRoot),
    "must record ADR-0009 as founder-accepted",
  );
});

test("governance rejects embedded live D0 task state", (t) => {
  const fixtureRoot = makeFixture(t);
  mutateFixtureText(
    fixtureRoot,
    "docs/tech-governance.md",
    (current) =>
      `${current}\nD0 remains \`implementing\`; Task 1 cannot begin yet.\n`,
  );

  assertIssue(
    verifyD0Governance(fixtureRoot),
    "must not contain live D0 or Task 1 state",
  );
});

test("workstream recovery rejects a checkpoint-specific task snapshot", (t) => {
  const fixtureRoot = makeFixture(t);
  mutateFixtureText(
    fixtureRoot,
    "docs/agent-workstreams/2026-08-10-archeform-codex-iteration.md",
    (current) =>
      `${current}\nCurrent checkpoint: D0 is the first active gate; Task 1 is blocked.\n`,
  );

  assertIssue(
    verifyD0Governance(fixtureRoot),
    "must not embed a current checkpoint",
  );
});

test("workstream recovery rejects replaying the consumed ADR founder gate", (t) => {
  const fixtureRoot = makeFixture(t);
  mutateFixtureText(
    fixtureRoot,
    "docs/agent-workstreams/2026-08-10-archeform-codex-iteration.md",
    (current) =>
      `${current}\nAfter independent Sol review and Terra QA, stop for the founder to explicitly\naccept or reject the proposed Graph V2 ADR.\n`,
  );

  assertIssue(
    verifyD0Governance(fixtureRoot),
    "must not replay the consumed ADR-0009 founder gate",
  );
});

test("workstream verification does not let the launch prompt substitute for recovery", (t) => {
  const fixtureRoot = makeFixture(t);
  mutateFixtureText(
    fixtureRoot,
    "docs/agent-workstreams/2026-08-10-archeform-codex-iteration.md",
    (current) => {
      const start = current.indexOf("## Ledger-state-driven recovery");
      const end = current.indexOf("\n## ", start + 3);
      assert.ok(start >= 0 && end > start, "recovery section must exist");
      const section = current.slice(start, end);
      const updated = section.replace(
        "1. Reconcile any in-flight accepted/review/commit/push handoff first against",
        "1. Ignore any in-flight accepted/review/commit/push handoff even though",
      );
      assert.notEqual(
        updated,
        section,
        "recovery mutation must change the section",
      );
      return `${current.slice(0, start)}${updated}${current.slice(end)}`;
    },
  );

  assertIssue(
    verifyD0Governance(fixtureRoot),
    "missing in-flight handoff first",
  );
});

test("authority verification rejects one document drifting from the shared map", () => {
  const resetPath =
    "docs/iterations/2026-08-10-prompt-to-polished-product-reset.md";
  const reset = readFileSync(path.join(root, resetPath), "utf8");
  const block = extractAuthorityMap(reset);
  assert.ok(block, "the checked-in reset must expose the shared authority map");

  const drifted = reset.replace(
    "the design owns the product contract",
    "the design owns live state",
  );
  const issues = verifyAuthorityMaps([
    [resetPath, reset],
    ["drifted.md", drifted],
  ]);
  assert.ok(
    issues.some((issue) => issue.includes("authority map differs")),
    `expected authority drift failure, received: ${issues.join("; ")}`,
  );
});

test("authority verification rejects a missing mutual link", () => {
  const resetPath =
    "docs/iterations/2026-08-10-prompt-to-polished-product-reset.md";
  const reset = readFileSync(path.join(root, resetPath), "utf8");
  const mutated = reset.replace(
    "docs/research/2026-08-10-product-builder-ui-ecosystem.md",
    "docs/research/missing.md",
  );
  const issues = verifyAuthorityMaps([[resetPath, mutated]]);
  assert.ok(
    issues.some((issue) => issue.includes("authority map omits")),
    `expected missing-link failure, received: ${issues.join("; ")}`,
  );
});

test("repository verification includes the ledger in five-way authority equivalence", (t) => {
  const fixtureRoot = makeFixture(t);
  replaceFixtureText(
    fixtureRoot,
    "docs/superpowers/ledgers/2026-08-10-prompt-to-polished-restaurant-product.md",
    "the reset records founder decisions",
    "the reset records reviewer notes",
  );

  assertIssue(verifyD0Governance(fixtureRoot), "authority map differs");
});

test("current governance rejects reverting ADR-0009 and its decision ledger to Proposed", (t) => {
  const fixtureRoot = makeFixture(t);
  setAcceptedAdrToProposed(fixtureRoot);
  removeAcceptedLedgerTransition(fixtureRoot);

  assertIssue(
    verifyD0Governance(fixtureRoot),
    "founder-accepted governance conflicts with Proposed ADR-0009",
  );
});

test("decision-aware verification requires exactly one founder decision marker", (t) => {
  const fixtureRoot = makeFixture(t);
  replaceFixtureText(
    fixtureRoot,
    "docs/adr/adr-0009-application-graph-v2-shared-contract.md",
    "Decision: **Accepted**.",
    "Decision: **Accepted**.\n\nDecision: **not recorded**.",
  );

  assertIssue(
    verifyD0Governance(fixtureRoot),
    "exactly one recognized founder decision marker",
  );
});

test("decision-aware verification rejects Proposed with orphan visible acceptance metadata", (t) => {
  const fixtureRoot = makeFixture(t);
  setAcceptedAdrToProposed(fixtureRoot);
  removeAcceptedLedgerTransition(fixtureRoot);
  replaceFixtureText(
    fixtureRoot,
    "docs/adr/adr-0009-application-graph-v2-shared-contract.md",
    "Decision: **not recorded**.",
    "Decision: **not recorded**.\n\nDate: **2026-08-11**.",
  );

  assertIssue(
    verifyD0Governance(fixtureRoot),
    "Proposed ADR conflicts with recorded founder acceptance",
  );
});

test("decision-aware verification rejects Accepted without an explicit founder decision", (t) => {
  const fixtureRoot = makeFixture(t);
  replaceFixtureText(
    fixtureRoot,
    "docs/adr/adr-0009-application-graph-v2-shared-contract.md",
    "Decision: **Accepted**.",
    "Decision: **not recorded**.",
  );

  assertIssue(
    verifyD0Governance(fixtureRoot),
    "Accepted ADR must record explicit founder acceptance",
  );
});

test("decision-aware verification rejects Accepted without a decision date", (t) => {
  const fixtureRoot = makeFixture(t);
  replaceFixtureText(
    fixtureRoot,
    "docs/adr/adr-0009-application-graph-v2-shared-contract.md",
    'decision_date: "2026-08-11"',
    'decision_date: ""',
  );

  assertIssue(
    verifyD0Governance(fixtureRoot),
    "Accepted ADR must record decision date",
  );
});

test("decision-aware verification rejects Accepted without a decision source", (t) => {
  const fixtureRoot = makeFixture(t);
  replaceFixtureText(
    fixtureRoot,
    "docs/adr/adr-0009-application-graph-v2-shared-contract.md",
    'decision_source: "Founder chat"',
    'decision_source: ""',
  );

  assertIssue(
    verifyD0Governance(fixtureRoot),
    "Accepted ADR must record decision source",
  );
});

test("decision-aware verification rejects Proposed while acceptance is recorded", (t) => {
  const fixtureRoot = makeFixture(t);
  replaceFixtureText(
    fixtureRoot,
    "docs/adr/adr-0009-application-graph-v2-shared-contract.md",
    'status: "Accepted"',
    'status: "Proposed"',
  );

  assertIssue(
    verifyD0Governance(fixtureRoot),
    "Proposed ADR conflicts with recorded founder acceptance",
  );
});

test("decision-aware verification never infers acceptance from design or plan", (t) => {
  const fixtureRoot = makeFixture(t);
  removeAcceptedLedgerTransition(fixtureRoot);
  mutateFixtureText(
    fixtureRoot,
    "docs/adr/adr-0009-application-graph-v2-shared-contract.md",
    (current) =>
      current
        .replace(/^decision_date:.*\n/m, "")
        .replace(/^decision_source:.*\n/m, "")
        .replace(
          /Decision: \*\*Accepted\*\*\.[\s\S]*?Founder response: `接受，继续`\./,
          "Decision: **not recorded**.",
        ),
  );

  assertIssue(
    verifyD0Governance(fixtureRoot),
    "ADR acceptance cannot be inferred from design or plan",
  );
});

test("ledger verification accepts the recorded D0 PM acceptance transition", (t) => {
  const fixtureRoot = makeFixture(t);
  setFixtureD0State(fixtureRoot, "accepted");

  assert.deepEqual(verifyD0Governance(fixtureRoot), []);
});

test("ledger verification accepts the reviewed pre-accept state", (t) => {
  const fixtureRoot = makeFixture(t);
  setFixtureD0State(fixtureRoot, "reviewed");

  assert.deepEqual(verifyD0Governance(fixtureRoot), []);
});

test("ledger verification accepts the authorized post-accept repair state", (t) => {
  const fixtureRoot = makeFixture(t);
  prepareAuthorizedImplementingFixture(fixtureRoot);

  assert.deepEqual(verifyD0Governance(fixtureRoot), []);
});

test("ledger verification rejects an unauthorized post-accept repair state", (t) => {
  const fixtureRoot = makeFixture(t);
  prepareAuthorizedImplementingFixture(fixtureRoot);
  replaceFixtureText(
    fixtureRoot,
    "docs/superpowers/ledgers/2026-08-10-prompt-to-polished-restaurant-product.md",
    "reopens exactly one minimal D0 post-accept transition repair.",
    "does not reopen a D0 post-accept transition repair.",
  );

  assertIssue(
    verifyD0Governance(fixtureRoot),
    "implementing D0 State requires exactly one complete post-accept repair authorization record",
  );
});

test("ledger verification rejects stale post-accept repair authority after PM re-acceptance", (t) => {
  const fixtureRoot = makeFixture(t);
  setFixtureD0State(fixtureRoot, "implementing");

  assertIssue(
    verifyD0Governance(fixtureRoot),
    "post-accept repair authorization is superseded or consumed by a later ledger record",
  );
});

test("ledger verification rejects post-accept repair markers split across records", (t) => {
  const fixtureRoot = makeFixture(t);
  prepareAuthorizedImplementingFixture(fixtureRoot);
  replaceLedgerSectionText(
    fixtureRoot,
    "Task 0 — Seal Honest Requirement-to-Product Closure",
    "and failed-delivery history. D0 moves to `implementing` only for this repair;",
    "and failed-delivery history.\n- D0 moves to `implementing` only for this repair;",
  );

  assertIssue(
    verifyD0Governance(fixtureRoot),
    "implementing D0 State requires exactly one complete post-accept repair authorization record",
  );
});

for (const [label, record] of [
  [
    "revocation",
    "The D0 post-accept transition repair authorization is revoked.",
  ],
  [
    "delivery consumption",
    "D0 delivery acceptance consumes the post-accept transition repair authorization.",
  ],
]) {
  test(`ledger verification rejects post-accept repair authority after later ${label}`, (t) => {
    const fixtureRoot = makeFixture(t);
    prepareAuthorizedImplementingFixture(fixtureRoot);
    appendLedgerSectionText(
      fixtureRoot,
      "Task 0 — Seal Honest Requirement-to-Product Closure",
      record,
    );

    assertIssue(
      verifyD0Governance(fixtureRoot),
      "post-accept repair authorization is superseded or consumed by a later ledger record",
    );
  });
}

test("ledger verification rejects duplicate post-accept repair authorization records", (t) => {
  const fixtureRoot = makeFixture(t);
  prepareAuthorizedImplementingFixture(fixtureRoot);
  appendLedgerSectionText(
    fixtureRoot,
    "Task 0 — Seal Honest Requirement-to-Product Closure",
    "The founder explicitly responds `接受，继续`. This is new authority from founder chat dated 2026-08-12 and reopens exactly one minimal D0 post-accept transition repair. D0 moves to `implementing` only for this repair;",
  );

  assertIssue(
    verifyD0Governance(fixtureRoot),
    "implementing D0 State requires exactly one complete post-accept repair authorization record",
  );
});

test("ledger verification rejects D0 acceptance with an unaccepted ADR", (t) => {
  const fixtureRoot = makeFixture(t);
  setFixtureD0State(fixtureRoot, "accepted");
  setAcceptedAdrToProposed(fixtureRoot);

  assertIssue(
    verifyD0Governance(fixtureRoot),
    "founder-accepted governance conflicts with Proposed ADR-0009",
  );
});

test("ledger verification rejects D0 acceptance with premature Task 1 implementation", (t) => {
  const fixtureRoot = makeFixture(t);
  setFixtureD0State(fixtureRoot, "accepted");
  replaceLedgerSectionText(
    fixtureRoot,
    "Task 1 — Freeze Product Intent and Application Graph v2",
    "State: `planned`.",
    "State: `implementing`.",
  );

  assertIssue(
    verifyD0Governance(fixtureRoot),
    "ledger: Task 1 State must be planned",
  );
});

test("ledger verification rejects D0 acceptance with a weakened push-equality blocker", (t) => {
  const fixtureRoot = makeFixture(t);
  setFixtureD0State(fixtureRoot, "accepted");
  replaceLedgerSectionText(
    fixtureRoot,
    "Task 1 — Freeze Product Intent and Application Graph v2",
    "local HEAD\nverified equal to the remote branch tip",
    "local D0 files\navailable for review",
  );

  assertIssue(
    verifyD0Governance(fixtureRoot),
    "ledger: Task 1 Blocked by must require local HEAD equal to remote tip",
  );
});

test("ledger verification accepts one current ready_for_qa authorization record", (t) => {
  const fixtureRoot = makeFixture(t);
  prepareReadyForQaFixture(fixtureRoot);

  assert.deepEqual(verifyD0Governance(fixtureRoot), []);
});

test("ledger verification rejects ready_for_qa without the exact Terra authorization", (t) => {
  const fixtureRoot = makeFixture(t);
  prepareReadyForQaFixture(fixtureRoot);
  replaceLedgerSectionText(
    fixtureRoot,
    "Task 0 — Seal Honest Requirement-to-Product Closure",
    "Authorize one independent Terra QA pass,",
    "Terra QA authorization remains pending,",
  );

  assertIssue(
    verifyD0Governance(fixtureRoot),
    "ready_for_qa D0 State requires exactly one complete current Sol PASS and Terra authorization record",
  );
});

test("ledger verification rejects split ready_for_qa transition markers", (t) => {
  const fixtureRoot = makeFixture(t);
  setFixtureD0State(fixtureRoot, "ready_for_qa");
  truncateLedgerSectionFrom(
    fixtureRoot,
    "Task 0 — Seal Honest Requirement-to-Product Closure",
    "- Terra QA stops before the full run and returns `FAIL`",
  );

  assertIssue(
    verifyD0Governance(fixtureRoot),
    "ready_for_qa D0 State requires exactly one complete current Sol PASS and Terra authorization record",
  );
});

test("ledger verification rejects duplicate ready_for_qa authorization records", (t) => {
  const fixtureRoot = makeFixture(t);
  prepareReadyForQaFixture(fixtureRoot);
  appendLedgerSectionText(
    fixtureRoot,
    "Task 0 — Seal Honest Requirement-to-Product Closure",
    "The same Sol re-review returns `PASS` with P0/P1/P2=0/0/0. D0 advances to `ready_for_qa`. Authorize one independent Terra QA pass, provider-free and read-only, on this exact tree.",
  );

  assertIssue(
    verifyD0Governance(fixtureRoot),
    "ready_for_qa D0 State requires exactly one complete current Sol PASS and Terra authorization record",
  );
});

for (const [label, record] of [
  [
    "later Sol failure",
    "A later independent Sol re-review returns `FAIL` with P0/P1/P2=0/1/0.",
  ],
  ["later Terra failure", "Terra QA returns `FAIL` with P0/P1/P2=0/1/0."],
  ["later revocation", "The D0 `ready_for_qa` authorization is revoked."],
  ["later supersession", "The D0 `ready_for_qa` authorization is superseded."],
  ["later consumption", "The D0 `ready_for_qa` authorization is consumed."],
  [
    "later return to implementing",
    "PM returns D0 to `implementing` after QA failure.",
  ],
]) {
  test(`ledger verification rejects stale ready_for_qa authority after ${label}`, (t) => {
    const fixtureRoot = makeFixture(t);
    prepareReadyForQaFixture(fixtureRoot);
    appendLedgerSectionText(
      fixtureRoot,
      "Task 0 — Seal Honest Requirement-to-Product Closure",
      record,
    );

    assertIssue(
      verifyD0Governance(fixtureRoot),
      "ready_for_qa authorization is superseded or consumed by a later ledger record",
    );
  });
}

for (const [label, record] of [
  ["Sol review FAIL", "Sol review returns `FAIL` with P0/P1/P2=0/1/0."],
  [
    "Sol re-review nonzero finding",
    "The later Sol re-review reports `PASS` with P0/P1/P2=0/1/0.",
  ],
  [
    "exact Sol task review wording",
    "Sol task review returns FAIL with P0/P1/P2=0/1/0.",
  ],
  [
    "Sol release review nonzero finding",
    "Final independent Sol release review reports `PASS` with P0/P1/P2=1/0/0.",
  ],
  ["Terra QA FAIL", "Terra QA returns `FAIL` with P0/P1/P2=0/1/0."],
  [
    "Terra recheck nonzero finding",
    "The Terra recheck reports `PASS` with P0/P1/P2=0/0/2.",
  ],
  [
    "Sol task review zero then nonzero findings",
    "Sol task review reports `PASS` with prior P0/P1/P2=0/0/0, then records current P0/P1/P2=0/1/0.",
  ],
  [
    "Terra recheck nonzero then zero findings",
    "Terra recheck reports current P0/P1/P2=0/1/0 after baseline P0/P1/P2=0/0/0.",
  ],
  [
    "Sol release review mixed PASS and FAIL outcome language",
    "Sol release review reports `PASS` with P0/P1/P2=0/0/0, but the current verdict is `FAIL`.",
  ],
  [
    "backticked explicit FAIL with zero findings",
    "Sol task review reports `FAIL` with P0/P1/P2=0/0/0.",
  ],
  [
    "backticked PASS with a plain nonzero finding",
    "Terra QA reports `PASS` with current P0/P1/P2=0/1/0.",
  ],
  [
    "ASCII possessives surrounding a genuine nonzero finding",
    "Sol task review reports `PASS`; reviewer's current P0/P1/P2=0/1/0 supersedes team's baseline.",
  ],
  [
    "curly possessives surrounding a genuine nonzero finding",
    "Sol task review reports `PASS`; reviewer’s current P0/P1/P2=0/1/0 supersedes team’s baseline.",
  ],
  [
    "ASCII contractions surrounding a genuine nonzero finding",
    "Sol task review reports `PASS`; it doesn't clear P0/P1/P2=0/1/0 and can't advance.",
  ],
  [
    "curly contractions surrounding a genuine nonzero finding",
    "Sol task review reports `PASS`; it doesn’t clear P0/P1/P2=0/1/0 and can’t advance.",
  ],
  [
    "an unmatched ASCII single quote before a genuine nonzero finding",
    "Sol task review reports `PASS`; unmatched 'history leaves P0/P1/P2=0/1/0 visible.",
  ],
  [
    "mixed ASCII and curly single delimiters around a genuine nonzero finding",
    "Sol task review reports `PASS`; 'history P0/P1/P2=0/1/0’ uses mixed delimiters.",
  ],
  [
    "an unmatched Markdown backtick before a genuine nonzero finding",
    "Sol task review reports `PASS`; unmatched `history leaves P0/P1/P2=0/1/0 visible.",
  ],
  [
    "mixed curly and ASCII double delimiters around a genuine nonzero finding",
    'Sol task review reports `PASS`; “history P0/P1/P2=0/1/0" uses mixed delimiters.',
  ],
]) {
  test(`ledger verification treats ${label} as a later ready_for_qa gate failure`, (t) => {
    const fixtureRoot = makeFixture(t);
    prepareReadyForQaFixture(fixtureRoot);
    appendLedgerSectionText(
      fixtureRoot,
      "Task 0 — Seal Honest Requirement-to-Product Closure",
      record,
    );

    assertIssue(
      verifyD0Governance(fixtureRoot),
      "ready_for_qa authorization is superseded or consumed by a later ledger record",
    );
  });
}

for (const [label, record] of [
  [
    "negated failure prose",
    "Sol task review does not fail; no verdict is recorded.",
  ],
  [
    "quoted historical explanation",
    'The ledger quotes "Sol task review returns `FAIL`" only as a historical explanation.',
  ],
  [
    "Sol PASS zero findings",
    "Sol release review returns `PASS` with P0/P1/P2=0/0/0.",
  ],
  [
    "Terra PASS zero findings",
    "Terra recheck reports `PASS` with P0/P1/P2=0/0/0.",
  ],
  [
    "straight-quoted historical nonzero tuple in a factual gate record",
    'Sol task review reports `PASS` with P0/P1/P2=0/0/0 and quotes "historical P0/P1/P2=0/1/0" only as explanation.',
  ],
  [
    "curly-quoted historical nonzero tuple in a factual gate record",
    "Sol task review reports `PASS` with current P0/P1/P2=0/0/0 and quotes “historical P0/P1/P2=0/1/0” only as explanation.",
  ],
  [
    "inline-code historical nonzero tuple after a current zero tuple",
    "Sol task review reports `PASS` with current P0/P1/P2=0/0/0 and cites historical `P0/P1/P2=0/1/0` only as explanation.",
  ],
  [
    "inline-code quoted historical phrase after a current zero tuple",
    "Sol task review reports `PASS` with current P0/P1/P2=0/0/0 and cites `historical P0/P1/P2=0/1/0` only as explanation.",
  ],
  [
    "ASCII single-quoted historical nonzero tuple",
    "Sol task review reports `PASS` with current P0/P1/P2=0/0/0 and cites 'historical P0/P1/P2=0/1/0' only as explanation.",
  ],
  [
    "curly single-quoted historical nonzero tuple",
    "Sol task review reports `PASS` with current P0/P1/P2=0/0/0 and cites ‘historical P0/P1/P2=0/1/0’ only as explanation.",
  ],
  [
    "multiple all-zero tuples",
    "Terra QA reports `PASS` with P0/P1/P2=0/0/0 after baseline P0/P1/P2=0/0/0.",
  ],
]) {
  test(`ledger verification does not consume ready_for_qa authority for ${label}`, (t) => {
    const fixtureRoot = makeFixture(t);
    prepareReadyForQaFixture(fixtureRoot);
    appendLedgerSectionText(
      fixtureRoot,
      "Task 0 — Seal Honest Requirement-to-Product Closure",
      record,
    );

    assert.deepEqual(verifyD0Governance(fixtureRoot), []);
  });
}

for (const d0State of ["planned"]) {
  test(`ledger verification rejects live D0 State ${d0State} at the delivery gate`, (t) => {
    const fixtureRoot = makeFixture(t);
    setFixtureD0State(fixtureRoot, d0State);

    assertIssue(
      verifyD0Governance(fixtureRoot),
      "ledger: D0 State must be reviewed, accepted, ready_for_qa with current QA authorization, or an authorized post-accept repair",
    );
  });
}

for (const task1State of ["implementing", "accepted"]) {
  test(`ledger verification rejects live Task 1 State ${task1State}`, (t) => {
    const fixtureRoot = makeFixture(t);
    replaceLedgerSectionText(
      fixtureRoot,
      "Task 1 — Freeze Product Intent and Application Graph v2",
      "State: `planned`.",
      `State: \`${task1State}\`.`,
    );

    assertIssue(
      verifyD0Governance(fixtureRoot),
      "ledger: Task 1 State must be planned",
    );
  });
}

for (const [label, from, to, issue] of [
  [
    "Graph contract status",
    "- Contract status: `proposed` until Task 1 is reviewed",
    "- Contract status: `frozen` before Task 1 is reviewed",
    "ledger: Graph contract status must be proposed",
  ],
  [
    "Graph contract owner",
    "- Graph and Draft Preview Snapshot contract owner: `integration`.",
    "- Graph and Draft Preview Snapshot contract owner: `frontend`.",
    "ledger: Graph contract owner must be integration",
  ],
  [
    "Graph contract artifact",
    "`docs/superpowers/specs/2026-08-10-prompt-to-polished-restaurant-product-design.md`.",
    "`docs/superpowers/plans/2026-08-10-prompt-to-polished-restaurant-product.md`.",
    "ledger: Graph contract artifact must be the product design",
  ],
]) {
  test(`ledger verification rejects drifted ${label}`, (t) => {
    const fixtureRoot = makeFixture(t);
    replaceLedgerSectionText(fixtureRoot, "Contract ownership", from, to);

    assertIssue(verifyD0Governance(fixtureRoot), issue);
  });
}

for (const [label, from, to, requirement] of [
  [
    "Task 0 acceptance",
    "Task 0 is already accepted.",
    "Task 0 acceptance is unknown.",
    "Task 0 accepted",
  ],
  ["D0 PM acceptance", "D0 PM acceptance", "D0 review", "D0 PM acceptance"],
  [
    "reviewed pushed commit",
    "reviewed D0 commit pushed",
    "local D0 files reviewed",
    "reviewed D0 commit pushed",
  ],
  [
    "remote-tip equality",
    "local HEAD\nverified equal to the remote branch tip",
    "local files\navailable for review",
    "local HEAD equal to remote tip",
  ],
]) {
  test(`ledger verification rejects a Task 1 blocker missing ${label}`, (t) => {
    const fixtureRoot = makeFixture(t);
    replaceLedgerSectionText(
      fixtureRoot,
      "Task 1 — Freeze Product Intent and Application Graph v2",
      from,
      to,
    );

    assertIssue(
      verifyD0Governance(fixtureRoot),
      `ledger: Task 1 Blocked by must require ${requirement}`,
    );
  });
}

test("ledger verification rejects an explicitly unblocked Task 1", (t) => {
  const fixtureRoot = makeFixture(t);
  replaceLedgerSectionText(
    fixtureRoot,
    "Task 1 — Freeze Product Intent and Application Graph v2",
    "Blocked by: D0 PM acceptance and the reviewed D0 commit pushed with local HEAD\nverified equal to the remote branch tip. Task 0 is already accepted.",
    "Blocked by: none.",
  );

  assertIssue(
    verifyD0Governance(fixtureRoot),
    "ledger: Task 1 Blocked by must not be empty or none",
  );
});

test("ledger verification rejects a negated Task 1 blocker that names every gate", (t) => {
  const fixtureRoot = makeFixture(t);
  replaceLedgerSectionText(
    fixtureRoot,
    "Task 1 — Freeze Product Intent and Application Graph v2",
    "Blocked by: D0 PM acceptance and the reviewed D0 commit pushed with local HEAD\nverified equal to the remote branch tip. Task 0 is already accepted.",
    "Blocked by: D0 PM acceptance is not required; the reviewed D0 commit pushed is not required; local HEAD verified equal to the remote branch tip is not required. Task 0 is not accepted.",
  );

  assertIssue(
    verifyD0Governance(fixtureRoot),
    "ledger: Task 1 Blocked by must require Task 0 accepted",
  );
});

test("Golden profile verification rejects a Workbench manifest range drift", (t) => {
  const fixtureRoot = makeFixture(t);
  const manifestPath = path.join(fixtureRoot, "apps/workbench/package.json");
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  manifest.dependencies.next = "^16.0.0";
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

  assertIssue(
    verifyD0Governance(fixtureRoot),
    "apps/workbench/package.json: next supported range",
  );
});

test("Golden profile verification rejects a lockfile importer resolution drift", (t) => {
  const fixtureRoot = makeFixture(t);
  replaceFixtureText(
    fixtureRoot,
    "pnpm-lock.yaml",
    "      next:\n        specifier: ^15.1.0\n        version: 15.5.22",
    "      next:\n        specifier: ^15.1.0\n        version: 16.0.0",
  );

  assertIssue(
    verifyD0Governance(fixtureRoot),
    "pnpm-lock.yaml: apps/workbench next resolution",
  );
});

test("Golden profile verification rejects a Dockerfile Node major-tag drift", (t) => {
  const fixtureRoot = makeFixture(t);
  replaceFixtureText(
    fixtureRoot,
    "apps/control-plane/Dockerfile",
    "node:22-alpine",
    "node:23-alpine",
  );

  assertIssue(
    verifyD0Governance(fixtureRoot),
    "apps/control-plane/Dockerfile: Node runtime tag",
  );
});

test("Golden profile verification rejects a missing Dockerfile runtime stage", (t) => {
  const fixtureRoot = makeFixture(t);
  replaceFixtureText(
    fixtureRoot,
    "apps/control-plane/Dockerfile",
    "FROM node:22-alpine\n",
    "# missing runtime stage\n",
  );

  assertIssue(
    verifyD0Governance(fixtureRoot),
    "apps/control-plane/Dockerfile: Node runtime tag",
  );
});

for (const [service, currentImage, driftedImage] of [
  ["postgres", "postgres:16-alpine", "postgres:17-alpine"],
  ["redis", "redis:7-alpine", "redis:8-alpine"],
]) {
  test(`Golden profile verification rejects a Compose ${service} major drift`, (t) => {
    const fixtureRoot = makeFixture(t);
    replaceFixtureText(
      fixtureRoot,
      "infra/docker-compose.yml",
      currentImage,
      driftedImage,
    );

    assertIssue(
      verifyD0Governance(fixtureRoot),
      `infra/docker-compose.yml: ${service} image`,
    );
  });
}

for (const [label, rowId, from, to, issue] of [
  [
    "manifest range",
    "workbench-next",
    "`^15.1.0`",
    "`^16.0.0`",
    "Golden profile row workbench-next: manifest value",
  ],
  [
    "exact lock resolution",
    "workbench-next",
    "`15.5.22`",
    "`15.5.21`",
    "Golden profile row workbench-next: exact lock resolution",
  ],
  [
    "Docker floating-major tag",
    "control-plane-node-image",
    "`node:22-alpine`",
    "`node:23-alpine`",
    "Golden profile row control-plane-node-image: floating-major image tag",
  ],
  [
    "Compose floating-major tag",
    "compose-postgres-image",
    "`postgres:16-alpine`",
    "`postgres:17-alpine`",
    "Golden profile row compose-postgres-image: floating-major image tag",
  ],
]) {
  test(`Golden profile verification rejects authority-table ${label} drift`, (t) => {
    const fixtureRoot = makeFixture(t);
    replaceGoldenProfileRowValue(fixtureRoot, rowId, from, to);

    assertIssue(verifyD0Governance(fixtureRoot), issue);
  });
}

test("Golden profile verification rejects a missing authority-table row", (t) => {
  const fixtureRoot = makeFixture(t);
  mutateGoldenProfileTable(fixtureRoot, (current) =>
    current.replace(/^\|\s*package\s*\|\s*workbench-next\s*\|[^\n]*\n/m, ""),
  );

  assertIssue(
    verifyD0Governance(fixtureRoot),
    "Golden profile table: missing row workbench-next",
  );
});

test("Golden profile verification rejects a duplicate authority-table row", (t) => {
  const fixtureRoot = makeFixture(t);
  mutateGoldenProfileTable(fixtureRoot, (current) =>
    current.replace(
      /^(\|\s*package\s*\|\s*workbench-next\s*\|[^\n]*\n)/m,
      "$1$1",
    ),
  );

  assertIssue(
    verifyD0Governance(fixtureRoot),
    "Golden profile table: duplicate row workbench-next",
  );
});

test("Golden profile verification rejects an unsupported authority-table row", (t) => {
  const fixtureRoot = makeFixture(t);
  mutateGoldenProfileTable(fixtureRoot, (current) =>
    current.replace(
      "<!-- d0-golden-profile:end -->",
      "| manifest | unexpected-runtime | `package.json` | `engines.unknown` | `1` | — | — | — |\n<!-- d0-golden-profile:end -->",
    ),
  );

  assertIssue(
    verifyD0Governance(fixtureRoot),
    "Golden profile table: unsupported row unexpected-runtime",
  );
});

test("Golden profile verification rejects a malformed authority-table row", (t) => {
  const fixtureRoot = makeFixture(t);
  replaceGoldenProfileRowValue(
    fixtureRoot,
    "workbench-next",
    "`^15.1.0`",
    "^15.1.0",
  );

  assertIssue(
    verifyD0Governance(fixtureRoot),
    "Golden profile table: malformed row workbench-next",
  );
});

test("Golden profile verification rejects an authority-table Docker stage-count drift", (t) => {
  const fixtureRoot = makeFixture(t);
  replaceGoldenProfileRowValue(
    fixtureRoot,
    "control-plane-node-image",
    "`2`",
    "`1`",
  );

  assertIssue(
    verifyD0Governance(fixtureRoot),
    "Golden profile row control-plane-node-image: floating-major image tag",
  );
});

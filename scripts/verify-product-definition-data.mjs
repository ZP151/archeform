import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

// Independent acceptance of the built CLI; never writes or admits candidates.
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const cli = resolve(
  root,
  "packages/adapters/dist/requirements/definition-batch-cli.js",
);
const source = readFileSync(
  resolve(
    root,
    "packages/adapters/src/requirements/definitions/product-definitions.v1.json",
  ),
);
const built = readFileSync(
  resolve(
    root,
    "packages/adapters/dist/requirements/definitions/product-definitions.v1.json",
  ),
);
assert.deepEqual(
  built,
  source,
  "The built catalogue must be the exact source bytes.",
);
const catalogue = JSON.parse(source.toString("utf8"));
const reportKeys = [
  "admitted",
  "apiVersion",
  "attempted",
  "distinct",
  "durationMs",
  "entries",
  "reasonCounts",
  "valid",
];
const reasons = new Set(
  [
    "invalid-json",
    "batch-limit",
    "unknown-key",
    "unknown-version",
    "duplicate-key",
    "duplicate-semantics",
    "unknown-family",
    "unsupported-family-version",
    "invalid-binding",
    "invalid-canonical",
    "unsupported-semantics",
    "missing-correction",
    "missing-failure",
    "projection-drift",
    "execution-drift",
  ].map((reason) => `definition.${reason}`),
);
const cases = [];
function invoke(name, args, input, exit, expectedReason) {
  const result = spawnSync(process.execPath, [cli, ...args], {
    cwd: root,
    input,
    encoding: "utf8",
    timeout: 15_000,
    maxBuffer: 512 * 1024,
    windowsHide: true,
  });
  assert.equal(result.error, undefined, `${name}: process failed`);
  assert.equal(result.status, exit, `${name}: wrong exit status`);
  if (exit === 2) {
    assert.equal(result.stdout, "", `${name}: internal failure wrote a report`);
    assert.equal(
      result.stderr.trim(),
      "definition.validation-failed",
      `${name}: unsafe failure diagnostic`,
    );
    cases.push({ name, exit });
    return;
  }
  assert.equal(result.stderr, "", `${name}: unexpected stderr`);
  const report = JSON.parse(result.stdout);
  assert.deepEqual(
    Object.keys(report).sort(),
    reportKeys,
    `${name}: report shape`,
  );
  assert.equal(
    report.apiVersion,
    "factory.product-definition-validation-report/v1",
  );
  for (const key of ["attempted", "valid", "distinct", "admitted"]) {
    assert.ok(
      Number.isSafeInteger(report[key]) && report[key] >= 0,
      `${name}: invalid count`,
    );
  }
  assert.ok(Number.isFinite(report.durationMs) && report.durationMs >= 0);
  for (const entry of report.entries) {
    assert.ok(
      Object.keys(entry).every((key) =>
        [
          "index",
          "definitionKey",
          "fingerprint",
          "verdict",
          "reasons",
        ].includes(key),
      ),
      `${name}: unsafe entry field`,
    );
    assert.ok(Number.isSafeInteger(entry.index));
    if (entry.definitionKey !== undefined)
      assert.match(entry.definitionKey, /^[a-z][a-z0-9-]{0,127}$/);
    if (entry.fingerprint !== undefined)
      assert.match(entry.fingerprint, /^sha256:[a-f0-9]{64}$/);
    assert.ok(["admitted", "rejected"].includes(entry.verdict));
    assert.deepEqual(entry.reasons, [...entry.reasons].sort());
    assert.ok(entry.reasons.every((reason) => reasons.has(reason)));
  }
  assert.ok(
    Object.keys(report.reasonCounts).every((reason) => reasons.has(reason)),
  );
  if (expectedReason)
    assert.ok(
      report.reasonCounts[expectedReason] > 0,
      `${name}: missing stable reason`,
    );
  assert.ok(
    !result.stdout.includes("SENSITIVE_SENTINEL"),
    `${name}: reflected input`,
  );
  cases.push({
    name,
    exit,
    attempted: report.attempted,
    valid: report.valid,
    distinct: report.distinct,
    admitted: report.admitted,
    reasonCounts: report.reasonCounts,
  });
  const { durationMs: _duration, ...stable } = report;
  return stable;
}
const first = invoke("shipped-default", [], undefined, 0);
const second = invoke("shipped-repeat", [], undefined, 0);
assert.deepEqual(first, second, "Only validation duration may differ.");
assert.deepEqual(
  [first.attempted, first.valid, first.distinct, first.admitted],
  [4, 4, 4, 4],
);
assert.deepEqual(invoke("shipped-stdin", ["--stdin"], source, 0), first);
invoke(
  "malformed-json",
  ["--stdin"],
  "{SENSITIVE_SENTINEL",
  1,
  "definition.invalid-json",
);
invoke(
  "escaped-duplicate-member",
  ["--stdin"],
  '{"apiVersion":"SENSITIVE_SENTINEL","\\u0061piVersion":"duplicate","definitions":[]}',
  1,
  "definition.invalid-json",
);
invoke(
  "invalid-utf8",
  ["--stdin"],
  Buffer.from([0xc3, 0x28]),
  1,
  "definition.invalid-json",
);
invoke(
  "oversized-stdin",
  ["--stdin"],
  Buffer.alloc(2 * 1024 * 1024 + 1, 32),
  1,
  "definition.batch-limit",
);
invoke("path-argument-rejected", ["SENSITIVE_SENTINEL.json"], undefined, 2);
invoke(
  "extra-argument-rejected",
  ["--stdin", "SENSITIVE_SENTINEL"],
  undefined,
  2,
);
function candidate(name, change, reason) {
  const data = structuredClone(catalogue);
  change(data);
  return invoke(name, ["--stdin"], JSON.stringify(data), 1, reason);
}
candidate(
  "unknown-executable-member",
  (data) => {
    data.definitions[0].module = "SENSITIVE_SENTINEL";
  },
  "definition.unknown-key",
);
candidate(
  "duplicate-definition-key",
  (data) => {
    data.definitions.push(structuredClone(data.definitions[0]));
  },
  "definition.duplicate-key",
);
candidate(
  "missing-correction",
  (data) => {
    data.definitions[0].journeys.correction = [];
  },
  "definition.missing-correction",
);
const cosmetic = candidate(
  "cosmetic-definition-duplicate",
  (data) => {
    const alias = structuredClone(data.definitions[1]);
    alias.definitionKey = "cosmetic-approval";
    alias.selection.providerGuide.definitionKey = alias.definitionKey;
    alias.journeys.correction[0].key = "renamed-correction-case";
    data.definitions.push(alias);
  },
  "definition.duplicate-semantics",
);
assert.equal(cosmetic.reasonCounts["definition.duplicate-semantics"], 2);
assert.deepEqual(
  [cosmetic.attempted, cosmetic.valid, cosmetic.distinct, cosmetic.admitted],
  [5, 5, 3, 3],
);
candidate(
  "missing-failure",
  (data) => {
    data.definitions[0].journeys.failure = [];
  },
  "definition.missing-failure",
);
candidate(
  "unsupported-family",
  (data) => {
    data.definitions[0].familyBinding.key = "unsupported-family";
  },
  "definition.unknown-family",
);
candidate(
  "batch-entry-limit",
  (data) => {
    data.definitions = Array.from({ length: 101 }, () =>
      structuredClone(data.definitions[0]),
    );
  },
  "definition.batch-limit",
);
console.log(
  JSON.stringify(
    {
      apiVersion: "factory.product-definition-command-evidence/v1",
      sourceDataSha256: createHash("sha256").update(source).digest("hex"),
      copiedBytes: source.length,
      passedCases: cases.length,
      cases,
    },
    null,
    2,
  ),
);

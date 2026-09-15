# Product definition data independent QA report

Date: 2026-09-13

QA scope: frozen definition-data slice in the `consumer-delivery` worktree.
This is provider-free, executable QA after the PM handoff and independent task
review. No source, test, Git, service, or external-provider state was changed.

## QA verdict

**QA_PASS: yes**

**P0/P1/P2: 0/0/0**

The four shipped entries validated through the built command as exactly
`attempted/valid/distinct/admitted = 4/4/4/4`. Fresh focused regression and
adversarial execution passed. No release-blocking defect was observed.

## Frozen source and scope evidence

Command:

```powershell
$manifest = Get-Content -Raw 'docs\acceptance\evidence\product-definition-data\source-manifest.json' | ConvertFrom-Json
# For every manifest entry: Test-Path, Get-Item.Length, and Get-FileHash SHA256.
```

Result: exit `0`; `SOURCE_MANIFEST_PASS files=18` with ADR SHA-256
`40aeafc6a532d85fae26aa3420c0f910e5870a8ffe286c4e6e97988bcdc4f333`.
All recorded byte sizes and SHA-256 digests matched. The immutable baseline
fixture retained SHA-256
`585efce4cf6383abdf323ba8d9de1d2f9b928f254a9cdb907e83698d2c3b28ea`.

## Fresh executable evidence

Command:

```powershell
pnpm --filter @factory/adapters test -- product-definition-data.test.ts requirement-interpreter.test.ts
```

Result: exit `0`; 2 files and 174 tests passed in 6.46 seconds:

- `product-definition-data.test.ts`: 26 passed, including immutable four-entry
  loading/admission and built-command unsafe-input checks.
- `requirement-interpreter.test.ts`: 148 passed.

Command:

```powershell
node scripts/verify-product-definition-data.mjs
```

Result: exit `0`; 16 real built-CLI process cases passed. The command first
verified the copied `dist` JSON was byte-equal to source: 97,762 bytes, SHA-256
`7a7ae966c7240fdab6a5597f373c08bf0edebf62ab8c57c89bc6eb4edecca81d`.

Functional state transitions exercised:

- Default source mode, a repeat invocation, and explicit `--stdin` each exited
  `0` and reported `4/4/4/4`; repeat output matched after omitting only
  `durationMs`.
- Malformed JSON, escape-equivalent duplicate keys, invalid UTF-8, oversized
  input, an unknown executable-shaped member, duplicate identity, missing
  correction, missing failure, unsupported family, and over-limit entry batch
  each exited `1` with only the expected stable safe reason.
- A cosmetic cross-key clone produced two
  `definition.duplicate-semantics` rejections and reported `5/5/3/3`, proving
  aliases do not raise admission counts.
- Path-shaped and additional arguments each exited `2`; the harness confirmed
  the fixed non-echoing diagnostic and that no sensitive sentinel appeared in
  output.

## Acceptance assessment and limits

The fresh evidence meets the data authoring, deterministic reporting, bounded
input, safe-error, duplicate, membership, and no-path-input acceptance paths.
The frozen compiler compatibility and authoring evidence remains represented by
the manifest-matched fixtures/tests and prior machine reports; it was not
rerun in this proportionate QA pass because no observed doubt required the
optional four-test compiler recheck. Existing immutable generated-output and
runtime/UI evidence therefore remains the referenced evidence for that
unchanged boundary.

This slice still does not demonstrate real-model selection quality, an ordinary
user journey, a newly admitted product, or a new runtime family. Those are
declared out of scope rather than failures of this four-definition migration.

## PM ledger handoff

Record this report as the independent QA result: `QA_PASS: yes`, `P0/P1/P2:
0/0/0`. No release-blocking defect or source repair is requested. The next
required gate is the independent Sol final review.

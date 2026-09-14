# ADR-0067: Reverify a reconciled Candidate conformance winner

Date: 2026-09-15
Status: Proposed
Decision: keep
Scope: Private conformance operation ordering; no serialized contract change.

## Context

The founder requests integration of the consumer branch through PR #4. Main CI
run 33756827488 on Node 22.11 failed the separate-process Candidate conformance
test: a child reached `recordConformancePass` and received "Strict Candidate
verification is required before access." The verification boundary itself is
correct. Another process can publish the durable sequence-2 winner after
`verifyIdentity` finishes and before `#entry` reconciles the cached entry.
Reconciliation loads the new winner as unverified, so the operation rejects an
otherwise valid idempotent caller before its existing winner checks run.

The original checkout contains an unfinished deterministic regression that
commits the winner in this exact gap. It will be reproduced independently in
the integration worktree without modifying the original checkout. A passing
timing-dependent run does not resolve the race.

## Authority and recommendation

This proposal retains the Golden profile in `docs/tech-governance.md` and the
strict verification, immutable receipts and fail-closed requirements in
`docs/threat-model.md`. Root acts as the serialized technology owner for this
bounded proposal because the existing agent slots are occupied. A separate
read-only reviewer must assess the exact proposal under the recorded founder
standing acceptance before implementation. Root must not self-approve it.

1. **DEC-001 — keep:** Preserve Candidate serialization, exported APIs,
   immutable records, indexed sequence-2 compare-and-set, result equality,
   receipt verification, and verified-only synchronous accessors.
2. **DEC-002 — keep:** In `recordConformancePass` only, allow one bounded strict
   verification of an entry newly loaded by reconciliation after the initial
   verification. Check the verification result and candidate before using it;
   require the bound snapshot's verified flag without a second reconciliation.
   Keep every public verified-only accessor unchanged. The existing verified
   indexed-winner/CAS path resolves a winner committed after that snapshot.
   Do not set a verification
   flag manually, trust the previous snapshot's result for the new entry, or
   implement an unbounded retry loop.
3. **DEC-003 — keep:** A valid existing conformance winner can return through
   the existing idempotent/CAS path. Tampered winners, invalid evidence,
   conflicting results, blocked/rejected terminals and unexpected further
   state changes remain denied. There is no third receipt or duplicate winner.
4. **DEC-004 — reject:** No storage staging change, PostgreSQL experiment,
   migration, dependency, framework, CI exclusion, lowered concurrency,
   generic accessor relaxation, provider, hosted operation, or deployment.

## Owned implementation and acceptance

After decision acceptance, root owns only
`packages/external-intake/src/candidates.ts` and
`packages/external-intake/test/candidates.test.ts` for this behavior repair.
Documentation and the separate formatting manifest remain root-controlled.

First demonstrate the stale-caller failure with a deterministic interleaving.
Then prove convergence to the exact verified durable winner, no new lifecycle
records, tampered-winner denial, terminal-state denial and conflicting-result
denial. Retain the existing separate-OS-process and ordinary concurrency tests.
Run the complete external-intake suite, owning typecheck/build/lint and both
unchanged Node CI lanes. Review the diff and adversarial evidence independently.
Integration still requires the delivery-policy gates; this decision alone
does not accept the iteration, authorize a repository release, or deploy it.

The correction is reversible by a normal commit revert. It restores the
existing idempotent operation under a verified current snapshot. It creates no
new authority or durable data shape; unresolved verification failures stay
visible and fail closed.

## Exact retained profile and effects

Current and proposed profiles are identical: Node `>=22.11.0 <23`,
`pnpm@9.0.0`, and private `@factory/external-intake@0.1.0`, governed by root
`package.json`, `packages/external-intake/package.json` and `pnpm-lock.yaml`.
Those files, `packages/external-intake/src/contracts.ts`, its public exports,
and the Graph/compiler/adapter packages are outside the behavioral write set.
Retained serializers include `factory.candidate-capability/v1`,
`factory.candidate-proposal/v1`, `factory.candidate-verification-state/v1`,
`factory.candidate-receipt-locator/v1`, `factory.candidate-manifest/v1`,
`factory.candidate-fixture/v1`, `factory.candidate-adapter/v1`,
`factory.candidate-conformance-plan/v1`, and
`factory.external-intake-receipt/v1`. No identifier or stored byte is migrated.

API, data shape, adapter, catalogue, license and supply-chain effects: none.
No dependency, source intake, asset, package coordinate, public export, fixture
baseline, or generated output changes. The security effect is strict verification
of the current entry before proceeding through the existing access gate.
Operability improves only idempotent convergence under one concurrent winner;
there is no new service, host, runner, credential or process topology.

Alternatives: leaving the race breaks existing convergence; relaxing verified
access would weaken the boundary; an unbounded retry hides unexpected states;
a storage migration exceeds this bug's cause. The bounded re-verification is
preferred because it retains the existing terminal lifecycle and strict verifier.

No migration or irreversible step is needed. Abort implementation if a schema,
export, dependency, storage protocol, authority, or concurrent-winner invariant
must change, or if a tampered winner is accepted. Return to a new proposal for
any such expansion. Root owns the two-file behavior repair and normal Git
delivery; the independent reviewer owns acceptance of the proposal and repair.

## Verification commands and evidence

Run from the consumer-delivery worktree with provider credentials unused:

```powershell
pnpm exec turbo run build --filter=@factory/external-intake...
pnpm --filter @factory/external-intake exec vitest run test/candidates.test.ts -t "reconciles a stale verified caller"
pnpm --filter @factory/external-intake test
pnpm --filter @factory/external-intake typecheck
pnpm --filter @factory/external-intake build
pnpm --filter @factory/external-intake lint
pnpm test
pnpm typecheck
pnpm build
pnpm format:check
pnpm verify:third-party
pnpm verify:source-studies
```

The focused regression must fail before the source edit and pass afterwards.
The complete owning suite must include the existing separate-process cases and
new deterministic negative cases. Existing `.github/workflows/ci.yml` supplies
unchanged Node `22.11.0` and `22.x` install, typecheck, test, build and provenance
gates on the PR and final main commit. Record initial failures and superseding
results in `docs/research/2026-09-15-readme-and-main-assessment.md` and decision,
ownership and acceptance in
`docs/superpowers/ledgers/2026-09-07-consumer-generation-delivery.md`.

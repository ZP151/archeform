# Portfolio Batch Acquisition

Updated: 2026-08-01

Status: `ready_for_qa`. This is a local Intake CLI enhancement. It does not
accept a Candidate, promote a Golden package, copy upstream source, change an
Application Graph, or add an external provider/runtime dependency.

## Purpose

The versioned external-source portfolio already records allowed source IDs,
fixed references, and the intended Factory boundary. The CLI can now acquire
an explicit set of those IDs through the existing fixed-reference quarantine
path without requiring an operator to construct a raw request batch by hand.

```text
local portfolio + explicit opaque source IDs
  -> strict Intake batch in memory
  -> fixed-reference source acquisition
  -> immutable quarantine evidence + redacted terminal output
```

Example command form:

```text
factory-intake portfolio acquire --file ecosystem/portfolio/2026-07-30-external-business-logic.json --sources tastyigniter,medusa
```

For the local root launcher, use:

```text
pnpm intake -- portfolio acquire --file ecosystem/portfolio/2026-07-30-external-business-logic.json --sources tastyigniter,medusa
```

Only one to sixty-four comma-separated opaque IDs are accepted. Each ID must
exist in the local portfolio and have a non-null intake classification.
Architecture-only and excluded records fail before network retrieval. The
terminal output contains item IDs, terminal status, and canonical evidence
digests only; it does not reveal repository URLs, source bytes, licence text,
commands, prompts, responses, or credentials.

When GitHub unauthenticated metadata limits block a permitted acquisition, an
operator may set `FACTORY_GITHUB_READ_TOKEN` in the untracked local `.env` and
launch the compiled CLI through `pnpm intake -- <command>`. Node loads `.env`
when it is present into the process environment; the CLI itself neither reads
nor persists that file. It attaches the token only to
`https://api.github.com` metadata requests. It strips authorization
from archive and every non-API destination. The token is never printed,
persisted, included in a Graph, included in quarantine evidence, or sent to
`codeload.github.com`.

## TDD evidence

Focused RED observations:

```text
pnpm --filter @factory/external-intake test -- --run test/portfolio.test.ts
# RED: createPortfolioIntakeBatch is not a function

pnpm --filter @factory/intake-cli test -- --run test/cli.test.ts --testNamePattern "acquires selected portfolio sources"
# RED: portfolio acquire returned invalid-command
```

The first CLI GREEN exposed a test-double endpoint assumption: the fixture
client fabricated endpoints only for one example repository, so a valid
portfolio source was blocked. The fixture now derives its fixed endpoints from
the request repository; no live network call is made by this test.

Current GREEN checks:

```text
pnpm --filter @factory/external-intake test
# 15 files, 402 tests passed
pnpm --filter @factory/external-intake typecheck
pnpm --filter @factory/external-intake lint
pnpm --filter @factory/external-intake build

pnpm --filter @factory/intake-cli test
# 3 files, 61 tests passed
pnpm --filter @factory/intake-cli typecheck
pnpm --filter @factory/intake-cli lint
pnpm --filter @factory/intake-cli build
git diff --check
```

## Boundaries and remaining work

The command is a batch-construction convenience layer, not an autonomous
repository importer. It does not extract archive contents for runtime use,
run a real scanner, make a licence decision, create a Candidate, generate a
capability package, or write to a Graph/compiler/generated application.

The next independent supply-chain slice must materialize a quarantined fixed
source into scanner and module-inventory inputs, preserve path-level evidence,
and produce only a reviewed Candidate proposal. A full repository import or
automatic source copy remains out of scope.

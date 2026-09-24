# Customer Requests Task 1 source acceptance

Accepted by PM on 2026-09-24 after the independent task review, Terra QA and
final source judgment returned P0/P1/P2 0/0/0. This accepts exact family
admission, composition and the immutable compiler profile only.

The sixteen source identities are retained in `task1-source-manifest.json`.
Its original SHA-256 is
`6c8b57e1f481a3957b31aac137c47d885e825c305ab00ffd83fd8a8ddade51eb`.
The accepted ADR-0084 hash is
`8a78888dd9f1996588f475188b4645664c06bf9e1a49561112cdfa89c6f954c6`.
The writer handoff remains at `generated/.customer-requests-task1/handoff.md`,
SHA-256 `cdc97d59ee5f411305b83c7336bcbe2cf10cc8c3ef8831f39c73833b3d790610`.

Independent QA passed 61 Graph cases, 2 composition cases, 53 compiler/export
cases and three package typechecks. Final judgment reused the unchanged task
review and QA; it did not repeat a broad audit. Portable receipts are
`task1-qa.json` and `task1-final-source-judgment.json`.

The writer compared all twelve historical physical definitions against the
original captured Published inputs and emitted bytes. The original capture hash
is `c9c6c0245de95ffb7176131e59206aa8ca0bceecb21b5ed70185ae6654f25eba`;
the equality receipt hash is
`3f6bd2c708c6b4ccd8391a4cfd24ba532e6e680a0f920213d7639124c18e655d`.
Review and QA verified retained identities without rewriting those receipts.

Public compilation deliberately rejects this family until Task 2 integrates
its runtime. No customer conversation, PostgreSQL persistence, responsive
generated application, consumer admission or hosted deployment is accepted here.
Delivered product counts remain unchanged. Main integration and release remain
open under the active delivery ledger.

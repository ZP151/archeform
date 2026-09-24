# Customer Requests catalogue regression correction

CI run [35994274947](https://github.com/ZP151/archeform/actions/runs/35994274947)
failed both Node jobs at `4081594b8bb338db05d9817d3837d32c195f99b2`.
The pre-registration witness test classified every catalogue row as another
family. Registering Customer Support Desk correctly produced a witness and
exposed that obsolete assertion. Runtime matching was unchanged.

The corrected test exercises every row: Customer Requests must match and reject
removed reply grants; other families must not match and must reject injected
reply grants. The existing definitions lane now runs both Customer Requests
Blueprint and Graph witness suites before generated-project checks. A failing
witness stops later steps on both POSIX and Windows dispatch.

Validation on September 24, 2026:

- RED: original witness assertion failed; four missing-lane expectations failed.
- GREEN: 984 Graph tests, 19 regression/case-index tests and Graph typecheck pass.
- The real definitions lane completes all nine steps with exit 0. Its receipt is
  `task4-ci-correction-lane.json`; the previous eight-step receipt is preserved.
- Affected formatting and diff checks pass. Independent scoped review reports
  P0/P1/P2 0/0/0; the three reviewed source identities are recorded separately.
- Raw RED/GREEN logs remain in
  `generated/.customer-requests-task4/ci-correction/`.

Root reconciled the completed lane after the independent review, which correctly
left it pending while its process was running. Replacement remote CI is a separate
delivery checkpoint. Both Node jobs now pass in
[replacement CI 35995761289](https://github.com/ZP151/archeform/actions/runs/35995761289)
at `3d9c101c9e02949053c0fe12d2d3b557351f02ca`; controller verified the terminal
remote state and watch exit 0. `task4-ci-correction-ci.json` records that outcome.
This repair establishes no actual browser, PostgreSQL,
hosted deployment or new delivered-product count.

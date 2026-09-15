# Definition Data Baseline Capture

Base: f8cdfe812c6c5ab2710a641862aa8f026134ab15, before any production changes.

Root captured canonical structure, selection JSON Schema, guide, instruction,
supported-default and needs-clarification projection digests for all four
registered definitions, plus each complete ordered generated bundle from an
immutable Published Graph with its separate checksum-bound capability lock.
The capture utility was removed immediately afterward. The stored baseline must
never be regenerated to accommodate implementation changes.

The first capture harness attempted an extra raw embedded-draft-selection path
that the existing Task adapter intentionally rejects against normalized lock
packages. The harness was corrected to use only the actual separate Published
lock path; no production behavior changed. Existing non-Task embedded cases
remain covered by their unchanged original baseline.

Fresh command: pnpm --filter @factory/compiler exec vitest run
test/definition-data-compatibility.test.ts test/task-compatibility.test.ts
test/task-correction-compatibility.test.ts
Result: three files / three tests passed, 10.59 seconds.

The new fixture retains four existing definitions; it is not additional product
coverage. It includes current corrected Task v2, while the old Task v1 and prior
non-Task baseline tests remain independent.

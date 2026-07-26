# Factory component and composition contracts v1

**Status:** Frozen by the Integration contract task after ADR-003 acceptance.

These schemas define the local, first-party package boundary for the
Composable Internal Approval Suite. They are data contracts only. They do not
authorize package discovery, Registry resolution, template rendering, Docker
execution, external fetching, or model-directed selection.

## Artifacts

| Artifact | Schema | Purpose |
| --- | --- | --- |
| Component manifest | `factory-component/v1` | Identity, inventory, compatibility, declared inputs/slots, lifecycle, and verification evidence for one local package. |
| Declarative adapter | `factory-component-adapter/v1` | Bounded template contribution declarations owned by the same component. |
| Composition plan | `factory-composition/v1` | Immutable selected locks, validated inputs, dependency graph, adapter order, and output checksums. |

The normative machine-readable artifacts are:

- `docs/contracts/factory-component-v1.schema.json`
- `docs/contracts/factory-component-adapter-v1.schema.json`
- `docs/contracts/factory-composition-v1.schema.json`

## Component package identity

A package is rooted at:

```text
packages/components/<component-key>/<semantic-version>/
```

`component.json` declares `key`, exact `major.minor.patch` version,
`package_root: "."`, category, lifecycle, and a `sha256:` digest. The inventory
must list every regular file under the package root except `component.json`,
in lexicographic POSIX-path order. Each entry contains the file SHA-256.

The package digest is SHA-256 over this binary stream:

```text
"factory-component-digest/v1\0"
canonical JSON bytes of `component.json` with only `digest` omitted
for each inventory entry ordered by path:
  UTF-8 path bytes
  "\0"
  unsigned 8-byte big-endian file-byte length
  raw file bytes
```

All paths are normalized relative POSIX paths. Absolute paths, `.`/`..`,
backslashes, trailing dots/spaces, Windows reserved device basenames (`NUL`,
`CON`, `AUX`, `PRN`, `COM1`–`COM9`, and `LPT1`–`LPT9`, including extensions
and case variants), symlinks, junctions, reparse points, omitted files,
unexpected files, and non-regular files fail validation. `component.json` is not an
inventory entry, but its canonical projection is digest-bound; only its
self-referential `digest` field is omitted. Changes to identity, dependencies,
input schema, slots, lifecycle, or verification evidence therefore invalidate
the package digest.

## Component manifest rules

- Supported lifecycle values are `candidate`, `golden`, `deprecated`, and
  `revoked`. A `golden` package must record `verification.status: "passed"`.
  Registry behavior is out of scope, but the next Registry must resolve only
  `golden` packages.
- `requires` identifies local dependencies by exact key/version. It must not
  repeat or self-reference. When a local available-identity set is supplied,
  a dependency outside that set is rejected.
- Compatibility is fixed to `internal-approval-app` and `factory/v1` for this
  experiment.
- The input contract is a JSON Schema object with explicit properties and
  `additionalProperties: false`.
- Verification evidence is required and reserves source revision, verification
  time, SPDX expression/list version, and optional SBOM/provenance digest
  references. It is not a signature or external provenance claim in Stage 1.

## Declarative adapter rules

An adapter has no executable code, shell/network operations, package selection,
dependency declarations, URLs, or output-path authority. Its only operation is
`render_template`.

Each contribution names an existing file under `templates/`, a predeclared
output slot, a normalized relative target within that slot, and bindings of
the form `{ "source": "input.<declared_input_property>", "context":
"<allowlisted-context>" }`. The adapter identity must exactly match
`component.json`; duplicate slot/target pairs (including case-folded
collisions such as `page.tsx` and `PAGE.tsx`) and contributions to an
undeclared slot fail closed. The exclusive-slot policy applies to every
`component.json.output_slots` declaration as well as every adapter
contribution.

### Safe template substitution

Templates are not expression languages. A placeholder has the exact grammar:

```text
{{python_string:<binding-name>}}
{{json_value:<binding-name>}}
{{typescript_string:<binding-name>}}
{{tsx_text:<binding-name>}}
```

`<binding-name>` is a lowercase identifier and every template placeholder must
map to exactly one adapter binding; every adapter binding must appear in its
template. The placeholder context must equal the binding's declared context.
Unknown, unused, malformed, or raw placeholders such as `{{title}}` fail
validation. No raw, arbitrary, or evaluated interpolation context exists.

The frozen renderer is a deterministic data transformation. `python_string`
and `typescript_string` accept strings and emit JSON-compatible quoted
literals; `json_value` emits strict canonical JSON (non-finite values reject);
`tsx_text` accepts strings and
escapes markup delimiters, braces, and line breaks as text entities. The
Composer must first call `validate_resolved_composition_inputs`, then render
each template through `render_adapter_template_text`; it must not use a general
template engine, `eval`, shell, network, or model-generated code. Inputs remain
flat `input.<property>` bindings and are never raw briefs or credentials.

The frozen slots are:

```text
frontend/app-shell
frontend/routes/login
frontend/routes/home
frontend/routes/profile
frontend/routes/system-settings
frontend/features/approval-form
frontend/features/my-requests
frontend/features/approval-queue
frontend/features/audit
backend/auth
backend/authz
backend/api/records
backend/workflow/approval
backend/audit
data/record-schema
data/audit-schema
runtime/postgres
tests/fixtures
```

Per ADR-003, `ui.app-shell` is the exclusive future owner of
`frontend/features/audit`; `ops.audit-log` owns `backend/audit` and
`data/audit-schema`. Composer alone will later own shared page assembly and
the generated output manifest.

## Composition plan rules

A `factory-composition/v1` plan contains an Application Definition checksum,
one exact `(key, version, digest)` lock per selected component key,
component-keyed locally validated inputs, dependency edges, exactly one
matching adapter-order lock per component, and a unique-path output manifest.

`validated_inputs` is exactly an object whose keys equal the selected component
keys and whose values are JSON objects. A future Composer validates each value
against that component's `input_schema`; this contract rejects any unselected
top-level key, including prompt aliases such as `requirements` or
`description`, rather than relying on keyword heuristics. Output paths must be
normalized, contained POSIX paths with no empty/dot segments, backslashes, or
case-fold collisions.

`validate_composition_plan` is **structural only**. It proves the plan's lock
shape and component-keyed input representation, not that those objects conform
to selected package schemas. After Registry resolves the exact manifests named
by the locks, the caller must invoke
`validate_resolved_composition_inputs(composition_plan, resolved_manifests)`.
That API requires exact key/version/digest agreement and validates each input
object against the corresponding resolved `input_schema`; unknown nested
properties, including raw-brief payloads, fail under the package schema.

Composition plans also reject duplicate component keys, duplicate or invalid
graph edges, adapter order that differs from the selected locks, and duplicate
output paths. Registry compatibility, cycle detection, Golden filtering, slot
merge policy, and actual output writes remain subsequent Composer/Registry
responsibilities.

When validation is invoked with an approved package base, a package must reside
exactly at `<approved-base>/<manifest-key>/<manifest-version>`. Test fixtures
may omit the base argument; the future Registry must supply it.
The validator checks the lexical key/version path, rejects aliases/reparse
points in every segment from the approved base to the package root, and then
requires the resolved package root to remain contained below the resolved
approved base. Equal resolved aliases outside the base are never trusted.

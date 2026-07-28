# Third-party notices

Factory Pilot uses third-party packages through their published package registries.
The lockfile records the exact resolved versions. This repository does not vendor
or copy their source unless a future source-study record explicitly says so.

## Direct platform dependencies

- Puck — MIT — visual PageModel authoring adapter.
- React Flow / xyflow — MIT — graph and flow editing adapter.
- XState — MIT — compiled FlowModel state machines.
- Prisma — Apache-2.0 — PostgreSQL persistence and generated data access.
- node-casbin — Apache-2.0 — compiled policy enforcement.

## Reference-only projects

- Amplication is studied for generator, plugin and Git synchronization patterns.
  Its `ee/` directory is excluded from Factory Pilot reuse.
- Medusa is a future Commerce Provider reference; it is not a v1 runtime
  dependency.
- Vendure is GPLv3 and is reference-only. Factory Pilot does not copy, embed, or
  link its core.

## Agent skills

The `.agents/skills/` directory retains its upstream notices for skills that
remain part of the local developer environment. Those skills are not Factory
Pilot runtime code.

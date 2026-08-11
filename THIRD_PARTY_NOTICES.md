# Third-party notices

Archeform uses third-party packages through their published package registries.
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

The copied skill source is local developer tooling, not Archeform runtime code.
Exact repository, source-path, revision, and content-hash evidence is retained
in `.agents/skills/UPSTREAM_PROVENANCE.md`.

### obra/superpowers

Source: https://github.com/obra/superpowers

Pinned source: tag `v6.2.0`, peeled commit
`3dcbd5c4b48e02263fbf4a3c01e3fe4f81d584d9`

License: MIT; upstream `LICENSE` SHA-256
`A37E0E9697144819E1D965176AC4AE5BC3FA02D11E7812036BBCADF6DAFE2400`

MIT License

Copyright (c) 2025 Jesse Vincent

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

### github/awesome-copilot

Source: https://github.com/github/awesome-copilot

Pinned source: commit `aa280f28b1b73f9b6e6917b607eb92127b67b419`
(no tag claim)

License: MIT; upstream `LICENSE` SHA-256
`E32449D23085399ADC1222F7A17408B730550258E51627C153CB108CA9955823`

MIT License

Copyright (c) GitHub, Inc.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

# Source-study records

An upstream repository is not a Factory Pilot dependency merely because it is
useful. A source-study record is required before copying any upstream source
fragment into Factory Pilot.

Each record must identify the immutable repository commit, licence, exact
paths studied, excluded paths, purpose, decision, notice obligations, tests,
and a removal path. A `reference-only` decision permits architectural study
but no source copying. Amplication's `ee/` tree is always excluded; Vendure
remains reference-only because its core is GPLv3.

No upstream source is copied by the initial Application Graph platform.

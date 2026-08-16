# Archeform README and Brand Design

## Goal

Reframe the repository README as an external-facing product entry point for
**Archeform · 元象**, while keeping the existing implementation identifiers,
package names, directory layout, and Git remote unchanged during the brand
transition.

## Product meaning

Archeform expresses the project's core idea: an application begins as an
underlying semantic form and unfolds into multiple verified technical forms.
The Chinese name 元象 adds the ideas of origin and manifestation without
requiring a pinyin pronunciation in the public brand.

The primary positioning line is:

> The source form of software.

The README must preserve the stronger architectural claim:

> The graph is the product definition. Generated code is a compiled artifact.

## README structure

The root README will follow this order:

1. Hero with the Archeform · 元象 name, concise product promise, and links to
   architecture, roadmap, and status.
2. What Archeform is, including the Application Graph as the source of truth.
3. Why it exists, expressed as versioned, reviewable, deterministic,
   multi-target, and verifiable behavior.
4. Lifecycle diagram from requirement to Draft, immutable Published Graph,
   Compilation, and independent verification.
5. Workbench and starter-profile explanation grounded in current repository
   capabilities.
6. Requirements, installation, environment setup, local development, and
   verification commands.
7. Architecture, project status, contribution constraints, and license links.

The README will not claim production readiness, hide the active-development
status, or include a broken screenshot path. A screenshot can be added later
when a real asset exists under the repository's documentation assets.

## Scope boundary

This change updates only the root README and the design/implementation records
for this work. It does not rename package metadata, source symbols, filesystem
paths, Git remotes, or existing historical documentation.

## Verification

- Every README link must resolve to an existing repository path or the current
  public Git remote.
- README formatting must pass Prettier.
- The final diff must contain no changes to unrelated user-owned files.

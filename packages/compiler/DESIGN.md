# Expressive generated approval workspace

## Selected direction

Mode: Operate. On September 12 the founder selected cobalt visual hierarchy,
warm photographic materials and clear approval progress, then requested
implementation and reusable assembly supply. This replaces the prior rejected
neutral inbox. The visual target is
`docs/acceptance/evidence/consumer-expressive-approval/design-reference.png`;
it is a concept, not functional evidence or exact business copy.

Richness comes from useful imagery, deliberate type and meaningful state—not
additional paragraphs, dummy metrics, ornamental controls or a second framework.
The real UI preserves Graph names, amounts without invented currency, actual state
and authorized actions. Illustrative currency and unimplemented controls in the
concept are excluded from output.

## Shared composition

Upgrade `approval-workspace-presentation` to 2.0.0 and compose private
`approval-presentation-components@1.0.0` and `approval-visual-assets@1.0.0`
under accepted ADR-0061. Retain `approval-decision-history@1.0.0` behavior.
These are reusable compiler assemblies, not extra public catalog definitions.

- One compact photo-led hero introduces an existing approval list/home without
  displacing the primary action or repeating on every form/history section.
- Original workspace and expense illustrations are bundled locally and selected
  by reviewed Published Graph structure. A thumbnail is category decoration,
  never a particular record or uploaded evidence. Unknown structures get the
  generic family hero and a usable neutral material surface.
- Identity, amount and semantic status dominate. Preserve typed values and
  concise supporting details with progressive disclosure. Avoid large repeated
  Amount/Status/Item labels where typography communicates them.
- Progress projects the known current position: Draft, Submitted, Decision
  (Approved or Rejected when real). It is not historical audit data and supplies
  no fabricated timestamps, actors or reasons.
- Familiar secondary actions use pinned icons with accessible names and
  tooltips. Submit/Approve/Reject retain words because their consequences matter.
  Only working Graph routes and authorized actions appear.
- Forms, errors, empty states, no-match recovery and history share the palette,
  spacing, controls and typography. A refined list beside a raw form is incomplete.

## Theme and responsive behavior

For approval Graphs without an explicit design system, use private cobalt
brand/on-brand #155EEF/#FFFFFF in light mode and #84ADFF/#102A56 in dark mode.
Explicit Graph design systems—including an explicit default—retain their resolved
colors. Typography, radius, motion, spacing and remaining tokens stay Graph-driven.
No external font request or dependency is necessary.

Phone: compact identity, honest demo-role control and native navigation disclosure;
one short hero and compact toolbar; readable records and next action. For the
fixed 390 x 900 populated case, the first permitted record action stays within
650 px and two identifying summaries remain visible. Do not hide necessary
content to satisfy a screenshot.

Tablet: compact navigation and working canvas without squeezing in a desktop
sidebar. Desktop: coherent sidebar, wider working surface, deliberate alignment
and readable line lengths. Fixed image geometry avoids layout shift; maintain
44 px controls and visible keyboard focus.

## Media admission and reuse

Two original AI-generated images, prepared as 768 x 512 WebP, have fixed keys,
dimensions, decoded lengths, hashes, provenance and decorative alt policy.
Embed only selected verified material. No record URL, prompt, upload or provider
response becomes an image source. Corrupt compiler assets fail admission; browser
decode failure preserves the material region, data, actions and recovery.

Future families follow `docs/design/generated-ui-assembly.md`: reuse compatible
slots, add only documented semantic gaps, and keep interpretation focused on the
business definition. Deterministic recipes supply visual completeness without
repeated model prompting or user-facing development steps.

## Acceptance and product truth

Compare actual generated images with the selected concept and retained rejection.
Review phone/tablet/desktop together, including forms and both outcomes; make one
bounded correction pass. Check decoding, local delivery, icons, computed styles,
contrast, focus, overflow, fallback and real create/submit/decision/reload.
Mechanical tests and internal review do not establish founder/user acceptance.

Decision history remains permission-gated read/audit behavior with safe retry and
role-race protection. ADR-0060 return/revision/resubmission/recovery remains a
separate unimplemented milestone. Do not display illustrative controls for it.
Actual identity, owner privacy and managed hosting are separate maturity gaps.

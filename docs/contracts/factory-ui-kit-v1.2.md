# Factory UI Kit v1.2

## Status

Frozen on 2026-07-28. Contract owner: `integration`. Derived from accepted
`docs/adr/014-factory-ui-1-2-console-visual-accessibility-successor.md`.

## Canonical identity and distribution

`packages/ui-kit/factory-ui/1.2.0/` is the immutable canonical asset for the
controlled Console only. It has a complete v1 manifest, exact inventory,
digests, CSS/tokens, React primitives, fixtures, tests, and SPDX evidence. The
complete `apps/console-next/components/factory-ui/` distribution must match it
byte-for-byte; the verifier rejects missing, altered, or mixed 1.1/1.2 files.

`factory-ui@1.1.0` remains the verified Console rollback identity. Nothing in
this contract modifies `factory-ui@1.0.0`, generated `ui.*@2.1.0` assets,
locks, sidecars, outputs, replay, or Registry selection; they remain bound to
1.0 exactly.

## Compatibility

The 1.1 Sheet API and behavior remain unchanged:

```ts
const effectiveModal = modal ?? side !== 'floating';
```

Legacy floating Sheets therefore remain non-modal unless callers explicitly
pass `modal`. Console Lineage remains the explicit `modal` + `overlay="clear"`
case; Products stays left, Evidence right, and Command/Stop centered.

## Visual-accessibility contract

- Light remains the default; both desktop light and dark resolve canvas, paper,
  ink, focus, border, and status colors from the intended token family, with no
  accidental `color-scheme` or fallback token. Normal text contrast is at least
  4.5:1, focus indication at least 3:1 against adjacent surfaces, and status
  tones are visibly distinct by computed foreground/background values.
- Under `prefers-reduced-motion: reduce`, non-essential transition, animation,
  transform, smooth-scroll, and automatic canvas-fit movement are suppressed.
  State, focus, errors, modal feedback, and manual graph navigation remain
  immediate and usable.
- At 390 px and 560 px, modal Lineage remains fully in the viewport with no
  document horizontal overflow, a reachable Close control, one usable graph
  navigation path, focus containment, and opener restoration. At desktop it
  remains below Console chrome and clear of lifecycle primary actions.
- Obsolete `.build-evidence-peek` selectors have no source owner. Compact
  secondary evidence/copy actions retain an accessible name, tooltip/context,
  keyboard target, visible focus, and stable test selector. Primary/destructive
  lifecycle actions retain text. Disabled Settings and Help rail controls are
  not rendered.

## Verification and rollback

Source tests prove exact Console-copy verification, retained 1.1 rollback,
generated-1.0 isolation, absence of dead CSS, hidden unavailable rail actions,
and compact evidence action semantics. Browser tests prove computed styles,
reduced motion, overlay behavior, and Lineage at desktop/390/560 px.

Rollback selects the verified full 1.1 Console distribution and verifier
identity. Preserve the 1.2 canonical asset as evidence; never relabel,
overwrite, or partially copy it, and never fall back by changing generated
1.0 locks.

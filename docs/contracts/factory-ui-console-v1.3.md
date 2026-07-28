# Factory Console UI v1.3 Contract

## Status

Frozen on 2026-07-28. Contract owner: `integration`. Derived from accepted
ADR-016. It applies only to the new immutable Console distribution
`factory-ui-console@1.3.0` and never to generated `factory-ui@1.3.0`.

## Identity and compatibility

- Clone the verified Console-only 1.2 distribution into a distinct canonical
  `factory-ui-console@1.3.0` root. Its manifest key is
  `factory-ui-console`, its inventory binds CSS, tokens, and React primitives,
  and the Console copy must match it byte-for-byte.
- Console 1.1/1.2 and generated 1.0/1.3 assets remain immutable. A Console
  verifier must reject a generated/Console key collision, absent inventory,
  changed file, or mixed versioned copy.
- No dependency, API, route, product-state, model, or control-plane contract
  changes are allowed in this slice.

## Overlay and viewport behavior

| Surface | Required placement |
| --- | --- |
| Products | left drawer |
| Evidence | right drawer |
| Command | centered dialog |
| Stop preview | centered dialog, initial focus Cancel |
| Product Lineage | compact bottom-right floating modal; maximize is the only full-canvas path |

- Compact Lineage is anchored to the desktop bottom-right, has a bounded
  height, does not occupy a side workspace, and restores trigger focus on
  Close/Escape.
- At 701px through 900px, it uses symmetric safe insets rather than a narrow
  desktop remainder. At 390px, 560px, 768px, 900px, and desktop it remains
  fully visible with no document horizontal overflow and reachable Close and
  graph controls.

## Command accessibility

- The search input is a `role="combobox"` with `aria-controls` pointing to the
  matching-command `role="listbox"`.
- Every `role="option"` has a stable DOM ID. ArrowUp/ArrowDown updates
  `aria-activedescendant`; Enter activates the selected enabled command.
- The existing Command focus/close semantics remain intact. Product selection
  from Command opens the same left Products drawer, not a nested centered
  dialog.

## Evidence and rollback

The Console browser/source suites must prove the identity, overlay matrix,
Lineage geometry, responsive breakpoints, focus restoration, and combobox
state. Rollback selects immutable verified Console 1.2; it never edits 1.3 or
changes a generated lock.

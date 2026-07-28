# Factory UI Kit v1.1

## Status

Frozen on 2026-07-28. Contract owner: `integration`. This is a Console-only
successor under accepted ADR-013; it does not replace `factory-ui-kit/v1`.

## Canonical asset identity

```text
packages/ui-kit/factory-ui/1.1.0/
  factory-ui.manifest.json
  tokens.css
  factory-ui.css
  react/factory-ui.tsx
```

The controlled Console distribution at
`apps/console-next/components/factory-ui/` must be byte-for-byte equivalent
to the complete `factory-ui@1.1.0` inventory. The verifier must bind the
Console to `1.1.0` explicitly and reject a missing, altered, or mixed-version
copy.

## Sheet compatibility contract

```ts
type FactorySheetOptions = {
  side?: 'right' | 'left' | 'top' | 'bottom' | 'floating' | 'center';
  modal?: boolean;
  overlay?: 'dim' | 'clear' | 'none';
  restoreFocusId?: string;
  initialFocusId?: string;
};

const effectiveModal = modal ?? side !== 'floating';
```

- All `1.0.0` calls retain their effective behavior.
- `side="floating"` remains non-modal unless a caller explicitly provides
  `modal`.
- A modal sheet renders an overlay unless `overlay="none"`.
- `overlay="clear"` retains modal focus containment without dimming or blur.
- Closing a sheet restores `restoreFocusId` when supplied; otherwise it
  restores the element focused when the sheet opened.

## Distribution isolation

`factory-ui@1.0.0`, its manifest and digest inventory, and every
`ui.*@2.1.0` generated-application lock and canonical evidence sidecar remain
immutable. Generated applications do not import the Console and do not claim
`1.1.0` until a separately versioned UI package suite is promoted.

## Verification gate

- `1.0.0` still verifies the current generated `ui.*@2.1.0` family.
- The Console copy verifies only against `1.1.0` after migration.
- A mixed or modified Console copy fails closed.
- Browser evidence proves Products left, Command/Stop centered, Evidence
  right, and explicit modal/clear floating Lineage with focus restoration.

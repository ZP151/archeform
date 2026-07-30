export const inventoryLedgerContract = {
  catalogEntity: "{{catalogEntity}}",
  stockField: "{{stockField}}",
  movementEntity: "{{movementEntity}}",
  orderEntity: "{{orderEntity}}",
  locationEntity: "{{locationEntity}}",
  merchantRole: "{{merchantRole}}",
  auditRole: "{{auditRole}}",
  movementKinds: ["reserve", "release", "decrement", "adjust"],
  immutable: true,
} as const;

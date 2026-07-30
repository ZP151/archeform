export const locationContextContract = {
  locationEntity: "{{locationEntity}}",
  contextEntity: "{{contextEntity}}",
  locationCodeField: "{{locationCodeField}}",
  customerRole: "{{customerRole}}",
  resolvers: ["opaque-session", "validated-manual-code"],
} as const;

export const principalContextContract = {
  principalEntity: "{{principalEntity}}",
  sessionEntity: "{{sessionEntity}}",
  defaultRole: "{{defaultRole}}",
  rejectedStates: [
    "expired",
    "unknown",
    "role-incompatible",
    "location-incompatible",
  ],
} as const;

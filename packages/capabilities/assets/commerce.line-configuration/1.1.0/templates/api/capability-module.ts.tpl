export const capabilityModule = {
  key: "{{asset.key}}",
  version: "{{asset.version}}",
  applicationId: "{{graph.metadata.id}}",
  effects: {{asset.effectsJson}},
} as const;

export const lineConfigurationContract = {
  catalogEntity: "{{catalogEntity}}",
  lineEntity: "{{lineEntity}}",
  optionGroupEntity: "{{optionGroupEntity}}",
  optionEntity: "{{optionEntity}}",
  customerRole: "{{customerRole}}",
  merchantRole: "{{merchantRole}}",
  catalogPage: "{{catalogPage}}",
  merchantPage: "{{merchantPage}}",
  pricingAuthority: "server",
  snapshotAuthority: "order-line",
} as const;

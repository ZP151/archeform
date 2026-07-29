export const capabilityModule = {
  key: "{{asset.key}}",
  version: "{{asset.version}}",
  applicationId: "{{graph.metadata.id}}",
  effects: {{asset.effectsJson}},
} as const;

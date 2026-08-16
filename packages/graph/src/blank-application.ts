import {
  createDraftRevision,
  safeBusinessTextSchema,
  type DraftRevisionV1,
} from "./index.js";

/**
 * The honest product-composition base: a schema-valid Draft revision whose
 * mutable surface is entirely empty. It is not profile-, template-, or
 * product-specific — the composed product is derived from the accepted
 * blueprint by the deterministic composer. Light mode and English are the
 * only declared experience defaults.
 */
export function createBlankApplicationDraft(input: {
  readonly applicationId: string;
  readonly workspaceId: string;
  readonly name: string;
}): DraftRevisionV1 {
  // The Graph schema does not scan metadata.name; the derivation boundary
  // refuses unsafe material before it can reach the application surface.
  safeBusinessTextSchema.parse(input.name);
  return createDraftRevision(
    {
      apiVersion: "factory.application-graph/v1",
      metadata: {
        id: input.applicationId,
        workspaceId: input.workspaceId,
        name: input.name,
      },
      page: { pages: [], navigation: [] },
      domain: { entities: [], relations: [] },
      policy: { roles: [], permissions: [] },
      flow: { flows: [] },
      integration: { providers: [], capabilities: [] },
      experience: { theme: { mode: "light", tokens: {} }, locales: ["en"] },
    },
    input.applicationId,
  );
}

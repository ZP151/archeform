import {
  assertApplicationGraphV3,
  assertDraftPreviewSnapshotV2,
  hashApplicationGraphV3,
  type ApplicationGraphV3,
  type DraftPreviewSnapshotV2,
} from "@factory/graph";

import type { RestaurantSurfaceKey } from "./contracts.js";
import type { RestaurantProductPlanV1 } from "./plan.js";
import {
  projectRestaurantSurface,
  type RestaurantSurfacePlanV1,
} from "./surface-projection.js";

export type ResolveDraftPreviewGraphV2 = (
  snapshot: DraftPreviewSnapshotV2,
) => ApplicationGraphV3;

export type RestaurantDraftPreviewSurfaceDocumentV2 = {
  readonly apiVersion: "factory.restaurant-draft-preview-surface/v2";
  readonly disposition: "preview-only";
  readonly snapshotId: string;
  readonly graphChecksum: `sha256:${string}`;
  readonly surface: RestaurantSurfacePlanV1;
};

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value as Record<string, unknown>))
      deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}

function previewPlan(
  graph: ApplicationGraphV3,
  checksum: `sha256:${string}`,
): RestaurantProductPlanV1 {
  return deepFreeze(
    JSON.parse(
      JSON.stringify({
        apiVersion: "factory.restaurant-product-plan/v1",
        publishedRevisionId: "preview-only",
        publishedRevisionNumber: 0,
        graphHash: checksum,
        application: graph.metadata,
        surfaces: graph.surfaces,
        pages: graph.page.pages,
        domain: graph.domain,
        policy: graph.policy,
        flows: graph.flow.flows,
        journeys: graph.journeys,
        fieldAuthorities: graph.fieldAuthorities,
        bindingPolicies: graph.bindingPolicies,
        seedScenarios: graph.seedScenarios,
        experience: graph.experience,
        runtimeSchemaVersion: 1,
      }),
    ) as RestaurantProductPlanV1,
  );
}

export function renderRestaurantDraftPreviewSurface(
  snapshotInput: unknown,
  surfaceKey: RestaurantSurfaceKey,
  resolveGraph: ResolveDraftPreviewGraphV2,
  requestedAt: string,
): RestaurantDraftPreviewSurfaceDocumentV2 {
  try {
    const snapshot = assertDraftPreviewSnapshotV2(snapshotInput);
    const requestedTime = Date.parse(requestedAt);
    if (
      snapshot.state !== "rendering" ||
      surfaceKey !== "customer-mobile" ||
      !Number.isFinite(requestedTime) ||
      requestedTime < Date.parse(snapshot.createdAt) ||
      requestedTime >= Date.parse(snapshot.expiresAt)
    ) {
      throw new Error();
    }
    const graph = assertApplicationGraphV3(resolveGraph(snapshot));
    if (hashApplicationGraphV3(graph) !== snapshot.graphChecksum)
      throw new Error();
    return deepFreeze({
      apiVersion: "factory.restaurant-draft-preview-surface/v2",
      disposition: "preview-only",
      snapshotId: snapshot.id,
      graphChecksum: snapshot.graphChecksum,
      surface: projectRestaurantSurface(
        previewPlan(graph, snapshot.graphChecksum),
        surfaceKey,
      ),
    });
  } catch {
    throw new Error("Restaurant Draft preview is invalid.");
  }
}

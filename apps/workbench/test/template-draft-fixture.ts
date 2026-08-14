import { composeRestaurantProductGraph } from "@factory/capabilities";
import {
  assertApplicationGraphV3,
  hashApplicationGraphV3,
  hashDraftPreviewSnapshotV2,
} from "@factory/graph";

import { restaurantProductFixture } from "../../../packages/capabilities/test/restaurant-product-fixture.js";
import type { WorkbenchTemplateDraftInstance } from "../lib/control-plane-client";

/** A strict server-shaped template response shared by Workbench boundary tests. */
export function templateDraftResponse(
  revisionNumber = 1,
  pageTitle?: { readonly pageId: string; readonly title: string },
) {
  const source = composeRestaurantProductGraph(restaurantProductFixture());
  const sourceGraph = structuredClone(source);
  if (pageTitle) {
    const page = sourceGraph.page.pages.find(
      ({ id }) => id === pageTitle.pageId,
    );
    if (!page) throw new Error("Fixture page is unknown.");
    page.title = pageTitle.title;
  }
  const graph = assertApplicationGraphV3({
    ...sourceGraph,
    metadata: {
      ...source.metadata,
      id: "restaurant-template-001",
      workspaceId: "local-workspace",
      name: revisionNumber === 1 ? "Maison Aurelia" : "Maison Rivage",
    },
  });
  const baseSnapshot = {
    apiVersion: "factory.draft-preview-snapshot/v2" as const,
    id: `preview-${revisionNumber}`,
    workspaceId: "local-workspace",
    applicationGraphId: "application-1",
    draftRevisionId: `draft-${revisionNumber}`,
    graphVersion: "factory.application-graph/v3" as const,
    graphChecksum: hashApplicationGraphV3(graph),
    snapshotChecksum:
      "sha256:0000000000000000000000000000000000000000000000000000000000000000" as const,
    disposition: "preview-only" as const,
    state: "active" as const,
    createdAt: "2026-08-14T08:00:00.000Z",
    expiresAt: "2026-08-14T08:30:00.000Z",
  };
  const snapshot = {
    ...baseSnapshot,
    snapshotChecksum: hashDraftPreviewSnapshotV2(baseSnapshot),
  };
  const previewBinding = (policy: (typeof graph.bindingPolicies)[number]) => {
    if (policy.kind === "domain-field") {
      return {
        kind: policy.kind,
        target: `${policy.entityKey}.${policy.fieldKey}`,
        mode: policy.access,
      };
    }
    if (policy.kind === "flow-transition") {
      return {
        kind: policy.kind,
        target: `${policy.flowKey}:${policy.from}:${policy.event}:${policy.to}`,
        mode: policy.access,
      };
    }
    return {
      kind: policy.kind,
      target: `${policy.roleKey}:${policy.resource}:${policy.action}`,
      mode: policy.access,
    };
  };
  const surface = (surfaceKey: "customer-mobile" | "merchant-desktop") => ({
    apiVersion: "factory.restaurant-draft-preview-surface/v2" as const,
    disposition: "preview-only" as const,
    snapshotId: snapshot.id,
    graphChecksum: snapshot.graphChecksum,
    surface: {
      apiVersion: "factory.restaurant-surface-plan/v1" as const,
      surfaceKey,
      pages: graph.page.pages
        .filter((page) => page.surfaceKey === surfaceKey)
        .map((page) => ({
          id: page.id,
          route: page.route,
          title: page.title,
          surfaceKey,
          screenIntent: page.screenIntent,
          recipe: {
            ...page.recipe,
            layoutKey:
              surfaceKey === "customer-mobile"
                ? ("mobile-product-shell" as const)
                : ("merchant-workspace-shell" as const),
          },
          blocks: page.blocks.map(({ id, type }) => ({
            id,
            type,
            bindings: Object.fromEntries(
              graph.bindingPolicies
                .filter(
                  (policy) =>
                    policy.pageId === page.id && policy.blockId === id,
                )
                .map((policy) => [policy.bindingKey, previewBinding(policy)]),
            ),
          })),
        })),
      navigation: graph.surfaces
        .find((candidate) => candidate.key === surfaceKey)!
        .navigation.items.map((item, index) => ({
          ...item,
          label:
            surfaceKey === "customer-mobile"
              ? ["Home", "Menu", "Cart", "Orders", "Profile"][index]!
              : [
                  "Dashboard",
                  "Menu Management",
                  "Orders",
                  "Kitchen Queue",
                  "Tables",
                  "Users/Roles",
                  "Settings",
                ][index]!,
        })),
      source: {
        origins: [
          {
            package: "@factory/screen-recipes",
            version: "0.1.0",
            ownership: "factory-authored",
            license: "UNLICENSED",
            recipeKeys: graph.page.pages
              .filter((page) => page.surfaceKey === surfaceKey)
              .map((page) => page.recipe.key),
          },
        ],
        module:
          surfaceKey === "customer-mobile"
            ? "src/generated/customer-restaurant-ui.mjs"
            : "src/generated/merchant-restaurant-ui.mjs",
        digest:
          "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      },
    },
  });
  return {
    apiVersion: "factory.template-draft-instance/v1" as const,
    template: {
      apiVersion: "factory.curated-template/v1" as const,
      key: "restaurant-dual-surface" as const,
      version: "1.0.0" as const,
      name: "Maison Aurelia" as const,
      description: "A polished customer and merchant Restaurant product.",
      surfaces: ["customer-mobile", "merchant-desktop"] as const,
      graphChecksum:
        "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" as const,
    },
    origin: {
      templateKey: "restaurant-dual-surface" as const,
      templateVersion: "1.0.0" as const,
      templateGraphChecksum:
        "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" as const,
    },
    draft: {
      applicationGraphId: "application-1",
      applicationKey: "restaurant-template-001",
      draftRevisionId: `draft-${revisionNumber}`,
      revisionNumber,
      graph,
    },
    snapshot,
    previews: [
      surface("customer-mobile"),
      surface("merchant-desktop"),
    ] as const,
  } satisfies WorkbenchTemplateDraftInstance;
}

import { describe, expect, it, vi } from "vitest";
import {
  hashApplicationGraphV3,
  hashDraftPreviewSnapshotV2,
  type DraftPreviewSnapshotV2,
} from "@factory/graph";

import { restaurantProductV3Fixture } from "./fixtures/restaurant-product-v3.js";
import * as previewApi from "../src/targets/restaurant-v3/preview.js";
import { planRestaurantProduct } from "../src/targets/restaurant-v3/plan.js";
import { projectRestaurantSurface } from "../src/targets/restaurant-v3/surface-projection.js";

const { renderRestaurantDraftPreviewSurface } = previewApi;
const assertDraftPreviewClosure = (input: unknown) =>
  (
    previewApi as typeof previewApi & {
      assertRestaurantDraftPreviewGraphClosure(input: unknown): unknown;
    }
  ).assertRestaurantDraftPreviewGraphClosure(input);

const fsSpies = vi.hoisted(() => ({
  writeFileSync: vi.fn(),
  renameSync: vi.fn(),
}));
vi.mock("node:fs", () => fsSpies);

function renderingSnapshot(
  graphChecksum = restaurantProductV3Fixture().graphHash,
): DraftPreviewSnapshotV2 {
  const bound = {
    apiVersion: "factory.draft-preview-snapshot/v2" as const,
    id: "restaurant-preview-1",
    workspaceId: "local-workspace",
    applicationGraphId: "restaurant-ordering",
    draftRevisionId: "restaurant-ordering-draft",
    graphVersion: "factory.application-graph/v3" as const,
    graphChecksum,
    disposition: "preview-only" as const,
  };
  const snapshot = {
    ...bound,
    snapshotChecksum: `sha256:${"0".repeat(64)}` as const,
    state: "rendering" as const,
    createdAt: "2026-08-14T00:00:00.000Z",
    expiresAt: "2026-08-14T01:00:00.000Z",
  };
  return {
    ...snapshot,
    snapshotChecksum: hashDraftPreviewSnapshotV2(snapshot),
  };
}

function render(snapshot: unknown = renderingSnapshot()) {
  const fixture = restaurantProductV3Fixture();
  return renderRestaurantDraftPreviewSurface(
    snapshot,
    "customer-mobile",
    () => fixture.graph,
    "2026-08-14T00:30:00.000Z",
  );
}

function allKeys(value: unknown, result = new Set<string>()): Set<string> {
  if (!value || typeof value !== "object") return result;
  for (const [key, child] of Object.entries(value)) {
    result.add(key);
    allKeys(child, result);
  }
  return result;
}

describe("Restaurant V3 Draft preview", () => {
  it("purely asserts the original and reordered dual-surface registry/source closure", () => {
    const original = restaurantProductV3Fixture().graph;
    expect(assertDraftPreviewClosure(original)).toEqual(original);

    const reordered = structuredClone(original);
    for (const [pageId, blockIds] of [
      ["customer-home", ["home-items", "home-hero", "home-categories"]],
      [
        "merchant-dashboard",
        ["dashboard-tables", "dashboard-metrics", "dashboard-orders"],
      ],
    ] as const) {
      const page = reordered.page.pages.find(({ id }) => id === pageId)!;
      const byId = new Map(page.blocks.map((block) => [block.id, block]));
      page.blocks = blockIds.map((id) => byId.get(id)!);
      page.recipe.regions[0]!.blockIds = [...blockIds];
    }
    expect(assertDraftPreviewClosure(reordered)).toEqual(reordered);
  });

  it.each(["type", "binding", "recipe", "source"] as const)(
    "rejects %s drift at the pure dual-surface closure boundary",
    (kind) => {
      const graph = structuredClone(restaurantProductV3Fixture().graph);
      const page = graph.page.pages.find(({ id }) => id === "customer-home")!;
      if (kind === "type") {
        page.blocks[0]!.type = "category-rail";
      } else if (kind === "binding") {
        page.blocks[0]!.bindings.locationName =
          "graph.domain.restaurant-location.serviceOpen";
        const policy = graph.bindingPolicies.find(
          (candidate) =>
            candidate.kind === "domain-field" &&
            candidate.pageId === "customer-home" &&
            candidate.blockId === "home-hero" &&
            candidate.bindingKey === "locationName",
        );
        if (!policy || policy.kind !== "domain-field") throw new Error();
        policy.fieldKey = "serviceOpen";
      } else if (kind === "recipe") {
        page.recipe.version = "9.9.9";
      } else {
        Object.assign(graph, {
          source: {
            module: "src/generated/private.mjs",
            digest: `sha256:${"0".repeat(64)}`,
          },
        });
      }

      expect(() => assertDraftPreviewClosure(graph)).toThrow(
        new Error("Restaurant Draft preview is invalid."),
      );
    },
  );

  it("renders a reordered Draft in Graph order without changing membership", () => {
    const fixture = restaurantProductV3Fixture();
    const graph = structuredClone(fixture.graph);
    const page = graph.page.pages.find(({ id }) => id === "customer-home")!;
    const blocksById = new Map(page.blocks.map((block) => [block.id, block]));
    const blockIds = ["home-items", "home-hero", "home-categories"];
    page.blocks = blockIds.map((blockId) => blocksById.get(blockId)!);
    page.recipe.regions[0]!.blockIds = blockIds;
    const graphChecksum = hashApplicationGraphV3(graph);

    const document = renderRestaurantDraftPreviewSurface(
      renderingSnapshot(graphChecksum),
      "customer-mobile",
      () => graph,
      "2026-08-14T00:30:00.000Z",
    );

    expect(
      document.surface.pages
        .find(({ id }) => id === "customer-home")!
        .blocks.map(({ id, type }) => [id, type]),
    ).toEqual([
      ["home-items", "menu-item-card"],
      ["home-hero", "menu-hero"],
      ["home-categories", "category-rail"],
    ]);
  });

  it("renders the exact frozen customer projection from rendering state", () => {
    const snapshot = renderingSnapshot();
    let resolverCalls = 0;
    const fixture = restaurantProductV3Fixture();
    const document = renderRestaurantDraftPreviewSurface(
      snapshot,
      "customer-mobile",
      () => {
        resolverCalls += 1;
        return fixture.graph;
      },
      "2026-08-14T00:30:00.000Z",
    );
    expect(document).toMatchObject({
      apiVersion: "factory.restaurant-draft-preview-surface/v2",
      disposition: "preview-only",
      snapshotId: "restaurant-preview-1",
      graphChecksum: fixture.graphHash,
      surface: {
        apiVersion: "factory.restaurant-surface-plan/v1",
        surfaceKey: "customer-mobile",
      },
    });
    expect(document.surface.pages).toHaveLength(8);
    expect(resolverCalls).toBe(1);
    expect(Object.isFrozen(document)).toBe(true);
  });

  it("renders merchant desktop with exact production projector parity", () => {
    const fixture = restaurantProductV3Fixture();
    const document = renderRestaurantDraftPreviewSurface(
      renderingSnapshot(),
      "merchant-desktop",
      () => fixture.graph,
      "2026-08-14T00:30:00.000Z",
    );
    const production = projectRestaurantSurface(
      planRestaurantProduct({
        publishedGraph: fixture.publishedGraph,
        compositionLock: fixture.compositionLock,
      }),
      "merchant-desktop",
    );
    expect(document.surface).toEqual(production);
    expect(document.surface.pages.map(({ route }) => route)).toEqual([
      "/merchant",
      "/merchant/menu",
      "/merchant/orders",
      "/merchant/kitchen",
      "/merchant/tables",
      "/merchant/users",
      "/merchant/settings",
    ]);
  });

  it.each(["ready", "active", "disposed", "expired"] as const)(
    "rejects %s lifecycle state",
    (state) => {
      expect(() => render({ ...renderingSnapshot(), state })).toThrow(
        "Restaurant Draft preview is invalid.",
      );
    },
  );

  it.each([
    ["expired request", () => render(undefined)],
    [
      "invalid requested date",
      () =>
        renderRestaurantDraftPreviewSurface(
          renderingSnapshot(),
          "customer-mobile",
          () => restaurantProductV3Fixture().graph,
          "not-a-date",
        ),
    ],
    [
      "checksum mismatch",
      () => {
        const snapshot = renderingSnapshot();
        return render({
          ...snapshot,
          graphChecksum: `sha256:${"9".repeat(64)}`,
        });
      },
    ],
  ] as const)("rejects %s", (label, invoke) => {
    if (label === "expired request") {
      const snapshot = renderingSnapshot();
      expect(() =>
        renderRestaurantDraftPreviewSurface(
          snapshot,
          "customer-mobile",
          () => restaurantProductV3Fixture().graph,
          snapshot.expiresAt,
        ),
      ).toThrow("Restaurant Draft preview is invalid.");
    } else {
      expect(invoke).toThrow("Restaurant Draft preview is invalid.");
    }
  });

  it("rejects a stale resolver graph and V1/V2 resolver values", () => {
    const fixture = restaurantProductV3Fixture();
    const stale = structuredClone(fixture.graph);
    stale.metadata.name = "Stale Restaurant";
    expect(() =>
      renderRestaurantDraftPreviewSurface(
        renderingSnapshot(),
        "customer-mobile",
        () => stale,
        "2026-08-14T00:30:00.000Z",
      ),
    ).toThrow("Restaurant Draft preview is invalid.");
    for (const graph of [
      fixture.baseDraft.graph,
      { ...fixture.graph, apiVersion: "factory.application-graph/v2" },
    ]) {
      expect(() =>
        renderRestaurantDraftPreviewSurface(
          renderingSnapshot(),
          "customer-mobile",
          () => graph as never,
          "2026-08-14T00:30:00.000Z",
        ),
      ).toThrow("Restaurant Draft preview is invalid.");
    }
    expect(hashApplicationGraphV3(fixture.graph)).toBe(fixture.graphHash);
  });

  it("redacts resolver exceptions", () => {
    expect(() =>
      renderRestaurantDraftPreviewSurface(
        renderingSnapshot(),
        "customer-mobile",
        () => {
          throw new Error("caller secret");
        },
        "2026-08-14T00:30:00.000Z",
      ),
    ).toThrow(new Error("Restaurant Draft preview is invalid."));
  });

  it("is artifact-free and never invokes filesystem helpers", () => {
    const document = render();
    const forbidden = [
      "files",
      "artifacts",
      "rootDirectory",
      "compilationId",
      "deploy",
      "export",
      "zip",
      "git",
    ];
    expect(
      [...allKeys(document)].filter((key) => forbidden.includes(key)),
    ).toEqual([]);
    expect(fsSpies.writeFileSync).not.toHaveBeenCalled();
    expect(fsSpies.renameSync).not.toHaveBeenCalled();
  });
});

import { describe, expect, it, vi } from "vitest";
import {
  hashApplicationGraphV3,
  hashDraftPreviewSnapshotV2,
  type DraftPreviewSnapshotV2,
} from "@factory/graph";

import { restaurantProductV3Fixture } from "./fixtures/restaurant-product-v3.js";
import { renderRestaurantDraftPreviewSurface } from "../src/targets/restaurant-v3/preview.js";
import { planRestaurantProduct } from "../src/targets/restaurant-v3/plan.js";
import { projectRestaurantSurface } from "../src/targets/restaurant-v3/surface-projection.js";

const fsSpies = vi.hoisted(() => ({
  writeFileSync: vi.fn(),
  renameSync: vi.fn(),
}));
vi.mock("node:fs", () => fsSpies);

function renderingSnapshot(): DraftPreviewSnapshotV2 {
  const graphChecksum = restaurantProductV3Fixture().graphHash;
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

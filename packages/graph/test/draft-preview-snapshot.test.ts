import { describe, expect, it } from "vitest";

import {
  assertDraftPreviewSnapshot,
  hashDraftPreviewSnapshot,
  transitionDraftPreviewSnapshot,
} from "../src/index.js";

const graphChecksum = `sha256:${"1".repeat(64)}`;
const snapshotChecksum =
  "sha256:9213338e9c3746319adc0b8f844c14dbc803b806ca6c6c2366c5feec346f9dc7";

function validSnapshot(state = "ready"): Record<string, unknown> {
  return {
    apiVersion: "factory.draft-preview-snapshot/v1",
    id: "snapshot-1",
    workspaceId: "workspace-1",
    applicationGraphId: "restaurant-app",
    draftRevisionId: "draft-2",
    graphVersion: "factory.application-graph/v2",
    graphChecksum,
    snapshotChecksum,
    disposition: "preview-only",
    state,
    createdAt: "2026-08-12T12:00:00.000Z",
    expiresAt: "2026-08-12T12:30:00.000Z",
  };
}

describe("DraftPreviewSnapshotV1", () => {
  it("validates an exact immutable Draft binding and literal canonical checksum", () => {
    expect(assertDraftPreviewSnapshot(validSnapshot())).toEqual(
      validSnapshot(),
    );
    expect(hashDraftPreviewSnapshot(validSnapshot())).toBe(snapshotChecksum);
  });

  it("excludes lifecycle state and timestamps from its semantic checksum", () => {
    const changedLifecycle = {
      ...validSnapshot("active"),
      createdAt: "2026-08-12T11:59:00.000Z",
      expiresAt: "2026-08-12T13:30:00.000Z",
    };
    expect(hashDraftPreviewSnapshot(changedLifecycle)).toBe(snapshotChecksum);
  });

  it("rejects checksum mismatch, invalid time bounds, and extra keys", () => {
    expect(() =>
      assertDraftPreviewSnapshot({
        ...validSnapshot(),
        snapshotChecksum: `sha256:${"2".repeat(64)}`,
      }),
    ).toThrow(/checksum/i);

    expect(() =>
      assertDraftPreviewSnapshot({
        ...validSnapshot(),
        expiresAt: "2026-08-12T11:59:59.000Z",
      }),
    ).toThrow(/expiresAt|after/i);

    expect(() =>
      assertDraftPreviewSnapshot({
        ...validSnapshot(),
        compilationId: "compilation-1",
      }),
    ).toThrow(/Unrecognized key/);
  });

  it("transitions ready -> rendering -> active -> disposed with append-only events", () => {
    const original = validSnapshot();
    const originalBytes = JSON.stringify(original);
    const rendering = transitionDraftPreviewSnapshot(original, {
      kind: "start-rendering",
      occurredAt: "2026-08-12T12:01:00.000Z",
      currentDraftRevisionId: "draft-2",
      currentGraphChecksum: graphChecksum,
    });

    expect(rendering).toEqual({
      snapshot: { ...original, state: "rendering" },
      event: {
        kind: "draft-preview-snapshot-transition",
        snapshotId: "snapshot-1",
        from: "ready",
        to: "rendering",
        occurredAt: "2026-08-12T12:01:00.000Z",
      },
    });
    expect(JSON.stringify(original)).toBe(originalBytes);

    const active = transitionDraftPreviewSnapshot(rendering.snapshot, {
      kind: "activate",
      occurredAt: "2026-08-12T12:02:00.000Z",
      currentDraftRevisionId: "draft-2",
      currentGraphChecksum: graphChecksum,
    });
    const disposed = transitionDraftPreviewSnapshot(active.snapshot, {
      kind: "dispose",
      occurredAt: "2026-08-12T12:03:00.000Z",
    });

    expect(active.snapshot.state).toBe("active");
    expect(disposed.snapshot.state).toBe("disposed");
    for (const result of [rendering, active, disposed]) {
      expect(result.snapshot.draftRevisionId).toBe("draft-2");
      expect(result.snapshot.graphChecksum).toBe(graphChecksum);
      expect(result.snapshot.snapshotChecksum).toBe(snapshotChecksum);
    }
  });

  it("rejects stale Draft and Graph checksum bindings", () => {
    expect(() =>
      transitionDraftPreviewSnapshot(validSnapshot(), {
        kind: "start-rendering",
        occurredAt: "2026-08-12T12:01:00.000Z",
        currentDraftRevisionId: "draft-3",
        currentGraphChecksum: graphChecksum,
      }),
    ).toThrow(/stale|revision/i);

    expect(() =>
      transitionDraftPreviewSnapshot(validSnapshot(), {
        kind: "start-rendering",
        occurredAt: "2026-08-12T12:01:00.000Z",
        currentDraftRevisionId: "draft-2",
        currentGraphChecksum: `sha256:${"3".repeat(64)}`,
      }),
    ).toThrow(/checksum/i);
  });

  it("enforces exact state and expiry time boundaries", () => {
    expect(() =>
      transitionDraftPreviewSnapshot(validSnapshot(), {
        kind: "activate",
        occurredAt: "2026-08-12T12:01:00.000Z",
        currentDraftRevisionId: "draft-2",
        currentGraphChecksum: graphChecksum,
      }),
    ).toThrow(/transition/i);

    expect(() =>
      transitionDraftPreviewSnapshot(validSnapshot(), {
        kind: "start-rendering",
        occurredAt: "2026-08-12T12:30:00.000Z",
        currentDraftRevisionId: "draft-2",
        currentGraphChecksum: graphChecksum,
      }),
    ).toThrow(/expired|expires/i);

    expect(() =>
      transitionDraftPreviewSnapshot(validSnapshot(), {
        kind: "expire",
        occurredAt: "2026-08-12T12:29:59.999Z",
      }),
    ).toThrow(/not expired|expires/i);

    expect(
      transitionDraftPreviewSnapshot(validSnapshot(), {
        kind: "expire",
        occurredAt: "2026-08-12T12:30:00.000Z",
      }).snapshot.state,
    ).toBe("expired");
  });

  it.each(["disposed", "expired"])(
    "treats %s as terminal for every command",
    (state) => {
      expect(() =>
        transitionDraftPreviewSnapshot(validSnapshot(state), {
          kind: "dispose",
          occurredAt: "2026-08-12T12:31:00.000Z",
        }),
      ).toThrow(/terminal/i);
    },
  );

  it.each(["deploy", "export", "publish", "create-compilation"] as const)(
    "explicitly rejects the production action %s",
    (kind) => {
      expect(() =>
        transitionDraftPreviewSnapshot(validSnapshot(), {
          kind,
          occurredAt: "2026-08-12T12:01:00.000Z",
        }),
      ).toThrow(/preview-only|forbidden|cannot/i);
    },
  );

  it("strictly rejects extra command keys", () => {
    expect(() =>
      transitionDraftPreviewSnapshot(validSnapshot(), {
        kind: "dispose",
        occurredAt: "2026-08-12T12:01:00.000Z",
        deployTarget: "production",
      } as never),
    ).toThrow(/Unrecognized key/);
  });
});

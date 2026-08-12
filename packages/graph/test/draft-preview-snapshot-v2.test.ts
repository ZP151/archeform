import { describe, expect, it } from "vitest";

import * as browserGraph from "../src/browser.js";
import { assertDraftPreviewSnapshot } from "../src/draft-preview-snapshot.js";
import {
  assertDraftPreviewSnapshotV2,
  draftPreviewSnapshotV2Schema,
  hashDraftPreviewSnapshotV2,
  transitionDraftPreviewSnapshotV2,
} from "../src/draft-preview-snapshot-v2.js";

const graphChecksum = `sha256:${"1".repeat(64)}`;
const snapshotChecksum =
  "sha256:d6382d36dc4d7dffae1a1cc9d32878ee9458e3566a3aafd63c553e78116189f7";

function validSnapshot(state = "ready"): Record<string, any> {
  return {
    apiVersion: "factory.draft-preview-snapshot/v2",
    id: "snapshot-1",
    workspaceId: "workspace-1",
    applicationGraphId: "restaurant-app",
    draftRevisionId: "draft-2",
    graphVersion: "factory.application-graph/v3",
    graphChecksum,
    snapshotChecksum,
    disposition: "preview-only",
    state,
    createdAt: "2026-08-12T12:00:00.000Z",
    expiresAt: "2026-08-12T12:30:00.000Z",
  };
}

type SnapshotBoundaryCase = {
  input: unknown;
  behaviorCalls: () => number;
};

function hostileSnapshotArray(
  values: readonly unknown[],
  customPrototype = false,
): { value: unknown[]; behaviorCalls: () => number } {
  let calls = 0;
  if (customPrototype) {
    const value = Array.from(values);
    const prototype = Object.create(Array.prototype) as Record<
      PropertyKey,
      unknown
    >;
    prototype.map = function (...args: unknown[]) {
      calls += 1;
      return Reflect.apply(Array.prototype.map, this, args);
    };
    Object.setPrototypeOf(value, prototype);
    return { value, behaviorCalls: () => calls };
  }

  class HostileArray extends Array<unknown> {
    public override map<U>(
      callback: (value: unknown, index: number, array: unknown[]) => U,
      thisArg?: unknown,
    ): U[] {
      calls += 1;
      return Array.prototype.map.call(this, callback, thisArg) as U[];
    }
  }
  const value = new HostileArray();
  for (const item of values) Array.prototype.push.call(value, item);
  return { value, behaviorCalls: () => calls };
}

const snapshotBoundaryCases = [
  {
    label: "inherited required field",
    create: (): SnapshotBoundaryCase => {
      const snapshot = validSnapshot();
      const { id, ...ownSnapshot } = snapshot;
      return {
        input: Object.assign(Object.create({ id }), ownSnapshot),
        behaviorCalls: () => 0,
      };
    },
  },
  {
    label: "symbol extra",
    create: (): SnapshotBoundaryCase => {
      const snapshot = validSnapshot();
      snapshot[Symbol("compilerTarget")] = "web";
      return { input: snapshot, behaviorCalls: () => 0 };
    },
  },
  {
    label: "non-enumerable extra",
    create: (): SnapshotBoundaryCase => {
      const snapshot = validSnapshot();
      Object.defineProperty(snapshot, "compilerTarget", {
        value: "web",
        enumerable: false,
      });
      return { input: snapshot, behaviorCalls: () => 0 };
    },
  },
  {
    label: "required-field accessor",
    create: (): SnapshotBoundaryCase => {
      const snapshot = validSnapshot();
      let calls = 0;
      const id = snapshot.id;
      Object.defineProperty(snapshot, "id", {
        enumerable: true,
        get() {
          calls += 1;
          return id;
        },
      });
      return { input: snapshot, behaviorCalls: () => calls };
    },
  },
  {
    label: "extra-field accessor",
    create: (): SnapshotBoundaryCase => {
      const snapshot = validSnapshot();
      let calls = 0;
      Object.defineProperty(snapshot, "compilerTarget", {
        enumerable: true,
        get() {
          calls += 1;
          return "web";
        },
      });
      return { input: snapshot, behaviorCalls: () => calls };
    },
  },
  {
    label: "array subclass",
    create: (): SnapshotBoundaryCase => {
      const hostile = hostileSnapshotArray([validSnapshot()]);
      return { input: hostile.value, behaviorCalls: hostile.behaviorCalls };
    },
  },
  {
    label: "custom array prototype",
    create: (): SnapshotBoundaryCase => {
      const hostile = hostileSnapshotArray([validSnapshot()], true);
      return { input: hostile.value, behaviorCalls: hostile.behaviorCalls };
    },
  },
  {
    label: "nested hostile array",
    create: (): SnapshotBoundaryCase => {
      const snapshot = validSnapshot();
      const hostile = hostileSnapshotArray([]);
      snapshot.details = { values: hostile.value };
      return { input: snapshot, behaviorCalls: hostile.behaviorCalls };
    },
  },
] as const;

const snapshotBoundaryApis = [
  [
    "Node schema",
    (input: unknown) => draftPreviewSnapshotV2Schema.safeParse(input).success,
  ],
  [
    "browser schema",
    (input: unknown) =>
      browserGraph.draftPreviewSnapshotV2Schema.safeParse(input).success,
  ],
  [
    "Node assert",
    (input: unknown) => {
      assertDraftPreviewSnapshotV2(input);
      return true;
    },
  ],
  [
    "browser assert",
    (input: unknown) => {
      browserGraph.assertDraftPreviewSnapshotV2(input);
      return true;
    },
  ],
  [
    "Node hash",
    (input: unknown) => {
      hashDraftPreviewSnapshotV2(input);
      return true;
    },
  ],
  [
    "browser hash",
    (input: unknown) => {
      browserGraph.hashDraftPreviewSnapshotV2(input);
      return true;
    },
  ],
] as const;

const transitionCommandBoundaryCases = [
  {
    label: "inherited required field",
    create: (): SnapshotBoundaryCase => ({
      input: Object.assign(Object.create({ kind: "dispose" }), {
        occurredAt: "2026-08-12T12:01:00.000Z",
      }),
      behaviorCalls: () => 0,
    }),
  },
  {
    label: "symbol extra",
    create: (): SnapshotBoundaryCase => {
      const command: Record<PropertyKey, unknown> = {
        kind: "dispose",
        occurredAt: "2026-08-12T12:01:00.000Z",
      };
      command[Symbol("deployTarget")] = "production";
      return { input: command, behaviorCalls: () => 0 };
    },
  },
  {
    label: "non-enumerable extra",
    create: (): SnapshotBoundaryCase => {
      const command = {
        kind: "dispose",
        occurredAt: "2026-08-12T12:01:00.000Z",
      };
      Object.defineProperty(command, "deployTarget", {
        value: "production",
        enumerable: false,
      });
      return { input: command, behaviorCalls: () => 0 };
    },
  },
  {
    label: "required-field accessor",
    create: (): SnapshotBoundaryCase => {
      let calls = 0;
      const command = {
        occurredAt: "2026-08-12T12:01:00.000Z",
      } as Record<string, unknown>;
      Object.defineProperty(command, "kind", {
        enumerable: true,
        get() {
          calls += 1;
          return "dispose";
        },
      });
      return { input: command, behaviorCalls: () => calls };
    },
  },
  {
    label: "array subclass",
    create: (): SnapshotBoundaryCase => {
      const hostile = hostileSnapshotArray([]);
      return { input: hostile.value, behaviorCalls: hostile.behaviorCalls };
    },
  },
  {
    label: "custom array prototype",
    create: (): SnapshotBoundaryCase => {
      const hostile = hostileSnapshotArray([], true);
      return { input: hostile.value, behaviorCalls: hostile.behaviorCalls };
    },
  },
  {
    label: "nested hostile array",
    create: (): SnapshotBoundaryCase => {
      const hostile = hostileSnapshotArray([]);
      return {
        input: {
          kind: "dispose",
          occurredAt: "2026-08-12T12:01:00.000Z",
          details: { values: hostile.value },
        },
        behaviorCalls: hostile.behaviorCalls,
      };
    },
  },
] as const;

describe("DraftPreviewSnapshotV2", () => {
  it("validates an exact immutable Graph V3 Draft binding and pinned checksum", () => {
    expect(assertDraftPreviewSnapshotV2(validSnapshot())).toEqual(
      validSnapshot(),
    );
    expect(hashDraftPreviewSnapshotV2(validSnapshot())).toBe(snapshotChecksum);
  });

  it("excludes lifecycle state and timestamps from its semantic checksum", () => {
    expect(
      hashDraftPreviewSnapshotV2({
        ...validSnapshot("active"),
        createdAt: "2026-08-12T11:59:00.000Z",
        expiresAt: "2026-08-12T13:30:00.000Z",
      }),
    ).toBe(snapshotChecksum);
  });

  it("strictly separates Snapshot V1/Graph V2 from Snapshot V2/Graph V3", () => {
    expect(() => assertDraftPreviewSnapshot(validSnapshot())).toThrow();
    expect(() =>
      assertDraftPreviewSnapshotV2({
        ...validSnapshot(),
        apiVersion: "factory.draft-preview-snapshot/v1",
        graphVersion: "factory.application-graph/v2",
      }),
    ).toThrow();
    expect(() =>
      assertDraftPreviewSnapshotV2({
        ...validSnapshot(),
        graphVersion: "factory.application-graph/v2",
      }),
    ).toThrow();
  });

  it("rejects checksum mismatch, invalid time bounds, and extra keys", () => {
    expect(() =>
      assertDraftPreviewSnapshotV2({
        ...validSnapshot(),
        snapshotChecksum: `sha256:${"2".repeat(64)}`,
      }),
    ).toThrow(
      "Draft Preview Snapshot checksum does not match its immutable binding.",
    );
    expect(() =>
      assertDraftPreviewSnapshotV2({
        ...validSnapshot(),
        expiresAt: "2026-08-12T11:59:59.000Z",
      }),
    ).toThrow("Draft Preview Snapshot expiresAt must be after createdAt.");
    expect(() =>
      assertDraftPreviewSnapshotV2({
        ...validSnapshot(),
        compilationId: "compilation-1",
      }),
    ).toThrow(/Unrecognized key/);
  });

  it("transitions ready to rendering to active to disposed without mutating input", () => {
    const original = validSnapshot();
    const originalBytes = JSON.stringify(original);
    const rendering = transitionDraftPreviewSnapshotV2(original, {
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

    const active = transitionDraftPreviewSnapshotV2(rendering.snapshot, {
      kind: "activate",
      occurredAt: "2026-08-12T12:02:00.000Z",
      currentDraftRevisionId: "draft-2",
      currentGraphChecksum: graphChecksum,
    });
    const disposed = transitionDraftPreviewSnapshotV2(active.snapshot, {
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

  it.each(["start-rendering", "activate"] as const)(
    "rejects stale Draft and Graph bindings during %s",
    (kind) => {
      const snapshot = validSnapshot(
        kind === "activate" ? "rendering" : "ready",
      );
      expect(() =>
        transitionDraftPreviewSnapshotV2(snapshot, {
          kind,
          occurredAt: "2026-08-12T12:01:00.000Z",
          currentDraftRevisionId: "draft-3",
          currentGraphChecksum: graphChecksum,
        }),
      ).toThrow(
        "Draft Preview Snapshot is stale relative to the current Draft revision.",
      );
      expect(() =>
        transitionDraftPreviewSnapshotV2(snapshot, {
          kind,
          occurredAt: "2026-08-12T12:01:00.000Z",
          currentDraftRevisionId: "draft-2",
          currentGraphChecksum: `sha256:${"3".repeat(64)}`,
        }),
      ).toThrow(
        "Draft Preview Snapshot Graph checksum does not match the current Draft.",
      );
    },
  );

  it("enforces state, creation-time, and expiry boundaries", () => {
    expect(() =>
      transitionDraftPreviewSnapshotV2(validSnapshot(), {
        kind: "activate",
        occurredAt: "2026-08-12T12:01:00.000Z",
        currentDraftRevisionId: "draft-2",
        currentGraphChecksum: graphChecksum,
      }),
    ).toThrow(
      "Draft Preview Snapshot cannot transition from 'ready' to active.",
    );
    expect(() =>
      transitionDraftPreviewSnapshotV2(validSnapshot(), {
        kind: "dispose",
        occurredAt: "2026-08-12T11:59:59.999Z",
      }),
    ).toThrow(
      "Draft Preview Snapshot transition cannot precede snapshot creation.",
    );
    expect(() =>
      transitionDraftPreviewSnapshotV2(validSnapshot(), {
        kind: "start-rendering",
        occurredAt: "2026-08-12T12:30:00.000Z",
        currentDraftRevisionId: "draft-2",
        currentGraphChecksum: graphChecksum,
      }),
    ).toThrow("Draft Preview Snapshot has expired and cannot start rendering.");
    expect(() =>
      transitionDraftPreviewSnapshotV2(validSnapshot("rendering"), {
        kind: "activate",
        occurredAt: "2026-08-12T12:30:00.000Z",
        currentDraftRevisionId: "draft-2",
        currentGraphChecksum: graphChecksum,
      }),
    ).toThrow("Draft Preview Snapshot has expired and cannot activate.");
    expect(() =>
      transitionDraftPreviewSnapshotV2(validSnapshot(), {
        kind: "expire",
        occurredAt: "2026-08-12T12:29:59.999Z",
      }),
    ).toThrow("Draft Preview Snapshot is not expired at the transition time.");
    expect(
      transitionDraftPreviewSnapshotV2(validSnapshot(), {
        kind: "expire",
        occurredAt: "2026-08-12T12:30:00.000Z",
      }).snapshot.state,
    ).toBe("expired");
  });

  it.each(["disposed", "expired"])(
    "treats %s as terminal for every command",
    (state) => {
      expect(() =>
        transitionDraftPreviewSnapshotV2(validSnapshot(state), {
          kind: "dispose",
          occurredAt: "2026-08-12T12:31:00.000Z",
        }),
      ).toThrow(`Draft Preview Snapshot state '${state}' is terminal.`);
    },
  );

  it.each(["deploy", "export", "publish", "create-compilation"] as const)(
    "explicitly rejects the production action %s",
    (kind) => {
      expect(() =>
        transitionDraftPreviewSnapshotV2(validSnapshot(), {
          kind,
          occurredAt: "2026-08-12T12:01:00.000Z",
        }),
      ).toThrow(
        `Draft Preview Snapshot is preview-only and cannot perform '${kind}'.`,
      );
    },
  );

  it("strictly rejects extra command keys", () => {
    expect(() =>
      transitionDraftPreviewSnapshotV2(validSnapshot(), {
        kind: "dispose",
        occurredAt: "2026-08-12T12:01:00.000Z",
        deployTarget: "production",
      } as never),
    ).toThrow(/Unrecognized key/);
  });

  it.each(snapshotBoundaryCases)(
    "rejects a $label through every Node/browser schema, assert, and hash boundary without invoking behavior",
    ({ create }) => {
      const observations = snapshotBoundaryApis.map(([label, run]) => {
        const candidate = create();
        let accepted = false;
        try {
          accepted = run(candidate.input);
        } catch {
          accepted = false;
        }
        return { label, accepted, calls: candidate.behaviorCalls() };
      });
      expect(observations.map(({ accepted }) => accepted)).toEqual(
        observations.map(() => false),
      );
      expect(observations.map(({ calls }) => calls)).toEqual(
        observations.map(() => 0),
      );
    },
  );

  it.each(transitionCommandBoundaryCases)(
    "rejects a $label transition command through Node/browser boundaries without invoking behavior",
    ({ create }) => {
      const observations = [
        ["Node", transitionDraftPreviewSnapshotV2],
        ["browser", browserGraph.transitionDraftPreviewSnapshotV2],
      ].map(([label, transition]) => {
        const candidate = create();
        let accepted = false;
        try {
          (transition as typeof transitionDraftPreviewSnapshotV2)(
            validSnapshot(),
            candidate.input as never,
          );
          accepted = true;
        } catch {
          accepted = false;
        }
        return { label, accepted, calls: candidate.behaviorCalls() };
      });
      expect(observations.map(({ accepted }) => accepted)).toEqual([
        false,
        false,
      ]);
      expect(observations.map(({ calls }) => calls)).toEqual([0, 0]);
    },
  );
});

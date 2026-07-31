import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  createExternalIntakeApi,
  canonicalJson,
  canonicalRecordDigest,
  ExternalIntakeStore,
  verifyPromotionPacket,
  type ExternalIntakeApiV1,
} from "@factory/external-intake";

import { runIntakeCli } from "../src/main.js";

const roots: string[] = [];

function tempRoot(): string {
  const root = mkdtempSync(join(tmpdir(), "factory-intake-cli-test-"));
  roots.push(root);
  return root;
}

function validRequestFile(root: string): string {
  const path = join(root, "batch.json");
  writeFileSync(
    path,
    JSON.stringify({
      apiVersion: "factory.external-intake-batch/v1",
      items: [
        {
          id: "safe-source",
          request: {
            apiVersion: "factory.external-intake-request/v1",
            createdAt: "2026-07-31T06:00:00.000Z",
            producerVersion: "0.1.0",
            parentDigests: [],
            source: {
              canonicalRepositoryUrl:
                "https://github.com/example/safe-source.git",
              requestedRef: "v1.0.0",
              expectedCommit: "a".repeat(40),
            },
            classification: "provider",
            requestedModules: [{ path: "src/index.ts" }],
            allowNetworkRetrieval: true,
          },
        },
      ],
    }),
  );
  return path;
}

function outputHarness(api: ExternalIntakeApiV1, cwd: string) {
  const stdout: string[] = [];
  const stderr: string[] = [];
  return {
    stdout,
    stderr,
    options: {
      api,
      cwd,
      stdout: (line: string) => stdout.push(line),
      stderr: (line: string) => stderr.push(line),
    },
  };
}

function credentialLikeSentinel(): string {
  return Array.from(
    { length: 16 },
    (_, index) =>
      `${String.fromCharCode(65 + (index % 26))}${String.fromCharCode(
        97 + ((index * 7) % 26),
      )}${index % 10}`,
  ).join("");
}

function delimiterCredentialSentinel(delimiter: "." | ":" | "@"): string {
  const sentinel = credentialLikeSentinel();
  const middle = sentinel.length / 2;
  return `${sentinel.slice(0, middle)}${delimiter}${sentinel.slice(middle)}`;
}

afterEach(() => {
  for (const root of roots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe("repository-local intake CLI", () => {
  function validPromotionPacket() {
    const digest = (character: string) =>
      `sha256:${character.repeat(64)}` as const;
    const reviewers = [
      "intake-maintainer",
      "licence-reviewer",
      "security-reviewer",
      "capability-maintainer",
      "architecture-owner",
      "qa-owner",
      "golden-owner",
    ].map((role) => ({
      role,
      reviewer: `${role}-alice`,
      status: "assigned-not-reviewed" as const,
    }));
    const packet = {
      apiVersion: "factory.external-capability-promotion-packet/v1" as const,
      decision: "pending-review" as const,
      candidate: {
        id: "safe-adapter",
        version: "1.0.0",
        digest: digest("a"),
        status: "conformance-passed" as const,
      },
      source: {
        repositoryUrl: "https://github.com/example/safe-adapter.git",
        resolvedCommit: "a".repeat(40),
        snapshotDigest: digest("b"),
      },
      evidenceDigest: digest("c"),
      conformanceDigest: digest("d"),
      reviewInputDigest: digest("e"),
      parentDigests: [
        digest("a"),
        digest("b"),
        digest("c"),
        digest("d"),
        digest("e"),
        digest("f"),
      ].sort(),
      licence: {
        manualStatus: "unreviewed" as const,
        reviewStatus: "pending-manual-review" as const,
      },
      findingDispositions: (
        ["licence", "secret", "sast", "dependency"] as const
      ).map((kind, index) => ({
        kind,
        resultDigest: digest(String(index + 1)),
        findings: [],
      })),
      sourceCopy: { mode: "none" as const, ranges: [] },
      notices: {
        destination: "docs/third-party-notices.md" as const,
        action: "pending-manual-review" as const,
      },
      reviewers,
      factory: {
        proposedFactoryKey: "candidate.safe-adapter",
        version: "1.0.0",
        packageRoot: "packages/capabilities/assets/safe-adapter/1.0.0",
        targets: ["api"],
      },
      factoryInterface: {
        proposedFactoryKey: "candidate.safe-adapter",
        version: "1.0.0",
        manifestDigest: digest("9"),
        inputSchema: {
          type: "object" as const,
          properties: { message: { type: "string" as const } },
          required: ["message"],
          additionalProperties: false as const,
        },
        outputSchema: {
          type: "object" as const,
          properties: { message: { type: "string" as const } },
          required: ["message"],
          additionalProperties: false as const,
        },
        effects: ["candidate.project"],
      },
      removalPlan: {
        packageRoot: "packages/capabilities/assets/safe-adapter/1.0.0",
        replacement: "factory-native-safe-adapter",
        steps: [
          "remove-package",
          "remove-target-bindings",
          "run-regressions",
        ] as const,
      },
      collision: {
        inventoryDigest: digest("f"),
        result: "no-collision-observed-in-inventory" as const,
        goldenOwnerAction: "pending-manual-review" as const,
      },
      prohibitedFields: [
        "approval",
        "waiver",
        "source-copy-execution",
        "notice-modification",
        "golden-registration",
        "graph-input",
        "asset-lock-input",
        "composition-lock-input",
        "compiler-input",
        "runtime-activation",
        "provider-activation",
      ] as const,
    };
    expect(verifyPromotionPacket(packet).valid).toBe(true);
    return packet;
  }

  it("submits only a local regular JSON request file and prints redacted status", async () => {
    const root = tempRoot();
    const requestPath = validRequestFile(root);
    const original = readFileSync(requestPath, "utf8");
    const quarantine = join(root, "quarantine");
    const api = createExternalIntakeApi(
      new ExternalIntakeStore(quarantine),
      quarantine,
    );
    const output = outputHarness(api, root);

    expect(
      await runIntakeCli(
        ["batch", "submit", "--file", requestPath],
        output.options,
      ),
    ).toBe(0);
    expect(await runIntakeCli(["status", "safe-source"], output.options)).toBe(
      0,
    );

    const rendered = output.stdout.join("\n");
    expect(rendered).toContain('"status":"requested"');
    expect(rendered).toContain('"id":"safe-source"');
    expect(rendered).not.toContain("github.com");
    expect(rendered).not.toMatch(/sourceBody|raw|secret-match/iu);
    expect(readFileSync(requestPath, "utf8")).toBe(original);
    expect(output.stderr).toEqual([]);
  });

  it("loads status and verifies a prior job in a fresh CLI process", async () => {
    const root = tempRoot();
    const requestPath = validRequestFile(root);
    const quarantine = join(root, "quarantine");
    const submitted = outputHarness(
      createExternalIntakeApi(new ExternalIntakeStore(quarantine), quarantine),
      root,
    );
    expect(
      await runIntakeCli(
        ["batch", "submit", "--file", requestPath],
        submitted.options,
      ),
    ).toBe(0);
    const result = JSON.parse(submitted.stdout[0]!) as {
      byId: Record<string, { lookupId: string }>;
    };
    const lookupId = result.byId["safe-source"]!.lookupId;
    const fresh = outputHarness(
      createExternalIntakeApi(new ExternalIntakeStore(quarantine), quarantine),
      root,
    );

    expect(await runIntakeCli(["status", lookupId], fresh.options)).toBe(0);
    expect(
      await runIntakeCli(["verify", "--job", lookupId], fresh.options),
    ).toBe(0);
    expect(fresh.stdout.join("\n")).toContain('\"valid\":true');
    expect(fresh.stderr).toEqual([]);
  });

  it.each([
    [
      "remote request URL",
      ["batch", "submit", "--file", "https://example.test/batch.json"],
    ],
    ["promotion operation", ["candidate", "promote", "safe-adapter@1.0.0"]],
    ["approval operation", ["candidate", "approve", "safe-adapter@1.0.0"]],
    ["arbitrary output", ["status", "safe-source", "--out", "result.json"]],
    ["path-like opaque ID", ["status", "../safe-source"]],
  ])("rejects %s", async (_, args) => {
    const root = tempRoot();
    const quarantine = join(root, "quarantine");
    const api = createExternalIntakeApi(
      new ExternalIntakeStore(quarantine),
      quarantine,
    );
    const output = outputHarness(api, root);

    expect(await runIntakeCli(args, output.options)).toBe(2);
    expect(output.stdout).toEqual([]);
    expect(output.stderr.join("\n")).toContain("invalid-command");
  });

  it.each([
    ["show", ["candidate", "show", "safe-adapter@1.0.0"]],
    ["test", ["candidate", "test", "safe-adapter@1.0.0"]],
    ["verify", ["verify", "--job", "safe-source"]],
  ])(
    "dispatches the read-only %s command with opaque identities",
    async (_, args) => {
      const root = tempRoot();
      const calls: string[] = [];
      const api = {
        candidateShow(id: string, version: string) {
          calls.push(`show:${id}@${version}`);
          return { id, version, status: "quarantined" };
        },
        candidateTest(id: string, version: string) {
          calls.push(`test:${id}@${version}`);
          return { id, version, status: "conformance-passed" };
        },
        verifyJob(id: string) {
          calls.push(`verify:${id}`);
          return { id, valid: true };
        },
      } as unknown as ExternalIntakeApiV1;
      const output = outputHarness(api, root);

      expect(await runIntakeCli(args, output.options)).toBe(0);
      expect(calls).toHaveLength(1);
      expect(output.stderr).toEqual([]);
      expect(output.stdout.join("\n")).not.toMatch(
        /sourceBody|sourceText|raw|secret-match/iu,
      );
    },
  );

  it.each([
    "token",
    "auth",
    "apiKey",
    "clientSecret",
    "privateKey",
    "password",
    "credential",
    "prompt",
    "response",
  ])("redacts Candidate output key family %s", async (key) => {
    const root = tempRoot();
    const sentinel = credentialLikeSentinel();
    const api = {
      candidateShow() {
        return {
          id: "safe-adapter",
          version: "1.0.0",
          [key]: sentinel,
        };
      },
    } as unknown as ExternalIntakeApiV1;
    const output = outputHarness(api, root);

    expect(
      await runIntakeCli(
        ["candidate", "show", "safe-adapter@1.0.0"],
        output.options,
      ),
    ).toBe(0);
    expect(output.stdout.join("\n")).not.toContain(sentinel);
    expect(output.stdout.join("\n")).toContain("[redacted]");
  });

  it("redacts a generic credential-like high-entropy Candidate output value", async () => {
    const root = tempRoot();
    const sentinel = credentialLikeSentinel();
    const api = {
      candidateShow() {
        return {
          id: "safe-adapter",
          version: "1.0.0",
          metadata: { value: sentinel },
        };
      },
    } as unknown as ExternalIntakeApiV1;
    const output = outputHarness(api, root);

    expect(
      await runIntakeCli(
        ["candidate", "show", "safe-adapter@1.0.0"],
        output.options,
      ),
    ).toBe(0);
    expect(output.stdout.join("\n")).not.toContain(sentinel);
    expect(output.stdout.join("\n")).toContain("[redacted]");
  });

  it("redacts a high-entropy lowercase alphanumeric Candidate output value", async () => {
    const root = tempRoot();
    const sentinel = "0123456789abcdefghijklmnopqrstuvwxyz".repeat(2);
    const api = {
      candidateShow() {
        return {
          metadata: {
            levelOne: { levelTwo: { levelThree: { value: sentinel } } },
          },
        };
      },
    } as unknown as ExternalIntakeApiV1;
    const output = outputHarness(api, root);

    expect(
      await runIntakeCli(
        ["candidate", "show", "safe-adapter@1.0.0"],
        output.options,
      ),
    ).toBe(0);
    expect(output.stdout.join("\n")).not.toContain(sentinel);
    expect(output.stdout.join("\n")).toContain("[redacted]");
  });

  it.each(
    ([".", ":", "@"] as const).flatMap((delimiter) => {
      const sentinel = delimiterCredentialSentinel(delimiter);
      return [
        [delimiter, "bare", sentinel],
        [delimiter, "Bearer", `Bearer ${sentinel}`],
      ] as const;
    }),
  )(
    "redacts a high-entropy Candidate credential with one %s delimiter in a %s token",
    async (_, __, sentinel) => {
      const root = tempRoot();
      const api = {
        candidateShow() {
          return {
            metadata: {
              levelOne: { levelTwo: { levelThree: { value: sentinel } } },
            },
          };
        },
      } as unknown as ExternalIntakeApiV1;
      const output = outputHarness(api, root);

      expect(
        await runIntakeCli(
          ["candidate", "show", "safe-adapter@1.0.0"],
          output.options,
        ),
      ).toBe(0);
      expect(output.stdout.join("\n")).not.toContain(sentinel);
      expect(output.stdout.join("\n")).toContain("[redacted]");
    },
  );

  it.each(
    ([".", ":", "@"] as const).flatMap((delimiter) => {
      const token = delimiterCredentialSentinel(delimiter);
      return [
        [delimiter, "without a scheme", token, `authorization: ${token}`],
        [
          delimiter,
          "with a Bearer scheme",
          token,
          `aUtHoRiZaTiOn: Bearer ${token}`,
        ],
      ] as const;
    }),
  )(
    "redacts a high-entropy Candidate credential with one %s delimiter behind a case-insensitive Authorization prefix %s",
    async (_, __, token, sentinel) => {
      const root = tempRoot();
      const api = {
        candidateShow() {
          return {
            metadata: {
              levelOne: { levelTwo: { levelThree: { value: sentinel } } },
            },
          };
        },
      } as unknown as ExternalIntakeApiV1;
      const output = outputHarness(api, root);

      expect(
        await runIntakeCli(
          ["candidate", "show", "safe-adapter@1.0.0"],
          output.options,
        ),
      ).toBe(0);
      const rendered = output.stdout.join("\n");
      expect(rendered).not.toContain(sentinel);
      expect(rendered).not.toContain(token);
      expect(rendered).toContain("[redacted]");
    },
  );

  it.each([
    ["Bearer", `Bearer ${credentialLikeSentinel()}`],
    [
      "Basic",
      `Basic ${Buffer.from(credentialLikeSentinel()).toString("base64")}`,
    ],
    [
      "JWT",
      "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJzYWZlLWFkYXB0ZXIifQ.c2lnbmF0dXJlLXNlbnRpbmVs",
    ],
  ])("redacts a structured %s Candidate credential", async (_, sentinel) => {
    const root = tempRoot();
    const api = {
      candidateShow() {
        return {
          metadata: {
            levelOne: { levelTwo: { levelThree: { value: sentinel } } },
          },
        };
      },
    } as unknown as ExternalIntakeApiV1;
    const output = outputHarness(api, root);

    expect(
      await runIntakeCli(
        ["candidate", "show", "safe-adapter@1.0.0"],
        output.options,
      ),
    ).toBe(0);
    expect(output.stdout.join("\n")).not.toContain(sentinel);
    expect(output.stdout.join("\n")).toContain("[redacted]");
  });

  it.each(["block", "reject"] as const)(
    "dispatches Candidate %s only through its dedicated API operation",
    async (operation) => {
      const root = tempRoot();
      const calls: string[] = [];
      const api = {
        ...(createExternalIntakeApi(
          new ExternalIntakeStore(root),
          root,
        ) as ExternalIntakeApiV1),
        candidateBlock: async (id: string, version: string) => {
          calls.push(`block:${id}@${version}`);
          return { status: "blocked" };
        },
        candidateReject: async (id: string, version: string) => {
          calls.push(`reject:${id}@${version}`);
          return { status: "rejected" };
        },
      } as ExternalIntakeApiV1 & {
        candidateBlock(id: string, version: string): Promise<unknown>;
        candidateReject(id: string, version: string): Promise<unknown>;
      };
      const output = outputHarness(api, root);

      expect(
        await runIntakeCli(
          ["candidate", operation, "safe-adapter@1.0.0"],
          output.options,
        ),
      ).toBe(0);
      expect(calls).toEqual([`${operation}:safe-adapter@1.0.0`]);
      expect(output.stderr).toEqual([]);
    },
  );

  it("preserves canonical digests and locators only in exact output contexts", async () => {
    const root = tempRoot();
    const id = "safe-adapter-0123456789abcdefghijklmnopqrstuvwxyz";
    const version = "1.2.3-safe.0123456789abcdefghijklmnopqrstuvwxyz";
    const proposedFactoryKey = `candidate.${id}`;
    const digest = `sha256:${"a1".repeat(32)}`;
    const candidateLookupId = `candidate-${"b2".repeat(32)}`;
    const jobLookupId = `job-${"c3".repeat(32)}`;
    const api = {
      candidateShow() {
        return {
          id,
          version,
          proposedFactoryKey,
          candidateDigest: digest,
          recordDigests: [digest],
          lookupId: candidateLookupId,
          job: { lookupId: jobLookupId },
          metadata: {
            id,
            version,
            apiVersion: "factory.candidate-conformance-plan/v1",
            proposedFactoryKey,
            digestValue: digest,
            locatorValue: jobLookupId,
          },
        };
      },
    } as unknown as ExternalIntakeApiV1;
    const output = outputHarness(api, root);

    expect(
      await runIntakeCli(
        ["candidate", "show", "safe-adapter@1.0.0"],
        output.options,
      ),
    ).toBe(0);
    const rendered = JSON.parse(output.stdout[0]!) as Record<string, unknown>;
    expect(rendered).toMatchObject({
      id,
      version,
      proposedFactoryKey,
      candidateDigest: digest,
      recordDigests: ["[redacted]"],
      lookupId: candidateLookupId,
      job: { lookupId: "[redacted]" },
      metadata: {
        id: "[redacted]",
        version: "[redacted]",
        apiVersion: "[redacted]",
        proposedFactoryKey: "[redacted]",
        digestValue: "[redacted]",
        locatorValue: "[redacted]",
      },
    });
  });

  it("preserves canonical conformance values only in their exact result paths", async () => {
    const root = tempRoot();
    const candidateId = "safe-adapter-0123456789abcdefghijklmnopqrstuvwxyz";
    const candidateVersion = "1.2.3-safe.0123456789abcdefghijklmnopqrstuvwxyz";
    const caseId = "accept-safe-fixture-0123456789abcdefghijklmnopqrstuvwxyz";
    const digest = `sha256:${"d4".repeat(32)}`;
    const api = {
      candidateTest() {
        return {
          apiVersion: "factory.candidate-conformance-result/v1",
          candidateId,
          candidateVersion,
          candidateDigest: digest,
          manifestDigest: digest,
          fixtureDigest: digest,
          adapterDigest: digest,
          planDigest: digest,
          status: "pass",
          cases: [{ id: caseId, status: "pass", code: "fixture-accepted" }],
        };
      },
    } as unknown as ExternalIntakeApiV1;
    const output = outputHarness(api, root);

    expect(
      await runIntakeCli(
        ["candidate", "test", "safe-adapter@1.0.0"],
        output.options,
      ),
    ).toBe(0);
    expect(JSON.parse(output.stdout[0]!)).toMatchObject({
      apiVersion: "factory.candidate-conformance-result/v1",
      candidateId,
      candidateVersion,
      candidateDigest: digest,
      cases: [{ id: caseId }],
    });
  });

  it("does not treat object properties as canonical array elements", async () => {
    const root = tempRoot();
    const caseId = "accept-safe-fixture-0123456789abcdefghijklmnopqrstuvwxyz";
    const digest = `sha256:${"e5".repeat(32)}`;
    const api = {
      candidateTest() {
        return { cases: { metadata: { id: caseId } } };
      },
      evidence() {
        return {
          scans: {
            metadata: {
              rulesetDigest: digest,
              resultDigest: digest,
            },
          },
        };
      },
    } as unknown as ExternalIntakeApiV1;
    const output = outputHarness(api, root);

    expect(
      await runIntakeCli(
        ["candidate", "test", "safe-adapter@1.0.0"],
        output.options,
      ),
    ).toBe(0);
    expect(await runIntakeCli(["evidence", digest], output.options)).toBe(0);

    expect(JSON.parse(output.stdout[0]!)).toEqual({
      cases: { metadata: { id: "[redacted]" } },
    });
    expect(JSON.parse(output.stdout[1]!)).toEqual({
      scans: {
        metadata: {
          rulesetDigest: "[redacted]",
          resultDigest: "[redacted]",
        },
      },
    });
  });

  it("writes and re-verifies only canonical JSON in an empty review directory", async () => {
    const root = tempRoot();
    writeFileSync(join(root, "review.json"), "{}");
    mkdirSync(join(root, "review-output"));
    const packet = validPromotionPacket();
    const calls: unknown[] = [];
    const api = {
      async promotionPacket(id: string, version: string, review: unknown) {
        calls.push({ id, version, review });
        return packet;
      },
    } as unknown as ExternalIntakeApiV1;
    const output = outputHarness(api, root);

    expect(
      await runIntakeCli(
        [
          "promotion",
          "packet",
          "safe-adapter@1.0.0",
          "--review",
          "review.json",
          "--out",
          "review-output/promotion-packet.json",
        ],
        output.options,
      ),
    ).toBe(0);

    const outputPath = join(root, "review-output", "promotion-packet.json");
    const bytes = readFileSync(outputPath, "utf8");
    expect(bytes).toBe(canonicalJson(packet));
    expect(readdirSync(join(root, "review-output"))).toEqual([
      "promotion-packet.json",
    ]);
    expect(verifyPromotionPacket(JSON.parse(bytes))).toMatchObject({
      valid: true,
      digest: canonicalRecordDigest(packet),
    });
    expect(calls).toEqual([
      { id: "safe-adapter", version: "1.0.0", review: {} },
    ]);
    expect(output.stdout.join("\n")).toContain(canonicalRecordDigest(packet));
    expect(output.stderr).toEqual([]);
  });

  it.each([
    [
      "absolute review path",
      (root: string) => join(root, "review.json"),
      "review-output/promotion-packet.json",
    ],
    [
      "traversal review path",
      "../review.json",
      "review-output/promotion-packet.json",
    ],
    [
      "absolute output path",
      "review.json",
      (root: string) => join(root, "review-output", "promotion-packet.json"),
    ],
    [
      "traversal output path",
      "review.json",
      "../review-output/promotion-packet.json",
    ],
    ["wrong output filename", "review.json", "review-output/packet.json"],
    [
      "wrong output extension",
      "review.json",
      "review-output/promotion-packet.txt",
    ],
  ])("rejects %s", async (_, reviewValue, outputValue) => {
    const root = tempRoot();
    writeFileSync(join(root, "review.json"), "{}");
    mkdirSync(join(root, "review-output"));
    const api = {
      async promotionPacket() {
        return validPromotionPacket();
      },
    } as unknown as ExternalIntakeApiV1;
    const output = outputHarness(api, root);
    const reviewPath =
      typeof reviewValue === "function" ? reviewValue(root) : reviewValue;
    const outputPath =
      typeof outputValue === "function" ? outputValue(root) : outputValue;

    expect(
      await runIntakeCli(
        [
          "promotion",
          "packet",
          "safe-adapter@1.0.0",
          "--review",
          reviewPath,
          "--out",
          outputPath,
        ],
        output.options,
      ),
    ).toBe(2);
    expect(output.stdout).toEqual([]);
    expect(output.stderr.join("\n")).toContain("invalid-command");
  });

  it("rejects a symlinked review component and a non-empty output directory", async () => {
    const root = tempRoot();
    mkdirSync(join(root, "reviews"));
    writeFileSync(join(root, "reviews", "review.json"), "{}");
    symlinkSync(
      join(root, "reviews"),
      join(root, "linked-reviews"),
      "junction",
    );
    mkdirSync(join(root, "review-output"));
    writeFileSync(join(root, "review-output", "keep.txt"), "keep");
    const api = {
      async promotionPacket() {
        return validPromotionPacket();
      },
    } as unknown as ExternalIntakeApiV1;
    const output = outputHarness(api, root);

    expect(
      await runIntakeCli(
        [
          "promotion",
          "packet",
          "safe-adapter@1.0.0",
          "--review",
          "linked-reviews/review.json",
          "--out",
          "review-output/promotion-packet.json",
        ],
        output.options,
      ),
    ).toBe(2);
    expect(
      await runIntakeCli(
        [
          "promotion",
          "packet",
          "safe-adapter@1.0.0",
          "--review",
          "reviews/review.json",
          "--out",
          "review-output/promotion-packet.json",
        ],
        output.options,
      ),
    ).toBe(2);
    expect(readFileSync(join(root, "review-output", "keep.txt"), "utf8")).toBe(
      "keep",
    );
  });

  it("uses exclusive create and never overwrites a prior packet", async () => {
    const root = tempRoot();
    writeFileSync(join(root, "review.json"), "{}");
    mkdirSync(join(root, "review-output"));
    const packet = validPromotionPacket();
    const api = {
      async promotionPacket() {
        return packet;
      },
    } as unknown as ExternalIntakeApiV1;
    const output = outputHarness(api, root);
    const args = [
      "promotion",
      "packet",
      "safe-adapter@1.0.0",
      "--review",
      "review.json",
      "--out",
      "review-output/promotion-packet.json",
    ];

    expect(await runIntakeCli(args, output.options)).toBe(0);
    const outputPath = join(root, "review-output", "promotion-packet.json");
    const original = readFileSync(outputPath, "utf8");
    expect(await runIntakeCli(args, output.options)).toBe(2);
    expect(readFileSync(outputPath, "utf8")).toBe(original);
    expect(existsSync(outputPath)).toBe(true);
  });
});

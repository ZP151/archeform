import { describe, expect, it, vi } from "vitest";
import {
  createPublishedGraphExchange,
  hashApplicationGraphV3,
  hashDraftPreviewSnapshotV2,
} from "@factory/graph";
import { templateDraftResponse } from "../test/template-draft-fixture";

import {
  ControlPlaneClient,
  ControlPlaneError,
  type WorkbenchPreviewRun,
} from "./control-plane-client";
import { workbenchGraph } from "./workbench-graph";

const capabilitySupplySummary = {
  apiVersion: "factory.capability-supply-summary/v1" as const,
  families: [
    {
      key: "commerce-transaction" as const,
      profiles: [
        "restaurant-ordering",
        "simple-ecommerce",
        "retail-counter",
        "grocery-pickup",
      ],
      discovery: 4,
      quarantined: 0,
      blocked: 0,
      action: "integrate" as const,
    },
  ],
};

const profileCoverage = [
  {
    apiVersion: "factory.profile-coverage/v1" as const,
    key: "commerce.order-operations",
    label: "Order operations",
    status: "partial" as const,
    packageKeys: ["commerce.order", "commerce.inventory", "core.audit"],
    profiles: [
      "restaurant-ordering",
      "simple-ecommerce",
      "retail-counter",
      "grocery-pickup",
    ],
  },
];

describe("ControlPlaneClient", () => {
  it("lists, clones, and revises a strict curated template Draft", async () => {
    const first = templateDraftResponse(1);
    const second = templateDraftResponse(2);
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify([first.template]), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify(first), { status: 201 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify(second), { status: 201 }),
      );
    const client = new ControlPlaneClient("http://control-plane.test", fetcher);

    await expect(client.listCuratedTemplates()).resolves.toEqual([
      first.template,
    ]);
    const cloned = await client.instantiateCuratedTemplate(
      "restaurant-dual-surface",
      {
        requestId: "restaurant-template-001",
        name: "Maison Aurelia",
      },
    );
    const revised = await client.appendTemplateDraftRevision("application-1", {
      baseDraftRevisionId: "draft-1",
      name: "Maison Rivage",
    });
    expect(cloned).toMatchObject({
      template: first.template,
      draft: { revisionNumber: 1 },
      snapshot: { id: "preview-1", state: "active" },
    });
    expect(revised).toMatchObject({
      template: second.template,
      draft: { revisionNumber: 2 },
      snapshot: { id: "preview-2", state: "active" },
    });
    expect(cloned.previews.map(({ surface }) => surface.pages.length)).toEqual([
      8, 7,
    ]);

    expect(fetcher).toHaveBeenNthCalledWith(
      2,
      "http://control-plane.test/workspaces/local/curated-templates/restaurant-dual-surface/instances",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          requestId: "restaurant-template-001",
          name: "Maison Aurelia",
        }),
      }),
    );
    expect(fetcher).toHaveBeenNthCalledWith(
      3,
      "http://control-plane.test/template-draft-instances/application-1/revisions",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          baseDraftRevisionId: "draft-1",
          name: "Maison Rivage",
        }),
      }),
    );
  });

  it("rejects malformed template responses instead of guessing by shape", async () => {
    const valid = templateDraftResponse(1);
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            ...valid,
            apiVersion: "factory.template-draft-instance/v2",
          }),
          { status: 201 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ ...valid, previews: valid.previews.slice(0, 1) }),
          { status: 201 },
        ),
      );
    const client = new ControlPlaneClient("http://control-plane.test", fetcher);

    await expect(
      client.instantiateCuratedTemplate("restaurant-dual-surface", {
        requestId: "restaurant-template-001",
      }),
    ).rejects.toThrow("Control Plane template response is invalid.");
    await expect(
      client.instantiateCuratedTemplate("restaurant-dual-surface", {
        requestId: "restaurant-template-002",
      }),
    ).rejects.toThrow("Control Plane template response is invalid.");
  });

  it("appends a page revision through the exact route and rejects projection drift", async () => {
    const revised = templateDraftResponse(3);
    const drifted = structuredClone(revised);
    drifted.previews[0].surface.pages[1]!.title = "Invented menu";
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify(revised), { status: 201 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify(drifted), { status: 201 }),
      );
    const client = new ControlPlaneClient("http://control-plane.test", fetcher);
    const input = {
      baseDraftRevisionId: "draft-2",
      surfaceKey: "customer-mobile" as const,
      pageId: "customer-menu",
      title: "Seasonal Menu",
    };

    await expect(
      client.appendTemplatePageRevision("application-1", input),
    ).resolves.toMatchObject({
      draft: { revisionNumber: 3 },
      snapshot: { id: "preview-3", state: "active" },
    });
    expect(fetcher).toHaveBeenNthCalledWith(
      1,
      "http://control-plane.test/template-draft-instances/application-1/page-revisions",
      expect.objectContaining({ method: "POST", body: JSON.stringify(input) }),
    );
    await expect(
      client.appendTemplatePageRevision("application-1", input),
    ).rejects.toThrow("Control Plane template response is invalid.");
  });

  it("appends an exact block-order revision and rejects a projection not matching Graph order", async () => {
    const revised = templateDraftResponse(4, undefined, {
      pageId: "customer-home",
      blockIds: ["home-items", "home-hero", "home-categories"],
    });
    const drifted = structuredClone(revised);
    drifted.previews[0].surface.pages[0]!.blocks.reverse();
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify(revised), { status: 201 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify(drifted), { status: 201 }),
      );
    const client = new ControlPlaneClient("http://control-plane.test", fetcher);
    const input = {
      baseDraftRevisionId: "draft-3",
      surfaceKey: "customer-mobile" as const,
      pageId: "customer-home",
      regionKey: "main" as const,
      blockIds: ["home-items", "home-hero", "home-categories"],
    };

    await expect(
      client.appendTemplatePageBlockOrderRevision("application-1", input),
    ).resolves.toMatchObject({
      draft: { revisionNumber: 4 },
      snapshot: { id: "preview-4", state: "active" },
    });
    expect(fetcher).toHaveBeenNthCalledWith(
      1,
      "http://control-plane.test/template-draft-instances/application-1/page-block-order-revisions",
      expect.objectContaining({ method: "POST", body: JSON.stringify(input) }),
    );
    await expect(
      client.appendTemplatePageBlockOrderRevision("application-1", input),
    ).rejects.toThrow("Control Plane template response is invalid.");
  });

  it("rejects a template response whose Graph and Snapshot identity do not match", async () => {
    const checksumDrift = structuredClone(templateDraftResponse(1));
    checksumDrift.draft.graph.metadata.name = "Checksum drift";
    const workspaceDrift = structuredClone(templateDraftResponse(1));
    workspaceDrift.draft.graph.metadata.workspaceId = "other-workspace";
    workspaceDrift.snapshot = {
      ...workspaceDrift.snapshot,
      graphChecksum: hashApplicationGraphV3(workspaceDrift.draft.graph),
      snapshotChecksum:
        "sha256:0000000000000000000000000000000000000000000000000000000000000000",
    };
    workspaceDrift.snapshot.snapshotChecksum = hashDraftPreviewSnapshotV2(
      workspaceDrift.snapshot,
    );
    workspaceDrift.previews = [
      {
        ...workspaceDrift.previews[0],
        graphChecksum: workspaceDrift.snapshot.graphChecksum,
      },
      {
        ...workspaceDrift.previews[1],
        graphChecksum: workspaceDrift.snapshot.graphChecksum,
      },
    ];
    const projectionDrift = structuredClone(templateDraftResponse(1));
    projectionDrift.previews[0].surface.pages[0]!.title = "Invented title";
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify(checksumDrift), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify(workspaceDrift), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify(projectionDrift), { status: 200 }),
      );
    const client = new ControlPlaneClient("http://control-plane.test", fetcher);

    await expect(
      client.openTemplateDraft("restaurant-template-001"),
    ).rejects.toThrow("Control Plane template response is invalid.");
    await expect(
      client.openTemplateDraft("restaurant-template-001"),
    ).rejects.toThrow("Control Plane template response is invalid.");
    await expect(
      client.openTemplateDraft("restaurant-template-001"),
    ).rejects.toThrow("Control Plane template response is invalid.");
  });

  it("copies only the template preview fields consumed by the default product view", async () => {
    const valid = templateDraftResponse(1);
    const hostile = structuredClone(valid) as unknown as Record<
      string,
      unknown
    >;
    (hostile.template as Record<string, unknown>).internalEvidence =
      "HOSTILE-TECHNICAL-SENTINEL";
    const firstPage = (
      (hostile.previews as Record<string, unknown>[])[0]?.surface as Record<
        string,
        unknown
      >
    ).pages as Record<string, unknown>[];
    firstPage[0]!.internalEvidence = "HOSTILE-TECHNICAL-SENTINEL";
    (firstPage[0]!.recipe as Record<string, unknown>).internalEvidence =
      "HOSTILE-TECHNICAL-SENTINEL";
    const firstBlock = (firstPage[0]!.blocks as Record<string, unknown>[])[0]!;
    firstBlock.internalEvidence = "HOSTILE-TECHNICAL-SENTINEL";
    const fetcher = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify(hostile), { status: 200 }),
      );
    const client = new ControlPlaneClient("http://control-plane.test", fetcher);

    const parsed = await client.openTemplateDraft("restaurant-template-001");

    expect(JSON.stringify(parsed)).not.toContain("HOSTILE-TECHNICAL-SENTINEL");
  });
  it("propagates the caller AbortSignal through product choice and apply transport", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ checksum: "sha256:diff" }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            draftRevision: {
              id: "draft-2",
              revisionNumber: 2,
              graph: workbenchGraph,
            },
            review: {
              applicationGraphId: "graph-1",
              status: "applied",
            },
          }),
          {
            status: 200,
            headers: { "content-type": "application/json" },
          },
        ),
      );
    const client = new ControlPlaneClient("http://control-plane.test", fetcher);
    const choiceController = new AbortController();
    const applyController = new AbortController();

    await client.chooseProductPlan(
      "review-1",
      "standard",
      choiceController.signal,
    );
    await client.applyProduct("review-1", applyController.signal);

    expect(fetcher).toHaveBeenNthCalledWith(
      1,
      "http://control-plane.test/product/requirements/review-1/choices",
      expect.objectContaining({ signal: choiceController.signal }),
    );
    expect(fetcher).toHaveBeenNthCalledWith(
      2,
      "http://control-plane.test/product/requirements/review-1/apply",
      expect.objectContaining({ signal: applyController.signal }),
    );
  });

  it.each([
    "composition.request_envelope_invalid",
    "composition.request_identity_invalid",
    "composition.requirement_invalid",
    "composition.blueprint_invalid",
    "composition.requirement_blueprint_checksum_mismatch",
  ])(
    "retains the approved rejection code %s without exposing its response",
    async (code) => {
      const fetcher = vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            statusCode: 400,
            error: "Bad Request",
            code,
            message: "Rejected value must-not-echo failed validation.",
            rejectedValue: "must-not-echo",
          }),
          { status: 400, headers: { "content-type": "application/json" } },
        ),
      );
      const client = new ControlPlaneClient(
        "http://control-plane.test",
        fetcher,
      );

      let rejection: ControlPlaneError | undefined;
      try {
        await client.createProductRequirement({
          requestId: "request-client-1234",
          requirement: {} as never,
          blueprint: {} as never,
        });
      } catch (error) {
        if (error instanceof ControlPlaneError) rejection = error;
        else throw error;
      }

      expect(rejection).toMatchObject({ status: 400, code });
      expect(rejection?.message).toBe("Control Plane request failed with 400.");
      expect(JSON.stringify(rejection)).not.toContain("must-not-echo");
    },
  );

  it.each([
    [
      "unknown code",
      JSON.stringify({
        code: "composition.unapproved",
        message: "must-not-echo",
      }),
    ],
    [
      "non-string code",
      JSON.stringify({
        code: ["composition.requirement_invalid"],
        message: "must-not-echo",
      }),
    ],
    ["malformed body", "{not-json:must-not-echo"],
  ])("drops rejection codes from a %s response", async (_label, body) => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(body, {
        status: 400,
        headers: { "content-type": "application/json" },
      }),
    );
    const client = new ControlPlaneClient("http://control-plane.test", fetcher);

    let rejection: ControlPlaneError | undefined;
    try {
      await client.createProductRequirement({
        requestId: "request-client-1234",
        requirement: {} as never,
        blueprint: {} as never,
      });
    } catch (error) {
      if (error instanceof ControlPlaneError) rejection = error;
      else throw error;
    }

    expect(rejection).toMatchObject({ status: 400 });
    expect(rejection?.code).toBeUndefined();
    expect(JSON.stringify(rejection)).not.toContain("must-not-echo");
  });

  it("reads only safe Workspace Portfolio summary fields", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          apiVersion: "factory.workspace-portfolio-summary/v1",
          profiles: [
            {
              profile: "restaurant-ordering",
              label: "Restaurant ordering",
              category: "commerce",
              requiredPackages: 18,
              optionalPackages: 1,
              sourceUrl: "https://must-not-survive.example",
            },
          ],
          readiness: [
            {
              apiVersion: "factory.profile-readiness/v1",
              profile: "restaurant-ordering",
              label: "Restaurant ordering",
              generatedTargets: [
                "simulator",
                "web",
                "api",
                "database",
                "tests",
                "docs",
              ],
              capabilities: [
                { key: "commerce.catalog", status: "available" },
                { key: "identity.member", status: "provider-required" },
              ],
              sourceUrl: "https://must-not-survive.example",
            },
          ],
          coverage: profileCoverage,
          capabilities: {
            golden: 23,
            lockedVersions: 48,
            candidate: 0,
            provider: 0,
            artifact: "must-not-survive",
          },
          capabilityFamilies: [
            {
              key: "core.identity-policy",
              lifecycle: "golden",
              version: "1.0.0",
              profileCount: 2,
              validation: "verified",
              generatedTargetState: "ready",
              sourcePath: "must-not-survive",
            },
          ],
          intake: {
            portfolioSources: 43,
            intakeEligible: 19,
            candidateBlueprints: 19,
            quarantined: 0,
            blocked: 0,
            sourcePath: "must-not-survive",
          },
          supply: capabilitySupplySummary,
          compilations: { queued: 0, running: 1, succeeded: 3, failed: 0 },
        }),
        { status: 200 },
      ),
    );
    const client = new ControlPlaneClient("http://control-plane.test", fetcher);

    await expect(
      client.getWorkspacePortfolioSummary("workspace-1"),
    ).resolves.toEqual({
      apiVersion: "factory.workspace-portfolio-summary/v1",
      profiles: [
        {
          profile: "restaurant-ordering",
          label: "Restaurant ordering",
          category: "commerce",
          requiredPackages: 18,
          optionalPackages: 1,
        },
      ],
      readiness: [
        {
          apiVersion: "factory.profile-readiness/v1",
          profile: "restaurant-ordering",
          label: "Restaurant ordering",
          generatedTargets: [
            "simulator",
            "web",
            "api",
            "database",
            "tests",
            "docs",
          ],
          capabilities: [
            { key: "commerce.catalog", status: "available" },
            { key: "identity.member", status: "provider-required" },
          ],
        },
      ],
      coverage: profileCoverage,
      capabilities: {
        golden: 23,
        lockedVersions: 48,
        candidate: 0,
        provider: 0,
      },
      capabilityFamilies: [
        {
          key: "core.identity-policy",
          lifecycle: "golden",
          version: "1.0.0",
          profileCount: 2,
          validation: "verified",
          generatedTargetState: "ready",
        },
      ],
      intake: {
        portfolioSources: 43,
        intakeEligible: 19,
        candidateBlueprints: 19,
        quarantined: 0,
        blocked: 0,
      },
      supply: capabilitySupplySummary,
      compilations: { queued: 0, running: 1, succeeded: 3, failed: 0 },
    });
    expect(fetcher).toHaveBeenCalledWith(
      "http://control-plane.test/workspaces/workspace-1/portfolio-summary",
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("rejects an unknown Profile readiness state", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          apiVersion: "factory.workspace-portfolio-summary/v1",
          profiles: [
            {
              profile: "restaurant-ordering",
              label: "Restaurant ordering",
              category: "commerce",
              requiredPackages: 18,
              optionalPackages: 1,
            },
          ],
          readiness: [
            {
              apiVersion: "factory.profile-readiness/v1",
              profile: "restaurant-ordering",
              label: "Restaurant ordering",
              generatedTargets: [
                "simulator",
                "web",
                "api",
                "database",
                "tests",
                "docs",
              ],
              capabilities: [{ key: "commerce.catalog", status: "unreviewed" }],
            },
          ],
          coverage: profileCoverage,
          capabilities: {
            golden: 23,
            lockedVersions: 48,
            candidate: 0,
            provider: 0,
          },
          intake: {
            portfolioSources: 43,
            intakeEligible: 19,
            candidateBlueprints: 19,
            quarantined: 0,
            blocked: 0,
          },
          supply: capabilitySupplySummary,
          compilations: { queued: 0, running: 0, succeeded: 0, failed: 0 },
        }),
        { status: 200 },
      ),
    );
    const client = new ControlPlaneClient("http://control-plane.test", fetcher);

    await expect(
      client.getWorkspacePortfolioSummary("workspace-1"),
    ).rejects.toThrow("Control Plane Profile readiness capability is invalid.");
  });

  it("rejects source-shaped Profile coverage fields", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          apiVersion: "factory.workspace-portfolio-summary/v1",
          profiles: [],
          readiness: [],
          coverage: [
            {
              ...profileCoverage[0],
              sourceUrl: "https://must-not-survive.example",
            },
          ],
          capabilities: {
            golden: 0,
            lockedVersions: 0,
            candidate: 0,
            provider: 0,
          },
          intake: {
            portfolioSources: 0,
            intakeEligible: 0,
            candidateBlueprints: 0,
            quarantined: 0,
            blocked: 0,
          },
          supply: {
            apiVersion: "factory.capability-supply-summary/v1",
            families: [],
          },
          compilations: { queued: 0, running: 0, succeeded: 0, failed: 0 },
        }),
        { status: 200 },
      ),
    );
    const client = new ControlPlaneClient("http://control-plane.test", fetcher);

    await expect(
      client.getWorkspacePortfolioSummary("workspace-1"),
    ).rejects.toThrow("Control Plane Profile coverage is invalid.");
  });

  it("projects only safe application summary fields from the local workspace endpoint", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify([
          {
            id: "graph-restaurant",
            key: "restaurant-ordering",
            name: "Restaurant ordering",
            compositionProfile: "restaurant-ordering",
            latestDraft: {
              revisionNumber: 3,
              createdAt: "2026-07-30T03:00:00.000Z",
              graph: workbenchGraph,
            },
            latestPublished: {
              revisionNumber: 2,
              publishedAt: "2026-07-30T03:10:00.000Z",
            },
            latestCompilation: {
              id: "compilation-4",
              status: "failed",
              completedAt: "2026-07-30T03:15:00.000Z",
              artifactContent: "do-not-return",
            },
            goldenAssetMaturity: {
              status: "golden",
              goldenAssets: 6,
              totalAssets: 6,
            },
            credential: "do-not-return",
          },
        ]),
        { status: 200 },
      ),
    );
    const client = new ControlPlaneClient("http://control-plane.test", fetcher);

    const summaries = await client.listLocalApplicationSummaries();

    expect(summaries).toEqual([
      {
        id: "graph-restaurant",
        key: "restaurant-ordering",
        name: "Restaurant ordering",
        templateOrigin: null,
        compositionProfile: "restaurant-ordering",
        latestDraft: {
          revisionNumber: 3,
          createdAt: "2026-07-30T03:00:00.000Z",
        },
        latestPublished: {
          revisionNumber: 2,
          publishedAt: "2026-07-30T03:10:00.000Z",
        },
        latestCompilation: {
          id: "compilation-4",
          status: "failed",
          completedAt: "2026-07-30T03:15:00.000Z",
        },
        goldenAssetMaturity: {
          status: "golden",
          goldenAssets: 6,
          totalAssets: 6,
        },
      },
    ]);
    expect(fetcher).toHaveBeenCalledWith(
      "http://control-plane.test/workspaces/local/application-graphs",
      expect.objectContaining({ method: "GET" }),
    );
    expect(JSON.stringify(summaries)).not.toMatch(
      /"(?:graph|artifactContent|credential)":/,
    );
  });

  it("starts a preview using only the immutable compilation identifier", async () => {
    const preview: WorkbenchPreviewRun = {
      id: "preview-1",
      compilationId: "compilation-1",
      status: "starting",
      previewUrl: null,
      webPort: null,
      apiPort: null,
      diagnostic: null,
      createdAt: "2026-07-30T00:00:00.000Z",
      updatedAt: "2026-07-30T00:00:00.000Z",
    };
    const fetcher = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify(preview), { status: 201 }),
      );
    const client = new ControlPlaneClient("http://control-plane.test", fetcher);

    await expect(client.startPreviewRun("compilation-1")).resolves.toEqual(
      preview,
    );
    expect(fetcher).toHaveBeenCalledWith(
      "http://control-plane.test/compilations/compilation-1/preview-runs",
      expect.objectContaining({ method: "POST", body: JSON.stringify({}) }),
    );
  });

  it("retains only safe PreviewRun lifecycle fields from the response", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          id: "preview-1",
          compilationId: "compilation-1",
          status: "ready",
          previewUrl: "http://127.0.0.1:43101",
          webPort: 43101,
          apiPort: 43102,
          diagnostic: null,
          createdAt: "2026-07-30T00:00:00.000Z",
          updatedAt: "2026-07-30T00:00:00.000Z",
          composeProjectName: "factory-preview-preview-1",
        }),
        { status: 200 },
      ),
    );
    const client = new ControlPlaneClient("http://control-plane.test", fetcher);

    await expect(client.getCurrentPreviewRun("compilation-1")).resolves.toEqual(
      {
        id: "preview-1",
        compilationId: "compilation-1",
        status: "ready",
        previewUrl: "http://127.0.0.1:43101",
        webPort: 43101,
        apiPort: 43102,
        diagnostic: null,
        createdAt: "2026-07-30T00:00:00.000Z",
        updatedAt: "2026-07-30T00:00:00.000Z",
      },
    );
  });

  it("reads the current preview using only the immutable compilation identifier", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(new Response("null", { status: 200 }));
    const client = new ControlPlaneClient("http://control-plane.test", fetcher);

    await expect(
      client.getCurrentPreviewRun("compilation-1"),
    ).resolves.toBeNull();
    expect(fetcher).toHaveBeenCalledWith(
      "http://control-plane.test/compilations/compilation-1/preview-runs/current",
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("stops a preview using only its Factory-issued run identifier", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: "preview-1", status: "stopping" }), {
        status: 200,
      }),
    );
    const client = new ControlPlaneClient("http://control-plane.test", fetcher);

    await client.stopPreviewRun("preview-1");

    expect(fetcher).toHaveBeenCalledWith(
      "http://control-plane.test/preview-runs/preview-1/stop",
      expect.objectContaining({ method: "POST", body: JSON.stringify({}) }),
    );
  });

  it("starts a verification run bound to the immutable compilation identifier", async () => {
    const run = {
      verificationRunId: "verification-run-1",
      compilationId: "compilation-1",
      profileKey: "expense-approval",
      status: "pending",
      stepIds: [],
      evidenceDigest: null,
      evidence: null,
      diagnosis: null,
      draftDiff: null,
    };
    const fetcher = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify(run), { status: 201 }));
    const client = new ControlPlaneClient("http://control-plane.test", fetcher);

    await expect(
      client.createVerificationRun(
        "compilation-1",
        "verification-run-1",
        "expense-approval",
      ),
    ).resolves.toEqual(run);
    expect(fetcher).toHaveBeenCalledWith(
      "http://control-plane.test/compilations/compilation-1/verification-runs",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          verificationRunId: "verification-run-1",
          profileKey: "expense-approval",
        }),
      }),
    );
  });

  it("creates a verification run without a profile key so the worker derives the plan from the Published Graph", async () => {
    const run = {
      verificationRunId: "verification-run-2",
      compilationId: "compilation-1",
      profileKey: null,
      status: "pending",
      stepIds: [],
      evidenceDigest: null,
      evidence: null,
      diagnosis: null,
      draftDiff: null,
    };
    const fetcher = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify(run), { status: 201 }));
    const client = new ControlPlaneClient("http://control-plane.test", fetcher);

    await expect(
      client.createVerificationRun("compilation-1", "verification-run-2"),
    ).resolves.toEqual(run);
    // The profile key is absent from the request body entirely — the worker
    // derives the verification plan from the Published Graph itself.
    expect(fetcher).toHaveBeenCalledWith(
      "http://control-plane.test/compilations/compilation-1/verification-runs",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ verificationRunId: "verification-run-2" }),
      }),
    );
  });

  it("reads a verification run by its Factory-issued identifier", async () => {
    const run = {
      verificationRunId: "verification-run-1",
      compilationId: "compilation-1",
      profileKey: "expense-approval",
      status: "succeeded",
      stepIds: ["isolated-boot", "employee-submit"],
      evidenceDigest: "sha256:" + "b".repeat(64),
      evidence: { steps: [] },
      diagnosis: null,
      draftDiff: null,
    };
    const fetcher = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify(run), { status: 200 }));
    const client = new ControlPlaneClient("http://control-plane.test", fetcher);

    await expect(
      client.getVerificationRun("verification-run-1"),
    ).resolves.toEqual(run);
    expect(fetcher).toHaveBeenCalledWith(
      "http://control-plane.test/verification-runs/verification-run-1",
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("approves a reviewable Draft Diff into the next immutable Draft revision", async () => {
    const draftDiff = { apiVersion: "factory.draft-diff/v1", operations: [] };
    const fetcher = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          draftRevision: {
            id: "draft-4",
            applicationGraphId: "graph-1",
            revisionNumber: 4,
            graph: workbenchGraph,
          },
          draftDiff,
        }),
        { status: 200 },
      ),
    );
    const client = new ControlPlaneClient("http://control-plane.test", fetcher);

    await expect(
      client.approveVerificationDraftDiff("verification-run-1", draftDiff),
    ).resolves.toEqual({
      draft: {
        applicationGraphId: "graph-1",
        draftRevisionId: "draft-4",
        revisionNumber: 4,
        graph: workbenchGraph,
      },
      draftDiff,
    });
    expect(fetcher).toHaveBeenCalledWith(
      "http://control-plane.test/verification-runs/verification-run-1/approve",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ draftDiff }),
      }),
    );
  });

  it("calls a browser-style fetch function without binding it to the client", async () => {
    let receiver: unknown = "not-called";
    const fetcher = function (this: unknown): Promise<Response> {
      receiver = this;
      return Promise.resolve(
        new Response(
          JSON.stringify({
            id: "graph-1",
            draftRevisions: [
              { id: "draft-1", revisionNumber: 1, graph: workbenchGraph },
            ],
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      );
    };
    const client = new ControlPlaneClient("http://control-plane.test", fetcher);

    await client.bootstrapLocalDraft(workbenchGraph);

    expect(receiver).toBeUndefined();
  });

  it("uses an existing local Draft instead of creating another Graph", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          id: "graph-1",
          key: workbenchGraph.metadata.id,
          draftRevisions: [
            { id: "draft-4", revisionNumber: 4, graph: workbenchGraph },
          ],
          publishedRevisions: [],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );
    const client = new ControlPlaneClient("http://control-plane.test", fetcher);

    await expect(
      client.bootstrapLocalDraft(workbenchGraph),
    ).resolves.toMatchObject({
      applicationGraphId: "graph-1",
      draftRevisionId: "draft-4",
      revisionNumber: 4,
      graph: workbenchGraph,
    });
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher).toHaveBeenCalledWith(
      "http://control-plane.test/workspaces/local/application-graphs/ops-workspace",
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("opens an existing local application through the exact Graph bootstrap path", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          id: "graph-restaurant",
          key: "restaurant-ordering",
          draftRevisions: [
            { id: "draft-4", revisionNumber: 4, graph: workbenchGraph },
          ],
          publishedRevisions: [
            {
              id: "published-2",
              revisionNumber: 2,
              sourceDraftRevisionId: "draft-4",
              graphHash: "sha256:published",
              graph: { credential: "do-not-retain" },
            },
          ],
          credential: "do-not-retain",
        }),
        { status: 200 },
      ),
    );
    const client = new ControlPlaneClient("http://control-plane.test", fetcher);

    await expect(
      client.openLocalApplication("restaurant-ordering"),
    ).resolves.toEqual({
      draft: {
        applicationGraphId: "graph-restaurant",
        draftRevisionId: "draft-4",
        revisionNumber: 4,
        graph: workbenchGraph,
      },
      publishedRevision: {
        id: "published-2",
        revisionNumber: 2,
        sourceDraftRevisionId: "draft-4",
        graphHash: "sha256:published",
        graph: workbenchGraph,
      },
    });
    expect(fetcher).toHaveBeenCalledWith(
      "http://control-plane.test/workspaces/local/application-graphs/restaurant-ordering",
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("does not attach the current Draft Graph to mismatched Published metadata", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          id: "graph-restaurant",
          key: "restaurant-ordering",
          draftRevisions: [
            { id: "draft-4", revisionNumber: 4, graph: workbenchGraph },
          ],
          publishedRevisions: [
            {
              id: "published-2",
              revisionNumber: 2,
              sourceDraftRevisionId: "draft-2",
              graphHash: "sha256:published",
            },
          ],
        }),
        { status: 200 },
      ),
    );
    const client = new ControlPlaneClient("http://control-plane.test", fetcher);

    const opened = await client.openLocalApplication("restaurant-ordering");

    expect(opened.publishedRevision).toEqual({
      id: "published-2",
      revisionNumber: 2,
      sourceDraftRevisionId: "draft-2",
      graphHash: "sha256:published",
    });
    expect(opened.publishedRevision).not.toHaveProperty("graph");
  });

  it("creates a local Graph only after the named Draft is absent", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(new Response("missing", { status: 404 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: "graph-1",
            draftRevisions: [
              { id: "draft-1", revisionNumber: 1, graph: workbenchGraph },
            ],
          }),
          { status: 201, headers: { "content-type": "application/json" } },
        ),
      );
    const client = new ControlPlaneClient("http://control-plane.test", fetcher);

    await expect(
      client.bootstrapLocalDraft(workbenchGraph),
    ).resolves.toMatchObject({
      applicationGraphId: "graph-1",
      draftRevisionId: "draft-1",
    });
    expect(fetcher).toHaveBeenLastCalledWith(
      "http://control-plane.test/workspaces/local/application-graphs",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ graph: workbenchGraph }),
      }),
    );
  });

  it("publishes only the known immutable Draft revision", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          id: "published-1",
          sourceDraftRevisionId: "draft-4",
        }),
        { status: 201, headers: { "content-type": "application/json" } },
      ),
    );
    const client = new ControlPlaneClient("http://control-plane.test", fetcher);

    await expect(client.publishDraft("graph-1", "draft-4")).resolves.toEqual({
      id: "published-1",
      sourceDraftRevisionId: "draft-4",
    });
    expect(fetcher).toHaveBeenCalledWith(
      "http://control-plane.test/application-graphs/graph-1/published-revisions",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ draftRevisionId: "draft-4" }),
      }),
    );
  });

  it("queues compilation only from an immutable Published revision", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          id: "compilation-1",
          publishedRevisionId: "published-1",
          target: "application-bundle",
          sequence: 1,
          inputGraphHash: "sha256:" + "a".repeat(64),
          compilerVersion: "factory-compiler/v1",
          compiledAt: "2026-08-10T11:59:00.000Z",
          result: { status: "queued" },
        }),
        { status: 201, headers: { "content-type": "application/json" } },
      ),
    );
    const client = new ControlPlaneClient("http://control-plane.test", fetcher);

    await expect(client.createCompilation("published-1")).resolves.toEqual({
      id: "compilation-1",
      publishedRevisionId: "published-1",
      target: "application-bundle",
      result: { status: "queued" },
    });
    expect(fetcher).toHaveBeenCalledWith(
      "http://control-plane.test/compilations",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          publishedRevisionId: "published-1",
          target: "application-bundle",
          compilerVersion: "factory-compiler/v1",
        }),
      }),
    );
  });

  it("reads compilation status without accessing a mutable Draft", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          id: "compilation-1",
          publishedRevisionId: "published-1",
          target: "application-bundle",
          result: {
            status: "succeeded",
            artifactCount: 1,
            completedAt: "2026-08-10T12:00:00.000Z",
          },
          artifacts: [
            {
              path: "web/app/page.tsx",
              digest: "sha256:abc",
              mediaType: "text/typescript",
            },
          ],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );
    const client = new ControlPlaneClient("http://control-plane.test", fetcher);

    await expect(client.getCompilation("compilation-1")).resolves.toMatchObject(
      {
        id: "compilation-1",
        result: {
          status: "succeeded",
          artifactCount: 1,
          completedAt: "2026-08-10T12:00:00.000Z",
        },
        artifacts: [{ path: "web/app/page.tsx" }],
      },
    );
    expect(fetcher).toHaveBeenCalledWith(
      "http://control-plane.test/compilations/compilation-1",
      expect.objectContaining({ method: "GET" }),
    );
  });

  it.each(["createCompilation", "getCompilation"] as const)(
    "%s rejects unsafe compilation result fields instead of casting them",
    async (method) => {
      const fetcher = vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            id: "compilation-1",
            publishedRevisionId: "published-1",
            target: "application-bundle",
            sequence: 1,
            compilerVersion: "factory-compiler/v1",
            compiledAt: "2026-08-10T11:59:00.000Z",
            result: {
              status: "failed",
              failureCode: "compilation.failed",
              completedAt: "2026-08-10T12:00:00.000Z",
              response: "must-not-surface",
            },
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      );
      const client = new ControlPlaneClient(
        "http://control-plane.test",
        fetcher,
      );

      const request =
        method === "createCompilation"
          ? client.createCompilation("published-1")
          : client.getCompilation("compilation-1");

      await expect(request).rejects.toThrow(
        "Control Plane compilation result is invalid.",
      );
    },
  );

  it("reads only a registered generated artifact snapshot by compilation and encoded path", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          path: "docs/api-reference.md",
          digest:
            "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          content: "# API reference\n",
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );
    const client = new ControlPlaneClient("http://control-plane.test", fetcher);

    await expect(
      client.getCompilationArtifact("compilation-1", "docs/api-reference.md"),
    ).resolves.toEqual({
      path: "docs/api-reference.md",
      digest:
        "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      content: "# API reference\n",
    });
    expect(fetcher).toHaveBeenCalledWith(
      "http://control-plane.test/compilations/compilation-1/artifact-content?path=docs%2Fapi-reference.md",
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("reads ordered Draft and Published revision snapshots for the Workbench timeline", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify([
            { id: "draft-1", revisionNumber: 1, graph: workbenchGraph },
            { id: "draft-2", revisionNumber: 2, graph: workbenchGraph },
          ]),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify([
            {
              id: "published-1",
              revisionNumber: 1,
              graphHash:
                "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
              graph: workbenchGraph,
            },
          ]),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      );
    const client = new ControlPlaneClient("http://control-plane.test", fetcher);

    await expect(client.listRevisionTimeline("graph-1")).resolves.toEqual({
      drafts: [
        { id: "draft-1", revisionNumber: 1, graph: workbenchGraph },
        { id: "draft-2", revisionNumber: 2, graph: workbenchGraph },
      ],
      published: [
        {
          id: "published-1",
          revisionNumber: 1,
          graphHash:
            "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          graph: workbenchGraph,
        },
      ],
    });
    expect(fetcher).toHaveBeenNthCalledWith(
      1,
      "http://control-plane.test/application-graphs/graph-1/draft-revisions",
      expect.objectContaining({ method: "GET" }),
    );
    expect(fetcher).toHaveBeenNthCalledWith(
      2,
      "http://control-plane.test/application-graphs/graph-1/published-revisions",
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("submits a brief only to the Draft-scoped AI proposal boundary", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          draftRevision: {
            id: "draft-5",
            revisionNumber: 5,
            graph: workbenchGraph,
          },
          proposal: {
            impact: {
              summary: "Adds an optional receipt.",
              affectedModels: ["domain"],
              risks: [],
            },
            testSuggestions: [
              {
                id: "receipt-journey",
                title: "Adds a receipt",
                type: "journey",
              },
            ],
          },
        }),
        { status: 201, headers: { "content-type": "application/json" } },
      ),
    );
    const client = new ControlPlaneClient("http://control-plane.test", fetcher);

    await expect(
      client.proposeDraft("graph-1", "Add an optional receipt field."),
    ).resolves.toMatchObject({
      draft: {
        applicationGraphId: "graph-1",
        draftRevisionId: "draft-5",
        revisionNumber: 5,
      },
      summary: "Adds an optional receipt.",
      affectedModels: ["domain"],
      testSuggestions: [
        { id: "receipt-journey", title: "Adds a receipt", type: "journey" },
      ],
    });
    expect(fetcher).toHaveBeenCalledWith(
      "http://control-plane.test/application-graphs/graph-1/ai-proposals",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ brief: "Add an optional receipt field." }),
      }),
    );
  });

  it("exports only a Published Graph exchange for Git storage", async () => {
    const exchange = createPublishedGraphExchange(workbenchGraph, 2);
    const fetcher = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(exchange), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    const client = new ControlPlaneClient("http://control-plane.test", fetcher);

    await expect(
      client.exportPublishedGraph("graph-1", "published-2"),
    ).resolves.toEqual(exchange);
    expect(fetcher).toHaveBeenCalledWith(
      "http://control-plane.test/application-graphs/graph-1/published-revisions/published-2/export",
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("imports a verified Graph exchange as a new Draft", async () => {
    const exchange = createPublishedGraphExchange(workbenchGraph, 2);
    const fetcher = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          id: "imported-graph",
          draftRevisions: [
            { id: "imported-draft", revisionNumber: 1, graph: workbenchGraph },
          ],
        }),
        { status: 201, headers: { "content-type": "application/json" } },
      ),
    );
    const client = new ControlPlaneClient("http://control-plane.test", fetcher);

    await expect(client.importPublishedGraph(exchange)).resolves.toMatchObject({
      applicationGraphId: "imported-graph",
      draftRevisionId: "imported-draft",
      revisionNumber: 1,
      graph: workbenchGraph,
    });
    expect(fetcher).toHaveBeenCalledWith(
      "http://control-plane.test/workspaces/local/application-graphs/import",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ exchange }),
      }),
    );
  });
});

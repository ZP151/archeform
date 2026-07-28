import { describe, expect, it, vi } from "vitest";
import { createPublishedGraphExchange } from "@factory/graph";

import { ControlPlaneClient } from "./control-plane-client";
import { workbenchGraph } from "./workbench-graph";

describe("ControlPlaneClient", () => {
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
          result: { status: "queued" },
        }),
        { status: 201, headers: { "content-type": "application/json" } },
      ),
    );
    const client = new ControlPlaneClient("http://control-plane.test", fetcher);

    await expect(
      client.createCompilation("published-1"),
    ).resolves.toMatchObject({
      id: "compilation-1",
      publishedRevisionId: "published-1",
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
          result: { status: "succeeded" },
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
        result: { status: "succeeded" },
        artifacts: [{ path: "web/app/page.tsx" }],
      },
    );
    expect(fetcher).toHaveBeenCalledWith(
      "http://control-plane.test/compilations/compilation-1",
      expect.objectContaining({ method: "GET" }),
    );
  });

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

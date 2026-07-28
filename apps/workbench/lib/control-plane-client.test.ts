import { describe, expect, it, vi } from "vitest";

import { ControlPlaneClient } from "./control-plane-client";
import { workbenchGraph } from "./workbench-graph";

describe("ControlPlaneClient", () => {
  it("uses an existing local Draft instead of creating another Graph", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          id: "graph-1",
          key: workbenchGraph.metadata.id,
          draftRevisions: [{ id: "draft-4", revisionNumber: 4, graph: workbenchGraph }],
          publishedRevisions: [],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );
    const client = new ControlPlaneClient("http://control-plane.test", fetcher);

    await expect(client.bootstrapLocalDraft(workbenchGraph)).resolves.toMatchObject({
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
            draftRevisions: [{ id: "draft-1", revisionNumber: 1, graph: workbenchGraph }],
          }),
          { status: 201, headers: { "content-type": "application/json" } },
        ),
      );
    const client = new ControlPlaneClient("http://control-plane.test", fetcher);

    await expect(client.bootstrapLocalDraft(workbenchGraph)).resolves.toMatchObject({
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
        JSON.stringify({ id: "published-1", sourceDraftRevisionId: "draft-4" }),
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
        JSON.stringify({ id: "compilation-1", publishedRevisionId: "published-1", target: "application-bundle", result: { status: "queued" } }),
        { status: 201, headers: { "content-type": "application/json" } },
      ),
    );
    const client = new ControlPlaneClient("http://control-plane.test", fetcher);

    await expect(client.createCompilation("published-1")).resolves.toMatchObject({
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
        JSON.stringify({ id: "compilation-1", publishedRevisionId: "published-1", target: "application-bundle", result: { status: "succeeded" } }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );
    const client = new ControlPlaneClient("http://control-plane.test", fetcher);

    await expect(client.getCompilation("compilation-1")).resolves.toMatchObject({
      id: "compilation-1",
      result: { status: "succeeded" },
    });
    expect(fetcher).toHaveBeenCalledWith(
      "http://control-plane.test/compilations/compilation-1",
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("submits a brief only to the Draft-scoped AI proposal boundary", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          draftRevision: { id: "draft-5", revisionNumber: 5, graph: workbenchGraph },
          proposal: { impact: { summary: "Adds an optional receipt.", affectedModels: ["domain"], risks: [] } },
        }),
        { status: 201, headers: { "content-type": "application/json" } },
      ),
    );
    const client = new ControlPlaneClient("http://control-plane.test", fetcher);

    await expect(
      client.proposeDraft("graph-1", "Add an optional receipt field."),
    ).resolves.toMatchObject({
      draft: { applicationGraphId: "graph-1", draftRevisionId: "draft-5", revisionNumber: 5 },
      summary: "Adds an optional receipt.",
    });
    expect(fetcher).toHaveBeenCalledWith(
      "http://control-plane.test/application-graphs/graph-1/ai-proposals",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ brief: "Add an optional receipt field." }),
      }),
    );
  });
});

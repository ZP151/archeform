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
});

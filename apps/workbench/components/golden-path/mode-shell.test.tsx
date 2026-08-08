// @vitest-environment happy-dom

import React, { act } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ControlPlaneClient } from "../../lib/control-plane-client";
import { createProfileDraft } from "../../lib/profile-starters";
import type { DiscussSession } from "../../lib/golden-path/discuss-model";
import { planExpenseApprovalAlternatives } from "../../lib/golden-path/plan-alternatives";
import { GoldenPathWorkspace } from "./mode-shell";
import { flushAsync, renderComponent } from "./render-helper";

function responseJson(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function routeFetch() {
  const fetchMock = vi.fn(
    async (input: RequestInfo | URL, init?: RequestInit) => {
      // Relative URLs (e.g. the Golden Path plan route) resolve against the
      // workbench origin, matching the browser's fetch behaviour.
      const url = new URL(String(input), "http://workbench.test");
      const method = init?.method ?? "GET";
      const body =
        init?.body === undefined
          ? null
          : (JSON.parse(String(init.body)) as Record<string, unknown>);
      const segments = url.pathname.split("/").filter(Boolean);

      if (method === "POST" && url.pathname === "/api/golden-path/plan") {
        // Mirror the server route: run the deterministic planner on the
        // posted session and return its bounded result shape.
        const result = planExpenseApprovalAlternatives(
          (body as { readonly session: DiscussSession }).session,
        );
        if (!result.ok) throw new Error("Fixture session must plan.");
        return responseJson(result);
      }
      if (
        method === "POST" &&
        segments[0] === "application-graphs" &&
        segments[2] === "draft-revisions"
      ) {
        return responseJson({
          id: "draft-3",
          applicationGraphId: segments[1],
          revisionNumber: 3,
          graph: body?.graph,
        });
      }
      if (
        method === "POST" &&
        segments[0] === "application-graphs" &&
        segments[2] === "published-revisions"
      ) {
        return responseJson({
          id: "published-1",
          revisionNumber: 1,
          graphHash: "sha256:" + "a".repeat(64),
        });
      }
      if (method === "POST" && segments[0] === "compilations") {
        return responseJson({
          id: "compilation-1",
          publishedRevisionId: body?.publishedRevisionId,
          target: "application-bundle",
          result: { status: "queued" },
        });
      }
      if (
        method === "GET" &&
        segments[0] === "compilations" &&
        segments.length === 2
      ) {
        return responseJson({
          id: "compilation-1",
          publishedRevisionId: "published-1",
          target: "application-bundle",
          result: { status: "succeeded" },
          artifacts: [],
        });
      }
      if (
        method === "POST" &&
        segments[0] === "compilations" &&
        segments[2] === "verification-runs"
      ) {
        return responseJson({
          verificationRunId: body?.verificationRunId,
          compilationId: "compilation-1",
          profileKey: body?.profileKey,
          status: "pending",
          stepIds: ["isolated-boot", "employee-submit", "manager-approval"],
          evidence: null,
          diagnosis: null,
          draftDiff: null,
        });
      }
      if (method === "GET" && segments[0] === "verification-runs") {
        return responseJson({
          verificationRunId: segments[1],
          compilationId: "compilation-1",
          profileKey: "expense-approval",
          status: "succeeded",
          stepIds: ["isolated-boot", "employee-submit", "manager-approval"],
          evidence: null,
          diagnosis: null,
          draftDiff: null,
        });
      }
      if (
        method === "POST" &&
        segments[0] === "compilations" &&
        segments[2] === "preview-runs"
      ) {
        return responseJson({
          id: "preview-1",
          compilationId: "compilation-1",
          status: "starting",
          previewUrl: null,
          webPort: null,
          apiPort: null,
          createdAt: "2026-08-08T00:00:00.000Z",
          updatedAt: "2026-08-08T00:00:00.000Z",
        });
      }
      if (
        method === "GET" &&
        segments[0] === "compilations" &&
        segments[2] === "preview-runs"
      ) {
        return responseJson({
          id: "preview-1",
          compilationId: "compilation-1",
          status: "ready",
          previewUrl: "http://127.0.0.1:43101",
          webPort: 43101,
          apiPort: 43102,
          createdAt: "2026-08-08T00:00:00.000Z",
          updatedAt: "2026-08-08T00:00:00.000Z",
        });
      }
      if (
        method === "POST" &&
        segments[0] === "preview-runs" &&
        segments[2] === "stop"
      ) {
        return responseJson({
          id: "preview-1",
          compilationId: "compilation-1",
          status: "stopped",
          previewUrl: null,
          webPort: null,
          apiPort: null,
          createdAt: "2026-08-08T00:00:00.000Z",
          updatedAt: "2026-08-08T00:00:00.000Z",
        });
      }
      throw new Error(`Unhandled fetch ${method} ${url.pathname}`);
    },
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

function click(container: HTMLElement, label: string): void {
  const element = container.querySelector(
    `[aria-label="${label}"]`,
  ) as HTMLElement | null;
  expect(element, `Expected element '${label}'`).not.toBeNull();
  act(() => element!.click());
}

function fill(container: HTMLElement, label: string, value: string): void {
  const element = container.querySelector(
    `[aria-label="${label}"]`,
  ) as HTMLInputElement | null;
  expect(element, `Expected element '${label}'`).not.toBeNull();
  const setter = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    "value",
  )!.set;
  act(() => {
    setter!.call(element!, value);
    element!.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

describe("GoldenPathWorkspace", () => {
  it("requires an Expense Approval application as the carrier", () => {
    const container = renderComponent(
      <GoldenPathWorkspace
        graph={createProfileDraft("restaurant-ordering")}
        client={new ControlPlaneClient("http://control-plane.test")}
        onDraftApplied={vi.fn()}
        onPublished={vi.fn()}
      />,
    );
    expect(container.textContent).toMatch(/expense approval application/i);
  });

  it("drives the complete journey end to end", async () => {
    const fetchMock = routeFetch();
    const onDraftApplied = vi.fn();
    const onPublished = vi.fn();
    const carrier = createProfileDraft("expense-approval");
    const container = renderComponent(
      <GoldenPathWorkspace
        graph={carrier}
        client={new ControlPlaneClient("http://control-plane.test")}
        onDraftApplied={onDraftApplied}
        onPublished={onPublished}
      />,
    );

    const stages = container.querySelector('[aria-label="Golden Path stages"]');
    expect(stages?.textContent).toContain("Discuss");

    // Discuss: answer the required clarifications and build the spec.
    click(container, "Answer 'approval-threshold' with '1000'");
    click(container, "Answer 'manager-role' with 'manager'");
    click(container, "Answer 'audit-trail' with 'audit-required'");
    click(container, "Answer 'multi-level-approval' with 'no-escalation'");
    click(container, "Build requirement spec");
    expect(container.textContent).toContain("employee-submit");
    click(container, "Proceed to Plan");

    // Plan: produce alternatives, compare, accept, inspect the Graph Diff.
    click(container, "Produce plan alternatives");
    await flushAsync();
    expect(container.textContent).toContain("Standard approval");
    click(container, "Accept 'standard'");
    const diff = container.querySelector('[aria-label="Visual Graph Diff"]');
    expect(diff?.textContent).toContain("submit: draft -> submitted");
    click(container, "Proceed to Build");

    // Build: apply the plan, adjust one token and one approved layout.
    click(container, "Apply plan to Draft");
    fill(container, "Colour token value", "#146b8e");
    click(container, "Apply token adjustment");
    const layoutVariant = container.querySelector(
      '[aria-label="Page layout variant"]',
    ) as HTMLSelectElement;
    act(() => {
      layoutVariant.value = "dashboard";
      layoutVariant.dispatchEvent(new Event("change", { bubbles: true }));
    });
    click(container, "Apply layout adjustment");
    expect(container.textContent).toContain("colour token brand");
    click(container, "Apply to Draft");
    await flushAsync();
    expect(onDraftApplied).toHaveBeenCalledOnce();
    expect(container.textContent).toContain("draft-3");
    // The persisted Draft carries the carrier application's identity (the
    // control plane binds revisions to the aggregate by metadata id), not
    // the profile starter's.
    const persistedBody = fetchMock.mock.calls
      .map(([input, init]) => ({
        url: String(input),
        body: init?.body === undefined ? null : JSON.parse(String(init.body)),
      }))
      .find((call) => call.url.endsWith("/draft-revisions"))?.body;
    expect(persistedBody?.graph.metadata.id).toBe(carrier.metadata.id);
    expect(persistedBody?.graph.metadata.workspaceId).toBe(
      carrier.metadata.workspaceId,
    );
    click(container, "Proceed to Simulate");

    // Simulate: employee submits; manager approves and rejects; finance
    // audits the trail; an authorization denial is recorded.
    click(container, "Start simulation");
    click(container, "Apply submit to expense-100");
    click(container, "Switch role to manager");
    click(container, "Apply approve to expense-101");
    click(container, "Apply reject to expense-102");
    click(container, "Switch role to finance");
    const trail = container.querySelector('[aria-label="Audit trail"]');
    expect(trail?.textContent).toContain("approve");
    expect(trail?.textContent).toContain("reject");
    // The per-role surface only offers policy-allowed actions, so the honest
    // UI denial is a flow-state denial: an employee submitting a record that
    // is already past its submit state.
    click(container, "Switch role to employee");
    click(container, "Apply submit to expense-101");
    const denials = container.querySelector('[aria-label="Denial trail"]');
    expect(denials?.textContent).toContain("flow-state");
    expect(denials?.textContent).toContain("submit");
    click(container, "Proceed to Release");

    // Release: one action publish -> compile -> verify -> preview -> cleanup.
    click(container, "Publish and release");
    await flushAsync();
    await flushAsync();
    expect(onPublished).toHaveBeenCalledOnce();
    expect(container.textContent).toContain("http://127.0.0.1:43101");
    click(container, "Stop preview");
    await flushAsync();
    expect(container.textContent).toContain("Golden Path journey complete");
    const timeline = container.querySelector(
      '[aria-label="Golden Path evidence timeline"]',
    );
    // The journey timeline carries the simulation denial and every release
    // stage merged from the release evidence timeline, in the same contract
    // the browser E2E asserts.
    expect(timeline?.textContent).toContain("authorization-denial");
    for (const kind of ["publish", "compile", "verify", "boot", "cleanup"]) {
      expect(timeline?.textContent).toContain(kind);
    }
  });
});

import { FixtureRequirementInterpreter } from "@factory/adapters";
import { planProductAlternatives } from "@factory/capabilities/node";
import {
  createBlankApplicationDraft,
  hashRequirementSpec,
} from "@factory/graph";
import type { Page, Route } from "@playwright/test";

import { workbenchGraph } from "../lib/workbench-graph";
import { templateDraftResponse } from "./template-draft-fixture";

const jsonHeaders = {
  "access-control-allow-origin": "*",
  "content-type": "application/json",
};

const applicationGraphId = "application-1";
const applicationKey = "restaurant-template-001";
const draftRevisionId = "draft-restaurant-r2";
const compilationId = "compilation-restaurant";
const verificationRunId = "verify-restaurant";
const previewRunId = "preview-restaurant";

export type ConsumerGenerationFixtureOptions = {
  readonly alternatives?:
    "standard" | "missing-standard" | "duplicate-standard";
  readonly holdChoice?: boolean;
  readonly publishUnavailable?: boolean;
  readonly previewUrl?: string | null;
};

export type ConsumerGenerationFixture = {
  readonly pageErrors: string[];
  readonly requests: string[];
  readonly selectedAlternativeKeys: string[];
  readonly releaseChoice: () => void;
};

function response(
  body: unknown,
  status = 200,
): {
  readonly status: number;
  readonly headers: typeof jsonHeaders;
  readonly body: string;
} {
  return { status, headers: jsonHeaders, body: JSON.stringify(body) };
}

function compilation(status: "queued" | "succeeded") {
  return {
    id: compilationId,
    publishedRevisionId: "published-restaurant",
    target: "application-bundle",
    result:
      status === "queued"
        ? { status: "queued" }
        : {
            status: "succeeded",
            artifactCount: 1,
            completedAt: "2026-09-08T00:00:00.000Z",
          },
  };
}

function preview(previewUrl: string | null) {
  return {
    id: previewRunId,
    compilationId,
    status: "ready",
    previewUrl,
    webPort: 3210,
    apiPort: 3211,
    diagnostic: null,
    createdAt: "2026-09-08T00:00:00.000Z",
    updatedAt: "2026-09-08T00:00:00.000Z",
  };
}

export async function installConsumerGenerationFixture(
  page: Page,
  options: ConsumerGenerationFixtureOptions = {},
): Promise<ConsumerGenerationFixture> {
  const interpreted = await new FixtureRequirementInterpreter().interpret({
    brief:
      "Build an expense approval application. Employees submit expenses with amount, category, date, receipt, and notes. Managers approve or reject them, and finance can audit all decisions.",
    answers: {},
  });
  const requirement = {
    ...interpreted.spec,
    productType: "restaurant-ordering",
  } as typeof interpreted.spec;
  const requirementChecksum = hashRequirementSpec(requirement);
  const interpretation = {
    ...interpreted,
    spec: requirement,
    blueprint: {
      ...interpreted.blueprint,
      requirementChecksum,
    },
  };
  const alternatives = planProductAlternatives({
    requirement: interpreted.spec,
    blueprint: interpreted.blueprint,
    baseDraft: createBlankApplicationDraft({
      applicationId: applicationGraphId,
      workspaceId: "local-workspace",
      name: "Restaurant ordering",
    }),
  }).map(({ key, label, plan }) => ({ key, label, plan }));
  const standard = alternatives.find(
    (alternative) => alternative.key === "standard",
  )!;
  const minimal = alternatives.find(
    (alternative) => alternative.key === "minimal",
  )!;
  const plannedAlternatives =
    options.alternatives === "missing-standard"
      ? [minimal]
      : options.alternatives === "duplicate-standard"
        ? [minimal, standard, { ...standard }]
        : [minimal, standard];
  const template = templateDraftResponse(2);
  const previewUrl = options.previewUrl ?? "http://127.0.0.1:3210";
  const pageErrors: string[] = [];
  const requests: string[] = [];
  const selectedAlternativeKeys: string[] = [];
  let releaseChoice: () => void = () => {};
  const choiceGate = options.holdChoice
    ? new Promise<void>((resolve) => {
        releaseChoice = resolve;
      })
    : null;
  page.on("pageerror", (error) => {
    pageErrors.push(`${error.name}: ${error.message}`.slice(0, 240));
  });

  await page.route("**/api/requirements/interpret", async (route) => {
    if (route.request().method() !== "POST") {
      await route.continue();
      return;
    }
    requests.push("interpret");
    await route.fulfill(response({ interpretation }));
  });

  const controlPlaneRoute = async (route: Route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    const method = request.method();
    const record = (name: string) => requests.push(name);

    if (
      method === "GET" &&
      path === "/workspaces/local/application-graphs/ops-workspace"
    ) {
      await route.fulfill(
        response({
          id: "graph-initial",
          draftRevisions: [
            { id: "draft-initial", revisionNumber: 1, graph: workbenchGraph },
          ],
          publishedRevisions: [],
        }),
      );
      return;
    }
    if (method === "GET" && path === "/workspaces/local/application-graphs") {
      await route.fulfill(response([]));
      return;
    }
    if (method === "GET" && path === "/workspaces/local/curated-templates") {
      await route.fulfill(response([]));
      return;
    }
    if (method === "POST" && path === "/product/requirements") {
      record("review");
      await route.fulfill(
        response({
          review: {
            id: "review-restaurant",
            applicationGraphId,
            status: "planning",
            requirementChecksum,
            draftBaseChecksum: "sha256:base",
          },
        }),
      );
      return;
    }
    if (
      method === "POST" &&
      path === "/product/requirements/review-restaurant/plan"
    ) {
      record("plan");
      await route.fulfill(response({ alternatives: plannedAlternatives }));
      return;
    }
    if (
      method === "POST" &&
      path === "/product/requirements/review-restaurant/choices"
    ) {
      record("choice");
      const selected = request.postDataJSON() as { alternativeKey?: unknown };
      if (typeof selected.alternativeKey === "string") {
        selectedAlternativeKeys.push(selected.alternativeKey);
      }
      await choiceGate;
      await route.fulfill(response({ checksum: "sha256:restaurant-diff" }));
      return;
    }
    if (
      method === "POST" &&
      path === "/product/requirements/review-restaurant/apply"
    ) {
      record("apply");
      await route.fulfill(
        response({
          draftRevision: {
            id: draftRevisionId,
            revisionNumber: 2,
            graph: template.draft.graph,
          },
          review: { applicationGraphId, status: "applied" },
        }),
      );
      return;
    }
    if (
      method === "GET" &&
      path === `/workspaces/local/template-draft-instances/${applicationKey}`
    ) {
      record("open-draft");
      await route.fulfill(response(template));
      return;
    }
    if (
      method === "POST" &&
      path === `/application-graphs/${applicationGraphId}/published-revisions`
    ) {
      record("publish");
      if (options.publishUnavailable) {
        await route.fulfill(response({}, 503));
        return;
      }
      await route.fulfill(
        response({
          id: "published-restaurant",
          revisionNumber: 1,
          sourceDraftRevisionId: draftRevisionId,
          graphHash:
            "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        }),
      );
      return;
    }
    if (method === "POST" && path === "/compilations") {
      record("compile");
      await route.fulfill(response(compilation("queued")));
      return;
    }
    if (method === "GET" && path === `/compilations/${compilationId}`) {
      record("compilation-status");
      await route.fulfill(response(compilation("succeeded")));
      return;
    }
    if (
      method === "POST" &&
      path === `/compilations/${compilationId}/verification-runs`
    ) {
      record("verify");
      await route.fulfill(
        response({
          verificationRunId,
          compilationId,
          profileKey: null,
          status: "pending",
          stepIds: [],
          evidenceDigest: null,
          evidence: null,
          diagnosis: null,
          draftDiff: null,
        }),
      );
      return;
    }
    if (
      method === "GET" &&
      path === `/verification-runs/${verificationRunId}`
    ) {
      record("verification-status");
      await route.fulfill(
        response({
          verificationRunId,
          compilationId,
          profileKey: null,
          status: "succeeded",
          stepIds: ["customer-journey"],
          evidenceDigest:
            "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
          evidence: {
            steps: [{ stepId: "customer-journey", status: "passed" }],
          },
          diagnosis: null,
          draftDiff: null,
        }),
      );
      return;
    }
    if (
      method === "POST" &&
      path === `/compilations/${compilationId}/preview-runs`
    ) {
      record("preview");
      await route.fulfill(response(preview(previewUrl)));
      return;
    }
    if (
      method === "GET" &&
      path === `/compilations/${compilationId}/preview-runs/current`
    ) {
      record("preview-status");
      await route.fulfill(response(preview(previewUrl)));
      return;
    }
    await route.fulfill(
      response({ error: "fixture route not available" }, 404),
    );
  };
  for (const pattern of [
    "**/workspaces/local/**",
    "**/product/**",
    "**/application-graphs/**",
    "**/compilations",
    "**/compilations/**",
    "**/verification-runs/**",
    "**/preview-runs/**",
  ]) {
    await page.route(pattern, controlPlaneRoute);
  }

  return { pageErrors, requests, selectedAlternativeKeys, releaseChoice };
}

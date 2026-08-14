import type { ProductPlanAlternativeKey } from "@factory/capabilities/node";
import type {
  ApplicationGraphV1,
  ApplicationGraphV3,
  CompositionPlanV1,
  ProductBlueprintV1,
  PublishedGraphExchangeV1,
  RequirementSpecV1,
} from "@factory/graph";
import {
  assertApplicationGraphV3,
  assertDraftPreviewSnapshotV2,
  hashApplicationGraphV3,
  type DraftPreviewSnapshotV2,
} from "@factory/graph";

import {
  parseCompilationResult,
  type WorkbenchCompilationResult,
} from "./compilation-status";

type Fetcher = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

type DraftRecord = {
  readonly id: string;
  readonly revisionNumber: number;
  readonly graph: ApplicationGraphV1;
};

type LocalGraphRecord = {
  readonly id: string;
  readonly draftRevisions: readonly DraftRecord[];
  readonly publishedRevisions?: readonly WorkbenchPublishedRevision[];
};

export type WorkbenchDraft = {
  readonly applicationGraphId: string;
  readonly draftRevisionId: string;
  readonly revisionNumber: number;
  readonly graph: ApplicationGraphV1;
};

export type WorkbenchCuratedTemplate = {
  readonly apiVersion: "factory.curated-template/v1";
  readonly key: "restaurant-dual-surface";
  readonly version: "1.0.0";
  readonly name: "Maison Aurelia";
  readonly description: string;
  readonly surfaces: readonly ["customer-mobile", "merchant-desktop"];
  readonly graphChecksum: `sha256:${string}`;
};

export type WorkbenchTemplatePreviewSurface = {
  readonly apiVersion: "factory.restaurant-draft-preview-surface/v2";
  readonly disposition: "preview-only";
  readonly snapshotId: string;
  readonly graphChecksum: `sha256:${string}`;
  readonly surface: {
    readonly apiVersion: "factory.restaurant-surface-plan/v1";
    readonly surfaceKey: "customer-mobile" | "merchant-desktop";
    readonly pages: readonly {
      readonly id: string;
      readonly route: string;
      readonly title: string;
      readonly surfaceKey: "customer-mobile" | "merchant-desktop";
      readonly recipe: {
        readonly key: string;
        readonly version: string;
        readonly layoutKey: "mobile-product-shell" | "merchant-workspace-shell";
      };
      readonly blocks: readonly {
        readonly id: string;
        readonly type: string;
      }[];
    }[];
    readonly navigation: readonly unknown[];
  };
};

export type WorkbenchTemplateDraftInstance = {
  readonly apiVersion: "factory.template-draft-instance/v1";
  readonly template: WorkbenchCuratedTemplate;
  readonly origin: {
    readonly templateKey: "restaurant-dual-surface";
    readonly templateVersion: "1.0.0";
    readonly templateGraphChecksum: `sha256:${string}`;
  };
  readonly draft: {
    readonly applicationGraphId: string;
    readonly applicationKey: string;
    readonly draftRevisionId: string;
    readonly revisionNumber: number;
    readonly graph: ApplicationGraphV3;
  };
  readonly snapshot: DraftPreviewSnapshotV2;
  readonly previews: readonly [
    WorkbenchTemplatePreviewSurface,
    WorkbenchTemplatePreviewSurface,
  ];
};

export type AppendTemplateDataFieldRevisionInput = {
  readonly baseDraftRevisionId: string;
  readonly entityKey: "menu-item";
  readonly recordId: "margherita-pizza";
  readonly fieldKey: "name";
  readonly value: string;
};

export type AppendTemplateExperienceThemeRevisionInput = {
  readonly baseDraftRevisionId: string;
  readonly mode: "dark";
};

const templateResponseError = "Control Plane template response is invalid.";
const previewNavigationLabels = {
  "customer-mobile": ["Home", "Menu", "Cart", "Orders", "Profile"],
  "merchant-desktop": [
    "Dashboard",
    "Menu Management",
    "Orders",
    "Kitchen Queue",
    "Tables",
    "Users/Roles",
    "Settings",
  ],
} as const;

function responseRecord(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error(templateResponseError);
  }
  return input as Record<string, unknown>;
}

function responseString(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(templateResponseError);
  }
  return value;
}

function jsonEqual(left: unknown, right: unknown): boolean {
  try {
    if (Object.is(left, right)) return true;
    if (
      left === null ||
      right === null ||
      typeof left !== "object" ||
      typeof right !== "object"
    ) {
      return false;
    }
    const leftArray = Array.isArray(left);
    const rightArray = Array.isArray(right);
    if (leftArray || rightArray) {
      if (
        !leftArray ||
        !rightArray ||
        Object.getPrototypeOf(left) !== Array.prototype ||
        Object.getPrototypeOf(right) !== Array.prototype ||
        left.length !== right.length ||
        Reflect.ownKeys(left).length !== left.length + 1 ||
        Reflect.ownKeys(right).length !== right.length + 1
      ) {
        return false;
      }
      for (let index = 0; index < left.length; index += 1) {
        const leftDescriptor = Object.getOwnPropertyDescriptor(
          left,
          String(index),
        );
        const rightDescriptor = Object.getOwnPropertyDescriptor(
          right,
          String(index),
        );
        if (
          leftDescriptor?.enumerable !== true ||
          rightDescriptor?.enumerable !== true ||
          !("value" in leftDescriptor) ||
          !("value" in rightDescriptor) ||
          !jsonEqual(leftDescriptor.value, rightDescriptor.value)
        ) {
          return false;
        }
      }
      return true;
    }
    const leftPrototype = Object.getPrototypeOf(left);
    const rightPrototype = Object.getPrototypeOf(right);
    if (
      (leftPrototype !== Object.prototype && leftPrototype !== null) ||
      (rightPrototype !== Object.prototype && rightPrototype !== null)
    ) {
      return false;
    }
    const leftKeys = Reflect.ownKeys(left);
    const rightKeys = Reflect.ownKeys(right);
    if (
      leftKeys.length !== rightKeys.length ||
      leftKeys.some((key) => typeof key !== "string") ||
      rightKeys.some((key) => typeof key !== "string")
    ) {
      return false;
    }
    for (const key of leftKeys) {
      if (typeof key !== "string") return false;
      const leftDescriptor = Object.getOwnPropertyDescriptor(left, key);
      const rightDescriptor = Object.getOwnPropertyDescriptor(right, key);
      if (
        leftDescriptor?.enumerable !== true ||
        rightDescriptor?.enumerable !== true ||
        !("value" in leftDescriptor) ||
        !("value" in rightDescriptor) ||
        !jsonEqual(leftDescriptor.value, rightDescriptor.value)
      ) {
        return false;
      }
    }
    return true;
  } catch {
    return false;
  }
}

function expectedPreviewBinding(
  policy: ApplicationGraphV3["bindingPolicies"][number],
) {
  if (policy.kind === "domain-field") {
    return {
      kind: policy.kind,
      target: `${policy.entityKey}.${policy.fieldKey}`,
      mode: policy.access,
    };
  }
  if (policy.kind === "flow-transition") {
    return {
      kind: policy.kind,
      target: `${policy.flowKey}:${policy.from}:${policy.event}:${policy.to}`,
      mode: policy.access,
    };
  }
  return {
    kind: policy.kind,
    target: `${policy.roleKey}:${policy.resource}:${policy.action}`,
    mode: policy.access,
  };
}

function curatedTemplateResponse(input: unknown): WorkbenchCuratedTemplate {
  const record = responseRecord(input);
  const surfaces = record.surfaces;
  if (
    record.apiVersion !== "factory.curated-template/v1" ||
    record.key !== "restaurant-dual-surface" ||
    record.version !== "1.0.0" ||
    record.name !== "Maison Aurelia" ||
    typeof record.description !== "string" ||
    !Array.isArray(surfaces) ||
    surfaces.length !== 2 ||
    surfaces[0] !== "customer-mobile" ||
    surfaces[1] !== "merchant-desktop" ||
    !/^sha256:[a-f0-9]{64}$/.test(responseString(record, "graphChecksum"))
  ) {
    throw new Error(templateResponseError);
  }
  return {
    apiVersion: "factory.curated-template/v1",
    key: "restaurant-dual-surface",
    version: "1.0.0",
    name: "Maison Aurelia",
    description: record.description,
    surfaces: ["customer-mobile", "merchant-desktop"],
    graphChecksum: responseString(
      record,
      "graphChecksum",
    ) as `sha256:${string}`,
  };
}

function previewSurfaceResponse(
  input: unknown,
  expectedSurface: "customer-mobile" | "merchant-desktop",
  snapshot: DraftPreviewSnapshotV2,
  graph: ApplicationGraphV3,
): WorkbenchTemplatePreviewSurface {
  const record = responseRecord(input);
  const surface = responseRecord(record.surface);
  const expectedPages = graph.page.pages.filter(
    (page) => page.surfaceKey === expectedSurface,
  );
  const graphSurface = graph.surfaces.find(
    (candidate) => candidate.key === expectedSurface,
  );
  const expectedNavigation = graphSurface?.navigation.items.map(
    (item, index) => ({
      ...item,
      label: previewNavigationLabels[expectedSurface][index],
    }),
  );
  const source = responseRecord(surface.source);
  const origins = source.origins;
  if (
    record.apiVersion !== "factory.restaurant-draft-preview-surface/v2" ||
    record.disposition !== "preview-only" ||
    record.snapshotId !== snapshot.id ||
    record.graphChecksum !== snapshot.graphChecksum ||
    surface.apiVersion !== "factory.restaurant-surface-plan/v1" ||
    surface.surfaceKey !== expectedSurface ||
    !Array.isArray(surface.pages) ||
    surface.pages.length !== expectedPages.length ||
    !Array.isArray(surface.navigation) ||
    !expectedNavigation ||
    !jsonEqual(surface.navigation, expectedNavigation) ||
    !Array.isArray(origins) ||
    origins.length !== 1 ||
    source.module !==
      (expectedSurface === "customer-mobile"
        ? "src/generated/customer-restaurant-ui.mjs"
        : "src/generated/merchant-restaurant-ui.mjs") ||
    !/^sha256:[a-f0-9]{64}$/.test(responseString(source, "digest"))
  ) {
    throw new Error(templateResponseError);
  }
  const origin = responseRecord(origins[0]);
  if (
    origin.package !== "@factory/screen-recipes" ||
    origin.version !== "0.1.0" ||
    origin.ownership !== "factory-authored" ||
    origin.license !== "UNLICENSED" ||
    !jsonEqual(
      origin.recipeKeys,
      expectedPages.map((page) => page.recipe.key),
    )
  ) {
    throw new Error(templateResponseError);
  }
  const pages = surface.pages.map((pageInput, pageIndex) => {
    const page = responseRecord(pageInput);
    const recipe = responseRecord(page.recipe);
    const expectedPage = expectedPages[pageIndex];
    if (
      !expectedPage ||
      page.id !== expectedPage.id ||
      page.route !== expectedPage.route ||
      page.title !== expectedPage.title ||
      page.surfaceKey !== expectedSurface ||
      !jsonEqual(page.screenIntent, expectedPage.screenIntent) ||
      recipe.key !== expectedPage.recipe.key ||
      recipe.version !== expectedPage.recipe.version ||
      !jsonEqual(recipe.regions, expectedPage.recipe.regions) ||
      recipe.layoutKey !==
        (expectedSurface === "customer-mobile"
          ? "mobile-product-shell"
          : "merchant-workspace-shell") ||
      !Array.isArray(page.blocks) ||
      page.blocks.length !== expectedPage.blocks.length ||
      page.blocks.some((blockInput, blockIndex) => {
        const block = responseRecord(blockInput);
        const expectedBlock = expectedPage.blocks[blockIndex];
        const expectedBindings = Object.fromEntries(
          graph.bindingPolicies
            .filter(
              (policy) =>
                policy.pageId === expectedPage.id &&
                policy.blockId === expectedBlock?.id,
            )
            .map((policy) => [
              policy.bindingKey,
              expectedPreviewBinding(policy),
            ]),
        );
        return (
          !expectedBlock ||
          block.id !== expectedBlock.id ||
          block.type !== expectedBlock.type ||
          !jsonEqual(block.bindings, expectedBindings)
        );
      })
    ) {
      throw new Error(templateResponseError);
    }
    return {
      id: responseString(page, "id"),
      route: responseString(page, "route"),
      title: responseString(page, "title"),
      surfaceKey: expectedSurface,
      recipe: {
        key: responseString(recipe, "key"),
        version: responseString(recipe, "version"),
        layoutKey: recipe.layoutKey as
          "mobile-product-shell" | "merchant-workspace-shell",
      },
      blocks: page.blocks.map((blockInput) => {
        const block = responseRecord(blockInput);
        return {
          id: responseString(block, "id"),
          type: responseString(block, "type"),
        };
      }),
    };
  });
  return {
    apiVersion: "factory.restaurant-draft-preview-surface/v2",
    disposition: "preview-only",
    snapshotId: snapshot.id,
    graphChecksum: snapshot.graphChecksum,
    surface: {
      apiVersion: "factory.restaurant-surface-plan/v1",
      surfaceKey: expectedSurface,
      pages,
      navigation: expectedNavigation.map((item) => ({ ...item })),
    },
  };
}

function templateDraftResponse(input: unknown): WorkbenchTemplateDraftInstance {
  try {
    const record = responseRecord(input);
    if (record.apiVersion !== "factory.template-draft-instance/v1") {
      throw new Error();
    }
    const template = curatedTemplateResponse(record.template);
    const origin = responseRecord(record.origin);
    const draft = responseRecord(record.draft);
    const graph = assertApplicationGraphV3(draft.graph);
    const snapshot = assertDraftPreviewSnapshotV2(record.snapshot);
    const previews = record.previews;
    if (
      origin.templateKey !== template.key ||
      origin.templateVersion !== template.version ||
      origin.templateGraphChecksum !== template.graphChecksum ||
      responseString(draft, "applicationGraphId") !==
        snapshot.applicationGraphId ||
      responseString(draft, "draftRevisionId") !== snapshot.draftRevisionId ||
      responseString(draft, "applicationKey") !== graph.metadata.id ||
      graph.metadata.workspaceId !== snapshot.workspaceId ||
      hashApplicationGraphV3(graph) !== snapshot.graphChecksum ||
      draft.revisionNumber !== Number(draft.revisionNumber) ||
      !Number.isSafeInteger(draft.revisionNumber) ||
      Number(draft.revisionNumber) < 1 ||
      snapshot.state !== "active" ||
      !Array.isArray(previews) ||
      previews.length !== 2
    ) {
      throw new Error();
    }
    const parsedPreviews = [
      previewSurfaceResponse(previews[0], "customer-mobile", snapshot, graph),
      previewSurfaceResponse(previews[1], "merchant-desktop", snapshot, graph),
    ] as const;
    return {
      apiVersion: "factory.template-draft-instance/v1",
      template,
      origin: {
        templateKey: template.key,
        templateVersion: template.version,
        templateGraphChecksum: template.graphChecksum,
      },
      draft: {
        applicationGraphId: snapshot.applicationGraphId,
        applicationKey: graph.metadata.id,
        draftRevisionId: snapshot.draftRevisionId,
        revisionNumber: Number(draft.revisionNumber),
        graph,
      },
      snapshot,
      previews: parsedPreviews,
    };
  } catch {
    throw new Error(templateResponseError);
  }
}

export function deriveTemplateDataFieldValue(
  instance: WorkbenchTemplateDraftInstance,
): string {
  try {
    const seedData = instance.draft.graph.domain.seedData;
    const scenario = instance.draft.graph.seedScenarios[0];
    if (
      !seedData ||
      instance.draft.graph.seedScenarios.length !== 1 ||
      scenario?.key !== "fine-dining-service" ||
      scenario.records.length !== seedData.length ||
      seedData.some(
        (seed, index) =>
          scenario.records[index]?.entityKey !== seed.entity ||
          !jsonEqual(scenario.records[index]?.values, seed.values),
      )
    ) {
      throw new Error();
    }
    const matches = seedData.flatMap((seed, index) =>
      seed.entity === "menu-item" && seed.id === "margherita-pizza"
        ? [{ seed, scenario: scenario.records[index] }]
        : [],
    );
    const value = matches[0]?.seed.values.name;
    if (
      matches.length !== 1 ||
      !matches[0]?.scenario ||
      typeof value !== "string" ||
      matches[0].scenario.values.name !== value
    ) {
      throw new Error();
    }
    return value;
  } catch {
    throw new Error(templateResponseError);
  }
}

export function deriveTemplateExperienceThemeMode(
  instance: WorkbenchTemplateDraftInstance,
): "light" | "dark" {
  try {
    const mode = instance.draft.graph.experience.theme.mode;
    if (mode !== "light" && mode !== "dark") throw new Error();
    return mode;
  } catch {
    throw new Error(templateResponseError);
  }
}

/** The product closure review row as the journey binds to it. */
export type WorkbenchProductReview = {
  readonly id: string;
  readonly applicationGraphId: string;
  readonly status: string;
  readonly requirementChecksum: string;
  readonly draftBaseChecksum: string;
};

export type WorkbenchProductPlanAlternative = {
  readonly key: ProductPlanAlternativeKey;
  readonly label: string;
  readonly plan: CompositionPlanV1;
};

export type WorkbenchProductApplied = {
  readonly applicationGraphId: string;
  readonly revisionNumber: number;
  readonly graph: ApplicationGraphV1;
  readonly reviewStatus: string;
};

type AiProposalResponse = {
  readonly draftRevision: DraftRecord;
  readonly proposal: {
    readonly impact: {
      readonly summary: string;
      readonly affectedModels: readonly string[];
      readonly risks: readonly string[];
    };
    readonly testSuggestions: readonly {
      readonly id: string;
      readonly title: string;
      readonly type: string;
    }[];
  };
};

export type WorkbenchAiProposal = {
  readonly draft: WorkbenchDraft;
  readonly summary: string;
  readonly affectedModels: readonly string[];
  readonly risks: readonly string[];
  readonly testSuggestions: readonly {
    readonly id: string;
    readonly title: string;
    readonly type: string;
  }[];
};

export type WorkbenchPublishedRevision = {
  readonly id: string;
  readonly revisionNumber: number;
  readonly sourceDraftRevisionId?: string;
  readonly graphHash: string;
  readonly graph?: ApplicationGraphV1;
};

export type WorkbenchOpenedApplication = {
  readonly draft: WorkbenchDraft;
  readonly publishedRevision: WorkbenchPublishedRevision | null;
};

export type WorkbenchRevisionTimeline = {
  readonly drafts: readonly {
    readonly id: string;
    readonly revisionNumber: number;
    readonly graph: ApplicationGraphV1;
  }[];
  readonly published: readonly WorkbenchPublishedRevision[];
};

export type WorkbenchCompilationArtifact = {
  readonly path: string;
  readonly digest: string;
  readonly mediaType: string;
  readonly sizeBytes?: number | null;
};

export type WorkbenchCompilation = {
  readonly id: string;
  readonly publishedRevisionId: string;
  readonly target: string;
  readonly result: WorkbenchCompilationResult;
  readonly artifacts?: readonly WorkbenchCompilationArtifact[];
};

const ARTIFACT_DIGEST_PATTERN = /^sha256:[0-9a-f]{64}$/;
const MAX_ARTIFACT_CONTENT_BYTES = 1_000_000;

function isSafeArtifactPath(path: string): boolean {
  if (
    path.length === 0 ||
    path.startsWith("/") ||
    path.includes("\\") ||
    path.includes("\0") ||
    /^[A-Za-z]:\//.test(path)
  ) {
    return false;
  }

  return path
    .split("/")
    .every(
      (segment) => segment.length > 0 && segment !== "." && segment !== "..",
    );
}

function compilationResponse(input: unknown): WorkbenchCompilation {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("Control Plane compilation response is invalid.");
  }
  const record = input as Record<string, unknown>;
  const requiredString = (key: string): string => {
    const value = record[key];
    if (typeof value !== "string" || value.length === 0) {
      throw new Error("Control Plane compilation response is invalid.");
    }
    return value;
  };
  let artifacts: WorkbenchCompilation["artifacts"];
  if (record.artifacts !== undefined) {
    if (!Array.isArray(record.artifacts)) {
      throw new Error("Control Plane compilation response is invalid.");
    }
    const artifactPaths = new Set<string>();
    artifacts = Object.freeze(
      record.artifacts.map((inputArtifact) => {
        if (
          !inputArtifact ||
          typeof inputArtifact !== "object" ||
          Array.isArray(inputArtifact)
        ) {
          throw new Error("Control Plane compilation response is invalid.");
        }
        const artifact = inputArtifact as Record<string, unknown>;
        if (
          typeof artifact.path !== "string" ||
          !isSafeArtifactPath(artifact.path) ||
          typeof artifact.digest !== "string" ||
          !ARTIFACT_DIGEST_PATTERN.test(artifact.digest) ||
          typeof artifact.mediaType !== "string" ||
          artifact.mediaType.length === 0 ||
          (artifact.sizeBytes !== undefined &&
            artifact.sizeBytes !== null &&
            (typeof artifact.sizeBytes !== "number" ||
              !Number.isSafeInteger(artifact.sizeBytes) ||
              artifact.sizeBytes < 0))
        ) {
          throw new Error("Control Plane compilation response is invalid.");
        }
        if (artifactPaths.has(artifact.path)) {
          throw new Error("Control Plane compilation response is invalid.");
        }
        artifactPaths.add(artifact.path);
        return Object.freeze({
          path: artifact.path,
          digest: artifact.digest,
          mediaType: artifact.mediaType,
          ...(artifact.sizeBytes === undefined
            ? {}
            : { sizeBytes: artifact.sizeBytes as number | null }),
        });
      }),
    );
  }
  return {
    id: requiredString("id"),
    publishedRevisionId: requiredString("publishedRevisionId"),
    target: requiredString("target"),
    result: parseCompilationResult(record.result),
    ...(artifacts === undefined ? {} : { artifacts }),
  };
}

export type WorkbenchApplicationSummary = {
  readonly id: string;
  readonly key: string;
  readonly name: string;
  readonly templateOrigin?: {
    readonly templateKey: string;
    readonly templateVersion: string;
  } | null;
  readonly compositionProfile: string | null;
  readonly latestDraft: {
    readonly revisionNumber: number;
    readonly createdAt: string;
  } | null;
  readonly latestPublished: {
    readonly revisionNumber: number;
    readonly publishedAt: string;
  } | null;
  readonly latestCompilation: {
    readonly id: string;
    readonly status: string;
    readonly completedAt: string | null;
  } | null;
  readonly goldenAssetMaturity: {
    readonly status: "golden" | "incomplete";
    readonly goldenAssets: number;
    readonly totalAssets: number;
  };
};

export type WorkbenchWorkspacePortfolioSummary = {
  readonly apiVersion: "factory.workspace-portfolio-summary/v1";
  readonly profiles: readonly {
    readonly profile: string;
    readonly label: string;
    readonly category: "approval" | "commerce";
    readonly requiredPackages: number;
    readonly optionalPackages: number;
  }[];
  readonly readiness: readonly WorkbenchProfileReadiness[];
  readonly coverage: readonly WorkbenchProfileCoverage[];
  readonly capabilities: {
    readonly golden: number;
    readonly lockedVersions: number;
    readonly candidate: number;
    readonly provider: number;
  };
  readonly capabilityFamilies: readonly {
    readonly key: string;
    readonly lifecycle: "golden";
    readonly version: string;
    readonly profileCount: number;
    readonly validation: "verified";
    readonly generatedTargetState: "ready";
  }[];
  readonly intake: {
    readonly portfolioSources: number;
    readonly intakeEligible: number;
    readonly candidateBlueprints: number;
    readonly quarantined: number;
    readonly blocked: number;
  };
  readonly supply: WorkbenchCapabilitySupplySummary;
  readonly compilations: {
    readonly queued: number;
    readonly running: number;
    readonly succeeded: number;
    readonly failed: number;
  };
};

export type WorkbenchCapabilitySupplySummary = {
  readonly apiVersion: "factory.capability-supply-summary/v1";
  readonly families: readonly {
    readonly key:
      | "identity"
      | "catalog"
      | "commerce-transaction"
      | "inventory"
      | "availability"
      | "queue"
      | "payment"
      | "fulfillment"
      | "notification"
      | "document"
      | "search"
      | "analytics"
      | "integration";
    readonly profiles: readonly (
      | "expense-approval"
      | "restaurant-ordering"
      | "simple-ecommerce"
      | "retail-counter"
      | "grocery-pickup"
    )[];
    readonly discovery: number;
    readonly quarantined: number;
    readonly blocked: number;
    readonly action:
      | "discover"
      | "qualify"
      | "integrate"
      | "provider-review"
      | "design"
      | "defer";
  }[];
};

export type WorkbenchProfileReadinessStatus =
  "available" | "partial" | "planned" | "provider-required";

export type WorkbenchProfileReadiness = {
  readonly apiVersion: "factory.profile-readiness/v1";
  readonly profile: string;
  readonly label: string;
  readonly generatedTargets: readonly (
    "simulator" | "web" | "api" | "database" | "tests" | "docs"
  )[];
  readonly capabilities: readonly {
    readonly key: string;
    readonly status: WorkbenchProfileReadinessStatus;
  }[];
};

export type WorkbenchProfileCoverageStatus =
  "available" | "partial" | "planned" | "provider-required";

export type WorkbenchProfileCoverage = {
  readonly apiVersion: "factory.profile-coverage/v1";
  readonly key: string;
  readonly label: string;
  readonly status: WorkbenchProfileCoverageStatus;
  readonly packageKeys: readonly string[];
  readonly profiles: readonly (
    | "expense-approval"
    | "restaurant-ordering"
    | "simple-ecommerce"
    | "retail-counter"
    | "grocery-pickup"
  )[];
};

export type WorkbenchArtifactContent = {
  readonly path: string;
  readonly digest: string;
  readonly content: string;
};

const INVALID_ARTIFACT_RESPONSE_MESSAGE =
  "Control Plane artifact response is invalid.";

export function admitCompilationArtifactContent(
  input: unknown,
  selected: WorkbenchCompilationArtifact,
): WorkbenchArtifactContent {
  try {
    if (
      !input ||
      typeof input !== "object" ||
      Array.isArray(input) ||
      Object.getPrototypeOf(input) !== Object.prototype
    ) {
      throw new Error(INVALID_ARTIFACT_RESPONSE_MESSAGE);
    }

    const keys = Reflect.ownKeys(input);
    if (
      keys.length !== 3 ||
      !keys.every((key) => typeof key === "string") ||
      !keys.includes("path") ||
      !keys.includes("digest") ||
      !keys.includes("content")
    ) {
      throw new Error(INVALID_ARTIFACT_RESPONSE_MESSAGE);
    }

    const pathDescriptor = Object.getOwnPropertyDescriptor(input, "path");
    const digestDescriptor = Object.getOwnPropertyDescriptor(input, "digest");
    const contentDescriptor = Object.getOwnPropertyDescriptor(input, "content");
    const descriptors = [pathDescriptor, digestDescriptor, contentDescriptor];
    if (
      descriptors.some(
        (descriptor) =>
          descriptor === undefined ||
          descriptor.enumerable !== true ||
          !Object.hasOwn(descriptor, "value"),
      )
    ) {
      throw new Error(INVALID_ARTIFACT_RESPONSE_MESSAGE);
    }

    const path = pathDescriptor?.value;
    const digest = digestDescriptor?.value;
    const content = contentDescriptor?.value;
    if (
      typeof path !== "string" ||
      !isSafeArtifactPath(path) ||
      typeof digest !== "string" ||
      !ARTIFACT_DIGEST_PATTERN.test(digest) ||
      typeof content !== "string" ||
      path !== selected.path ||
      digest !== selected.digest ||
      content.length > MAX_ARTIFACT_CONTENT_BYTES ||
      new TextEncoder().encode(content).byteLength > MAX_ARTIFACT_CONTENT_BYTES
    ) {
      throw new Error(INVALID_ARTIFACT_RESPONSE_MESSAGE);
    }

    return Object.freeze({ path, digest, content });
  } catch {
    throw new Error(INVALID_ARTIFACT_RESPONSE_MESSAGE);
  }
}

export type WorkbenchPreviewRun = {
  readonly id: string;
  readonly compilationId: string;
  readonly status: "starting" | "ready" | "stopping" | "stopped" | "failed";
  readonly previewUrl: string | null;
  readonly webPort: number | null;
  readonly apiPort: number | null;
  readonly diagnostic: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type WorkbenchVerificationRun = {
  readonly verificationRunId: string;
  readonly compilationId: string;
  /** Null when the worker derives the verification plan from the Published Graph. */
  readonly profileKey: string | null;
  readonly status: "pending" | "succeeded" | "failed" | "cancelled";
  readonly stepIds: readonly string[];
  readonly evidenceDigest: string | null;
  readonly evidence: unknown;
  readonly diagnosis: unknown;
  readonly draftDiff: unknown;
};

function workbenchVerificationRun(
  record: WorkbenchVerificationRun,
): WorkbenchVerificationRun {
  return {
    verificationRunId: record.verificationRunId,
    compilationId: record.compilationId,
    profileKey: record.profileKey,
    status: record.status,
    stepIds: record.stepIds,
    evidenceDigest: record.evidenceDigest,
    evidence: record.evidence,
    diagnosis: record.diagnosis,
    draftDiff: record.draftDiff,
  };
}

export type WorkbenchVerificationApproval = {
  readonly draft: WorkbenchDraft;
  readonly draftDiff: unknown;
};

function workbenchVerificationApproval(record: {
  readonly draftRevision: {
    readonly id: string;
    readonly applicationGraphId: string;
    readonly revisionNumber: number;
    readonly graph: ApplicationGraphV1;
  };
  readonly draftDiff: unknown;
}): WorkbenchVerificationApproval {
  return {
    draft: {
      applicationGraphId: record.draftRevision.applicationGraphId,
      draftRevisionId: record.draftRevision.id,
      revisionNumber: record.draftRevision.revisionNumber,
      graph: record.draftRevision.graph,
    },
    draftDiff: record.draftDiff,
  };
}

function workbenchPreviewRun(record: WorkbenchPreviewRun): WorkbenchPreviewRun {
  return {
    id: record.id,
    compilationId: record.compilationId,
    status: record.status,
    previewUrl: record.previewUrl,
    webPort: record.webPort,
    apiPort: record.apiPort,
    diagnostic: record.diagnostic,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

export type ControlPlaneRejectionCode =
  | "composition.request_envelope_invalid"
  | "composition.request_identity_invalid"
  | "composition.requirement_invalid"
  | "composition.blueprint_invalid"
  | "composition.requirement_blueprint_checksum_mismatch";

const CONTROL_PLANE_REJECTION_CODES = new Set<ControlPlaneRejectionCode>([
  "composition.request_envelope_invalid",
  "composition.request_identity_invalid",
  "composition.requirement_invalid",
  "composition.blueprint_invalid",
  "composition.requirement_blueprint_checksum_mismatch",
]);

function controlPlaneRejectionCode(
  body: unknown,
): ControlPlaneRejectionCode | undefined {
  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    return undefined;
  }
  const code = (body as { readonly code?: unknown }).code;
  return typeof code === "string" &&
    CONTROL_PLANE_REJECTION_CODES.has(code as ControlPlaneRejectionCode)
    ? (code as ControlPlaneRejectionCode)
    : undefined;
}

export class ControlPlaneError extends Error {
  constructor(
    readonly status: number,
    readonly code?: ControlPlaneRejectionCode,
  ) {
    super(`Control Plane request failed with ${status}.`);
  }
}

function recordAsDraft(record: LocalGraphRecord): WorkbenchDraft {
  const draft = record.draftRevisions[0];
  if (
    !record.id ||
    !draft?.id ||
    !Number.isInteger(draft.revisionNumber) ||
    !draft.graph
  ) {
    throw new Error(
      "Control Plane response did not contain a current Draft revision.",
    );
  }
  return {
    applicationGraphId: record.id,
    draftRevisionId: draft.id,
    revisionNumber: draft.revisionNumber,
    graph: draft.graph,
  };
}

function recordAsOpenedApplication(
  record: LocalGraphRecord,
): WorkbenchOpenedApplication {
  const draft = recordAsDraft(record);
  const published = record.publishedRevisions?.[0] ?? null;
  return {
    draft,
    publishedRevision: published
      ? {
          id: published.id,
          revisionNumber: published.revisionNumber,
          ...(published.sourceDraftRevisionId
            ? { sourceDraftRevisionId: published.sourceDraftRevisionId }
            : {}),
          graphHash: published.graphHash,
          ...(published.sourceDraftRevisionId === draft.draftRevisionId
            ? { graph: draft.graph }
            : {}),
        }
      : null,
  };
}

function applicationSummary(
  record: WorkbenchApplicationSummary,
): WorkbenchApplicationSummary {
  return {
    id: record.id,
    key: record.key,
    name: record.name,
    templateOrigin: record.templateOrigin
      ? {
          templateKey: record.templateOrigin.templateKey,
          templateVersion: record.templateOrigin.templateVersion,
        }
      : null,
    compositionProfile: record.compositionProfile,
    latestDraft: record.latestDraft
      ? {
          revisionNumber: record.latestDraft.revisionNumber,
          createdAt: record.latestDraft.createdAt,
        }
      : null,
    latestPublished: record.latestPublished
      ? {
          revisionNumber: record.latestPublished.revisionNumber,
          publishedAt: record.latestPublished.publishedAt,
        }
      : null,
    latestCompilation: record.latestCompilation
      ? {
          id: record.latestCompilation.id,
          status: record.latestCompilation.status,
          completedAt: record.latestCompilation.completedAt,
        }
      : null,
    goldenAssetMaturity: {
      status: record.goldenAssetMaturity.status,
      goldenAssets: record.goldenAssetMaturity.goldenAssets,
      totalAssets: record.goldenAssetMaturity.totalAssets,
    },
  };
}

function nonNegativeCount(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) {
    throw new Error(`Control Plane Portfolio summary has invalid ${label}.`);
  }
  return value;
}

function capabilitySupply(value: unknown): WorkbenchCapabilitySupplySummary {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Control Plane Capability supply is invalid.");
  }
  const record = value as Record<string, unknown>;
  if (
    record.apiVersion !== "factory.capability-supply-summary/v1" ||
    !Array.isArray(record.families) ||
    Object.keys(record).some(
      (key) => key !== "apiVersion" && key !== "families",
    )
  ) {
    throw new Error("Control Plane Capability supply is invalid.");
  }
  const keys = new Set<
    WorkbenchCapabilitySupplySummary["families"][number]["key"]
  >([
    "identity",
    "catalog",
    "commerce-transaction",
    "inventory",
    "availability",
    "queue",
    "payment",
    "fulfillment",
    "notification",
    "document",
    "search",
    "analytics",
    "integration",
  ]);
  const profiles = new Set([
    "expense-approval",
    "restaurant-ordering",
    "simple-ecommerce",
    "retail-counter",
    "grocery-pickup",
  ]);
  const actions = new Set([
    "discover",
    "qualify",
    "integrate",
    "provider-review",
    "design",
    "defer",
  ]);
  const families = record.families.map((value) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new Error("Control Plane Capability supply is invalid.");
    }
    const item = value as Record<string, unknown>;
    if (
      Object.keys(item).some(
        (key) =>
          ![
            "key",
            "profiles",
            "discovery",
            "quarantined",
            "blocked",
            "action",
          ].includes(key),
      ) ||
      typeof item.key !== "string" ||
      !keys.has(
        item.key as WorkbenchCapabilitySupplySummary["families"][number]["key"],
      ) ||
      !Array.isArray(item.profiles) ||
      item.profiles.some(
        (profile) => typeof profile !== "string" || !profiles.has(profile),
      ) ||
      new Set(item.profiles).size !== item.profiles.length ||
      typeof item.action !== "string" ||
      !actions.has(item.action)
    ) {
      throw new Error("Control Plane Capability supply is invalid.");
    }
    return {
      key: item.key as WorkbenchCapabilitySupplySummary["families"][number]["key"],
      profiles:
        item.profiles as WorkbenchCapabilitySupplySummary["families"][number]["profiles"],
      discovery: nonNegativeCount(item.discovery, "supply.discovery"),
      quarantined: nonNegativeCount(item.quarantined, "supply.quarantined"),
      blocked: nonNegativeCount(item.blocked, "supply.blocked"),
      action:
        item.action as WorkbenchCapabilitySupplySummary["families"][number]["action"],
    };
  });
  if (new Set(families.map((family) => family.key)).size !== families.length) {
    throw new Error("Control Plane Capability supply is invalid.");
  }
  return {
    apiVersion: "factory.capability-supply-summary/v1",
    families,
  };
}

function workspacePortfolioSummary(
  value: unknown,
): WorkbenchWorkspacePortfolioSummary {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Control Plane Portfolio summary is invalid.");
  }
  const record = value as Record<string, unknown>;
  if (record.apiVersion !== "factory.workspace-portfolio-summary/v1") {
    throw new Error("Control Plane Portfolio summary version is unsupported.");
  }
  const profiles = record.profiles;
  if (!Array.isArray(profiles)) {
    throw new Error("Control Plane Portfolio summary profiles are invalid.");
  }
  const profileRecords = profiles.map((profile) => {
    if (!profile || typeof profile !== "object" || Array.isArray(profile)) {
      throw new Error("Control Plane Portfolio profile is invalid.");
    }
    const entry = profile as Record<string, unknown>;
    const category = entry.category;
    if (
      typeof entry.profile !== "string" ||
      typeof entry.label !== "string" ||
      (category !== "approval" && category !== "commerce")
    ) {
      throw new Error("Control Plane Portfolio profile is invalid.");
    }
    return {
      profile: entry.profile,
      label: entry.label,
      category: category as "approval" | "commerce",
      requiredPackages: nonNegativeCount(
        entry.requiredPackages,
        "profile requiredPackages",
      ),
      optionalPackages: nonNegativeCount(
        entry.optionalPackages,
        "profile optionalPackages",
      ),
    };
  });
  const readiness = record.readiness;
  if (!Array.isArray(readiness)) {
    throw new Error("Control Plane Portfolio readiness is invalid.");
  }
  const supportedProfiles = new Set([
    "expense-approval",
    "restaurant-ordering",
    "simple-ecommerce",
    "retail-counter",
    "grocery-pickup",
  ]);
  const supportedTargets = new Set([
    "simulator",
    "web",
    "api",
    "database",
    "tests",
    "docs",
  ]);
  const supportedReadinessStatuses = new Set([
    "available",
    "partial",
    "planned",
    "provider-required",
  ]);
  const capabilityKeyPattern = /^[a-z][a-z0-9-]*(?:\.[a-z][a-z0-9-]*)+$/;
  const readinessRecords = readiness.map((entry) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      throw new Error("Control Plane Profile readiness is invalid.");
    }
    const candidate = entry as Record<string, unknown>;
    if (
      candidate.apiVersion !== "factory.profile-readiness/v1" ||
      typeof candidate.profile !== "string" ||
      !supportedProfiles.has(candidate.profile) ||
      typeof candidate.label !== "string" ||
      !Array.isArray(candidate.generatedTargets) ||
      !Array.isArray(candidate.capabilities)
    ) {
      throw new Error("Control Plane Profile readiness is invalid.");
    }
    const generatedTargets = candidate.generatedTargets.map((target) => {
      if (typeof target !== "string" || !supportedTargets.has(target)) {
        throw new Error("Control Plane Profile readiness target is invalid.");
      }
      return target as WorkbenchProfileReadiness["generatedTargets"][number];
    });
    if (
      generatedTargets.length !== supportedTargets.size ||
      new Set(generatedTargets).size !== supportedTargets.size
    ) {
      throw new Error("Control Plane Profile readiness targets are invalid.");
    }
    const capabilities = candidate.capabilities.map((capability) => {
      if (
        !capability ||
        typeof capability !== "object" ||
        Array.isArray(capability)
      ) {
        throw new Error(
          "Control Plane Profile readiness capability is invalid.",
        );
      }
      const item = capability as Record<string, unknown>;
      if (
        typeof item.key !== "string" ||
        !capabilityKeyPattern.test(item.key) ||
        typeof item.status !== "string" ||
        !supportedReadinessStatuses.has(item.status)
      ) {
        throw new Error(
          "Control Plane Profile readiness capability is invalid.",
        );
      }
      return {
        key: item.key,
        status: item.status as WorkbenchProfileReadinessStatus,
      };
    });
    return {
      apiVersion: "factory.profile-readiness/v1" as const,
      profile: candidate.profile,
      label: candidate.label,
      generatedTargets,
      capabilities,
    };
  });
  const coverage = record.coverage;
  if (!Array.isArray(coverage)) {
    throw new Error("Control Plane Profile coverage is invalid.");
  }
  const coverageRecords = coverage.map((entry) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      throw new Error("Control Plane Profile coverage is invalid.");
    }
    const candidate = entry as Record<string, unknown>;
    if (
      Object.keys(candidate).some(
        (key) =>
          ![
            "apiVersion",
            "key",
            "label",
            "status",
            "packageKeys",
            "profiles",
          ].includes(key),
      ) ||
      candidate.apiVersion !== "factory.profile-coverage/v1" ||
      typeof candidate.key !== "string" ||
      !capabilityKeyPattern.test(candidate.key) ||
      typeof candidate.label !== "string" ||
      candidate.label.trim().length === 0 ||
      typeof candidate.status !== "string" ||
      !supportedReadinessStatuses.has(candidate.status) ||
      !Array.isArray(candidate.packageKeys) ||
      !Array.isArray(candidate.profiles)
    ) {
      throw new Error("Control Plane Profile coverage is invalid.");
    }
    const packageKeys = candidate.packageKeys.map((packageKey) => {
      if (
        typeof packageKey !== "string" ||
        !capabilityKeyPattern.test(packageKey)
      ) {
        throw new Error("Control Plane Profile coverage package is invalid.");
      }
      return packageKey;
    });
    const profiles = candidate.profiles.map((profile) => {
      if (typeof profile !== "string" || !supportedProfiles.has(profile)) {
        throw new Error("Control Plane Profile coverage profile is invalid.");
      }
      return profile as WorkbenchProfileCoverage["profiles"][number];
    });
    if (
      new Set(packageKeys).size !== packageKeys.length ||
      profiles.length === 0 ||
      new Set(profiles).size !== profiles.length
    ) {
      throw new Error("Control Plane Profile coverage is invalid.");
    }
    return {
      apiVersion: "factory.profile-coverage/v1" as const,
      key: candidate.key,
      label: candidate.label,
      status: candidate.status as WorkbenchProfileCoverageStatus,
      packageKeys,
      profiles,
    };
  });
  if (
    new Set(coverageRecords.map((coverage) => coverage.key)).size !==
    coverageRecords.length
  ) {
    throw new Error("Control Plane Profile coverage is invalid.");
  }
  const counts = <T extends readonly string[]>(
    input: unknown,
    fields: T,
    label: string,
  ): Record<T[number], number> => {
    if (!input || typeof input !== "object" || Array.isArray(input)) {
      throw new Error(`Control Plane Portfolio ${label} is invalid.`);
    }
    const record = input as Record<string, unknown>;
    return Object.fromEntries(
      fields.map((field) => [
        field,
        nonNegativeCount(record[field], `${label}.${field}`),
      ]),
    ) as Record<T[number], number>;
  };
  const capabilityFamilies = record.capabilityFamilies;
  if (!Array.isArray(capabilityFamilies)) {
    throw new Error("Control Plane Capability families are invalid.");
  }
  const capabilityFamilyRecords = capabilityFamilies.map((entry) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      throw new Error("Control Plane Capability family is invalid.");
    }
    const family = entry as Record<string, unknown>;
    if (
      typeof family.key !== "string" ||
      !capabilityKeyPattern.test(family.key) ||
      family.lifecycle !== "golden" ||
      typeof family.version !== "string" ||
      family.version.trim().length === 0 ||
      family.validation !== "verified" ||
      family.generatedTargetState !== "ready"
    ) {
      throw new Error("Control Plane Capability family is invalid.");
    }
    return {
      key: family.key,
      lifecycle: "golden" as const,
      version: family.version,
      profileCount: nonNegativeCount(
        family.profileCount,
        "capability family profileCount",
      ),
      validation: "verified" as const,
      generatedTargetState: "ready" as const,
    };
  });

  return {
    apiVersion: "factory.workspace-portfolio-summary/v1",
    profiles: profileRecords,
    readiness: readinessRecords,
    coverage: coverageRecords,
    capabilities: counts(
      record.capabilities,
      ["golden", "lockedVersions", "candidate", "provider"] as const,
      "capabilities",
    ),
    capabilityFamilies: capabilityFamilyRecords,
    intake: counts(
      record.intake,
      [
        "portfolioSources",
        "intakeEligible",
        "candidateBlueprints",
        "quarantined",
        "blocked",
      ] as const,
      "intake",
    ),
    supply: capabilitySupply(record.supply),
    compilations: counts(
      record.compilations,
      ["queued", "running", "succeeded", "failed"] as const,
      "compilations",
    ),
  };
}

export class ControlPlaneClient {
  private readonly baseUrl: string;

  constructor(
    baseUrl: string,
    private readonly fetcher?: Fetcher,
  ) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
  }

  private async request<T>(path: string, init: RequestInit): Promise<T> {
    // The global fetch is resolved at request time so test environments can
    // install their transport after the client is constructed.
    const fetcher = this.fetcher ?? fetch;
    const response = await fetcher(`${this.baseUrl}${path}`, {
      ...init,
      headers: { "content-type": "application/json", ...init.headers },
    });
    if (!response.ok) {
      const body: unknown = await response.json().catch(() => null);
      throw new ControlPlaneError(
        response.status,
        controlPlaneRejectionCode(body),
      );
    }
    return response.json() as Promise<T>;
  }

  async bootstrapLocalDraft(
    graph: ApplicationGraphV1,
  ): Promise<WorkbenchDraft> {
    try {
      const existing = await this.request<LocalGraphRecord>(
        `/workspaces/local/application-graphs/${encodeURIComponent(graph.metadata.id)}`,
        { method: "GET" },
      );
      return recordAsDraft(existing);
    } catch (error) {
      if (!(error instanceof ControlPlaneError) || error.status !== 404)
        throw error;
    }

    const created = await this.request<LocalGraphRecord>(
      "/workspaces/local/application-graphs",
      { method: "POST", body: JSON.stringify({ graph }) },
    );
    return recordAsDraft(created);
  }

  async listCuratedTemplates(): Promise<readonly WorkbenchCuratedTemplate[]> {
    const response = await this.request<unknown>(
      "/workspaces/local/curated-templates",
      { method: "GET" },
    );
    if (!Array.isArray(response)) throw new Error(templateResponseError);
    return response.map(curatedTemplateResponse);
  }

  async instantiateCuratedTemplate(
    templateKey: string,
    input: { readonly requestId: string; readonly name?: string },
  ): Promise<WorkbenchTemplateDraftInstance> {
    const response = await this.request<unknown>(
      `/workspaces/local/curated-templates/${encodeURIComponent(templateKey)}/instances`,
      { method: "POST", body: JSON.stringify(input) },
    );
    return templateDraftResponse(response);
  }

  async openTemplateDraft(
    applicationKey: string,
  ): Promise<WorkbenchTemplateDraftInstance> {
    const response = await this.request<unknown>(
      `/workspaces/local/template-draft-instances/${encodeURIComponent(applicationKey)}`,
      { method: "GET" },
    );
    return templateDraftResponse(response);
  }

  async appendTemplateDraftRevision(
    applicationGraphId: string,
    input: {
      readonly baseDraftRevisionId: string;
      readonly name: string;
    },
  ): Promise<WorkbenchTemplateDraftInstance> {
    const response = await this.request<unknown>(
      `/template-draft-instances/${encodeURIComponent(applicationGraphId)}/revisions`,
      { method: "POST", body: JSON.stringify(input) },
    );
    return templateDraftResponse(response);
  }

  async appendTemplatePageRevision(
    applicationGraphId: string,
    input: {
      readonly baseDraftRevisionId: string;
      readonly surfaceKey: "customer-mobile" | "merchant-desktop";
      readonly pageId: string;
      readonly title: string;
    },
  ): Promise<WorkbenchTemplateDraftInstance> {
    const response = await this.request<unknown>(
      `/template-draft-instances/${encodeURIComponent(applicationGraphId)}/page-revisions`,
      { method: "POST", body: JSON.stringify(input) },
    );
    return templateDraftResponse(response);
  }

  async appendTemplatePageBlockOrderRevision(
    applicationGraphId: string,
    input: {
      readonly baseDraftRevisionId: string;
      readonly surfaceKey: "customer-mobile" | "merchant-desktop";
      readonly pageId: string;
      readonly regionKey: "main";
      readonly blockIds: readonly string[];
    },
  ): Promise<WorkbenchTemplateDraftInstance> {
    const response = await this.request<unknown>(
      `/template-draft-instances/${encodeURIComponent(applicationGraphId)}/page-block-order-revisions`,
      { method: "POST", body: JSON.stringify(input) },
    );
    return templateDraftResponse(response);
  }

  async appendTemplateDataFieldRevision(
    applicationGraphId: string,
    input: AppendTemplateDataFieldRevisionInput,
  ): Promise<WorkbenchTemplateDraftInstance> {
    const response = await this.request<unknown>(
      `/template-draft-instances/${encodeURIComponent(applicationGraphId)}/data-field-revisions`,
      { method: "POST", body: JSON.stringify(input) },
    );
    const instance = templateDraftResponse(response);
    deriveTemplateDataFieldValue(instance);
    return instance;
  }

  async appendTemplateExperienceThemeRevision(
    applicationGraphId: string,
    input: AppendTemplateExperienceThemeRevisionInput,
  ): Promise<WorkbenchTemplateDraftInstance> {
    const response = await this.request<unknown>(
      `/template-draft-instances/${encodeURIComponent(applicationGraphId)}/experience-theme-revisions`,
      { method: "POST", body: JSON.stringify(input) },
    );
    const instance = templateDraftResponse(response);
    deriveTemplateExperienceThemeMode(instance);
    return instance;
  }

  async listLocalApplicationSummaries(): Promise<
    readonly WorkbenchApplicationSummary[]
  > {
    const records = await this.request<readonly WorkbenchApplicationSummary[]>(
      "/workspaces/local/application-graphs",
      { method: "GET" },
    );
    return records.map(applicationSummary);
  }

  async getWorkspacePortfolioSummary(
    workspaceId: string,
  ): Promise<WorkbenchWorkspacePortfolioSummary> {
    const summary = await this.request<unknown>(
      `/workspaces/${encodeURIComponent(workspaceId)}/portfolio-summary`,
      { method: "GET" },
    );
    return workspacePortfolioSummary(summary);
  }

  async openLocalApplication(
    applicationKey: string,
  ): Promise<WorkbenchOpenedApplication> {
    const record = await this.request<LocalGraphRecord>(
      `/workspaces/local/application-graphs/${encodeURIComponent(applicationKey)}`,
      { method: "GET" },
    );
    return recordAsOpenedApplication(record);
  }

  async appendDraft(
    applicationGraphId: string,
    graph: ApplicationGraphV1,
  ): Promise<WorkbenchDraft> {
    const draft = await this.request<DraftRecord>(
      `/application-graphs/${encodeURIComponent(applicationGraphId)}/draft-revisions`,
      { method: "POST", body: JSON.stringify({ graph }) },
    );
    return {
      applicationGraphId,
      draftRevisionId: draft.id,
      revisionNumber: draft.revisionNumber,
      graph: draft.graph,
    };
  }

  async proposeDraft(
    applicationGraphId: string,
    brief: string,
  ): Promise<WorkbenchAiProposal> {
    const response = await this.request<AiProposalResponse>(
      `/application-graphs/${encodeURIComponent(applicationGraphId)}/ai-proposals`,
      { method: "POST", body: JSON.stringify({ brief }) },
    );
    return {
      draft: {
        applicationGraphId,
        draftRevisionId: response.draftRevision.id,
        revisionNumber: response.draftRevision.revisionNumber,
        graph: response.draftRevision.graph,
      },
      summary: response.proposal.impact.summary,
      affectedModels: response.proposal.impact.affectedModels,
      risks: response.proposal.impact.risks,
      testSuggestions: response.proposal.testSuggestions,
    };
  }

  publishDraft(
    applicationGraphId: string,
    draftRevisionId: string,
  ): Promise<WorkbenchPublishedRevision> {
    return this.request(
      `/application-graphs/${encodeURIComponent(applicationGraphId)}/published-revisions`,
      { method: "POST", body: JSON.stringify({ draftRevisionId }) },
    );
  }

  async listRevisionTimeline(
    applicationGraphId: string,
  ): Promise<WorkbenchRevisionTimeline> {
    const encodedId = encodeURIComponent(applicationGraphId);
    const [drafts, published] = await Promise.all([
      this.request<WorkbenchRevisionTimeline["drafts"]>(
        `/application-graphs/${encodedId}/draft-revisions`,
        { method: "GET" },
      ),
      this.request<WorkbenchRevisionTimeline["published"]>(
        `/application-graphs/${encodedId}/published-revisions`,
        { method: "GET" },
      ),
    ]);
    return { drafts, published };
  }

  exportPublishedGraph(
    applicationGraphId: string,
    publishedRevisionId: string,
  ): Promise<PublishedGraphExchangeV1> {
    return this.request(
      `/application-graphs/${encodeURIComponent(applicationGraphId)}/published-revisions/${encodeURIComponent(publishedRevisionId)}/export`,
      { method: "GET" },
    );
  }

  async importPublishedGraph(
    exchange: PublishedGraphExchangeV1,
  ): Promise<WorkbenchDraft> {
    const created = await this.request<LocalGraphRecord>(
      "/workspaces/local/application-graphs/import",
      { method: "POST", body: JSON.stringify({ exchange }) },
    );
    return recordAsDraft(created);
  }

  createCompilation(
    publishedRevisionId: string,
  ): Promise<WorkbenchCompilation> {
    return this.request<unknown>("/compilations", {
      method: "POST",
      body: JSON.stringify({
        publishedRevisionId,
        target: "application-bundle",
        compilerVersion: "factory-compiler/v1",
      }),
    }).then(compilationResponse);
  }

  getCompilation(compilationId: string): Promise<WorkbenchCompilation> {
    return this.request<unknown>(
      `/compilations/${encodeURIComponent(compilationId)}`,
      { method: "GET" },
    ).then(compilationResponse);
  }

  getCompilationArtifact(
    compilationId: string,
    selected: WorkbenchCompilationArtifact,
  ): Promise<WorkbenchArtifactContent> {
    return this.request<unknown>(
      `/compilations/${encodeURIComponent(compilationId)}/artifact-content?path=${encodeURIComponent(selected.path)}`,
      { method: "GET" },
    ).then((response) => admitCompilationArtifactContent(response, selected));
  }

  startPreviewRun(compilationId: string): Promise<WorkbenchPreviewRun> {
    return this.request<WorkbenchPreviewRun>(
      `/compilations/${encodeURIComponent(compilationId)}/preview-runs`,
      { method: "POST", body: JSON.stringify({}) },
    ).then(workbenchPreviewRun);
  }

  getCurrentPreviewRun(
    compilationId: string,
  ): Promise<WorkbenchPreviewRun | null> {
    return this.request<WorkbenchPreviewRun | null>(
      `/compilations/${encodeURIComponent(compilationId)}/preview-runs/current`,
      { method: "GET" },
    ).then((preview) => (preview ? workbenchPreviewRun(preview) : null));
  }

  stopPreviewRun(previewRunId: string): Promise<WorkbenchPreviewRun> {
    return this.request<WorkbenchPreviewRun>(
      `/preview-runs/${encodeURIComponent(previewRunId)}/stop`,
      { method: "POST", body: JSON.stringify({}) },
    ).then(workbenchPreviewRun);
  }

  /**
   * Profile key is optional: without one the worker derives the verification
   * plan from the Published Graph itself, so any composed product verifies.
   */
  createVerificationRun(
    compilationId: string,
    verificationRunId: string,
    profileKey?: string,
  ): Promise<WorkbenchVerificationRun> {
    return this.request<WorkbenchVerificationRun>(
      `/compilations/${encodeURIComponent(compilationId)}/verification-runs`,
      {
        method: "POST",
        body: JSON.stringify(
          profileKey === undefined
            ? { verificationRunId }
            : { verificationRunId, profileKey },
        ),
      },
    ).then(workbenchVerificationRun);
  }

  getVerificationRun(
    verificationRunId: string,
  ): Promise<WorkbenchVerificationRun> {
    return this.request<WorkbenchVerificationRun>(
      `/verification-runs/${encodeURIComponent(verificationRunId)}`,
      { method: "GET" },
    ).then(workbenchVerificationRun);
  }

  approveVerificationDraftDiff(
    verificationRunId: string,
    draftDiff: unknown,
  ): Promise<WorkbenchVerificationApproval> {
    return this.request<{
      readonly draftRevision: {
        readonly id: string;
        readonly applicationGraphId: string;
        readonly revisionNumber: number;
        readonly graph: ApplicationGraphV1;
      };
      readonly draftDiff: unknown;
    }>(`/verification-runs/${encodeURIComponent(verificationRunId)}/approve`, {
      method: "POST",
      body: JSON.stringify({ draftDiff }),
    }).then(workbenchVerificationApproval);
  }

  /**
   * Product closure journey over a blank Draft. Each step passes only the
   * schema-valid contracts: the requirement and its checksum-bound blueprint,
   * a review id, an alternative key, and finally the apply signal that turns
   * the blank Draft into the composed product Graph.
   */

  async createProductRequirement(
    input: {
      readonly requestId: string;
      readonly name?: string;
      readonly requirement: RequirementSpecV1;
      readonly blueprint: ProductBlueprintV1;
    },
    signal?: AbortSignal,
  ): Promise<WorkbenchProductReview> {
    const created = await this.request<{
      readonly review: WorkbenchProductReview;
    }>("/product/requirements", {
      method: "POST",
      body: JSON.stringify(input),
      signal,
    });
    return created.review;
  }

  async requestProductPlan(
    reviewId: string,
    signal?: AbortSignal,
  ): Promise<readonly WorkbenchProductPlanAlternative[]> {
    const result = await this.request<{
      readonly alternatives: readonly WorkbenchProductPlanAlternative[];
    }>(`/product/requirements/${encodeURIComponent(reviewId)}/plan`, {
      method: "POST",
      signal,
    });
    return result.alternatives;
  }

  async chooseProductPlan(
    reviewId: string,
    alternativeKey: string,
    signal?: AbortSignal,
  ): Promise<{ readonly reviewId: string; readonly checksum: string }> {
    const result = await this.request<{ readonly checksum: string }>(
      `/product/requirements/${encodeURIComponent(reviewId)}/choices`,
      { method: "POST", body: JSON.stringify({ alternativeKey }), signal },
    );
    return { reviewId, checksum: result.checksum };
  }

  async applyProduct(
    reviewId: string,
    signal?: AbortSignal,
  ): Promise<WorkbenchProductApplied> {
    const result = await this.request<{
      readonly draftRevision: DraftRecord;
      readonly review: {
        readonly applicationGraphId: string;
        readonly status: string;
      };
    }>(`/product/requirements/${encodeURIComponent(reviewId)}/apply`, {
      method: "POST",
      signal,
    });
    return {
      applicationGraphId: result.review.applicationGraphId,
      revisionNumber: result.draftRevision.revisionNumber,
      graph: result.draftRevision.graph,
      reviewStatus: result.review.status,
    };
  }
}

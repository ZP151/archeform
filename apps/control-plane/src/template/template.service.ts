import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import {
  composeDefaultCapabilityDraft,
  composeRestaurantProductGraph,
} from "@factory/capabilities";
import {
  assertRestaurantDraftPreviewGraphClosure,
  renderRestaurantDraftPreviewSurface,
} from "@factory/compiler";
import {
  assertApplicationGraphV3,
  assertDraftPreviewSnapshotV2,
  assertExperienceBrief,
  assertProductIntent,
  createDraftRevision,
  hashApplicationGraphV3,
  hashDraftPreviewSnapshotV2,
  transitionDraftPreviewSnapshotV2,
  type ApplicationGraphV3,
  type DraftPreviewSnapshotV2,
} from "@factory/graph";

import { PrismaService } from "../prisma.service.js";
import {
  applyCapturedTemplateDataFieldEdit,
  captureTemplateDataFieldRevisionInput,
  type AppendTemplateDataFieldRevisionInput,
} from "./template-data-field-edit.js";
import {
  applyCapturedTemplatePageBlockOrderEdit,
  captureTemplatePageBlockOrderRevisionInput,
  type AppendTemplatePageBlockOrderRevisionInput,
} from "./template-page-block-order.js";
import {
  applyCapturedTemplatePageTitleEdit,
  captureTemplatePageRevisionInput,
  type AppendTemplatePageRevisionInput,
} from "./template-page-edit.js";

const LOCAL_WORKSPACE_SLUG = "local-workspace";
const LOCAL_WORKSPACE_NAME = "Local workspace";
const TEMPLATE_KEY = "restaurant-dual-surface";
const TEMPLATE_VERSION = "1.0.0";
const TEMPLATE_NAME = "Maison Aurelia";
const INVALID_REQUEST = "Template Draft request is invalid.";
const SNAPSHOT_LIFETIME_MS = 30 * 60 * 1_000;
const TRANSACTION_ATTEMPTS = 3;

type PlainRecord = Record<string, unknown>;

export type CuratedTemplateV1 = {
  readonly apiVersion: "factory.curated-template/v1";
  readonly key: typeof TEMPLATE_KEY;
  readonly version: typeof TEMPLATE_VERSION;
  readonly name: typeof TEMPLATE_NAME;
  readonly description: string;
  readonly surfaces: readonly ["customer-mobile", "merchant-desktop"];
  readonly graphChecksum: `sha256:${string}`;
};

export type TemplateOriginV1 = {
  readonly templateKey: typeof TEMPLATE_KEY;
  readonly templateVersion: typeof TEMPLATE_VERSION;
  readonly templateGraphChecksum: `sha256:${string}`;
};

export type TemplateDraftInstanceV1 = {
  readonly apiVersion: "factory.template-draft-instance/v1";
  readonly template: CuratedTemplateV1;
  readonly origin: TemplateOriginV1;
  readonly draft: {
    readonly applicationGraphId: string;
    readonly applicationKey: string;
    readonly draftRevisionId: string;
    readonly revisionNumber: number;
    readonly graph: ApplicationGraphV3;
  };
  readonly snapshot: DraftPreviewSnapshotV2;
  readonly previews: readonly ReturnType<
    typeof renderRestaurantDraftPreviewSurface
  >[];
};

function exactPlainRecord(
  input: unknown,
  required: readonly string[],
  optional: readonly string[] = [],
): PlainRecord {
  try {
    if (
      input === null ||
      typeof input !== "object" ||
      Array.isArray(input) ||
      Object.getPrototypeOf(input) !== Object.prototype
    ) {
      throw new Error();
    }
    const allowed = new Set([...required, ...optional]);
    const output: PlainRecord = Object.create(null);
    const keys = Reflect.ownKeys(input);
    if (
      keys.length < required.length ||
      keys.some((key) => typeof key !== "string" || !allowed.has(key))
    ) {
      throw new Error();
    }
    for (const key of keys) {
      const descriptor = Object.getOwnPropertyDescriptor(input, key);
      if (
        typeof key !== "string" ||
        descriptor?.enumerable !== true ||
        !("value" in descriptor)
      ) {
        throw new Error();
      }
      output[key] = descriptor.value;
    }
    if (required.some((key) => !Object.hasOwn(output, key))) throw new Error();
    return output;
  } catch {
    throw new BadRequestException(INVALID_REQUEST);
  }
}

function applicationKey(value: unknown): string {
  if (typeof value !== "string" || !/^[a-z][a-z0-9-]{4,80}$/.test(value)) {
    throw new BadRequestException(INVALID_REQUEST);
  }
  return value;
}

function applicationName(value: unknown, fallback?: string): string {
  if (value === undefined && fallback !== undefined) return fallback;
  if (
    typeof value !== "string" ||
    value.trim().length < 2 ||
    value.trim().length > 80 ||
    /[\u0000-\u001f\u007f]/.test(value)
  ) {
    throw new BadRequestException(INVALID_REQUEST);
  }
  return value.trim();
}

function uniqueConstraint(error: unknown): boolean {
  return (
    !!error &&
    typeof error === "object" &&
    (error as { code?: unknown }).code === "P2002"
  );
}

function serializationConflict(error: unknown): boolean {
  return (
    !!error &&
    typeof error === "object" &&
    (error as { code?: unknown }).code === "P2034"
  );
}

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value as Record<string, unknown>)) {
      deepFreeze(child);
    }
    Object.freeze(value);
  }
  return value;
}

function restaurantTemplateIntent() {
  const requirementChecksum =
    "sha256:4cafea9d0a83bd84d27e4b29c6694af0456b7bc88758106276db18e23fbe7749";
  const intent = assertProductIntent({
    apiVersion: "factory.product-intent/v1",
    requirementChecksum,
    productType: "restaurant-ordering",
    title: "Maison Aurelia private dining",
    businessOutcome:
      "Guests place table orders while restaurant staff manage service safely.",
    actors: [
      {
        key: "customer",
        label: "Guest",
        goals: ["Discover dishes and place a table order."],
      },
      {
        key: "cashier",
        label: "Cashier",
        goals: ["Collect simulated payment and serve orders."],
      },
      {
        key: "kitchen",
        label: "Kitchen",
        goals: ["Prepare accepted orders in priority order."],
      },
      {
        key: "manager",
        label: "Manager",
        goals: ["Manage menu, tables, users, settings, and exceptions."],
      },
    ],
    coreJourneys: [
      "customer-place-order",
      "manager-cancel-submitted-order",
      "manager-cancel-paid-order",
      "manager-table-session",
      "manager-expire-open-table-session",
      "manager-expire-active-table-session",
      "manager-adjust-inventory",
    ].map((key) => ({
      key,
      actorKey: key.startsWith("customer") ? "customer" : "manager",
      outcome: `Complete ${key}.`,
      critical: true,
    })),
    constraints: {
      regulatedData: false,
      externalSideEffects: false,
      moneyMovement: "simulated",
    },
  });
  const experience = assertExperienceBrief({
    apiVersion: "factory.experience-brief/v1",
    requirementChecksum,
    surfaces: [
      {
        key: "customer-mobile",
        device: "mobile",
        audience: ["customer"],
        navigation: "bottom-tabs",
        density: "comfortable",
      },
      {
        key: "merchant-desktop",
        device: "desktop",
        audience: ["cashier", "kitchen", "manager"],
        navigation: "sidebar",
        density: "compact",
      },
    ],
    brand: {
      qualities: ["refined", "warm", "private"],
      contrast: "balanced",
      imagery: "image-led",
    },
    theme: { defaultMode: "light", supportsDark: true },
    responsiveTargets: ["mobile", "tablet", "desktop"],
  });
  return { intent, experience };
}

function sourceTemplateGraph(): ApplicationGraphV3 {
  const { intent, experience } = restaurantTemplateIntent();
  const base = composeDefaultCapabilityDraft({
    profile: "restaurant-ordering",
  });
  const graph = composeRestaurantProductGraph({
    intent,
    experience,
    baseDraft: createDraftRevision(base.graph, "restaurant-template-source"),
  });
  return assertApplicationGraphV3({
    ...structuredClone(graph),
    metadata: {
      ...graph.metadata,
      id: "restaurant-dual-surface-template",
      workspaceId: LOCAL_WORKSPACE_SLUG,
      name: TEMPLATE_NAME,
    },
  });
}

let sourceGraphCache: ApplicationGraphV3 | undefined;

function canonicalSourceGraph(): ApplicationGraphV3 {
  sourceGraphCache ??= deepFreeze(sourceTemplateGraph());
  return sourceGraphCache;
}

export function createCuratedRestaurantTemplateGraph(
  instanceKey: string,
  name: string,
): ApplicationGraphV3 {
  const source = canonicalSourceGraph();
  return assertApplicationGraphV3({
    ...structuredClone(source),
    metadata: {
      ...source.metadata,
      id: instanceKey,
      workspaceId: LOCAL_WORKSPACE_SLUG,
      name,
    },
  });
}

function templateDefinition(): CuratedTemplateV1 {
  return deepFreeze({
    apiVersion: "factory.curated-template/v1",
    key: TEMPLATE_KEY,
    version: TEMPLATE_VERSION,
    name: TEMPLATE_NAME,
    description:
      "A polished customer ordering app and merchant operations workspace.",
    surfaces: ["customer-mobile", "merchant-desktop"],
    graphChecksum: hashApplicationGraphV3(canonicalSourceGraph()),
  });
}

function originRecord(): TemplateOriginV1 {
  const template = templateDefinition();
  return {
    templateKey: template.key,
    templateVersion: template.version,
    templateGraphChecksum: template.graphChecksum,
  };
}

function assertStoredOrigin(input: unknown): TemplateOriginV1 {
  try {
    const record = exactPlainRecord(input, [
      "templateKey",
      "templateVersion",
      "templateGraphChecksum",
    ]);
    const expected = originRecord();
    if (
      record.templateKey !== expected.templateKey ||
      record.templateVersion !== expected.templateVersion ||
      record.templateGraphChecksum !== expected.templateGraphChecksum
    ) {
      throw new Error();
    }
    return expected;
  } catch {
    throw new ConflictException("Template Draft origin is invalid.");
  }
}

type StoredDraft = {
  readonly id: string;
  readonly applicationGraphId: string;
  readonly revisionNumber: number;
  readonly graph: unknown;
  readonly draftPreviewSnapshots?: readonly { readonly snapshot: unknown }[];
};

type StoredApplication = {
  readonly id: string;
  readonly key: string;
  readonly name: string;
  readonly templateOrigin: unknown;
  readonly workspace: { readonly slug: string };
  readonly draftRevisions: readonly StoredDraft[];
};

@Injectable()
export class TemplateService {
  constructor(private readonly prisma: PrismaService) {}

  listCuratedTemplates(): readonly CuratedTemplateV1[] {
    return [structuredClone(templateDefinition())].map(deepFreeze);
  }

  private renderPreviews(
    snapshot: DraftPreviewSnapshotV2,
    graph: ApplicationGraphV3,
  ): TemplateDraftInstanceV1["previews"] {
    const rendering = { ...snapshot, state: "rendering" as const };
    return (["customer-mobile", "merchant-desktop"] as const).map(
      (surfaceKey) =>
        renderRestaurantDraftPreviewSurface(
          rendering,
          surfaceKey,
          () => graph,
          snapshot.createdAt,
        ),
    );
  }

  private async createSnapshot(
    transaction: Prisma.TransactionClient,
    applicationGraphId: string,
    draft: StoredDraft,
    graph: ApplicationGraphV3,
  ): Promise<{
    snapshot: DraftPreviewSnapshotV2;
    previews: TemplateDraftInstanceV1["previews"];
  }> {
    const createdAt = new Date();
    const base: DraftPreviewSnapshotV2 = {
      apiVersion: "factory.draft-preview-snapshot/v2",
      id: `preview-${randomUUID()}`,
      workspaceId: LOCAL_WORKSPACE_SLUG,
      applicationGraphId,
      draftRevisionId: draft.id,
      graphVersion: "factory.application-graph/v3",
      graphChecksum: hashApplicationGraphV3(graph),
      snapshotChecksum:
        "sha256:0000000000000000000000000000000000000000000000000000000000000000",
      disposition: "preview-only",
      state: "ready",
      createdAt: createdAt.toISOString(),
      expiresAt: new Date(
        createdAt.getTime() + SNAPSHOT_LIFETIME_MS,
      ).toISOString(),
    };
    const ready = assertDraftPreviewSnapshotV2({
      ...base,
      snapshotChecksum: hashDraftPreviewSnapshotV2(base),
    });
    const rendering = transitionDraftPreviewSnapshotV2(ready, {
      kind: "start-rendering",
      occurredAt: ready.createdAt,
      currentDraftRevisionId: ready.draftRevisionId,
      currentGraphChecksum: ready.graphChecksum,
    }).snapshot;
    const previews = this.renderPreviews(rendering, graph);
    const active = transitionDraftPreviewSnapshotV2(rendering, {
      kind: "activate",
      occurredAt: ready.createdAt,
      currentDraftRevisionId: ready.draftRevisionId,
      currentGraphChecksum: ready.graphChecksum,
    }).snapshot;
    await transaction.draftPreviewSnapshot.create({
      data: {
        id: active.id,
        applicationGraphId,
        draftRevisionId: draft.id,
        snapshot: active as unknown as Prisma.InputJsonValue,
      },
    });
    return { snapshot: active, previews };
  }

  private async instanceFrom(
    transaction: Prisma.TransactionClient,
    application: StoredApplication,
    draft: StoredDraft,
  ): Promise<TemplateDraftInstanceV1> {
    const origin = assertStoredOrigin(application.templateOrigin);
    const graph = assertApplicationGraphV3(draft.graph);
    if (
      application.workspace.slug !== LOCAL_WORKSPACE_SLUG ||
      graph.metadata.id !== application.key ||
      graph.metadata.workspaceId !== LOCAL_WORKSPACE_SLUG ||
      graph.metadata.name !== application.name ||
      draft.applicationGraphId !== application.id
    ) {
      throw new ConflictException("Template Draft identity is invalid.");
    }
    const candidate = draft.draftPreviewSnapshots?.[0]?.snapshot;
    let snapshot: DraftPreviewSnapshotV2 | undefined;
    if (candidate !== undefined) {
      try {
        const parsed = assertDraftPreviewSnapshotV2(candidate);
        if (
          parsed.applicationGraphId === application.id &&
          parsed.draftRevisionId === draft.id &&
          parsed.graphChecksum === hashApplicationGraphV3(graph) &&
          parsed.state === "active" &&
          Date.parse(parsed.expiresAt) > Date.now()
        ) {
          snapshot = parsed;
        }
      } catch {
        snapshot = undefined;
      }
    }
    const preview = snapshot
      ? { snapshot, previews: this.renderPreviews(snapshot, graph) }
      : await this.createSnapshot(transaction, application.id, draft, graph);
    return deepFreeze({
      apiVersion: "factory.template-draft-instance/v1",
      template: structuredClone(templateDefinition()),
      origin,
      draft: {
        applicationGraphId: application.id,
        applicationKey: application.key,
        draftRevisionId: draft.id,
        revisionNumber: draft.revisionNumber,
        graph,
      },
      snapshot: preview.snapshot,
      previews: preview.previews,
    });
  }

  async instantiateCuratedTemplate(
    templateKey: string,
    input: unknown,
  ): Promise<TemplateDraftInstanceV1> {
    if (templateKey !== TEMPLATE_KEY) {
      throw new NotFoundException("Curated template is not available.");
    }
    const body = exactPlainRecord(input, ["requestId"], ["name"]);
    const requestId = applicationKey(body.requestId);
    const name = applicationName(body.name, TEMPLATE_NAME);
    const operation = async (transaction: Prisma.TransactionClient) => {
      const existing = (await transaction.applicationGraph.findFirst({
        where: {
          key: requestId,
          workspace: { slug: LOCAL_WORKSPACE_SLUG },
        },
        include: {
          workspace: true,
          draftRevisions: {
            orderBy: { revisionNumber: "desc" },
            take: 1,
            include: {
              draftPreviewSnapshots: {
                orderBy: { createdAt: "desc" },
                take: 1,
              },
            },
          },
        },
      })) as StoredApplication | null;
      if (existing) {
        assertStoredOrigin(existing.templateOrigin);
        const originalDraft =
          existing.draftRevisions.find((draft) => draft.revisionNumber === 1) ??
          ((await transaction.draftRevision.findFirst({
            where: {
              applicationGraphId: existing.id,
              revisionNumber: 1,
            },
          })) as StoredDraft | null);
        if (
          !originalDraft ||
          assertApplicationGraphV3(originalDraft.graph).metadata.name !== name
        ) {
          throw new ConflictException(
            "Template request identity is already bound to different input.",
          );
        }
        const draft = existing.draftRevisions[0];
        if (!draft) throw new ConflictException("Template Draft is invalid.");
        return this.instanceFrom(transaction, existing, draft);
      }
      const workspace = await transaction.workspace.upsert({
        where: { slug: LOCAL_WORKSPACE_SLUG },
        update: {},
        create: { slug: LOCAL_WORKSPACE_SLUG, name: LOCAL_WORKSPACE_NAME },
      });
      const graph = createCuratedRestaurantTemplateGraph(requestId, name);
      const created = (await transaction.applicationGraph.create({
        data: {
          workspaceId: workspace.id,
          key: requestId,
          name,
          templateOrigin: originRecord() as unknown as Prisma.InputJsonValue,
          draftRevisions: {
            create: {
              revisionNumber: 1,
              graph: graph as unknown as Prisma.InputJsonValue,
            },
          },
        },
        include: {
          workspace: true,
          draftRevisions: {
            orderBy: { revisionNumber: "desc" },
            take: 1,
          },
        },
      })) as StoredApplication;
      const draft = created.draftRevisions[0];
      if (!draft) throw new ConflictException("Template Draft is invalid.");
      return this.instanceFrom(transaction, created, draft);
    };
    for (let attempt = 0; attempt < TRANSACTION_ATTEMPTS; attempt += 1) {
      try {
        return await this.prisma.$transaction(operation, {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        });
      } catch (error) {
        if (!uniqueConstraint(error) && !serializationConflict(error)) {
          throw error;
        }
      }
    }
    throw new ConflictException(
      "Template Draft creation conflicted; retry the operation.",
    );
  }

  async openTemplateDraft(
    applicationKeyInput: string,
  ): Promise<TemplateDraftInstanceV1> {
    const key = applicationKey(applicationKeyInput);
    return this.prisma.$transaction(async (transaction) => {
      const application = (await transaction.applicationGraph.findFirst({
        where: {
          key,
          workspace: { slug: LOCAL_WORKSPACE_SLUG },
        },
        include: {
          workspace: true,
          draftRevisions: {
            orderBy: { revisionNumber: "desc" },
            take: 1,
            include: {
              draftPreviewSnapshots: {
                orderBy: { createdAt: "desc" },
                take: 1,
              },
            },
          },
        },
      })) as StoredApplication | null;
      if (!application) {
        throw new NotFoundException("Template Draft was not found.");
      }
      assertStoredOrigin(application.templateOrigin);
      const draft = application.draftRevisions[0];
      if (!draft) throw new ConflictException("Template Draft is invalid.");
      return this.instanceFrom(transaction, application, draft);
    });
  }

  async appendTemplateDraftRevision(
    applicationGraphId: string,
    input: unknown,
  ): Promise<TemplateDraftInstanceV1> {
    const id = applicationKey(applicationGraphId);
    const body = exactPlainRecord(input, ["baseDraftRevisionId", "name"]);
    const baseDraftRevisionId = applicationKey(body.baseDraftRevisionId);
    const name = applicationName(body.name);
    const operation = async (transaction: Prisma.TransactionClient) => {
      const application = (await transaction.applicationGraph.findUnique({
        where: { id },
        include: {
          workspace: true,
          draftRevisions: {
            orderBy: { revisionNumber: "desc" },
            take: 1,
          },
        },
      })) as StoredApplication | null;
      if (!application) {
        throw new NotFoundException("Template Draft was not found.");
      }
      assertStoredOrigin(application.templateOrigin);
      const latest = application.draftRevisions[0];
      if (!latest || latest.id !== baseDraftRevisionId) {
        throw new ConflictException(
          "Template Draft revision moved; reload before editing.",
        );
      }
      const current = assertApplicationGraphV3(latest.graph);
      const graph = assertApplicationGraphV3({
        ...structuredClone(current),
        metadata: { ...current.metadata, name },
      });
      const draft = (await transaction.draftRevision.create({
        data: {
          applicationGraphId: application.id,
          revisionNumber: latest.revisionNumber + 1,
          graph: graph as unknown as Prisma.InputJsonValue,
        },
      })) as StoredDraft;
      await transaction.applicationGraph.update({
        where: { id: application.id },
        data: { name },
      });
      const updated: StoredApplication = { ...application, name };
      return this.instanceFrom(transaction, updated, draft);
    };
    for (let attempt = 0; attempt < TRANSACTION_ATTEMPTS; attempt += 1) {
      try {
        return await this.prisma.$transaction(operation, {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        });
      } catch (error) {
        if (uniqueConstraint(error)) {
          throw new ConflictException(
            "Template Draft revision moved; reload before editing.",
          );
        }
        if (!serializationConflict(error)) throw error;
      }
    }
    throw new ConflictException(
      "Template Draft revision moved; reload before editing.",
    );
  }

  async appendTemplatePageRevision(
    applicationGraphId: string,
    input: unknown,
  ): Promise<TemplateDraftInstanceV1> {
    let command: AppendTemplatePageRevisionInput;
    try {
      command = captureTemplatePageRevisionInput(input);
    } catch {
      throw new BadRequestException(INVALID_REQUEST);
    }
    const id = applicationKey(applicationGraphId);
    const operation = async (transaction: Prisma.TransactionClient) => {
      const application = (await transaction.applicationGraph.findFirst({
        where: { id, workspace: { slug: LOCAL_WORKSPACE_SLUG } },
        include: {
          workspace: true,
          draftRevisions: {
            orderBy: { revisionNumber: "desc" },
            take: 1,
          },
        },
      })) as StoredApplication | null;
      if (!application || application.workspace.slug !== LOCAL_WORKSPACE_SLUG) {
        throw new NotFoundException("Template Draft was not found.");
      }
      assertStoredOrigin(application.templateOrigin);
      const latest = application.draftRevisions[0];
      if (!latest) throw new ConflictException("Template Draft is invalid.");
      if (latest.id !== command.baseDraftRevisionId) {
        throw new ConflictException(
          "Template Draft revision moved; reload before editing.",
        );
      }
      const current = assertApplicationGraphV3(latest.graph);
      let edit;
      try {
        edit = applyCapturedTemplatePageTitleEdit(current, command);
      } catch (error) {
        if (error instanceof Error && error.message === INVALID_REQUEST) {
          throw new BadRequestException(INVALID_REQUEST);
        }
        throw error;
      }
      const draft = (await transaction.draftRevision.create({
        data: {
          applicationGraphId: application.id,
          revisionNumber: latest.revisionNumber + 1,
          graph: edit.graph as unknown as Prisma.InputJsonValue,
        },
      })) as StoredDraft;
      return this.instanceFrom(transaction, application, draft);
    };
    for (let attempt = 0; attempt < TRANSACTION_ATTEMPTS; attempt += 1) {
      try {
        return await this.prisma.$transaction(operation, {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        });
      } catch (error) {
        if (uniqueConstraint(error)) {
          throw new ConflictException(
            "Template Draft revision moved; reload before editing.",
          );
        }
        if (!serializationConflict(error)) throw error;
      }
    }
    throw new ConflictException(
      "Template Draft revision moved; reload before editing.",
    );
  }

  async appendTemplatePageBlockOrderRevision(
    applicationGraphId: string,
    input: unknown,
  ): Promise<TemplateDraftInstanceV1> {
    let command: AppendTemplatePageBlockOrderRevisionInput;
    try {
      command = captureTemplatePageBlockOrderRevisionInput(input);
    } catch {
      throw new BadRequestException(INVALID_REQUEST);
    }
    const id = applicationKey(applicationGraphId);
    const operation = async (transaction: Prisma.TransactionClient) => {
      const application = (await transaction.applicationGraph.findFirst({
        where: { id, workspace: { slug: LOCAL_WORKSPACE_SLUG } },
        include: {
          workspace: true,
          draftRevisions: {
            orderBy: { revisionNumber: "desc" },
            take: 1,
          },
        },
      })) as StoredApplication | null;
      if (!application || application.workspace.slug !== LOCAL_WORKSPACE_SLUG) {
        throw new NotFoundException("Template Draft was not found.");
      }
      assertStoredOrigin(application.templateOrigin);
      const latest = application.draftRevisions[0];
      if (!latest) throw new ConflictException("Template Draft is invalid.");
      if (latest.id !== command.baseDraftRevisionId) {
        throw new ConflictException(
          "Template Draft revision moved; reload before editing.",
        );
      }
      const current = assertApplicationGraphV3(latest.graph);
      if (
        current.metadata.id !== application.key ||
        current.metadata.workspaceId !== LOCAL_WORKSPACE_SLUG ||
        current.metadata.name !== application.name
      ) {
        throw new ConflictException("Template Draft identity is invalid.");
      }
      let edit;
      try {
        edit = applyCapturedTemplatePageBlockOrderEdit(current, command);
      } catch (error) {
        if (
          error instanceof Error &&
          error.message ===
            "Template Draft revision moved; reload before editing."
        ) {
          throw new ConflictException(error.message);
        }
        if (error instanceof Error && error.message === INVALID_REQUEST) {
          throw new BadRequestException(INVALID_REQUEST);
        }
        throw error;
      }
      const closedGraph = assertRestaurantDraftPreviewGraphClosure(edit.graph);
      const draft = (await transaction.draftRevision.create({
        data: {
          applicationGraphId: application.id,
          revisionNumber: latest.revisionNumber + 1,
          graph: closedGraph as unknown as Prisma.InputJsonValue,
        },
      })) as StoredDraft;
      return this.instanceFrom(transaction, application, draft);
    };
    for (let attempt = 0; attempt < TRANSACTION_ATTEMPTS; attempt += 1) {
      try {
        return await this.prisma.$transaction(operation, {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        });
      } catch (error) {
        if (uniqueConstraint(error)) {
          throw new ConflictException(
            "Template Draft revision moved; reload before editing.",
          );
        }
        if (!serializationConflict(error)) throw error;
      }
    }
    throw new ConflictException(
      "Template Draft revision moved; reload before editing.",
    );
  }

  async appendTemplateDataFieldRevision(
    applicationGraphId: string,
    input: unknown,
  ): Promise<TemplateDraftInstanceV1> {
    let command: AppendTemplateDataFieldRevisionInput;
    try {
      command = captureTemplateDataFieldRevisionInput(input);
    } catch {
      throw new BadRequestException(INVALID_REQUEST);
    }
    const id = applicationKey(applicationGraphId);
    const operation = async (transaction: Prisma.TransactionClient) => {
      const application = (await transaction.applicationGraph.findFirst({
        where: { id, workspace: { slug: LOCAL_WORKSPACE_SLUG } },
        include: {
          workspace: true,
          draftRevisions: {
            orderBy: { revisionNumber: "desc" },
            take: 1,
            include: {
              draftPreviewSnapshots: {
                orderBy: { createdAt: "desc" },
                take: 1,
              },
            },
          },
        },
      })) as StoredApplication | null;
      if (!application || application.workspace.slug !== LOCAL_WORKSPACE_SLUG) {
        throw new NotFoundException("Template Draft was not found.");
      }
      assertStoredOrigin(application.templateOrigin);
      const latest = application.draftRevisions[0];
      if (!latest) throw new BadRequestException(INVALID_REQUEST);
      if (latest.id !== command.baseDraftRevisionId) {
        throw new ConflictException(
          "Template Draft revision moved; reload before editing.",
        );
      }

      let graph: ApplicationGraphV3;
      try {
        const current = assertApplicationGraphV3(latest.graph);
        if (
          application.workspace.slug !== LOCAL_WORKSPACE_SLUG ||
          current.metadata.id !== application.key ||
          current.metadata.workspaceId !== LOCAL_WORKSPACE_SLUG ||
          current.metadata.name !== application.name ||
          latest.applicationGraphId !== application.id
        ) {
          throw new Error(INVALID_REQUEST);
        }
        const currentSnapshot = assertDraftPreviewSnapshotV2(
          latest.draftPreviewSnapshots?.[0]?.snapshot,
        );
        if (
          currentSnapshot.workspaceId !== LOCAL_WORKSPACE_SLUG ||
          currentSnapshot.applicationGraphId !== application.id ||
          currentSnapshot.draftRevisionId !== latest.id ||
          currentSnapshot.graphChecksum !== hashApplicationGraphV3(current) ||
          currentSnapshot.state !== "active"
        ) {
          throw new Error(INVALID_REQUEST);
        }
        graph = assertRestaurantDraftPreviewGraphClosure(
          applyCapturedTemplateDataFieldEdit(current, command).graph,
        );
      } catch (error) {
        if (
          error instanceof Error &&
          error.message ===
            "Template Draft revision moved; reload before editing."
        ) {
          throw new ConflictException(error.message);
        }
        throw new BadRequestException(INVALID_REQUEST);
      }

      const draft = (await transaction.draftRevision.create({
        data: {
          applicationGraphId: application.id,
          revisionNumber: latest.revisionNumber + 1,
          graph: graph as unknown as Prisma.InputJsonValue,
        },
      })) as StoredDraft;
      try {
        return await this.instanceFrom(transaction, application, draft);
      } catch (error) {
        if (uniqueConstraint(error) || serializationConflict(error))
          throw error;
        throw new BadRequestException(INVALID_REQUEST);
      }
    };
    for (let attempt = 0; attempt < TRANSACTION_ATTEMPTS; attempt += 1) {
      try {
        return await this.prisma.$transaction(operation, {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        });
      } catch (error) {
        if (uniqueConstraint(error)) {
          throw new ConflictException(
            "Template Draft revision moved; reload before editing.",
          );
        }
        if (!serializationConflict(error)) throw error;
      }
    }
    throw new ConflictException(
      "Template Draft revision moved; reload before editing.",
    );
  }
}

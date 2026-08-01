import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { isDeepStrictEqual } from "node:util";

import {
  createCapabilityCompositionLock,
  hasRestaurantOrderingComposition,
  resolveCapabilityAssetLock,
  type CapabilityBindingValueV1,
  type CapabilityCompositionLockV1,
  type CapabilityExecutableContributionV1,
  type CapabilitySelectionV1,
} from "@factory/capabilities";
import {
  loadCapabilityAssetContributions,
  loadCapabilityAssetTemplates,
  type ResolvedCapabilityAssetContribution,
  type ResolvedCapabilityAssetTemplate,
} from "@factory/capabilities/node";
import {
  assertValidApplicationGraph,
  hashApplicationGraph,
  type ApplicationGraphV1,
} from "@factory/graph";
import { createGeneratedPageRuntimeProjection } from "./page-runtime-projection.js";
import {
  renderRestaurantCustomerCommandRuntime,
  renderRestaurantPageRuntime,
} from "./restaurant-page-runtime.js";
import {
  renderRestaurantEventPublisher,
  renderRestaurantMerchantPageRuntime,
} from "./restaurant-merchant-runtime.js";
import { renderRestaurantRuntime } from "./restaurant-runtime.js";

export {
  createGeneratedPageRuntimeProjection,
  generatedPageRuntimeApiVersion,
  generatedPageRuntimeBlockTypes,
  type GeneratedPageRuntimeBlockTypeV1,
  type GeneratedPageRuntimeBlockV1,
  type GeneratedPageRuntimeCommerceV1,
  type GeneratedPageRuntimeNavigationV1,
  type GeneratedPageRuntimePageV1,
  type GeneratedPageRuntimeProjectionV1,
  type GeneratedPageRuntimeRouteFallbackV1,
  type GeneratedPageRuntimeSafePropV1,
} from "./page-runtime-projection.js";
export {
  projectRestaurantReceiptModifiers,
  renderRestaurantCustomerCommandRuntime,
  renderRestaurantPageRuntime,
  restaurantCustomerPageRuntimeApiVersion,
  type RestaurantReceiptModifierProjection,
} from "./restaurant-page-runtime.js";
export {
  renderRestaurantEventPublisher,
  renderRestaurantMerchantPageRuntime,
} from "./restaurant-merchant-runtime.js";
export {
  renderRestaurantRuntime,
  restaurantRuntimeApiVersion,
  restaurantRuntimeEndpoints,
  type RestaurantRuntimeArtifacts,
} from "./restaurant-runtime.js";

export type CompilationTargetKey =
  | "simulator"
  | "next-web"
  | "nest-api"
  | "prisma-postgres"
  | "casbin-policy"
  | "xstate-flow"
  | "test-suite"
  | "documentation";

export interface CompilationTarget {
  readonly key: CompilationTargetKey;
  readonly label: string;
  readonly description: string;
}
export const compilationTargets: readonly CompilationTarget[] = Object.freeze([
  {
    key: "simulator",
    label: "Role simulator",
    description: "Browser-only seed scenario simulator.",
  },
  {
    key: "next-web",
    label: "Next.js web",
    description: "Standalone customer and operator web application.",
  },
  {
    key: "nest-api",
    label: "NestJS API",
    description: "Standalone REST API and flow handlers.",
  },
  {
    key: "prisma-postgres",
    label: "Prisma PostgreSQL",
    description: "Schema, migrations, and seed data.",
  },
  {
    key: "casbin-policy",
    label: "Casbin policy",
    description: "Compiled authorization policy and guards.",
  },
  {
    key: "xstate-flow",
    label: "XState flows",
    description: "Compiled declared state machines.",
  },
  {
    key: "test-suite",
    label: "Journey tests",
    description: "Role, API, flow, and smoke tests.",
  },
  {
    key: "documentation",
    label: "Documentation",
    description: "API reference, ERD, and permission matrix.",
  },
]);

export interface PublishedGraphInput {
  readonly publishedRevisionId: string;
  readonly graph: ApplicationGraphV1;
  readonly compositionLock: CapabilityCompositionLockV1;
}

export interface CompilationArtifactPlan {
  readonly target: CompilationTargetKey;
  readonly path: string;
  readonly mediaType: string;
}

export interface CompilationPlan {
  readonly publishedRevisionId: string;
  readonly graphHash: string;
  readonly artifacts: readonly CompilationArtifactPlan[];
}

export interface GeneratedFile {
  readonly path: string;
  readonly content: string;
}

export interface GeneratedApplicationBundle {
  readonly rootDirectory: string;
  readonly graphHash: string;
  readonly files: readonly GeneratedFile[];
}

interface PlannedGeneratedFile {
  readonly path: string;
  readonly render: () => string;
}

function assertUniqueGeneratedFilePaths(
  files: readonly Pick<GeneratedFile, "path">[],
): void {
  const paths = new Set<string>();
  for (const file of files) {
    if (paths.has(file.path)) {
      throw new Error(`Generated output collision at '${file.path}'.`);
    }
    paths.add(file.path);
  }
}

export interface GenerateApplicationBundleOptions {
  readonly repositoryRoot?: string;
}

export interface ResolvedTargetContribution {
  readonly packageKey: string;
  readonly packageVersion: string;
  readonly contributionId: string;
  readonly namespace: string;
  readonly source: string;
  readonly path: string;
  readonly outputSlot: CapabilityExecutableContributionV1["outputSlot"];
  readonly digest: string;
  readonly targetRuntimeInterfaceVersion: string;
  readonly content: string;
}

const artifactBlueprint: Readonly<
  Record<
    CompilationTargetKey,
    readonly Omit<CompilationArtifactPlan, "target">[]
  >
> = {
  simulator: [{ path: "simulator/", mediaType: "text/html" }],
  "next-web": [
    { path: "web/", mediaType: "application/vnd.factory.source-tree" },
  ],
  "nest-api": [
    { path: "api/", mediaType: "application/vnd.factory.source-tree" },
    { path: "api/src/application-runtime.ts", mediaType: "text/typescript" },
    { path: "api/src/policy.ts", mediaType: "text/typescript" },
  ],
  "prisma-postgres": [
    { path: "database/prisma/schema.prisma", mediaType: "text/plain" },
    {
      path: "database/prisma/migrations/",
      mediaType: "application/vnd.factory.source-tree",
    },
    { path: "database/prisma/seed.ts", mediaType: "text/typescript" },
  ],
  "casbin-policy": [
    { path: "api/policy/model.conf", mediaType: "text/plain" },
    { path: "api/policy/policy.csv", mediaType: "text/csv" },
  ],
  "xstate-flow": [
    {
      path: "api/src/flows/",
      mediaType: "application/vnd.factory.source-tree",
    },
  ],
  "test-suite": [
    { path: "api/test/", mediaType: "application/vnd.factory.source-tree" },
  ],
  documentation: [
    { path: "docs/api-reference.md", mediaType: "text/markdown" },
    { path: "docs/entity-relationship.md", mediaType: "text/markdown" },
    { path: "docs/permission-matrix.md", mediaType: "text/markdown" },
    { path: "capability-lock.json", mediaType: "application/json" },
    {
      path: "capability-template-lock.json",
      mediaType: "application/json",
    },
    { path: "composition-lock.json", mediaType: "application/json" },
  ],
};

function hasEqualJsonStructure(left: unknown, right: unknown): boolean {
  return isDeepStrictEqual(
    JSON.parse(JSON.stringify(left)),
    JSON.parse(JSON.stringify(right)),
  );
}

function assertCanonicalCompositionLock(
  input: PublishedGraphInput,
): CapabilityCompositionLockV1 {
  if (!input.compositionLock) {
    throw new Error("Published revision has no composition lock.");
  }
  const graphHash = hashApplicationGraph(
    assertValidApplicationGraph(input.graph),
  );
  try {
    const canonical = createCapabilityCompositionLock({
      graphChecksum: graphHash,
      selections: input.compositionLock.packages,
    });
    if (!hasEqualJsonStructure(input.compositionLock, canonical)) {
      throw new Error("mismatch");
    }
    return canonical;
  } catch {
    throw new Error(
      "Published revision composition lock does not match the Published Graph.",
    );
  }
}

/**
 * Produces a deterministic, non-executable output map. Target writers consume
 * this plan later; only a Published Revision can form its input.
 */
export function buildCompilationPlan(
  input: PublishedGraphInput,
): CompilationPlan {
  if (!input.publishedRevisionId) {
    throw new Error("Published revision id is required for compilation.");
  }

  if (
    input.graph.integration.capabilities.some(({ key }) =>
      key.startsWith("candidate."),
    )
  ) {
    throw new Error("Candidate capabilities cannot be compiled.");
  }

  assertCanonicalCompositionLock(input);
  const graph = assertValidApplicationGraph(input.graph);
  const artifacts = compilationTargets.flatMap((target) =>
    artifactBlueprint[target.key].map((artifact) => ({
      target: target.key,
      ...artifact,
    })),
  );

  return {
    publishedRevisionId: input.publishedRevisionId,
    graphHash: hashApplicationGraph(graph),
    artifacts,
  };
}

type LoadedTargetContribution = {
  readonly selection: CapabilitySelectionV1;
  readonly declared: CapabilityExecutableContributionV1;
  readonly loaded: ResolvedCapabilityAssetContribution;
};

interface PlannedTargetContribution extends Omit<
  ResolvedTargetContribution,
  "content"
> {
  readonly loadedContribution: LoadedTargetContribution;
}

function renderedBindingValue(value: CapabilityBindingValueV1): string {
  if (typeof value === "object") {
    return value.graphSymbol.slice(value.graphSymbol.lastIndexOf(".") + 1);
  }
  return String(value);
}

function renderDeclaredContribution(
  value: string,
  contribution: LoadedTargetContribution,
): string {
  const declaredParameters = new Set(contribution.declared.parameterRefs);
  const rendered = value.replace(
    /{{([a-z][a-zA-Z0-9]*)}}/g,
    (_, key: string) => {
      if (!declaredParameters.has(key)) {
        throw new Error(
          `Capability target contribution '${contribution.declared.id}' uses undeclared binding '${key}'.`,
        );
      }
      const binding = contribution.selection.bindings[key];
      if (binding === undefined) {
        throw new Error(
          `Capability target contribution '${contribution.declared.id}' has no binding for '${key}'.`,
        );
      }
      return renderedBindingValue(binding);
    },
  );
  if (/{{[^{}]+}}/.test(rendered)) {
    throw new Error(
      `Capability target contribution '${contribution.declared.id}' contains an unsupported binding token.`,
    );
  }
  return rendered;
}

function assertSafeGeneratedTarget(path: string): void {
  const segments = path.split("/");
  if (
    path === "docker-compose.yml" ||
    path.includes("\\") ||
    path.startsWith("/") ||
    segments.some(
      (segment) =>
        !segment ||
        segment === "." ||
        segment === ".." ||
        /[:\u0000-\u001f\u007f]/.test(segment),
    )
  ) {
    throw new Error(
      `Capability target '${path}' is outside its safe namespace.`,
    );
  }
}

function orderTargetContributions(
  contributions: readonly LoadedTargetContribution[],
  packageOrder: readonly string[],
): readonly LoadedTargetContribution[] {
  const packageRanks = new Map(packageOrder.map((key, index) => [key, index]));
  const identities = new Map(
    contributions.map((contribution) => [
      `${contribution.selection.lock.key}:${contribution.declared.id}`,
      contribution,
    ]),
  );
  const dependencies = new Map<
    LoadedTargetContribution,
    Set<LoadedTargetContribution>
  >();
  for (const contribution of contributions) {
    const required = new Set<LoadedTargetContribution>();
    for (const requirement of contribution.declared.orderingRequirements) {
      const dependency = identities.get(
        `${contribution.selection.lock.key}:${requirement}`,
      );
      if (!dependency) {
        throw new Error(
          `Capability target contribution '${contribution.declared.id}' has unknown ordering requirement '${requirement}'.`,
        );
      }
      required.add(dependency);
    }
    dependencies.set(contribution, required);
  }
  const compare = (
    left: LoadedTargetContribution,
    right: LoadedTargetContribution,
  ) =>
    (packageRanks.get(left.selection.lock.key) ?? Number.MAX_SAFE_INTEGER) -
      (packageRanks.get(right.selection.lock.key) ?? Number.MAX_SAFE_INTEGER) ||
    left.loaded.target.localeCompare(right.loaded.target) ||
    left.declared.id.localeCompare(right.declared.id);
  const ready = contributions
    .filter((contribution) => dependencies.get(contribution)?.size === 0)
    .sort(compare);
  const resolved: LoadedTargetContribution[] = [];
  while (ready.length > 0) {
    const next = ready.shift();
    if (!next) break;
    resolved.push(next);
    for (const contribution of contributions) {
      const remaining = dependencies.get(contribution);
      if (!remaining?.delete(next) || remaining.size !== 0) continue;
      if (!resolved.includes(contribution) && !ready.includes(contribution)) {
        ready.push(contribution);
        ready.sort(compare);
      }
    }
  }
  if (resolved.length !== contributions.length) {
    throw new Error(
      "Capability target contributions contain an ordering cycle.",
    );
  }
  return resolved;
}

function resolveTargetContributionPlans(
  input: PublishedGraphInput,
  options: GenerateApplicationBundleOptions = {},
): readonly PlannedTargetContribution[] {
  const lock = assertCanonicalCompositionLock(input);
  if (lock.packages.length === 0) return [];
  const root = findFactoryRepositoryRoot(
    options.repositoryRoot ?? process.cwd(),
  );
  const loaded = lock.packages.flatMap((selection) => {
    const asset = resolveCapabilityAssetLock(selection.lock);
    const physical = loadCapabilityAssetContributions(asset, root);
    const declared = asset.manifest.executableContributions ?? [];
    if (physical.length !== declared.length) {
      throw new Error(
        `Capability package '${asset.manifest.key}' contribution set does not match its manifest.`,
      );
    }
    return physical.map((contribution) => {
      const metadata = declared.find(
        (candidate) =>
          candidate.source === contribution.source &&
          candidate.target === contribution.target &&
          candidate.digest === contribution.digest,
      );
      if (!metadata) {
        throw new Error(
          `Capability package '${asset.manifest.key}' contribution does not match its manifest.`,
        );
      }
      const runtimeIdentity = `${metadata.outputSlot}@${metadata.targetRuntimeInterfaceVersion}`;
      if (
        !lock.resolvedContributionDigests.includes(metadata.digest) ||
        !lock.targetRuntimeInterfaceVersions.includes(runtimeIdentity) ||
        contribution.targetRuntimeInterfaceVersion !==
          metadata.targetRuntimeInterfaceVersion
      ) {
        throw new Error(
          `Capability target contribution '${metadata.id}' does not match the composition lock.`,
        );
      }
      return { selection, declared: metadata, loaded: contribution };
    });
  });
  const targets = new Map<string, string>();
  return orderTargetContributions(loaded, lock.resolvedDependencyOrder).map(
    (contribution) => {
      const path = renderDeclaredContribution(
        contribution.loaded.target,
        contribution,
      );
      assertSafeGeneratedTarget(path);
      const previous = targets.get(path);
      if (previous) {
        throw new Error(
          `Capability target collision at '${path}' between '${previous}' and '${contribution.selection.lock.key}'.`,
        );
      }
      targets.set(path, contribution.selection.lock.key);
      return {
        packageKey: contribution.selection.lock.key,
        packageVersion: contribution.selection.lock.version,
        contributionId: contribution.declared.id,
        namespace: contribution.loaded.namespace,
        source: contribution.loaded.source,
        path,
        outputSlot: contribution.loaded.outputSlot,
        digest: contribution.loaded.digest,
        targetRuntimeInterfaceVersion:
          contribution.loaded.targetRuntimeInterfaceVersion,
        loadedContribution: contribution,
      };
    },
  );
}

function renderTargetContribution(
  plan: PlannedTargetContribution,
): ResolvedTargetContribution {
  const { loadedContribution, ...target } = plan;
  return {
    ...target,
    content: renderDeclaredContribution(
      loadedContribution.loaded.content,
      loadedContribution,
    ),
  };
}

interface OrderOperationsPersistenceContribution {
  readonly schema: string;
  readonly migration: string;
}

interface MoneyPricingPersistenceContribution {
  readonly schema: string;
  readonly migration: string;
}

interface NotificationOutboxRuntimeContribution {
  readonly applicationId: string;
  readonly recipientRole: string;
  readonly template: string | null;
}

const notificationOutboxPrismaSchema = `model NotificationOutbox {
  id String @id @default(cuid())
  dedupeKey String @unique
  actor String
  recipientRole String
  template String?
  entity String
  recordId String
  status String @default("pending")
  attempts Int @default(0)
  availableAt DateTime
  deliveredAt DateTime?
  lastError String?
  @@index([status, availableAt])
}`;

const notificationOutboxMigration = `CREATE TABLE "NotificationOutbox" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "dedupeKey" TEXT NOT NULL UNIQUE,
  "actor" TEXT NOT NULL,
  "recipientRole" TEXT NOT NULL,
  "template" TEXT,
  "entity" TEXT NOT NULL,
  "recordId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "availableAt" TIMESTAMP(3) NOT NULL,
  "deliveredAt" TIMESTAMP(3),
  "lastError" TEXT
);
CREATE INDEX "NotificationOutbox_status_availableAt_idx" ON "NotificationOutbox" ("status", "availableAt");`;

function renderNotificationOutboxWorker(): string {
  return `import type { NotificationOutboxEntry, RecordStore } from "./application-runtime.js";

export interface NotificationTransport {
  deliver(entry: NotificationOutboxEntry): Promise<void>;
}

export class FixtureNotificationTransport implements NotificationTransport {
  private remainingFailures: number;
  private readonly deliveredEntries: NotificationOutboxEntry[] = [];
  deliveryAttempts = 0;

  constructor(failuresBeforeSuccess = 0) {
    this.remainingFailures = failuresBeforeSuccess;
  }

  get delivered(): readonly NotificationOutboxEntry[] {
    return this.deliveredEntries.map((entry) => ({ ...entry }));
  }

  async deliver(entry: NotificationOutboxEntry): Promise<void> {
    this.deliveryAttempts += 1;
    if (this.remainingFailures > 0) {
      this.remainingFailures -= 1;
      throw new Error("fixture-delivery-failed");
    }
    this.deliveredEntries.push({ ...entry });
  }
}

export class NotificationOutboxWorker {
  constructor(
    private readonly store: RecordStore,
    private readonly transport: NotificationTransport,
  ) {}

  async drain(
    now: string,
    limit = 10,
  ): Promise<readonly NotificationOutboxEntry[]> {
    const claimed = await this.store.claimDueNotifications(now, limit);
    const processed: NotificationOutboxEntry[] = [];
    for (const entry of claimed) {
      try {
        await this.transport.deliver(entry);
      } catch {
        const attempts = entry.attempts + 1;
        const status = attempts >= 3 ? "failed" : "pending";
        const availableAt =
          status === "failed"
            ? now
            : new Date(new Date(now).getTime() + attempts * 60_000).toISOString();
        processed.push(
          await this.store.recordNotificationFailure(
            entry.id,
            "fixture-delivery-failed",
            status,
            availableAt,
          ),
        );
        continue;
      }
      await this.store.markNotificationDelivered(entry.id, now);
      processed.push({
        ...entry,
        status: "delivered",
        deliveredAt: now,
        lastError: null,
      });
    }
    return processed;
  }
}
`;
}

function renderNotificationOutboxDrain(): string {
  return `import { PrismaClient } from "@prisma/client";
import { PrismaRecordStore } from "./prisma-record-store.js";
import { FixtureNotificationTransport, NotificationOutboxWorker } from "./notification-outbox-worker.js";

async function main(): Promise<void> {
  const prisma = new PrismaClient();
  try {
    const transport = new FixtureNotificationTransport();
    const worker = new NotificationOutboxWorker(
      new PrismaRecordStore(prisma),
      transport,
    );
    const processed = await worker.drain(new Date().toISOString());
    const summary = processed.reduce(
      (counts, entry) => ({
        ...counts,
        [entry.status]: counts[entry.status] + 1,
      }),
      { delivered: 0, pending: 0, failed: 0 },
    );
    console.log(JSON.stringify({ processed: processed.length, ...summary }));
  } finally {
    await prisma.$disconnect();
  }
}

void main().catch(() => {
  console.error(JSON.stringify({ status: "failed" }));
  process.exitCode = 1;
});
`;
}

function renderNotificationOutboxDrainDocumentation(): string {
  return `# Local notification outbox drain

Run \`docker compose exec api pnpm notification:drain\` from the generated
application root to process due notification outbox entries once. The command uses the generated Prisma store and the local
fixture transport only; it accepts no recipient, message, provider, URL, or
credential input. It prints a count-only summary and exits.
`;
}

function resolveNotificationOutboxRuntimeContribution(
  input: PublishedGraphInput,
): NotificationOutboxRuntimeContribution | undefined {
  const selection = input.compositionLock.packages.find(
    ({ lock }) => lock.key === "core.notification",
  );
  if (!selection) return undefined;

  const asset = resolveCapabilityAssetLock(selection.lock);
  const providesOutbox = asset.manifest.provides?.some(
    (provided) =>
      provided.interfaceKey === "notification.outbox" &&
      provided.version === "v1",
  );
  if (
    !["1.1.0", "1.1.1"].includes(asset.manifest.version) ||
    asset.manifest.verification.status !== "verified" ||
    !providesOutbox
  ) {
    return undefined;
  }
  const recipientBinding = selection.bindings.recipientRole;
  if (
    !recipientBinding ||
    typeof recipientBinding !== "object" ||
    !("graphSymbol" in recipientBinding) ||
    typeof recipientBinding.graphSymbol !== "string"
  ) {
    throw new Error(
      "Locked notification outbox requires a recipientRole Graph binding.",
    );
  }
  const recipientRole = /^graph\.policy\.([a-z][a-z0-9-]*)$/.exec(
    recipientBinding.graphSymbol,
  )?.[1];
  if (!recipientRole) {
    throw new Error(
      "Locked notification outbox recipientRole must target a declared policy role.",
    );
  }
  const templateBinding = selection.bindings.template;
  if (
    asset.manifest.version === "1.1.1" &&
    templateBinding !== undefined &&
    typeof templateBinding !== "string"
  ) {
    throw new Error(
      "Locked notification outbox template must be a declared enum identifier.",
    );
  }
  let template: string | null = null;
  if (asset.manifest.version === "1.1.1") {
    if (templateBinding === undefined) {
      template = null;
    } else if (typeof templateBinding === "string") {
      template = templateBinding;
    }
  }
  return Object.freeze({
    applicationId: input.graph.metadata.id,
    recipientRole,
    template,
  });
}

function resolveOrderOperationsPersistenceContribution(
  input: PublishedGraphInput,
  contributions: readonly ResolvedTargetContribution[],
): OrderOperationsPersistenceContribution | undefined {
  const selection = input.compositionLock.packages.find(
    ({ lock }) => lock.key === "commerce.order-operations",
  );
  if (!selection) return undefined;

  const asset = resolveCapabilityAssetLock(selection.lock);
  const declaresReceipt = asset.manifest.provides?.some(
    (provided) =>
      provided.interfaceKey === "commerce.order-operation-receipt" &&
      provided.version === "v1",
  );
  if (!declaresReceipt) return undefined;

  const owned = contributions.filter(
    (contribution) => contribution.packageKey === asset.manifest.key,
  );
  const schema = owned.find(
    (contribution) =>
      contribution.contributionId === "order-operation-receipt-schema" &&
      contribution.outputSlot === "database.schema",
  );
  const migration = owned.find(
    (contribution) =>
      contribution.contributionId === "order-operation-receipt-migration" &&
      contribution.outputSlot === "database.migration",
  );
  if (!schema || !migration) {
    throw new Error(
      "Locked commerce.order-operations receipt provider is missing a schema or migration contribution.",
    );
  }
  return Object.freeze({
    schema: schema.content,
    migration: migration.content,
  });
}

function resolveMoneyPricingPersistenceContribution(
  input: PublishedGraphInput,
  contributions: readonly ResolvedTargetContribution[],
): MoneyPricingPersistenceContribution | undefined {
  const selection = input.compositionLock.packages.find(
    ({ lock }) => lock.key === "commerce.money-pricing",
  );
  if (!selection) return undefined;

  const asset = resolveCapabilityAssetLock(selection.lock);
  const declaresSnapshot = asset.manifest.provides?.some(
    (provided) =>
      provided.interfaceKey === "commerce.price-snapshot" &&
      provided.version === "v1",
  );
  if (!declaresSnapshot) return undefined;

  const owned = contributions.filter(
    (contribution) => contribution.packageKey === asset.manifest.key,
  );
  const schema = owned.find(
    (contribution) =>
      contribution.contributionId === "money-pricing-schema" &&
      contribution.outputSlot === "database.schema",
  );
  const migration = owned.find(
    (contribution) =>
      contribution.contributionId === "money-pricing-migration" &&
      contribution.outputSlot === "database.migration",
  );
  if (!schema || !migration) {
    throw new Error(
      "Locked commerce.money-pricing provider is missing a schema or migration contribution.",
    );
  }
  return Object.freeze({
    schema: schema.content,
    migration: migration.content,
  });
}

export function resolveTargetContributions(
  input: PublishedGraphInput,
  options: GenerateApplicationBundleOptions = {},
): readonly ResolvedTargetContribution[] {
  return resolveTargetContributionPlans(input, options).map(
    renderTargetContribution,
  );
}

interface IdentityPolicyRuntimeContribution {
  readonly fixtureSessions: readonly {
    readonly principalId: string;
    readonly sessionId: string;
    readonly tenantId: string;
    readonly roles: readonly string[];
    readonly expiresAt: string;
  }[];
}

function resolveIdentityPolicyRuntimeContribution(
  input: PublishedGraphInput,
  contributions: readonly ResolvedTargetContribution[],
): IdentityPolicyRuntimeContribution | undefined {
  const selection = input.compositionLock.packages.find(
    ({ lock }) => lock.key === "core.identity-policy",
  );
  if (!selection) return undefined;

  const asset = resolveCapabilityAssetLock(selection.lock);
  const providesAuthorization = asset.manifest.provides?.some(
    (provided) =>
      provided.interfaceKey === "authorization.decision" &&
      provided.version === "v1",
  );
  if (!providesAuthorization) {
    throw new Error(
      "Locked identity policy package does not provide authorization.decision@v1.",
    );
  }
  for (const binding of [
    "principalEntity",
    "sessionEntity",
    "defaultRole",
    "authenticatedRole",
  ]) {
    if (!selection.bindings[binding]) {
      throw new Error(
        `Locked identity policy package is missing '${binding}' binding.`,
      );
    }
  }

  const owned = contributions.filter(
    (contribution) => contribution.packageKey === asset.manifest.key,
  );
  const service = owned.find(
    (contribution) =>
      contribution.contributionId === "local-fixture-service" &&
      contribution.outputSlot === "api.service",
  );
  const policy = owned.find(
    (contribution) =>
      contribution.contributionId === "deny-by-default-policy" &&
      contribution.outputSlot === "policy.rule",
  );
  const fixture = owned.find(
    (contribution) =>
      contribution.contributionId === "local-fixture-sessions" &&
      contribution.outputSlot === "test.fixture",
  );
  if (!service || !policy || !fixture) {
    throw new Error(
      "Locked identity policy package is missing a required local contribution.",
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(fixture.content);
  } catch {
    throw new Error("Locked identity policy fixture is not valid JSON.");
  }
  if (
    !parsed ||
    typeof parsed !== "object" ||
    (parsed as { mode?: unknown }).mode !== "local-fixture" ||
    !Array.isArray((parsed as { sessions?: unknown }).sessions)
  ) {
    throw new Error("Locked identity policy fixture has an invalid shape.");
  }
  const template = (parsed as { sessions: readonly unknown[] }).sessions.find(
    (session): session is { tenantId: string; expiresAt: string } =>
      !!session &&
      typeof session === "object" &&
      typeof (session as { tenantId?: unknown }).tenantId === "string" &&
      typeof (session as { expiresAt?: unknown }).expiresAt === "string" &&
      Number.isFinite(Date.parse((session as { expiresAt: string }).expiresAt)),
  );
  if (!template) {
    throw new Error("Locked identity policy fixture has no valid session.");
  }

  return Object.freeze({
    fixtureSessions: Object.freeze(
      input.graph.policy.roles.map((role) =>
        Object.freeze({
          principalId: `fixture-principal-${role}`,
          sessionId: `fixture-session-${role}`,
          tenantId: template.tenantId,
          roles: Object.freeze([role]),
          expiresAt: template.expiresAt,
        }),
      ),
    ),
  });
}

interface ResolvedCapabilityTemplateContribution extends ResolvedCapabilityAssetTemplate {
  readonly effects: readonly string[];
  readonly operations: readonly { capability: string; operation: string }[];
  readonly bindings: CapabilitySelectionV1["bindings"];
}

function findFactoryRepositoryRoot(startDirectory: string): string {
  let candidate = resolve(startDirectory);
  while (true) {
    const workspace = resolve(candidate, "pnpm-workspace.yaml");
    const capabilityAssets = resolve(
      candidate,
      "packages",
      "capabilities",
      "assets",
    );
    if (existsSync(workspace) && existsSync(capabilityAssets)) {
      return candidate;
    }
    const parent = dirname(candidate);
    if (parent === candidate) {
      throw new Error(
        "Factory repository root with Golden capability packages could not be resolved.",
      );
    }
    candidate = parent;
  }
}

function templateString(value: string): string {
  return JSON.stringify(value).slice(1, -1);
}

function renderCapabilityBindingValue(value: CapabilityBindingValueV1): string {
  if (typeof value === "string") {
    return templateString(value);
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  const graphSymbol = value.graphSymbol;
  const target = graphSymbol.split(".").at(-1);
  if (!target) {
    throw new Error("Capability template binding must target a Graph symbol.");
  }
  if ("fieldKey" in value) return templateString(value.fieldKey);
  return templateString(target);
}

function renderCapabilityTemplate(
  template: ResolvedCapabilityTemplateContribution,
  graph: ApplicationGraphV1,
): string {
  const values: Readonly<Record<string, string>> = {
    "asset.key": templateString(template.assetKey),
    "asset.version": templateString(template.assetVersion),
    "asset.effectsJson": JSON.stringify(template.effects),
    "graph.metadata.id": templateString(graph.metadata.id),
    ...Object.fromEntries(
      Object.entries(template.bindings).map(([key, value]) => [
        key,
        renderCapabilityBindingValue(value),
      ]),
    ),
  };
  return template.content.replace(
    /{{([A-Za-z.]+)}}/g,
    (marker, key: string) => {
      const value = values[key];
      if (value === undefined) {
        throw new Error(
          "Capability template '" +
            template.assetKey +
            "' declares unsupported token '" +
            marker +
            "'.",
        );
      }
      return value;
    },
  );
}

function resolveCapabilityTemplateContributions(
  graph: ApplicationGraphV1,
  compositionLock: CapabilityCompositionLockV1,
  repositoryRoot?: string,
): readonly ResolvedCapabilityTemplateContribution[] {
  const locks = compositionLock.packages.map(({ lock }) => lock);
  const factoryCapabilities = graph.integration.capabilities.filter(
    (capability) => capability.providerId === "factory",
  );
  const capabilityKeys = factoryCapabilities.map(
    (capability) => capability.key,
  );
  if (!locks.length) {
    if (capabilityKeys.length) {
      throw new Error(
        "Factory Graph capabilities require matching Golden asset locks before compilation.",
      );
    }
    return [];
  }
  const root = findFactoryRepositoryRoot(repositoryRoot ?? process.cwd());
  const targets = new Set<string>();
  const contributions = compositionLock.packages.flatMap(
    ({ lock, bindings }) => {
      const asset = resolveCapabilityAssetLock(lock);
      return loadCapabilityAssetTemplates(asset, root).map((template) => ({
        ...template,
        bindings,
        effects: asset.manifest.effects,
        operations: factoryCapabilities
          .filter((capability) =>
            asset.manifest.effects.includes(capability.key),
          )
          .map((capability) => ({
            capability: capability.key,
            operation: capability.operation,
          })),
      }));
    },
  );
  for (const contribution of contributions) {
    if (targets.has(contribution.target)) {
      throw new Error(
        "Golden capability packages declare duplicate target '" +
          contribution.target +
          "'.",
      );
    }
    if (contribution.target === "api/src/capabilities/registry.ts") {
      throw new Error(
        "Golden capability packages cannot replace the generated capability registry.",
      );
    }
    targets.add(contribution.target);
  }
  return contributions.sort((left, right) =>
    left.target.localeCompare(right.target),
  );
}

function renderCapabilityRegistry(
  contributions: readonly ResolvedCapabilityTemplateContribution[],
): string {
  const imports = contributions.map((contribution, index) => {
    const relativeModule = contribution.target
      .replace("api/src/capabilities/", "./")
      .replace(/\.ts$/, ".js");
    return (
      "import { capabilityModule as capabilityModule" +
      index +
      ' } from "' +
      relativeModule +
      '";'
    );
  });
  const modules = contributions.map((_, index) => "capabilityModule" + index);
  const operations = Array.from(
    new Set(
      contributions.flatMap((contribution) =>
        contribution.operations.map(
          (operation) => operation.capability + "\u0000" + operation.operation,
        ),
      ),
    ),
  ).sort();
  return [
    'import type { CapabilityRuntimeModule, CartHandler, CatalogHandler, EffectHandler, LineConfigurationHandler, MoneyPricingHandler, OrderHandler, OrderOperationsHandler, RecordHandler, WorkflowHandler } from "./contract.js";',
    "",
    ...imports,
    ...(imports.length ? [""] : []),
    "export const capabilityModules: readonly CapabilityRuntimeModule[] = [" +
      modules.join(", ") +
      "];",
    "export const providedEffects = new Set<string>(",
    "  capabilityModules.flatMap((module) => module.effects),",
    ");",
    "",
    "const declaredEffectOperations = new Set<string>(" +
      JSON.stringify(operations) +
      ");",
    "",
    "function effectOperationKey(capability: string, operation: string): string {",
    "  return `${capability}\\u0000${operation}`;",
    "}",
    "",
    "function singleHandler<T>(handlers: readonly T[], label: string): T {",
    "  if (handlers.length === 0) throw new Error(`No ${label} handler.`);",
    "  if (handlers.length > 1) throw new Error(`Multiple ${label} handlers are registered.`);",
    "  return handlers[0]!;",
    "}",
    "",
    "function assertUniqueEffectHandlers(): void {",
    "  const registered = new Set<string>();",
    "  for (const module of capabilityModules) {",
    "    if (!module.effectHandler) continue;",
    "    for (const effect of module.effects) {",
    "      if (registered.has(effect)) throw new Error(`Multiple handlers for '${effect}'.`);",
    "      registered.add(effect);",
    "    }",
    "  }",
    "}",
    "",
    "assertUniqueEffectHandlers();",
    "",
    "export function getEffectHandler(capability: string, operation: string): EffectHandler {",
    "  if (!declaredEffectOperations.has(effectOperationKey(capability, operation))) {",
    "    throw new Error(`No handler for '${capability}.${operation}'.`);",
    "  }",
    "  const module = capabilityModules.find((candidate) =>",
    "    candidate.effects.includes(capability) && candidate.effectHandler,",
    "  );",
    "  if (!module?.effectHandler) throw new Error(`No handler for '${capability}'.`);",
    "  return module.effectHandler;",
    "}",
    "",
    "export function getRecordHandler(): RecordHandler {",
    "  return singleHandler(",
    "    capabilityModules.flatMap((module) => module.recordHandler ? [module.recordHandler] : []),",
    '    "record",',
    "  );",
    "}",
    "",
    "export function getWorkflowHandler(): WorkflowHandler {",
    "  return singleHandler(",
    "    capabilityModules.flatMap((module) => module.workflowHandler ? [module.workflowHandler] : []),",
    '    "workflow",',
    "  );",
    "}",
    "",
    "export function getCartHandler(): CartHandler {",
    "  return singleHandler(",
    "    capabilityModules.flatMap((module) => module.cartHandler ? [module.cartHandler] : []),",
    '    "cart",',
    "  );",
    "}",
    "",
    "export function getCatalogHandler(): CatalogHandler {",
    "  return singleHandler(",
    "    capabilityModules.flatMap((module) => module.catalogHandler ? [module.catalogHandler] : []),",
    '    "catalog",',
    "  );",
    "}",
    "",
    "export function getLineConfigurationHandler(): LineConfigurationHandler {",
    "  return singleHandler(",
    "    capabilityModules.flatMap((module) => module.lineConfigurationHandler ? [module.lineConfigurationHandler] : []),",
    '    "line configuration",',
    "  );",
    "}",
    "",
    "export function getMoneyPricingHandler(): MoneyPricingHandler {",
    "  return singleHandler(",
    "    capabilityModules.flatMap((module) => module.moneyPricingHandler ? [module.moneyPricingHandler] : []),",
    '    "money pricing",',
    "  );",
    "}",
    "",
    "export function getOrderHandler(): OrderHandler {",
    "  return singleHandler(",
    "    capabilityModules.flatMap((module) => module.orderHandler ? [module.orderHandler] : []),",
    '    "order",',
    "  );",
    "}",
    "",
    "export function getOrderOperationsHandler(): OrderOperationsHandler {",
    "  return singleHandler(",
    "    capabilityModules.flatMap((module) => module.orderOperationsHandler ? [module.orderOperationsHandler] : []),",
    '    "order operations",',
    "  );",
    "}",
    "",
  ].join("\n");
}

function renderCapabilityContract(graph: ApplicationGraphV1): string {
  const commerce = hasCommerceCapabilities(graph);
  return [
    "export type CapabilityStoredRecord = Record<string, unknown> & { id: string; status?: string; version?: number };",
    "export type CapabilityCommerceLineItem = { id: string; actor: string; orderEntity: string; orderRecordId: string; catalogEntity: string; catalogRecordId: string; quantity: number };",
    "export type CapabilityConfiguredLine = { catalogEntity: string; catalogRecordId: string; quantity: number; priceDelta: number; options: readonly { id: string; label: string; priceDelta: number }[] };",
    "",
    "export interface CapabilityStore {",
    "  list(entityKey: string): Promise<readonly CapabilityStoredRecord[]>;",
    "  find(entityKey: string, recordId: string): Promise<CapabilityStoredRecord | undefined>;",
    "  create(entityKey: string, input: Record<string, unknown>): Promise<CapabilityStoredRecord>;",
    "  update(entityKey: string, recordId: string, input: Record<string, unknown>): Promise<CapabilityStoredRecord>;",
    "  appendAudit(event: { actor: string; action: string; entity: string; recordId: string; at: string }): Promise<void>;",
    "  appendCapabilityEvent(event: { actor: string; capability: string; operation: string; entity: string; recordId: string; outcome: 'completed'; at: string }): Promise<void>;",
    ...(commerce
      ? [
          "  listCartItems(orderEntity: string, orderRecordId: string): Promise<readonly CapabilityCommerceLineItem[]>;",
          "  addCartItem(input: Omit<CapabilityCommerceLineItem, 'id'>): Promise<CapabilityCommerceLineItem>;",
          "  adjustInventory(entityKey: string, recordId: string, fieldKey: string, delta: number): Promise<CapabilityStoredRecord>;",
          "  decrementInventory(entityKey: string, recordId: string, quantity: number): Promise<CapabilityStoredRecord>;",
        ]
      : []),
    "}",
    "",
    "export interface RecordHandler {",
    "  create(input: { store: CapabilityStore; entityKey: string; input: Record<string, unknown> }): Promise<CapabilityStoredRecord>;",
    "  list(input: { store: CapabilityStore; entityKey: string }): Promise<readonly CapabilityStoredRecord[]>;",
    "}",
    "",
    "export interface WorkflowHandler {",
    "  applyTransition(input: { store: CapabilityStore; entityKey: string; recordId: string; nextState: string }): Promise<CapabilityStoredRecord>;",
    "}",
    "",
    "export interface CartHandler {",
    "  add(input: { role: string; orderEntity: string; orderRecordId: string; catalogEntity: string; catalogRecordId: string; quantity: number; store: CapabilityStore; assertAllowed(role: string, entityKey: string, action: string): Promise<void> }): Promise<CapabilityCommerceLineItem>;",
    "  list(input: { role: string; orderEntity: string; orderRecordId: string; store: CapabilityStore; assertAllowed(role: string, entityKey: string, action: string): Promise<void> }): Promise<readonly CapabilityCommerceLineItem[]>;",
    "}",
    "",
    "export interface CatalogHandler {",
    "  list(input: { role: string; entityKey: string; store: CapabilityStore; assertAllowed(role: string, entityKey: string, action: string): Promise<void> }): Promise<readonly CapabilityStoredRecord[]>;",
    "  read(input: { role: string; entityKey: string; recordId: string; store: CapabilityStore; assertAllowed(role: string, entityKey: string, action: string): Promise<void> }): Promise<CapabilityStoredRecord>;",
    "}",
    "",
    "export interface LineConfigurationHandler {",
    "  select(input: { role: string; catalogEntity: string; catalogRecordId: string; optionIds: readonly string[]; quantity: number; store: CapabilityStore; assertAllowed(role: string, entityKey: string, action: string): Promise<void> }): Promise<CapabilityConfiguredLine>;",
    "}",
    "",
    "export interface OrderHandler {",
    "  create(input: { role: string; entityKey: string; input: Record<string, unknown>; store: CapabilityStore; assertAllowed(role: string, entityKey: string, action: string): Promise<void> }): Promise<CapabilityStoredRecord>;",
    "  transition(input: { role: string; entityKey: string; recordId: string; nextState: string; expectedVersion: number; idempotencyKey: string; store: CapabilityStore; assertAllowed(role: string, entityKey: string, action: string): Promise<void> }): Promise<CapabilityStoredRecord>;",
    "}",
    "",
    "export type CommerceOrderOperationCommandName = 'hold' | 'release-hold' | 'amend' | 'cancel' | 'record-partial-payment' | 'capture-payment' | 'refund';",
    "export type CommerceOrderOperationStatus = 'cart' | 'submitted' | 'held' | 'payment-pending' | 'paid' | 'fulfilled' | 'cancelled';",
    "export interface CommerceOrderPaymentState { readonly due: string; readonly captured: string; readonly refunded: string; }",
    "export interface CommerceOrderOperationState { readonly orderId: string; readonly version: number; readonly status: CommerceOrderOperationStatus; readonly payment: CommerceOrderPaymentState; readonly processedIdempotencyKeys: readonly string[]; }",
    "export interface CommerceOrderOperationCommand { readonly command: CommerceOrderOperationCommandName; readonly orderId: string; readonly expectedVersion: number; readonly idempotencyKey: string; readonly actorRole: string; readonly reason?: string; readonly amount?: string; }",
    "export interface CommerceOrderOperationPlan { readonly nextState: CommerceOrderOperationStatus; readonly incrementVersion: true; readonly paymentDelta: 'none' | 'capture-partial' | 'capture-final' | 'refund-partial' | 'refund-full'; readonly inventoryEffect: 'reserve' | 'release' | 'none'; readonly auditAction: string; }",
    "export interface OrderOperationsHandler { plan(inputState: CommerceOrderOperationState, inputCommand: CommerceOrderOperationCommand): CommerceOrderOperationPlan; }",
    "",
    "export interface MoneyPricingQuoteLine { readonly catalogRecordId: string; readonly quantity: number; readonly unitMinor: string; readonly totalMinor: string; }",
    "export interface MoneyPricingQuote { readonly currency: string; readonly subtotalMinor: string; readonly discountMinor: string; readonly taxMinor: string; readonly totalMinor: string; readonly lines: readonly MoneyPricingQuoteLine[]; }",
    "export interface MoneyPricingHandler { quote(input: { role: string; catalogEntity: string; lines: readonly { catalogRecordId: string; quantity: number }[]; store: CapabilityStore; assertAllowed(role: string, entityKey: string, action: string): Promise<void> }): Promise<MoneyPricingQuote>; }",
    "",
    "export type EffectHandler = (input: { role: string; entityKey: string; recordId: string; operation: string; store: CapabilityStore; now: string }) => Promise<void>;",
    "",
    "export interface CapabilityRuntimeModule {",
    "  readonly key: string;",
    "  readonly version: string;",
    "  readonly applicationId: string;",
    "  readonly effects: readonly string[];",
    "  readonly recordHandler?: RecordHandler;",
    "  readonly workflowHandler?: WorkflowHandler;",
    "  readonly cartHandler?: CartHandler;",
    "  readonly catalogHandler?: CatalogHandler;",
    "  readonly lineConfigurationHandler?: LineConfigurationHandler;",
    "  readonly moneyPricingHandler?: MoneyPricingHandler;",
    "  readonly orderHandler?: OrderHandler;",
    "  readonly orderOperationsHandler?: OrderOperationsHandler;",
    "  readonly effectHandler?: EffectHandler;",
    "}",
    "",
  ].join("\n");
}

function toPascalCase(value: string): string {
  return value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((segment) => segment[0]!.toUpperCase() + segment.slice(1))
    .join("");
}

function toCamelCase(value: string): string {
  const pascal = toPascalCase(value);
  return pascal ? `${pascal[0]!.toLowerCase()}${pascal.slice(1)}` : pascal;
}

function pluralize(value: string): string {
  return value.endsWith("s") ? `${value}es` : `${value}s`;
}

function hasCommerceCapabilities(graph: ApplicationGraphV1): boolean {
  return graph.integration.capabilities.some((capability) =>
    ["catalog.", "cart.", "inventory.", "order.", "payment."].some((prefix) =>
      capability.key.startsWith(prefix),
    ),
  );
}

function prismaType(
  type: ApplicationGraphV1["domain"]["entities"][number]["fields"][number]["type"],
): string {
  switch (type) {
    case "integer":
      return "Int";
    case "decimal":
      return "Decimal";
    case "boolean":
      return "Boolean";
    case "date":
      return "DateTime @db.Date";
    case "datetime":
      return "DateTime";
    case "json":
      return "Json";
    default:
      return "String";
  }
}

type GraphRelation = ApplicationGraphV1["domain"]["relations"][number];

interface ResolvedRelationForeignKey {
  readonly ownerKey: string;
  readonly targetKey: string;
  readonly scalarField: string;
  readonly targetField: string;
  readonly required: boolean;
  readonly oneToOne: boolean;
}

function resolveRelationForeignKey(
  graph: ApplicationGraphV1,
  relation: GraphRelation,
): ResolvedRelationForeignKey {
  if (relation.kind === "many-to-many") {
    throw new Error(
      "Many-to-many relations do not have an owning scalar field.",
    );
  }
  if (relation.field && relation.kind === "one-to-many") {
    throw new Error(
      `Relation '${relation.from}' to '${relation.to}' cannot declare owning field '${relation.field}' for one-to-many cardinality.`,
    );
  }

  const sourceIsOne =
    relation.kind === "one-to-many" || relation.kind === "one-to-one";
  const ownerKey = relation.field
    ? relation.from
    : sourceIsOne
      ? relation.to
      : relation.from;
  const targetKey = relation.field
    ? relation.to
    : sourceIsOne
      ? relation.from
      : relation.to;
  const owner = graph.domain.entities.find((entity) => entity.key === ownerKey);
  const target = graph.domain.entities.find(
    (entity) => entity.key === targetKey,
  );
  if (!owner || !target) {
    throw new Error(
      `Relation '${relation.from}' to '${relation.to}' references an unknown entity.`,
    );
  }

  const scalarField = relation.field ?? `${toCamelCase(targetKey)}Id`;
  const declaredScalar = owner.fields.find(
    (field) => field.key === scalarField,
  );
  if (relation.field && !declaredScalar) {
    throw new Error(
      `Relation '${relation.from}' to '${relation.to}' field '${relation.field}' is not declared on '${relation.from}'.`,
    );
  }
  if (
    relation.kind === "one-to-one" &&
    declaredScalar &&
    !declaredScalar.unique
  ) {
    throw new Error(
      `One-to-one relation '${relation.from}' to '${relation.to}' requires unique owning field '${scalarField}'.`,
    );
  }

  let targetField = "id";
  if (relation.field) {
    const naturalKeyCandidates = target.fields.filter(
      (field) =>
        field.unique === true &&
        relation.field!.toLowerCase().endsWith(field.key.toLowerCase()),
    );
    if (naturalKeyCandidates.length === 1) {
      targetField = naturalKeyCandidates[0]!.key;
    } else if (
      naturalKeyCandidates.length > 1 ||
      !/(?:id|key)$/i.test(relation.field)
    ) {
      throw new Error(
        `Relation '${relation.from}' to '${relation.to}' field '${relation.field}' cannot resolve a unique target field.`,
      );
    }
  }

  if (targetField !== "id") {
    const referencedField = target.fields.find(
      (field) => field.key === targetField,
    )!;
    if (declaredScalar?.type !== referencedField.type) {
      throw new Error(
        `Relation '${relation.from}' to '${relation.to}' field '${scalarField}' must match target field '${targetField}' type.`,
      );
    }
  } else if (declaredScalar && declaredScalar.type !== "string") {
    throw new Error(
      `Relation '${relation.from}' to '${relation.to}' field '${scalarField}' must be a string to reference target id.`,
    );
  }

  return {
    ownerKey,
    targetKey,
    scalarField,
    targetField,
    required: declaredScalar?.required ?? false,
    oneToOne: relation.kind === "one-to-one",
  };
}

function renderPrismaSchema(
  graph: ApplicationGraphV1,
  orderOperationReceiptSchema?: string,
  includeGenericCommerceLineItems = true,
  additionalSchemaFragments: readonly string[] = [],
): string {
  const relationFields = (entityKey: string): readonly string[] =>
    graph.domain.relations.flatMap((relation) => {
      const relationName = `${toPascalCase(relation.from)}To${toPascalCase(relation.to)}`;
      const fromModel = toPascalCase(relation.from);
      const toModel = toPascalCase(relation.to);
      const fromField = toCamelCase(relation.from);
      const toField = toCamelCase(relation.to);

      if (relation.kind === "many-to-many") {
        if (entityKey === relation.from) {
          return [
            `  ${pluralize(toField)} ${toModel}[] @relation("${relationName}")`,
          ];
        }
        if (entityKey === relation.to) {
          return [
            `  ${pluralize(fromField)} ${fromModel}[] @relation("${relationName}")`,
          ];
        }
        return [];
      }

      const foreignKey = resolveRelationForeignKey(graph, relation);
      const ownerModel = toPascalCase(foreignKey.ownerKey);
      const targetModel = toPascalCase(foreignKey.targetKey);
      const ownerField = toCamelCase(foreignKey.ownerKey);
      const targetField = toCamelCase(foreignKey.targetKey);

      if (entityKey === foreignKey.targetKey) {
        return [
          `  ${foreignKey.oneToOne ? ownerField : pluralize(ownerField)} ${ownerModel}${foreignKey.oneToOne ? "?" : "[]"} @relation("${relationName}")`,
        ];
      }
      if (entityKey === foreignKey.ownerKey) {
        const declaredScalar = graph.domain.entities
          .find((entity) => entity.key === foreignKey.ownerKey)
          ?.fields.find((field) => field.key === foreignKey.scalarField);
        const optional = foreignKey.required ? "" : "?";
        return [
          ...(declaredScalar
            ? []
            : [
                `  ${foreignKey.scalarField} String?${foreignKey.oneToOne ? " @unique" : ""}`,
              ]),
          `  ${targetField} ${targetModel}${optional} @relation("${relationName}", fields: [${foreignKey.scalarField}], references: [${foreignKey.targetField}])`,
        ];
      }
      return [];
    });
  const models = graph.domain.entities.map((entity) => {
    const fields = entity.fields.map((field) => {
      const optional = field.required ? "" : "?";
      const unique = field.unique ? " @unique" : "";
      return `  ${field.key} ${prismaType(field.type)}${optional}${unique}`;
    });
    const indexes = entity.indexes.map(
      (index) => `  @@index([${index.fields.join(", ")}])`,
    );
    return [
      `model ${toPascalCase(entity.key)} {`,
      "  id String @id @default(cuid())",
      ...fields,
      ...relationFields(entity.key),
      "  createdAt DateTime @default(now())",
      "  updatedAt DateTime @updatedAt",
      ...indexes,
      "}",
    ].join("\n");
  });
  return [
    "generator client {",
    '  provider = "prisma-client-js"',
    "}",
    "",
    "datasource db {",
    '  provider = "postgresql"',
    '  url = env("DATABASE_URL")',
    "}",
    "",
    ...models,
    "",
    "model AuditEvent {",
    "  id String @id @default(cuid())",
    "  actor String",
    "  action String",
    "  entity String",
    "  recordId String",
    "  at DateTime @default(now())",
    "  @@index([entity, recordId])",
    "}",
    "",
    "model CapabilityEvent {",
    "  id String @id @default(cuid())",
    "  actor String",
    "  capability String",
    "  operation String",
    "  entity String",
    "  recordId String",
    "  outcome String",
    "  at DateTime @default(now())",
    "  @@index([entity, recordId])",
    "  @@index([capability, operation])",
    "}",
    ...(includeGenericCommerceLineItems && hasCommerceCapabilities(graph)
      ? [
          "",
          "model CommerceLineItem {",
          "  id String @id @default(cuid())",
          "  actor String",
          "  orderEntity String",
          "  orderRecordId String",
          "  catalogEntity String",
          "  catalogRecordId String",
          "  quantity Int",
          "  createdAt DateTime @default(now())",
          "  @@index([orderEntity, orderRecordId])",
          "  @@index([catalogEntity, catalogRecordId])",
          "}",
        ]
      : []),
    ...(orderOperationReceiptSchema
      ? ["", orderOperationReceiptSchema.trimEnd()]
      : []),
    ...additionalSchemaFragments.flatMap((fragment) => [
      "",
      fragment.trimEnd(),
    ]),
    "",
  ].join("\n");
}

function postgresType(
  type: ApplicationGraphV1["domain"]["entities"][number]["fields"][number]["type"],
): string {
  switch (type) {
    case "integer":
      return "INTEGER";
    case "decimal":
      return "DECIMAL";
    case "boolean":
      return "BOOLEAN";
    case "date":
      return "DATE";
    case "datetime":
      return "TIMESTAMP(3)";
    case "json":
      return "JSONB";
    default:
      return "TEXT";
  }
}

function quoteSqlIdentifier(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}

function relationColumnDefinitions(
  graph: ApplicationGraphV1,
  entityKey: string,
): readonly string[] {
  return graph.domain.relations.flatMap((relation) => {
    if (relation.kind === "many-to-many") return [];
    const foreignKey = resolveRelationForeignKey(graph, relation);
    if (entityKey !== foreignKey.ownerKey) return [];
    if (
      graph.domain.entities
        .find((entity) => entity.key === foreignKey.ownerKey)
        ?.fields.some((field) => field.key === foreignKey.scalarField)
    ) {
      return [];
    }
    return [
      `${quoteSqlIdentifier(foreignKey.scalarField)} TEXT${foreignKey.oneToOne ? " UNIQUE" : ""}`,
    ];
  });
}

function renderInitialMigration(
  graph: ApplicationGraphV1,
  orderOperationReceiptMigration?: string,
  includeGenericCommerceLineItems = true,
  additionalMigrationFragments: readonly string[] = [],
): string {
  const createTables = graph.domain.entities.map((entity) => {
    const columns = [
      '"id" TEXT NOT NULL PRIMARY KEY',
      ...entity.fields.map(
        (field) =>
          `${quoteSqlIdentifier(field.key)} ${postgresType(field.type)}${field.required ? " NOT NULL" : ""}${field.unique ? " UNIQUE" : ""}`,
      ),
      ...relationColumnDefinitions(graph, entity.key),
      '"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP',
      '"updatedAt" TIMESTAMP(3) NOT NULL',
    ];
    return `CREATE TABLE ${quoteSqlIdentifier(toPascalCase(entity.key))} (\n  ${columns.join(",\n  ")}\n);`;
  });
  const indexes = graph.domain.entities.flatMap((entity) =>
    entity.indexes.map(
      (index, indexNumber) =>
        `CREATE ${index.unique ? "UNIQUE " : ""}INDEX ${quoteSqlIdentifier(`${toPascalCase(entity.key)}_${indexNumber}_idx`)} ON ${quoteSqlIdentifier(toPascalCase(entity.key))} (${index.fields.map(quoteSqlIdentifier).join(", ")});`,
    ),
  );
  const relationTables = graph.domain.relations.flatMap((relation) => {
    if (relation.kind !== "many-to-many") return [];
    const relationName = `${toPascalCase(relation.from)}To${toPascalCase(relation.to)}`;
    const sourceModel = toPascalCase(relation.from);
    const targetModel = toPascalCase(relation.to);
    return [
      `CREATE TABLE ${quoteSqlIdentifier(`_${relationName}`)} (\n  "A" TEXT NOT NULL,\n  "B" TEXT NOT NULL,\n  CONSTRAINT ${quoteSqlIdentifier(`_${relationName}_AB_pkey`)} PRIMARY KEY ("A", "B"),\n  CONSTRAINT ${quoteSqlIdentifier(`_${relationName}_A_fkey`)} FOREIGN KEY ("A") REFERENCES ${quoteSqlIdentifier(sourceModel)} ("id") ON DELETE CASCADE ON UPDATE CASCADE,\n  CONSTRAINT ${quoteSqlIdentifier(`_${relationName}_B_fkey`)} FOREIGN KEY ("B") REFERENCES ${quoteSqlIdentifier(targetModel)} ("id") ON DELETE CASCADE ON UPDATE CASCADE\n);`,
      `CREATE INDEX ${quoteSqlIdentifier(`_${relationName}_B_index`)} ON ${quoteSqlIdentifier(`_${relationName}`)} ("B");`,
    ];
  });
  const relationConstraints = graph.domain.relations.flatMap((relation) => {
    if (relation.kind === "many-to-many") return [];
    const foreignKey = resolveRelationForeignKey(graph, relation);
    const relationName = `${toPascalCase(foreignKey.targetKey)}To${toPascalCase(foreignKey.ownerKey)}`;
    return [
      `ALTER TABLE ${quoteSqlIdentifier(toPascalCase(foreignKey.ownerKey))} ADD CONSTRAINT ${quoteSqlIdentifier(`${relationName}_fkey`)} FOREIGN KEY (${quoteSqlIdentifier(foreignKey.scalarField)}) REFERENCES ${quoteSqlIdentifier(toPascalCase(foreignKey.targetKey))} (${quoteSqlIdentifier(foreignKey.targetField)}) ON DELETE RESTRICT ON UPDATE CASCADE;`,
    ];
  });
  return [
    "-- Generated from a Published Factory Application Graph. Do not edit manually.",
    ...createTables,
    'CREATE TABLE "AuditEvent" (\n  "id" TEXT NOT NULL PRIMARY KEY,\n  "actor" TEXT NOT NULL,\n  "action" TEXT NOT NULL,\n  "entity" TEXT NOT NULL,\n  "recordId" TEXT NOT NULL,\n  "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP\n);',
    'CREATE INDEX "AuditEvent_entity_recordId_idx" ON "AuditEvent" ("entity", "recordId");',
    'CREATE TABLE "CapabilityEvent" (\n  "id" TEXT NOT NULL PRIMARY KEY,\n  "actor" TEXT NOT NULL,\n  "capability" TEXT NOT NULL,\n  "operation" TEXT NOT NULL,\n  "entity" TEXT NOT NULL,\n  "recordId" TEXT NOT NULL,\n  "outcome" TEXT NOT NULL,\n  "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP\n);',
    'CREATE INDEX "CapabilityEvent_entity_recordId_idx" ON "CapabilityEvent" ("entity", "recordId");',
    'CREATE INDEX "CapabilityEvent_capability_operation_idx" ON "CapabilityEvent" ("capability", "operation");',
    ...(includeGenericCommerceLineItems && hasCommerceCapabilities(graph)
      ? [
          'CREATE TABLE "CommerceLineItem" (\n  "id" TEXT NOT NULL PRIMARY KEY,\n  "actor" TEXT NOT NULL,\n  "orderEntity" TEXT NOT NULL,\n  "orderRecordId" TEXT NOT NULL,\n  "catalogEntity" TEXT NOT NULL,\n  "catalogRecordId" TEXT NOT NULL,\n  "quantity" INTEGER NOT NULL,\n  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP\n);',
          'CREATE INDEX "CommerceLineItem_orderEntity_orderRecordId_idx" ON "CommerceLineItem" ("orderEntity", "orderRecordId");',
          'CREATE INDEX "CommerceLineItem_catalogEntity_catalogRecordId_idx" ON "CommerceLineItem" ("catalogEntity", "catalogRecordId");',
        ]
      : []),
    ...(orderOperationReceiptMigration
      ? [orderOperationReceiptMigration.trimEnd()]
      : []),
    ...additionalMigrationFragments.map((fragment) => fragment.trimEnd()),
    ...indexes,
    ...relationTables,
    ...relationConstraints,
    "",
  ].join("\n\n");
}

function renderPrismaSeed(
  graph: ApplicationGraphV1,
  hasRestaurantRuntime: boolean,
): string {
  const records = (graph.domain.seedData ?? []).map((seed, index) => ({
    delegate: toCamelCase(seed.entity),
    id: seed.id ?? `seed-${seed.entity}-${index + 1}`,
    values: seed.values,
  }));
  const restaurantTableSeed = hasRestaurantRuntime
    ? (graph.domain.seedData ?? []).find(
        (seed) => seed.entity === "restaurant-table",
      )
    : undefined;
  const restaurantTableCode = restaurantTableSeed?.values.code;
  const restaurantMenuItemSeed = hasRestaurantRuntime
    ? (graph.domain.seedData ?? []).find((seed) => seed.entity === "menu-item")
    : undefined;
  const restaurantTableId = records.find(
    (record) => record.delegate === "restaurantTable",
  )?.id;
  const restaurantLocationId = records.find(
    (record) => record.delegate === "restaurantLocation",
  )?.id;
  const restaurantMenuItemId = records.find(
    (record) => record.delegate === "menuItem",
  )?.id;
  const restaurantMenuItemPrice = restaurantMenuItemSeed?.values.price;
  if (
    hasRestaurantRuntime &&
    (typeof restaurantTableCode !== "string" ||
      !restaurantTableCode ||
      typeof restaurantLocationId !== "string" ||
      !restaurantLocationId ||
      typeof restaurantTableId !== "string" ||
      !restaurantTableId ||
      typeof restaurantMenuItemId !== "string" ||
      !restaurantMenuItemId ||
      typeof restaurantMenuItemPrice !== "number")
  ) {
    throw new Error(
      "Restaurant seed generation requires table, location, and menu-item fixtures.",
    );
  }
  const restaurantSessionSeed = restaurantTableSeed
    ? {
        id: `${restaurantTableSeed.id ?? "restaurant-table"}-demo-session`,
        tableCode: restaurantTableCode as string,
      }
    : null;
  return [
    ...(restaurantSessionSeed
      ? ['import { createHash } from "node:crypto";']
      : []),
    'import { PrismaClient } from "@prisma/client";',
    "",
    "const prisma = new PrismaClient();",
    `const records = ${JSON.stringify(records, null, 2)} as const;`,
    "",
    "type SeedDelegate = { upsert(input: { where: { id: string }; update: Record<string, unknown>; create: Record<string, unknown> }): Promise<unknown> };",
    "",
    "export async function seed() {",
    "  const delegates = prisma as unknown as Record<string, SeedDelegate>;",
    "  for (const record of records) {",
    "    await delegates[record.delegate]!.upsert({",
    "      where: { id: record.id },",
    "      update: record.values,",
    "      create: { id: record.id, ...record.values },",
    "    });",
    "  }",
    ...(restaurantSessionSeed
      ? [
          "  const demoTableToken = process.env.RESTAURANT_DEMO_TABLE_TOKEN;",
          '  if (!demoTableToken || demoTableToken.length < 16) throw new Error("RESTAURANT_DEMO_TABLE_TOKEN must contain at least 16 characters.");',
          '  const tokenDigest = createHash("sha256").update(demoTableToken, "utf8").digest("hex");',
          "  const openedAt = new Date();",
          "  const expiresAt = new Date(openedAt.getTime() + 24 * 60 * 60 * 1000);",
          "  await prisma.tableSession.upsert({",
          `    where: { id: ${JSON.stringify(restaurantSessionSeed.id)} },`,
          '    update: { tokenDigest, status: "active", openedAt, expiresAt, guestCount: 2 },',
          `    create: { id: ${JSON.stringify(restaurantSessionSeed.id)}, tableCode: ${JSON.stringify(restaurantSessionSeed.tableCode)}, tokenDigest, status: "active", openedAt, expiresAt, guestCount: 2 },`,
          "  });",
          `  await prisma.restaurantTable.update({ where: { id: ${JSON.stringify(restaurantTableId)} }, data: { restaurantLocationId: ${JSON.stringify(restaurantLocationId)} } });`,
          '  const merchantFixtureOpenedAt = new Date("2026-07-30T00:00:00.000Z");',
          '  const merchantFixtureExpiresAt = new Date("2099-12-31T23:59:59.000Z");',
          '  const merchantFixtureSubmittedAt = new Date("2026-07-30T00:01:00.000Z");',
          "  const merchantFixtureTables = [",
          `    { id: "merchant-e2e-cashier-table", code: "E2E-CASHIER", number: 98, restaurantLocationId: ${JSON.stringify(restaurantLocationId)} },`,
          `    { id: "merchant-e2e-cancellation-table", code: "E2E-CANCEL", number: 99, restaurantLocationId: ${JSON.stringify(restaurantLocationId)} },`,
          "  ] as const;",
          "  for (const table of merchantFixtureTables) {",
          "    await prisma.restaurantTable.upsert({",
          "      where: { id: table.id },",
          '      update: { code: table.code, number: table.number, status: "open", active: true, resourceVersion: 0, restaurantLocationId: table.restaurantLocationId },',
          '      create: { ...table, status: "open", active: true, resourceVersion: 0 },',
          "    });",
          "  }",
          "  const merchantFixtureSessions = [",
          '    { id: "merchant-e2e-cashier-session", tableCode: "E2E-CASHIER", tokenDigest: createHash("sha256").update(demoTableToken + ":merchant-e2e:cashier", "utf8").digest("hex") },',
          '    { id: "merchant-e2e-cancellation-session", tableCode: "E2E-CANCEL", tokenDigest: createHash("sha256").update(demoTableToken + ":merchant-e2e:cancellation", "utf8").digest("hex") },',
          "  ] as const;",
          "  for (const session of merchantFixtureSessions) {",
          "    await prisma.tableSession.upsert({",
          "      where: { id: session.id },",
          '      update: { tokenDigest: session.tokenDigest, status: "active", openedAt: merchantFixtureOpenedAt, expiresAt: merchantFixtureExpiresAt, guestCount: 2 },',
          '      create: { ...session, status: "active", openedAt: merchantFixtureOpenedAt, expiresAt: merchantFixtureExpiresAt, guestCount: 2 },',
          "    });",
          "  }",
          "  const merchantFixtureOrders = [",
          `    { id: "merchant-e2e-cashier-order", tableSessionId: "merchant-e2e-cashier-session", priority: 2, total: ${JSON.stringify(restaurantMenuItemPrice)} },`,
          `    { id: "merchant-e2e-cancellation-order", tableSessionId: "merchant-e2e-cancellation-session", priority: 1, total: ${JSON.stringify(restaurantMenuItemPrice)} },`,
          "  ] as const;",
          "  for (const order of merchantFixtureOrders) {",
          "    await prisma.order.upsert({",
          "      where: { id: order.id },",
          '      update: { tableSessionId: order.tableSessionId, status: "submitted", paymentStatus: "unpaid", fulfilmentType: "dine-in", orderNote: "Merchant E2E fixture", priority: order.priority, total: order.total, orderVersion: 0, submittedAt: merchantFixtureSubmittedAt, paidAt: null },',
          '      create: { ...order, status: "submitted", paymentStatus: "unpaid", fulfilmentType: "dine-in", orderNote: "Merchant E2E fixture", orderVersion: 0, submittedAt: merchantFixtureSubmittedAt, paidAt: null },',
          "    });",
          "  }",
          "  const merchantFixtureLines = [",
          `    { id: "merchant-e2e-cashier-line", orderId: "merchant-e2e-cashier-order", menuItemId: ${JSON.stringify(restaurantMenuItemId)} },`,
          `    { id: "merchant-e2e-cancellation-line", orderId: "merchant-e2e-cancellation-order", menuItemId: ${JSON.stringify(restaurantMenuItemId)} },`,
          "  ] as const;",
          "  for (const line of merchantFixtureLines) {",
          "    await prisma.orderLine.upsert({",
          "      where: { id: line.id },",
          `      update: { orderId: line.orderId, menuItemId: line.menuItemId, quantity: 1, unitPrice: ${JSON.stringify(restaurantMenuItemPrice)}, lineNote: "", modifiers: [] },`,
          `      create: { ...line, quantity: 1, unitPrice: ${JSON.stringify(restaurantMenuItemPrice)}, lineNote: "", modifiers: [] },`,
          "    });",
          "  }",
          `  await prisma.menuItem.update({ where: { id: ${JSON.stringify(restaurantMenuItemId)} }, data: { stock: 10, resourceVersion: 0 } });`,
          "  const merchantFixtureReservations = [",
          `    { id: "merchant-e2e-cashier-reservation", locationId: ${JSON.stringify(restaurantLocationId)}, orderId: "merchant-e2e-cashier-order", menuItemId: ${JSON.stringify(restaurantMenuItemId)}, idempotencyKey: "merchant-e2e-cashier-reservation" },`,
          `    { id: "merchant-e2e-cancellation-reservation", locationId: ${JSON.stringify(restaurantLocationId)}, orderId: "merchant-e2e-cancellation-order", menuItemId: ${JSON.stringify(restaurantMenuItemId)}, idempotencyKey: "merchant-e2e-cancellation-reservation" },`,
          "  ] as const;",
          "  for (const reservation of merchantFixtureReservations) {",
          "    await prisma.inventoryLedger.upsert({",
          "      where: { id: reservation.id },",
          '      update: { locationId: reservation.locationId, orderId: reservation.orderId, menuItemId: reservation.menuItemId, idempotencyKey: reservation.idempotencyKey, delta: -1, provenance: "order-reservation", adjustmentReason: null, recordedAt: merchantFixtureSubmittedAt },',
          '      create: { ...reservation, delta: -1, provenance: "order-reservation", adjustmentReason: null, recordedAt: merchantFixtureSubmittedAt },',
          "    });",
          "  }",
        ]
      : []),
    `  return { seeded: records.length${restaurantSessionSeed ? " + 11" : ""} };`,
    "}",
    "",
    "void seed().catch((error: unknown) => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());",
    "",
  ].join("\n");
}

function renderCasbinPolicy(graph: ApplicationGraphV1): string {
  const lines = graph.policy.permissions.flatMap((permission) =>
    permission.actions.map(
      (action) => `p, ${permission.role}, ${permission.resource}, ${action}`,
    ),
  );
  return `${lines.join("\n")}\n`;
}

function renderFlowDefinitions(graph: ApplicationGraphV1): string {
  const flows = graph.flow.flows.map((flow) => ({
    id: flow.id,
    initial: flow.initialState,
    states: flow.states,
    transitions: flow.transitions,
  }));
  return `export const flowDefinitions = ${JSON.stringify(flows, null, 2)} as const;\n`;
}

function renderFlowMachines(): string {
  return [
    'import { createMachine } from "xstate";',
    'import { flowDefinitions } from "./definitions.js";',
    "",
    "export const flowMachines = flowDefinitions.map((flow) =>",
    "  createMachine({",
    "    id: flow.id,",
    "    initial: flow.initial,",
    "    states: Object.fromEntries(",
    "      flow.states.map((state) => [",
    "        state,",
    "        {",
    "          on: Object.fromEntries(",
    "            flow.transitions",
    "              .filter((transition) => transition.from === state)",
    "              .map((transition) => [transition.event, transition.to]),",
    "          ),",
    "        },",
    "      ]),",
    "    ),",
    "  } as any),",
    ");",
    "",
  ].join("\n");
}

function renderPolicyModule(graph: ApplicationGraphV1): string {
  const model = [
    "[request_definition]",
    "r = sub, obj, act",
    "",
    "[policy_definition]",
    "p = sub, obj, act",
    "",
    "[policy_effect]",
    "e = some(where (p.eft == allow))",
    "",
    "[matchers]",
    'm = r.sub == p.sub && (r.obj == p.obj || p.obj == "*") && r.act == p.act',
  ].join("\n");
  return [
    'import { newEnforcer, newModelFromString, StringAdapter } from "casbin";',
    "",
    `const model = ${JSON.stringify(model)};`,
    `const policy = ${JSON.stringify(renderCasbinPolicy(graph))};`,
    "let enforcerPromise: ReturnType<typeof newEnforcer> | undefined;",
    "",
    "async function enforcer() {",
    "  enforcerPromise ??= newEnforcer(newModelFromString(model), new StringAdapter(policy));",
    "  return enforcerPromise;",
    "}",
    "",
    "export async function enforce(role: string, resource: string, action: string): Promise<boolean> {",
    "  return (await enforcer()).enforce(role, resource, action);",
    "}",
    "",
  ].join("\n");
}

function runtimeDefinition(graph: ApplicationGraphV1) {
  return {
    entities: graph.domain.entities.map((entity) => ({
      key: entity.key,
      fields: entity.fields.map((field) => ({
        key: field.key,
        required: field.required,
      })),
    })),
    permissions: graph.policy.permissions,
    capabilities: graph.integration.capabilities,
    seedData: (graph.domain.seedData ?? []).map((seed, index) => ({
      entity: seed.entity,
      id: seed.id ?? `seed-${seed.entity}-${index + 1}`,
      values: seed.values,
    })),
    flows: graph.flow.flows,
  };
}

function lockedRuntimeHandlerEntity(
  compositionLock: CapabilityCompositionLockV1,
  assetKey: string,
  handler: "catalog" | "order" | "orderOperations",
  bindingKey: string,
): string | undefined {
  const selection = compositionLock.packages.find(
    ({ lock }) => lock.key === assetKey,
  );
  if (!selection) return undefined;

  const asset = resolveCapabilityAssetLock(selection.lock);
  if (!asset.manifest.runtimeHandlers?.includes(handler)) return undefined;

  const binding = selection.bindings[bindingKey];
  if (
    !binding ||
    typeof binding !== "object" ||
    !("graphSymbol" in binding) ||
    typeof binding.graphSymbol !== "string"
  ) {
    throw new Error(
      `Locked ${assetKey} handler requires a '${bindingKey}' Graph binding.`,
    );
  }
  const match = /^graph\.domain\.([a-z][a-z0-9-]*)$/.exec(binding.graphSymbol);
  if (!match) {
    throw new Error(
      `Locked ${assetKey} handler binding '${bindingKey}' must target a domain entity.`,
    );
  }
  return match[1];
}

function renderOrderOperationsRuntime(
  orderEntityKey: string,
  catalogEntityKey: string | undefined,
  persistentOrderOperationReceipts: boolean,
): string {
  if (!catalogEntityKey) {
    throw new Error(
      "Locked commerce.order-operations requires a locked Catalog handler.",
    );
  }
  const receiptField = persistentOrderOperationReceipts
    ? ""
    : "  private readonly orderOperationReceipts = new Map<string, { payment: { due: string; captured: string; refunded: string }; keys: string[] }>();\n\n";
  const receiptLookup = persistentOrderOperationReceipts
    ? `const receipt = await store.getOrderOperationReceipt(${JSON.stringify(orderEntityKey)}, record.id);`
    : "const receipt = this.orderOperationReceipts.get(record.id);";
  const receiptKeys = persistentOrderOperationReceipts
    ? "receipt?.processedIdempotencyKeys ?? []"
    : "receipt?.keys ?? []";
  const persistReceipt = persistentOrderOperationReceipts
    ? `await store.saveOrderOperationReceipt({
        orderEntity: entityKey,
        orderRecordId: recordId,
        payment: this.paymentAfterOperation(state, command, plan),
        processedIdempotencyKeys: [...state.processedIdempotencyKeys, input.idempotencyKey],
      });`
    : `this.orderOperationReceipts.set(recordId, {
        payment: this.paymentAfterOperation(state, command, plan),
        keys: [...state.processedIdempotencyKeys, input.idempotencyKey],
      });`;
  return String.raw`${receiptField}  private decimalToMinorUnits(value: unknown): bigint {
    const decimal = typeof value === "number" && Number.isFinite(value) ? value.toFixed(2) : value;
    if (typeof decimal !== "string" || !/^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/.test(decimal)) {
      throw new Error("Order operation amount is invalid.");
    }
    const [whole, fraction = ""] = decimal.split(".");
    return BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"));
  }

  private minorUnitsToDecimal(value: bigint): string {
    return (value / 100n).toString() + "." + (value % 100n).toString().padStart(2, "0");
  }

  private async orderOperationDue(store: RecordStore, orderRecordId: string): Promise<string> {
    const items = await store.listCartItems(${JSON.stringify(orderEntityKey)}, orderRecordId);
    if (items.length === 0) throw new Error("Order operations require at least one cart item.");
    let total = 0n;
    for (const item of items) {
      const catalogRecord = await store.find(${JSON.stringify(catalogEntityKey)}, item.catalogRecordId);
      if (!catalogRecord) throw new Error("Order operation catalog record was not found.");
      total += this.decimalToMinorUnits(catalogRecord.price) * BigInt(item.quantity);
    }
    return this.minorUnitsToDecimal(total);
  }

  private async orderOperationState(store: RecordStore, record: StoredRecord): Promise<import("./capabilities/contract.js").CommerceOrderOperationState> {
    ${receiptLookup}
    const due = receipt?.payment.due ?? await this.orderOperationDue(store, record.id);
    const captured = receipt?.payment.captured ?? (record.status === "paid" || record.status === "fulfilled" ? due : "0.00");
    const refunded = receipt?.payment.refunded ?? "0.00";
    if (typeof record.status !== "string" || !Number.isSafeInteger(record.version) || (record.version as number) < 0) {
      throw new Error("Order operation record is invalid.");
    }
    return {
      orderId: record.id,
      version: record.version as number,
      status: record.status as import("./capabilities/contract.js").CommerceOrderOperationStatus,
      payment: { due, captured, refunded },
      processedIdempotencyKeys: ${receiptKeys},
    };
  }

  private paymentAfterOperation(
    state: import("./capabilities/contract.js").CommerceOrderOperationState,
    command: import("./capabilities/contract.js").CommerceOrderOperationCommand,
    plan: import("./capabilities/contract.js").CommerceOrderOperationPlan,
  ): { due: string; captured: string; refunded: string } {
    const due = this.decimalToMinorUnits(state.payment.due);
    let captured = this.decimalToMinorUnits(state.payment.captured);
    let refunded = this.decimalToMinorUnits(state.payment.refunded);
    const amount = command.amount ? this.decimalToMinorUnits(command.amount) : 0n;
    if (plan.paymentDelta === "capture-partial") captured += amount;
    if (plan.paymentDelta === "capture-final") captured = due;
    if (plan.paymentDelta === "refund-partial") refunded += amount;
    if (plan.paymentDelta === "refund-full") refunded = captured;
    return {
      due: this.minorUnitsToDecimal(due),
      captured: this.minorUnitsToDecimal(captured),
      refunded: this.minorUnitsToDecimal(refunded),
    };
  }

  async applyOrderOperation(
    role: string,
    entityKey: string,
    recordId: string,
    input: {
      command: import("./capabilities/contract.js").CommerceOrderOperationCommandName;
      expectedVersion: number;
      idempotencyKey: string;
      reason?: string;
      amount?: string;
    },
  ): Promise<{ record: StoredRecord; plan: import("./capabilities/contract.js").CommerceOrderOperationPlan }> {
    if (entityKey !== ${JSON.stringify(orderEntityKey)}) {
      throw new Error("Locked order operations cannot target this entity.");
    }
    this.entity(entityKey);
    return this.store.inTransaction(async (store) => {
      const record = await store.find(entityKey, recordId);
      if (!record) throw new Error("Order operation record was not found.");
      const state = await this.orderOperationState(store, record);
      const command: import("./capabilities/contract.js").CommerceOrderOperationCommand = {
        ...input,
        orderId: recordId,
        actorRole: role,
      };
      const plan = getOrderOperationsHandler().plan(state, command);
      const flow = this.flow(entityKey);
      if (!flow?.states.includes(plan.nextState)) {
        throw new Error("Locked order operation cannot produce an undeclared Flow state.");
      }
      const updated = await getOrderHandler().transition({
        role,
        entityKey,
        recordId,
        nextState: plan.nextState,
        expectedVersion: input.expectedVersion,
        idempotencyKey: input.idempotencyKey,
        store,
        assertAllowed: (candidateRole, resource, action) => this.assertAllowed(candidateRole, resource, action),
      });
      ${persistReceipt}
      await store.appendAudit({ actor: role, action: plan.auditAction, entity: entityKey, recordId, at: new Date().toISOString() });
      return { record: updated, plan };
    });
  }
`;
}

function renderApplicationRuntime(
  graph: ApplicationGraphV1,
  useResolvedContributions: boolean,
  usePackageCartHandler: boolean,
  usePackageLineConfigurationHandler: boolean,
  usePackageMoneyPricingHandler: boolean,
  catalogEntityKey: string | undefined,
  orderEntityKey: string | undefined,
  orderOperationsEntityKey: string | undefined,
  persistentOrderOperationReceipts: boolean,
  notificationOutbox: NotificationOutboxRuntimeContribution | undefined,
): string {
  const commerce = hasCommerceCapabilities(graph);
  const capabilityRegistryImports = [
    ...(commerce && usePackageCartHandler ? ["getCartHandler"] : []),
    ...(commerce && usePackageLineConfigurationHandler
      ? ["getLineConfigurationHandler"]
      : []),
    ...(commerce && usePackageMoneyPricingHandler
      ? ["getMoneyPricingHandler"]
      : []),
    ...(catalogEntityKey ? ["getCatalogHandler"] : []),
    ...(orderEntityKey ? ["getOrderHandler"] : []),
    ...(orderOperationsEntityKey ? ["getOrderOperationsHandler"] : []),
    "getEffectHandler",
    "getRecordHandler",
    "getWorkflowHandler",
    "providedEffects",
  ];
  return [
    useResolvedContributions
      ? `import { ${capabilityRegistryImports.join(", ")} } from "./capabilities/registry.js";`
      : 'import { providedEffects } from "./capabilities/registry.js";',
    'import { enforce } from "./policy.js";',
    "",
    "export type StoredRecord = Record<string, unknown> & { id: string; status?: string; version?: number };",
    "export type AuditEvent = { actor: string; action: string; entity: string; recordId: string; at: string };",
    "export type CapabilityEvent = { actor: string; capability: string; operation: string; entity: string; recordId: string; outcome: 'completed'; at: string };",
    ...(notificationOutbox
      ? [
          "export type NotificationOutboxEntry = { id: string; dedupeKey: string; actor: string; recipientRole: string; template: string | null; entity: string; recordId: string; status: 'pending' | 'delivered' | 'failed'; attempts: number; availableAt: string; deliveredAt: string | null; lastError: string | null };",
          "export type NotificationOutboxInput = Omit<NotificationOutboxEntry, 'id' | 'status' | 'attempts' | 'deliveredAt' | 'lastError'>;",
        ]
      : []),
    ...(commerce
      ? [
          "export type CommerceLineItem = { id: string; actor: string; orderEntity: string; orderRecordId: string; catalogEntity: string; catalogRecordId: string; quantity: number };",
        ]
      : []),
    ...(persistentOrderOperationReceipts
      ? [
          "export type OrderOperationReceipt = { orderEntity: string; orderRecordId: string; payment: { due: string; captured: string; refunded: string }; processedIdempotencyKeys: readonly string[] };",
        ]
      : []),
    "export interface RecordStore {",
    "  list(entityKey: string): Promise<readonly StoredRecord[]>;",
    "  find(entityKey: string, recordId: string): Promise<StoredRecord | undefined>;",
    "  create(entityKey: string, input: Record<string, unknown>): Promise<StoredRecord>;",
    "  update(entityKey: string, recordId: string, input: Record<string, unknown>): Promise<StoredRecord>;",
    "  appendAudit(event: AuditEvent): Promise<void>;",
    "  listAudit(): Promise<readonly AuditEvent[]>;",
    "  appendCapabilityEvent(event: CapabilityEvent): Promise<void>;",
    "  listCapabilityEvents(): Promise<readonly CapabilityEvent[]>;",
    "  inTransaction<T>(operation: (store: RecordStore) => Promise<T>): Promise<T>;",
    ...(notificationOutbox
      ? [
          "  enqueueNotification(input: NotificationOutboxInput): Promise<NotificationOutboxEntry>;",
          "  claimDueNotifications(now: string, limit: number): Promise<readonly NotificationOutboxEntry[]>;",
          "  markNotificationDelivered(id: string, deliveredAt: string): Promise<void>;",
          "  recordNotificationFailure(id: string, error: string, status: 'pending' | 'failed', availableAt: string): Promise<NotificationOutboxEntry>;",
        ]
      : []),
    ...(persistentOrderOperationReceipts
      ? [
          "  getOrderOperationReceipt(orderEntity: string, orderRecordId: string): Promise<OrderOperationReceipt | undefined>;",
          "  saveOrderOperationReceipt(receipt: OrderOperationReceipt): Promise<void>;",
        ]
      : []),
    ...(commerce
      ? [
          "  addCartItem(input: Omit<CommerceLineItem, 'id'>): Promise<CommerceLineItem>;",
          "  listCartItems(orderEntity: string, orderRecordId: string): Promise<readonly CommerceLineItem[]>;",
          "  adjustInventory(entityKey: string, recordId: string, fieldKey: string, delta: number): Promise<StoredRecord>;",
          "  decrementInventory(entityKey: string, recordId: string, quantity: number): Promise<StoredRecord>;",
        ]
      : []),
    "}",
    "",
    "export class InMemoryRecordStore implements RecordStore {",
    "  private readonly records = new Map<string, Map<string, StoredRecord>>();",
    "  private readonly auditEvents: AuditEvent[] = [];",
    "  private readonly capabilityEvents: CapabilityEvent[] = [];",
    ...(notificationOutbox
      ? [
          "  private readonly notificationOutbox = new Map<string, NotificationOutboxEntry>();",
          "  private readonly notificationOutboxByDedupeKey = new Map<string, string>();",
          "  private transactionTail: Promise<void> = Promise.resolve();",
        ]
      : []),
    ...(persistentOrderOperationReceipts
      ? [
          "  private readonly orderOperationReceiptStore = new Map<string, OrderOperationReceipt>();",
        ]
      : []),
    ...(commerce
      ? ["  private readonly cartItems: CommerceLineItem[] = [];"]
      : []),
    "",
    notificationOutbox
      ? "  constructor(private readonly bypassMutationCoordinator = false) {"
      : "  constructor() {",
    "    for (const seed of definition.seedData) {",
    "      this.collection(seed.entity).set(seed.id, { id: seed.id, ...seed.values });",
    "    }",
    "  }",
    "",
    ...(notificationOutbox
      ? [
          "  private async coordinateMutation<T>(operation: () => T | Promise<T>): Promise<T> {",
          "    if (this.bypassMutationCoordinator) return operation();",
          "    let release!: () => void;",
          "    const previous = this.transactionTail;",
          "    this.transactionTail = new Promise<void>((resolve) => { release = resolve; });",
          "    await previous;",
          "    try { return await operation(); } finally { release(); }",
          "  }",
          "",
          "  private replaceState(source: InMemoryRecordStore): void {",
          "    this.records.clear(); for (const [entity, records] of source.records) this.records.set(entity, new Map([...records].map(([id, record]) => [id, structuredClone(record)])));",
          "    this.auditEvents.splice(0, this.auditEvents.length, ...source.auditEvents.map((event) => ({ ...event })));",
          "    this.capabilityEvents.splice(0, this.capabilityEvents.length, ...source.capabilityEvents.map((event) => ({ ...event })));",
          "    this.notificationOutbox.clear(); for (const [id, entry] of source.notificationOutbox) this.notificationOutbox.set(id, { ...entry });",
          "    this.notificationOutboxByDedupeKey.clear(); for (const [key, id] of source.notificationOutboxByDedupeKey) this.notificationOutboxByDedupeKey.set(key, id);",
          ...(persistentOrderOperationReceipts
            ? [
                "    this.orderOperationReceiptStore.clear(); for (const [key, receipt] of source.orderOperationReceiptStore) this.orderOperationReceiptStore.set(key, { ...receipt, payment: { ...receipt.payment }, processedIdempotencyKeys: [...receipt.processedIdempotencyKeys] });",
              ]
            : []),
          ...(commerce
            ? [
                "    this.cartItems.splice(0, this.cartItems.length, ...source.cartItems.map((item) => ({ ...item })));",
              ]
            : []),
          "  }",
          "",
        ]
      : []),
    "  private collection(entityKey: string): Map<string, StoredRecord> {",
    "    let collection = this.records.get(entityKey);",
    "    if (!collection) {",
    "      collection = new Map<string, StoredRecord>();",
    "      this.records.set(entityKey, collection);",
    "    }",
    "    return collection;",
    "  }",
    "",
    "  async list(entityKey: string): Promise<readonly StoredRecord[]> { return [...this.collection(entityKey).values()]; }",
    "  async find(entityKey: string, recordId: string): Promise<StoredRecord | undefined> { return this.collection(entityKey).get(recordId); }",
    ...(notificationOutbox
      ? [
          "  async create(entityKey: string, input: Record<string, unknown>): Promise<StoredRecord> {",
          "    return this.coordinateMutation(() => {",
          "      const collection = this.collection(entityKey);",
          "      const record: StoredRecord = { id: `${entityKey}-${collection.size + 1}`, ...input };",
          "      collection.set(record.id, record);",
          "      return record;",
          "    });",
          "  }",
          "  async update(entityKey: string, recordId: string, input: Record<string, unknown>): Promise<StoredRecord> {",
          "    return this.coordinateMutation(() => {",
          "      const record = this.collection(entityKey).get(recordId);",
          "      if (!record) throw new Error(`Record '${recordId}' was not found.`);",
          "      Object.assign(record, input);",
          "      this.collection(entityKey).set(recordId, record);",
          "      return record;",
          "    });",
          "  }",
          "  async appendAudit(event: AuditEvent): Promise<void> { await this.coordinateMutation(() => { this.auditEvents.push(event); }); }",
        ]
      : [
          "  async create(entityKey: string, input: Record<string, unknown>): Promise<StoredRecord> {",
          "    const collection = this.collection(entityKey);",
          "    const record: StoredRecord = { id: `${entityKey}-${collection.size + 1}`, ...input };",
          "    collection.set(record.id, record);",
          "    return record;",
          "  }",
          "  async update(entityKey: string, recordId: string, input: Record<string, unknown>): Promise<StoredRecord> {",
          "    const record = await this.find(entityKey, recordId);",
          "    if (!record) throw new Error(`Record '${recordId}' was not found.`);",
          "    Object.assign(record, input);",
          "    this.collection(entityKey).set(recordId, record);",
          "    return record;",
          "  }",
          "  async appendAudit(event: AuditEvent): Promise<void> { this.auditEvents.push(event); }",
        ]),
    "  async listAudit(): Promise<readonly AuditEvent[]> { return [...this.auditEvents]; }",
    notificationOutbox
      ? "  async appendCapabilityEvent(event: CapabilityEvent): Promise<void> { await this.coordinateMutation(() => { this.capabilityEvents.push(event); }); }"
      : "  async appendCapabilityEvent(event: CapabilityEvent): Promise<void> { this.capabilityEvents.push(event); }",
    "  async listCapabilityEvents(): Promise<readonly CapabilityEvent[]> { return [...this.capabilityEvents]; }",
    ...(notificationOutbox
      ? [
          "  async inTransaction<T>(operation: (store: RecordStore) => Promise<T>): Promise<T> {",
          "    if (this.bypassMutationCoordinator) return operation(this);",
          "    return this.coordinateMutation(async () => {",
          "      const transaction = new InMemoryRecordStore(true);",
          "      transaction.replaceState(this);",
          "      const result = await operation(transaction);",
          "      this.replaceState(transaction);",
          "      return result;",
          "    });",
          "  }",
          "  async enqueueNotification(input: NotificationOutboxInput): Promise<NotificationOutboxEntry> {",
          "    return this.coordinateMutation(() => {",
          "      const existingId = this.notificationOutboxByDedupeKey.get(input.dedupeKey);",
          "      if (existingId) return { ...this.notificationOutbox.get(existingId)! };",
          "      const entry: NotificationOutboxEntry = { id: `notification-${this.notificationOutbox.size + 1}`, ...input, status: 'pending', attempts: 0, deliveredAt: null, lastError: null };",
          "      this.notificationOutbox.set(entry.id, entry);",
          "      this.notificationOutboxByDedupeKey.set(entry.dedupeKey, entry.id);",
          "      return { ...entry };",
          "    });",
          "  }",
          "  async claimDueNotifications(now: string, limit: number): Promise<readonly NotificationOutboxEntry[]> {",
          "    if (!Number.isSafeInteger(limit) || limit < 1) return [];",
          "    return this.coordinateMutation(() => {",
          "      const claimUntil = new Date(new Date(now).getTime() + 300_000).toISOString();",
          "      return [...this.notificationOutbox.values()].filter((entry) => entry.status === 'pending' && entry.availableAt <= now).sort((left, right) => left.availableAt.localeCompare(right.availableAt) || left.id.localeCompare(right.id)).slice(0, limit).map((entry) => { const claimed = { ...entry, availableAt: claimUntil }; this.notificationOutbox.set(entry.id, claimed); return { ...claimed }; });",
          "    });",
          "  }",
          "  async markNotificationDelivered(id: string, deliveredAt: string): Promise<void> {",
          "    await this.coordinateMutation(() => {",
          "      const entry = this.notificationOutbox.get(id);",
          "      if (!entry) throw new Error(`Notification outbox entry '${id}' was not found.`);",
          "      if (entry.status !== 'pending') return;",
          "      this.notificationOutbox.set(id, { ...entry, status: 'delivered', deliveredAt, lastError: null });",
          "    });",
          "  }",
          "  async recordNotificationFailure(id: string, error: string, status: 'pending' | 'failed', availableAt: string): Promise<NotificationOutboxEntry> {",
          "    return this.coordinateMutation(() => {",
          "      const entry = this.notificationOutbox.get(id);",
          "      if (!entry) throw new Error(`Notification outbox entry '${id}' was not found.`);",
          "      if (entry.status !== 'pending') return { ...entry };",
          "      const attempts = entry.attempts + 1;",
          "      const updated: NotificationOutboxEntry = { ...entry, attempts, status, availableAt, lastError: error.slice(0, 500) };",
          "      this.notificationOutbox.set(id, updated);",
          "      return { ...updated };",
          "    });",
          "  }",
        ]
      : [
          "  async inTransaction<T>(operation: (store: RecordStore) => Promise<T>): Promise<T> { return operation(this); }",
        ]),
    ...(persistentOrderOperationReceipts
      ? [
          "  async getOrderOperationReceipt(orderEntity: string, orderRecordId: string): Promise<OrderOperationReceipt | undefined> {",
          "    return this.orderOperationReceiptStore.get(`${orderEntity}:${orderRecordId}`);",
          "  }",
          "  async saveOrderOperationReceipt(receipt: OrderOperationReceipt): Promise<void> {",
          ...(notificationOutbox
            ? [
                "    await this.coordinateMutation(() => { this.orderOperationReceiptStore.set(`${receipt.orderEntity}:${receipt.orderRecordId}`, { ...receipt, payment: { ...receipt.payment }, processedIdempotencyKeys: [...receipt.processedIdempotencyKeys] }); });",
              ]
            : [
                "    this.orderOperationReceiptStore.set(`${receipt.orderEntity}:${receipt.orderRecordId}`, { ...receipt, payment: { ...receipt.payment }, processedIdempotencyKeys: [...receipt.processedIdempotencyKeys] });",
              ]),
          "  }",
        ]
      : []),
    ...(commerce
      ? [
          "  async addCartItem(input: Omit<CommerceLineItem, 'id'>): Promise<CommerceLineItem> {",
          ...(notificationOutbox
            ? [
                "    return this.coordinateMutation(() => {",
                "      const item = { id: `line-${this.cartItems.length + 1}`, ...input };",
                "      this.cartItems.push(item);",
                "      return item;",
                "    });",
              ]
            : [
                "    const item = { id: `line-${this.cartItems.length + 1}`, ...input };",
                "    this.cartItems.push(item);",
                "    return item;",
              ]),
          "  }",
          "  async listCartItems(orderEntity: string, orderRecordId: string): Promise<readonly CommerceLineItem[]> {",
          "    return this.cartItems.filter((item) => item.orderEntity === orderEntity && item.orderRecordId === orderRecordId);",
          "  }",
          "  async adjustInventory(entityKey: string, recordId: string, fieldKey: string, delta: number): Promise<StoredRecord> {",
          ...(notificationOutbox
            ? [
                "    return this.coordinateMutation(() => {",
                "      const record = this.collection(entityKey).get(recordId);",
                "      if (!record || typeof record[fieldKey] !== 'number') throw new Error(`Catalog record '${recordId}' has no numeric '${fieldKey}' field.`);",
                "      if (!Number.isInteger(delta)) throw new Error('Inventory adjustment must be an integer.');",
                "      const next = (record[fieldKey] as number) + delta;",
                "      if (next < 0) throw new Error(`Catalog record '${recordId}' has insufficient stock.`);",
                "      Object.assign(record, { [fieldKey]: next });",
                "      this.collection(entityKey).set(recordId, record);",
                "      return record;",
                "    });",
              ]
            : [
                "    const record = await this.find(entityKey, recordId);",
                "    if (!record || typeof record[fieldKey] !== 'number') throw new Error(`Catalog record '${recordId}' has no numeric '${fieldKey}' field.`);",
                "    if (!Number.isInteger(delta)) throw new Error('Inventory adjustment must be an integer.');",
                "    const next = (record[fieldKey] as number) + delta;",
                "    if (next < 0) throw new Error(`Catalog record '${recordId}' has insufficient stock.`);",
                "    return this.update(entityKey, recordId, { [fieldKey]: next });",
              ]),
          "  }",
          "  async decrementInventory(entityKey: string, recordId: string, quantity: number): Promise<StoredRecord> {",
          "    return this.adjustInventory(entityKey, recordId, 'stock', -quantity);",
          "  }",
        ]
      : []),
    "}",
    "type RuntimeDefinition = {",
    "  entities: readonly { key: string; fields: readonly { key: string; required: boolean }[] }[];",
    "  permissions: readonly { role: string; resource: string; actions: readonly string[] }[];",
    "  capabilities: readonly { key: string; providerId: string; operation: string }[];",
    "  seedData: readonly { entity: string; id: string; values: Record<string, unknown> }[];",
    "  flows: readonly {",
    "    id: string;",
    "    entity: string;",
    "    initialState: string;",
    "    states: readonly string[];",
    "    events: readonly string[];",
    "    transitions: readonly { from: string; event: string; to: string; roles?: readonly string[]; effects?: readonly { capability: string; operation: string }[] }[];",
    "  }[];",
    "};",
    `const definition: RuntimeDefinition = ${JSON.stringify(runtimeDefinition(graph), null, 2)};`,
    "",
    "export class ApplicationRuntime {",
    "  constructor(private readonly store: RecordStore = new InMemoryRecordStore()) {}",
    "",
    "  private entity(entityKey: string) {",
    "    const entity = definition.entities.find((candidate) => candidate.key === entityKey);",
    "    if (!entity) throw new Error(`Unknown entity '${entityKey}'.`);",
    "    return entity;",
    "  }",
    "",
    "  private flow(entityKey: string) {",
    "    return definition.flows.find((candidate) => candidate.entity === entityKey);",
    "  }",
    "",
    "  private async assertAllowed(role: string, entityKey: string, action: string): Promise<void> {",
    "    if (!(await enforce(role, entityKey, action))) {",
    "      throw new Error(`Role '${role}' cannot ${action} '${entityKey}'.`);",
    "    }",
    "  }",
    "",
    "  private async assertTransitionAllowed(role: string, entityKey: string, event: string): Promise<void> {",
    "    if (await enforce(role, entityKey, event)) return;",
    "    await this.assertAllowed(role, entityKey, 'update');",
    "  }",
    "",
    ...(orderOperationsEntityKey
      ? [
          renderOrderOperationsRuntime(
            orderOperationsEntityKey,
            catalogEntityKey,
            persistentOrderOperationReceipts,
          ),
        ]
      : []),
    "  private assertCapability(capabilityKey: string, operation: string): { key: string; providerId: string; operation: string } {",
    "    const capability = definition.capabilities.find((candidate) => candidate.key === capabilityKey && candidate.operation === operation);",
    "    if (!capability) {",
    "      throw new Error(`Capability '${capabilityKey}.${operation}' is not declared by this Application Graph.`);",
    "    }",
    "    return capability;",
    "  }",
    "",
    "  private async executeEffects(role: string, entityKey: string, recordId: string, effects: readonly { capability: string; operation: string }[] | undefined, store: RecordStore): Promise<void> {",
    "    const declaredEffects = (effects ?? []).map((effect) => ({ effect, capability: this.assertCapability(effect.capability, effect.operation) }));",
    "    for (const { effect, capability } of declaredEffects) {",
    "      if (capability.providerId !== 'factory') throw new Error(`External provider capability '${effect.capability}' requires an activated adapter for provider '${capability.providerId}'.`);",
    "    }",
    "    for (const { effect } of declaredEffects) {",
    "      const at = new Date().toISOString();",
    ...(useResolvedContributions
      ? [
          "      const handler = getEffectHandler(effect.capability, effect.operation);",
          "      await handler({ role, entityKey, recordId, operation: effect.operation, store, now: at });",
        ]
      : [
          "      if (!providedEffects.has(effect.capability)) throw new Error(`Unsupported capability effect '${effect.capability}.${effect.operation}'.`);",
          "      if (effect.capability === 'audit.record') {",
          "        await store.appendAudit({ actor: role, action: effect.operation, entity: entityKey, recordId, at });",
          "      }",
          ...(commerce
            ? [
                "      if (effect.capability === 'inventory.decrement') {",
                "        const items = await store.listCartItems(entityKey, recordId);",
                "        if (items.length === 0) throw new Error(`Cannot decrement inventory for an empty cart '${recordId}'.`);",
                "        for (const item of items) await store.decrementInventory(item.catalogEntity, item.catalogRecordId, item.quantity);",
                "      }",
              ]
            : []),
        ]),
    ...(notificationOutbox
      ? [
          "      if (effect.capability === 'notification.send') {",
          `        const dedupeKey = JSON.stringify([${JSON.stringify(notificationOutbox.applicationId)}, effect.operation, entityKey, recordId, ${JSON.stringify(notificationOutbox.recipientRole)}, ${JSON.stringify(notificationOutbox.template)}]);`,
          "        await store.enqueueNotification({ dedupeKey, actor: role, recipientRole: " +
            JSON.stringify(notificationOutbox.recipientRole) +
            ", template: " +
            JSON.stringify(notificationOutbox.template) +
            ", entity: entityKey, recordId, availableAt: at });",
          "      }",
        ]
      : []),
    "      await store.appendCapabilityEvent({ actor: role, capability: effect.capability, operation: effect.operation, entity: entityKey, recordId, outcome: 'completed', at });",
    "    }",
    "  }",
    "",
    "  async list(role: string, entityKey: string): Promise<readonly StoredRecord[]> {",
    "    this.entity(entityKey);",
    "    await this.assertAllowed(role, entityKey, 'read');",
    ...(catalogEntityKey
      ? [
          `    if (entityKey === ${JSON.stringify(catalogEntityKey)}) {`,
          "      return getCatalogHandler().list({",
          "        role,",
          "        entityKey,",
          "        store: this.store,",
          "        assertAllowed: (candidateRole, resource, action) => this.assertAllowed(candidateRole, resource, action),",
          "      });",
          "    }",
        ]
      : []),
    useResolvedContributions
      ? "    return getRecordHandler().list({ store: this.store, entityKey });"
      : "    return this.store.list(entityKey);",
    "  }",
    "",
    "  async read(role: string, entityKey: string, recordId: string): Promise<StoredRecord> {",
    "    this.entity(entityKey);",
    "    await this.assertAllowed(role, entityKey, 'read');",
    ...(catalogEntityKey
      ? [
          `    if (entityKey === ${JSON.stringify(catalogEntityKey)}) {`,
          "      return getCatalogHandler().read({",
          "        role,",
          "        entityKey,",
          "        recordId,",
          "        store: this.store,",
          "        assertAllowed: (candidateRole, resource, action) => this.assertAllowed(candidateRole, resource, action),",
          "      });",
          "    }",
        ]
      : []),
    "    const record = await this.store.find(entityKey, recordId);",
    "    if (!record) throw new Error(`Record '${recordId}' was not found.`);",
    "    return record;",
    "  }",
    "",
    "  async create(role: string, entityKey: string, input: Record<string, unknown>): Promise<StoredRecord> {",
    "    const entity = this.entity(entityKey);",
    "    await this.assertAllowed(role, entityKey, 'create');",
    "    const allowedFields = new Set(entity.fields.map((field) => field.key));",
    "    const unknown = Object.keys(input).find((key) => !allowedFields.has(key));",
    "    if (unknown) throw new Error(`Unknown field '${unknown}' for '${entityKey}'.`);",
    "    const flow = this.flow(entityKey);",
    "    for (const field of entity.fields) {",
    "      const supplied = input[field.key];",
    "      const suppliedByRuntime =",
    `        (field.key === 'status' && !!flow) || (field.key === 'version' && entityKey === ${JSON.stringify(orderEntityKey)});`,
    "      if (field.required && supplied === undefined && !suppliedByRuntime) {",
    "        throw new Error(`Required field '${field.key}' is missing.`);",
    "      }",
    "    }",
    ...(useResolvedContributions && orderEntityKey
      ? [
          `    const record = entityKey === ${JSON.stringify(orderEntityKey)}`,
          "      ? await getOrderHandler().create({",
          "          role,",
          "          entityKey,",
          "          input: { ...input, ...(flow ? { status: flow.initialState } : {}), version: 0 },",
          "          store: this.store,",
          "          assertAllowed: (candidateRole, resource, action) => this.assertAllowed(candidateRole, resource, action),",
          "        })",
          "      : await getRecordHandler().create({",
          "          store: this.store,",
          "          entityKey,",
          "          input: { ...input, ...(flow ? { status: flow.initialState } : {}) },",
          "        });",
        ]
      : useResolvedContributions
        ? [
            "    const record = await getRecordHandler().create({",
            "      store: this.store,",
            "      entityKey,",
            "      input: { ...input, ...(flow ? { status: flow.initialState } : {}) },",
            "    });",
          ]
        : [
            "    const record = await this.store.create(entityKey, { ...input, ...(flow ? { status: flow.initialState } : {}) });",
          ]),
    "    await this.store.appendAudit({ actor: role, action: 'create', entity: entityKey, recordId: record.id, at: new Date().toISOString() });",
    "    return record;",
    "  }",
    "",
    ...(commerce && usePackageLineConfigurationHandler
      ? [
          "  async configureLine(role: string, input: { catalogEntity: string; catalogRecordId: string; optionIds: readonly string[]; quantity: number }): Promise<{ catalogEntity: string; catalogRecordId: string; quantity: number; priceDelta: number; options: readonly { id: string; label: string; priceDelta: number }[] }> {",
          "    this.assertCapability('catalog.option.select', 'select');",
          "    if (!providedEffects.has('catalog.option.select')) throw new Error(\"Unsupported capability effect 'catalog.option.select'.\");",
          "    const configured = await getLineConfigurationHandler().select({",
          "      role,",
          "      catalogEntity: input.catalogEntity,",
          "      catalogRecordId: input.catalogRecordId,",
          "      optionIds: input.optionIds,",
          "      quantity: input.quantity,",
          "      store: this.store,",
          "      assertAllowed: (candidateRole, entityKey, action) => this.assertAllowed(candidateRole, entityKey, action),",
          "    });",
          "    const at = new Date().toISOString();",
          "    await this.store.appendCapabilityEvent({ actor: role, capability: 'catalog.option.select', operation: 'select', entity: configured.catalogEntity, recordId: configured.catalogRecordId, outcome: 'completed', at });",
          "    return configured;",
          "  }",
          "",
        ]
      : []),
    ...(commerce && usePackageMoneyPricingHandler
      ? [
          '  async quotePrice(role: string, input: { catalogEntity: string; lines: readonly { catalogRecordId: string; quantity: number }[] }): Promise<import("./capabilities/contract.js").MoneyPricingQuote> {',
          "    if (!providedEffects.has('pricing.quote')) throw new Error(\"Unsupported capability effect 'pricing.quote'.\");",
          "    const quote = await getMoneyPricingHandler().quote({",
          "      role,",
          "      catalogEntity: input.catalogEntity,",
          "      lines: input.lines,",
          "      store: this.store,",
          "      assertAllowed: (candidateRole, entityKey, action) => this.assertAllowed(candidateRole, entityKey, action),",
          "    });",
          "    const at = new Date().toISOString();",
          "    await this.store.appendCapabilityEvent({ actor: role, capability: 'pricing.quote', operation: 'quote', entity: input.catalogEntity, recordId: quote.lines.map((line) => line.catalogRecordId).join(','), outcome: 'completed', at });",
          "    return quote;",
          "  }",
          "",
        ]
      : []),
    ...(commerce
      ? [
          "  async addCartItem(role: string, orderEntity: string, orderRecordId: string, input: { catalogEntity: string; catalogRecordId: string; quantity: number }): Promise<CommerceLineItem> {",
          "    this.entity(orderEntity);",
          "    this.entity(input.catalogEntity);",
          "    this.assertCapability('cart.add', 'add');",
          "    if (!providedEffects.has('cart.add')) throw new Error('Unsupported capability effect \\'cart.add\\'.');",
          ...(usePackageCartHandler
            ? [
                "    const item = await getCartHandler().add({",
                "      role,",
                "      orderEntity,",
                "      orderRecordId,",
                "      catalogEntity: input.catalogEntity,",
                "      catalogRecordId: input.catalogRecordId,",
                "      quantity: input.quantity,",
                "      store: this.store,",
                "      assertAllowed: (candidateRole, entityKey, action) => this.assertAllowed(candidateRole, entityKey, action),",
                "    });",
              ]
            : [
                "    await this.assertAllowed(role, orderEntity, 'create');",
                "    await this.assertAllowed(role, input.catalogEntity, 'read');",
                "    const order = await this.store.find(orderEntity, orderRecordId);",
                "    if (!order) throw new Error(`Cart '${orderRecordId}' was not found.`);",
                "    if (order.status !== 'cart') throw new Error(`Order '${orderRecordId}' is not an active cart.`);",
                "    const catalogRecord = await this.store.find(input.catalogEntity, input.catalogRecordId);",
                "    if (!catalogRecord) throw new Error(`Catalog record '${input.catalogRecordId}' was not found.`);",
                "    if (!Number.isInteger(input.quantity) || input.quantity < 1) throw new Error('Cart quantity must be a positive integer.');",
                "    const item = await this.store.addCartItem({ actor: role, orderEntity, orderRecordId, ...input });",
              ]),
          "    const at = new Date().toISOString();",
          "    await this.store.appendAudit({ actor: role, action: 'cart.add', entity: orderEntity, recordId: orderRecordId, at });",
          "    await this.store.appendCapabilityEvent({ actor: role, capability: 'cart.add', operation: 'add', entity: orderEntity, recordId: orderRecordId, outcome: 'completed', at });",
          "    return item;",
          "  }",
          "",
          "  async cartItems(role: string, orderEntity: string, orderRecordId: string): Promise<readonly CommerceLineItem[]> {",
          "    this.entity(orderEntity);",
          ...(usePackageCartHandler
            ? [
                "    return getCartHandler().list({",
                "      role,",
                "      orderEntity,",
                "      orderRecordId,",
                "      store: this.store,",
                "      assertAllowed: (candidateRole, entityKey, action) => this.assertAllowed(candidateRole, entityKey, action),",
                "    });",
              ]
            : [
                "    await this.assertAllowed(role, orderEntity, 'read');",
                "    return this.store.listCartItems(orderEntity, orderRecordId);",
              ]),
          "  }",
          "",
        ]
      : []),
    "  async transition(role: string, entityKey: string, recordId: string, event: string, options: { expectedVersion?: number; idempotencyKey?: string } = {}): Promise<StoredRecord> {",
    "    this.entity(entityKey);",
    "    const flow = this.flow(entityKey);",
    "    if (!flow) throw new Error(`Entity '${entityKey}' has no declared flow.`);",
    notificationOutbox
      ? "    return this.store.inTransaction(async (store) => {"
      : "    const store = this.store;",
    "    const record = await store.find(entityKey, recordId);",
    "    if (!record) throw new Error(`Record '${recordId}' was not found.`);",
    "    const transition = flow.transitions.find((candidate) => candidate.from === record.status && candidate.event === event);",
    "    if (!transition) throw new Error(`Event '${event}' is not valid from '${record.status}'.`);",
    "    if (transition.roles?.length && !transition.roles.includes(role)) {",
    "      throw new Error(`Role '${role}' cannot trigger '${event}'.`);",
    "    }",
    "    if (transition.roles?.length) await this.assertTransitionAllowed(role, entityKey, event);",
    "    else await this.assertAllowed(role, entityKey, 'read');",
    ...(orderEntityKey
      ? [
          `    if (entityKey === ${JSON.stringify(orderEntityKey)} && (!Number.isInteger(options.expectedVersion) || (options.expectedVersion ?? -1) < 0 || typeof options.idempotencyKey !== 'string' || !options.idempotencyKey.trim())) {`,
          "      throw new Error('Order transitions require an expected version and idempotency key.');",
          "    }",
        ]
      : []),
    ...(useResolvedContributions && orderEntityKey
      ? [
          `    if (entityKey === ${JSON.stringify(orderEntityKey)}) {`,
          "      const previous = { status: record.status, version: record.version };",
          "      const updated = await getOrderHandler().transition({",
          "        role,",
          "        entityKey,",
          "        recordId,",
          "        nextState: transition.to,",
          "        expectedVersion: options.expectedVersion!,",
          "        idempotencyKey: options.idempotencyKey!,",
          "        store,",
          "        assertAllowed: (candidateRole, resource, action) => this.assertAllowed(candidateRole, resource, action),",
          "      });",
          "      try {",
          "        await this.executeEffects(role, entityKey, recordId, transition.effects, store);",
          "      } catch (error) {",
          "        await store.update(entityKey, recordId, previous);",
          "        throw error;",
          "      }",
          "      await store.appendAudit({ actor: role, action: event, entity: entityKey, recordId, at: new Date().toISOString() });",
          "      return updated;",
          "    }",
          "    await this.executeEffects(role, entityKey, recordId, transition.effects, store);",
          "    const updated = await getWorkflowHandler().applyTransition({",
          "      store,",
          "      entityKey,",
          "      recordId,",
          "      nextState: transition.to,",
          "    });",
        ]
      : useResolvedContributions
        ? [
            "    const workflowHandler = getWorkflowHandler();",
            "    await this.executeEffects(role, entityKey, recordId, transition.effects, store);",
            "    const updated = await workflowHandler.applyTransition({",
            "      store,",
            "      entityKey,",
            "      recordId,",
            "      nextState: transition.to,",
            "    });",
          ]
        : [
            "    await this.executeEffects(role, entityKey, recordId, transition.effects, store);",
            "    const updated = await store.update(entityKey, recordId, { status: transition.to });",
          ]),
    "    await store.appendAudit({ actor: role, action: event, entity: entityKey, recordId, at: new Date().toISOString() });",
    "    return updated;",
    ...(notificationOutbox ? ["    });"] : []),
    "  }",
    "",
    "  async auditLog(role: string): Promise<readonly AuditEvent[]> {",
    "    const permitted = definition.permissions.some((permission) =>",
    "      permission.role === role && permission.actions.includes('audit'),",
    "    );",
    "    if (!permitted) throw new Error(`Role '${role}' cannot read audit evidence.`);",
    "    return this.store.listAudit();",
    "  }",
    "",
    "  async capabilityEvents(role: string): Promise<readonly CapabilityEvent[]> {",
    "    if (!definition.permissions.some((permission) => permission.role === role && permission.actions.includes('audit'))) {",
    "      throw new Error(`Role '${role}' cannot read capability evidence.`);",
    "    }",
    "    return this.store.listCapabilityEvents();",
    "  }",
    "}",
    "",
    "export const applicationRuntime = new ApplicationRuntime();",
    "",
  ].join("\n");
}

function renderPrismaRecordStore(
  graph: ApplicationGraphV1,
  hasRestaurantRuntime: boolean,
  persistentOrderOperationReceipts: boolean,
  notificationOutbox: boolean,
): string {
  const commerce = hasCommerceCapabilities(graph);
  const capabilityOutcome = hasRestaurantRuntime ? "succeeded" : "completed";
  const delegates = Object.fromEntries(
    graph.domain.entities.map((entity) => [
      entity.key,
      toCamelCase(entity.key),
    ]),
  );
  return [
    'import { PrismaClient } from "@prisma/client";',
    `import type { AuditEvent, CapabilityEvent,${commerce ? " CommerceLineItem," : ""}${notificationOutbox ? " NotificationOutboxEntry, NotificationOutboxInput," : ""}${persistentOrderOperationReceipts ? " OrderOperationReceipt," : ""} RecordStore, StoredRecord } from "./application-runtime.js";`,
    "",
    "type CrudDelegate = {",
    "  findMany(): Promise<unknown[]>;",
    "  findUnique(input: { where: { id: string } }): Promise<unknown | null>;",
    "  create(input: { data: Record<string, unknown> }): Promise<unknown>;",
    "  update(input: { where: { id: string }; data: Record<string, unknown> }): Promise<unknown>;",
    "};",
    "type AuditDelegate = {",
    "  create(input: { data: Record<string, unknown> }): Promise<unknown>;",
    "  findMany(input: { orderBy: { at: 'asc' } }): Promise<unknown[]>;",
    "};",
    "type CapabilityDelegate = {",
    "  create(input: { data: Record<string, unknown> }): Promise<unknown>;",
    "  findMany(input: { orderBy: { at: 'asc' } }): Promise<unknown[]>;",
    "};",
    "type TransactionExecutor = { $transaction<T>(operation: (client: PrismaClient) => Promise<T>): Promise<T> };",
    ...(notificationOutbox
      ? [
          "type NotificationOutboxDelegate = {",
          "  upsert(input: { where: { dedupeKey: string }; update: Record<string, never>; create: Record<string, unknown> }): Promise<unknown>;",
          "  findMany(input: { where: { status: 'pending'; availableAt: { lte: Date } }; orderBy: readonly [{ availableAt: 'asc' }, { id: 'asc' }]; take: number }): Promise<unknown[]>;",
          "  findUnique(input: { where: { id: string } }): Promise<unknown | null>;",
          "  update(input: { where: { id: string }; data: Record<string, unknown> }): Promise<unknown>;",
          "  updateMany(input: { where: Record<string, unknown>; data: Record<string, unknown> }): Promise<{ count: number }>;",
          "};",
        ]
      : []),
    ...(persistentOrderOperationReceipts
      ? [
          "type OrderOperationReceiptDelegate = {",
          "  findUnique(input: { where: { orderEntity_orderRecordId: { orderEntity: string; orderRecordId: string } } }): Promise<unknown | null>;",
          "  upsert(input: { where: { orderEntity_orderRecordId: { orderEntity: string; orderRecordId: string } }; update: Record<string, unknown>; create: Record<string, unknown> }): Promise<unknown>;",
          "};",
        ]
      : []),
    ...(commerce
      ? [
          "type CommerceLineDelegate = {",
          "  create(input: { data: Record<string, unknown> }): Promise<unknown>;",
          "  findMany(input: { where: { orderEntity: string; orderRecordId: string }; orderBy: { createdAt: 'asc' } }): Promise<unknown[]>;",
          "};",
        ]
      : []),
    `const delegates: Readonly<Record<string, string>> = ${JSON.stringify(delegates, null, 2)};`,
    "",
    "function asStoredRecord(value: unknown): StoredRecord { return value as StoredRecord; }",
    ...(notificationOutbox
      ? [
          "function asNotificationOutboxEntry(value: unknown): NotificationOutboxEntry {",
          "  const entry = value as Omit<NotificationOutboxEntry, 'availableAt' | 'deliveredAt'> & { availableAt: Date; deliveredAt: Date | null };",
          "  return { ...entry, availableAt: entry.availableAt.toISOString(), deliveredAt: entry.deliveredAt?.toISOString() ?? null };",
          "}",
        ]
      : []),
    "",
    "export class PrismaRecordStore implements RecordStore {",
    "  constructor(private readonly prisma: PrismaClient) {}",
    "",
    "  private delegate(entityKey: string): CrudDelegate {",
    "    const delegateKey = delegates[entityKey];",
    "    if (!delegateKey) throw new Error(`Unknown persisted entity '${entityKey}'.`);",
    "    const client = this.prisma as unknown as Record<string, CrudDelegate>;",
    "    return client[delegateKey]!;",
    "  }",
    "",
    "  private auditDelegate(): AuditDelegate {",
    "    return (this.prisma as unknown as { auditEvent: AuditDelegate }).auditEvent;",
    "  }",
    "",
    "  private capabilityDelegate(): CapabilityDelegate {",
    "    return (this.prisma as unknown as { capabilityEvent: CapabilityDelegate }).capabilityEvent;",
    "  }",
    ...(notificationOutbox
      ? [
          "  private notificationOutboxDelegate(): NotificationOutboxDelegate {",
          "    return (this.prisma as unknown as { notificationOutbox: NotificationOutboxDelegate }).notificationOutbox;",
          "  }",
        ]
      : []),
    ...(persistentOrderOperationReceipts
      ? [
          "  private orderOperationReceiptDelegate(): OrderOperationReceiptDelegate {",
          "    return (this.prisma as unknown as { orderOperationReceipt: OrderOperationReceiptDelegate }).orderOperationReceipt;",
          "  }",
        ]
      : []),
    ...(commerce
      ? [
          "",
          "  private commerceLineDelegate(): CommerceLineDelegate {",
          "    return (this.prisma as unknown as { commerceLineItem: CommerceLineDelegate }).commerceLineItem;",
          "  }",
        ]
      : []),
    "",
    "  async list(entityKey: string): Promise<readonly StoredRecord[]> {",
    "    return (await this.delegate(entityKey).findMany()).map(asStoredRecord);",
    "  }",
    "",
    "  async find(entityKey: string, recordId: string): Promise<StoredRecord | undefined> {",
    "    const record = await this.delegate(entityKey).findUnique({ where: { id: recordId } });",
    "    return record ? asStoredRecord(record) : undefined;",
    "  }",
    "",
    "  async create(entityKey: string, input: Record<string, unknown>): Promise<StoredRecord> {",
    "    return asStoredRecord(await this.delegate(entityKey).create({ data: input }));",
    "  }",
    "",
    "  async update(entityKey: string, recordId: string, input: Record<string, unknown>): Promise<StoredRecord> {",
    "    return asStoredRecord(await this.delegate(entityKey).update({ where: { id: recordId }, data: input }));",
    "  }",
    "",
    "  async appendAudit(event: AuditEvent): Promise<void> {",
    "    await this.auditDelegate().create({ data: { ...event, at: new Date(event.at) } });",
    "  }",
    "",
    "  async listAudit(): Promise<readonly AuditEvent[]> {",
    "    return (await this.auditDelegate().findMany({ orderBy: { at: 'asc' } })).map((entry) => {",
    "      const event = entry as Omit<AuditEvent, 'at'> & { at: Date };",
    "      return { ...event, at: event.at.toISOString() };",
    "    });",
    "  }",
    "",
    "  async appendCapabilityEvent(event: CapabilityEvent): Promise<void> {",
    "    await this.capabilityDelegate().create({ data: { ...event, at: new Date(event.at) } });",
    "  }",
    "",
    "  async listCapabilityEvents(): Promise<readonly CapabilityEvent[]> {",
    "    return (await this.capabilityDelegate().findMany({ orderBy: { at: 'asc' } })).map((entry) => {",
    "      const event = entry as Omit<CapabilityEvent, 'at'> & { at: Date };",
    `      return { ...event, at: event.at.toISOString(), outcome: '${capabilityOutcome}' as const };`,
    "    });",
    "  }",
    "  async inTransaction<T>(operation: (store: RecordStore) => Promise<T>): Promise<T> {",
    "    return (this.prisma as unknown as TransactionExecutor).$transaction(async (client) => operation(new PrismaRecordStore(client)));",
    "  }",
    ...(notificationOutbox
      ? [
          "  async enqueueNotification(input: NotificationOutboxInput): Promise<NotificationOutboxEntry> {",
          "    return asNotificationOutboxEntry(await this.notificationOutboxDelegate().upsert({",
          "      where: { dedupeKey: input.dedupeKey },",
          "      update: {},",
          "      create: { ...input, availableAt: new Date(input.availableAt) },",
          "    }));",
          "  }",
          "  async claimDueNotifications(now: string, limit: number): Promise<readonly NotificationOutboxEntry[]> {",
          "    if (!Number.isSafeInteger(limit) || limit < 1) return [];",
          "    const dueAt = new Date(now);",
          "    const claimUntil = new Date(dueAt.getTime() + 300_000);",
          "    const due = (await this.notificationOutboxDelegate().findMany({ where: { status: 'pending', availableAt: { lte: dueAt } }, orderBy: [{ availableAt: 'asc' }, { id: 'asc' }], take: limit })).map(asNotificationOutboxEntry);",
          "    const claimed: NotificationOutboxEntry[] = [];",
          "    for (const entry of due) {",
          "      const result = await this.notificationOutboxDelegate().updateMany({ where: { id: entry.id, status: 'pending', availableAt: { lte: dueAt } }, data: { availableAt: claimUntil } });",
          "      if (result.count === 1) claimed.push({ ...entry, availableAt: claimUntil.toISOString() });",
          "    }",
          "    return claimed;",
          "  }",
          "  async markNotificationDelivered(id: string, deliveredAt: string): Promise<void> {",
          "    const result = await this.notificationOutboxDelegate().updateMany({ where: { id, status: 'pending' }, data: { status: 'delivered', deliveredAt: new Date(deliveredAt), lastError: null } });",
          "    if (result.count === 1) return;",
          "    const value = await this.notificationOutboxDelegate().findUnique({ where: { id } });",
          "    if (!value) throw new Error(`Notification outbox entry '${id}' was not found.`);",
          "  }",
          "  async recordNotificationFailure(id: string, error: string, status: 'pending' | 'failed', availableAt: string): Promise<NotificationOutboxEntry> {",
          "    const result = await this.notificationOutboxDelegate().updateMany({ where: { id, status: 'pending' }, data: { attempts: { increment: 1 }, status, availableAt: new Date(availableAt), lastError: error.slice(0, 500) } });",
          "    if (result.count === 1) return asNotificationOutboxEntry((await this.notificationOutboxDelegate().findUnique({ where: { id } }))!);",
          "    const value = await this.notificationOutboxDelegate().findUnique({ where: { id } });",
          "    if (!value) throw new Error(`Notification outbox entry '${id}' was not found.`);",
          "    return asNotificationOutboxEntry(value);",
          "  }",
        ]
      : []),
    ...(persistentOrderOperationReceipts
      ? [
          "  async getOrderOperationReceipt(orderEntity: string, orderRecordId: string): Promise<OrderOperationReceipt | undefined> {",
          "    const receipt = await this.orderOperationReceiptDelegate().findUnique({ where: { orderEntity_orderRecordId: { orderEntity, orderRecordId } } });",
          "    if (!receipt) return undefined;",
          "    const entry = receipt as { orderEntity: string; orderRecordId: string; due: string; captured: string; refunded: string; processedIdempotencyKeys: string[] };",
          "    return { orderEntity: entry.orderEntity, orderRecordId: entry.orderRecordId, payment: { due: entry.due, captured: entry.captured, refunded: entry.refunded }, processedIdempotencyKeys: entry.processedIdempotencyKeys };",
          "  }",
          "  async saveOrderOperationReceipt(receipt: OrderOperationReceipt): Promise<void> {",
          "    const data = { due: receipt.payment.due, captured: receipt.payment.captured, refunded: receipt.payment.refunded, processedIdempotencyKeys: [...receipt.processedIdempotencyKeys] };",
          "    await this.orderOperationReceiptDelegate().upsert({",
          "      where: { orderEntity_orderRecordId: { orderEntity: receipt.orderEntity, orderRecordId: receipt.orderRecordId } },",
          "      update: data,",
          "      create: { orderEntity: receipt.orderEntity, orderRecordId: receipt.orderRecordId, ...data },",
          "    });",
          "  }",
        ]
      : []),
    ...(commerce
      ? [
          "",
          "  async addCartItem(input: Omit<CommerceLineItem, 'id'>): Promise<CommerceLineItem> {",
          "    return asStoredRecord(await this.commerceLineDelegate().create({ data: input })) as CommerceLineItem;",
          "  }",
          "",
          "  async listCartItems(orderEntity: string, orderRecordId: string): Promise<readonly CommerceLineItem[]> {",
          "    return (await this.commerceLineDelegate().findMany({ where: { orderEntity, orderRecordId }, orderBy: { createdAt: 'asc' } })) as CommerceLineItem[];",
          "  }",
          "",
          "  async adjustInventory(entityKey: string, recordId: string, fieldKey: string, delta: number): Promise<StoredRecord> {",
          "    const record = await this.find(entityKey, recordId);",
          "    if (!record || typeof record[fieldKey] !== 'number') throw new Error(`Catalog record '${recordId}' has no numeric '${fieldKey}' field.`);",
          "    if (!Number.isInteger(delta)) throw new Error('Inventory adjustment must be an integer.');",
          "    const next = (record[fieldKey] as number) + delta;",
          "    if (next < 0) throw new Error(`Catalog record '${recordId}' has insufficient stock.`);",
          "    return this.update(entityKey, recordId, { [fieldKey]: next });",
          "  }",
          "  async decrementInventory(entityKey: string, recordId: string, quantity: number): Promise<StoredRecord> {",
          "    return this.adjustInventory(entityKey, recordId, 'stock', -quantity);",
          "  }",
        ]
      : []),
    "}",
    "",
  ].join("\n");
}

function renderWebRootPage(): string {
  return [
    'import { GeneratedApplication } from "./page-runtime";',
    "",
    "export default function GeneratedRootPage() {",
    '  return <GeneratedApplication requestedPath="/" />;',
    "}",
    "",
  ].join("\n");
}

function renderWebCatchAllPage(restaurant = false): string {
  return [
    'import { GeneratedApplication } from "../page-runtime";',
    ...(restaurant
      ? [
          'import { RestaurantMerchantApplication } from "../restaurant-merchant-runtime";',
        ]
      : []),
    "",
    "type RouteProps = { params: Promise<{ path: string[] }> };",
    "",
    "export default async function GeneratedRoutePage({ params }: RouteProps) {",
    "  const { path } = await params;",
    '  const requestedPath = `/${path.map(encodeURIComponent).join("/")}`;',
    ...(restaurant
      ? [
          '  if (requestedPath.startsWith("/merchant/")) return <RestaurantMerchantApplication requestedPath={requestedPath} />;',
        ]
      : []),
    "  return <GeneratedApplication requestedPath={requestedPath} />;",
    "}",
    "",
  ].join("\n");
}

function renderFaviconRoute(): string {
  return [
    "export function GET() {",
    '  return new Response(\'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="16" fill="#0b766e"/><path d="M17 32h30M32 17v30" stroke="white" stroke-width="6" stroke-linecap="round"/></svg>\', { headers: { \'content-type\': \'image/svg+xml\', \'cache-control\': \'public, max-age=86400\' } });',
    "}",
    "",
  ].join("\n");
}

function renderPageRuntime(
  graph: ApplicationGraphV1,
  orderEntityKey: string | undefined,
  useFixtureSessions: boolean,
): string {
  const projection = createGeneratedPageRuntimeProjection(graph, {
    ...(orderEntityKey ? { orderEntity: orderEntityKey } : {}),
  });
  const runtimeDefinition = {
    applicationName: graph.metadata.name,
    themeMode: graph.experience.theme.mode,
    entities: graph.domain.entities.map((entity) => ({
      key: entity.key,
      label: entity.label,
      fields: entity.fields.map((field) => ({
        key: field.key,
        required: field.required,
      })),
    })),
    policy: graph.policy,
    flow: {
      flows: graph.flow.flows.map((flow) => ({
        entity: flow.entity,
        transitions: flow.transitions.map((transition) => ({
          from: transition.from,
          event: transition.event,
          to: transition.to,
          roles: transition.roles ?? [],
        })),
      })),
    },
    commerce: projection.commerce,
  };
  const serializedProjection = JSON.stringify(projection, null, 2).replaceAll(
    "<",
    "\\u003c",
  );
  const serializedDefinition = JSON.stringify(
    runtimeDefinition,
    null,
    2,
  ).replaceAll("<", "\\u003c");

  return [
    '"use client";',
    "",
    'import { useEffect, useState } from "react";',
    "",
    "type JsonRecord = Record<string, unknown>;",
    "type PageRuntimeBlock = { readonly id: string; readonly type: 'hero' | 'form' | 'collection' | 'catalog' | 'catalog-configurator' | 'cart' | 'queue' | 'checkout'; readonly entity?: string; readonly props: Readonly<Record<string, string>> };",
    "type PageRuntimeProjection = { readonly apiVersion: 'factory.generated-page-runtime/v1'; readonly applicationName: string; readonly themeMode: 'light' | 'dark' | 'system'; readonly pages: readonly { readonly id: string; readonly route: string; readonly title: string; readonly blocks: readonly PageRuntimeBlock[] }[]; readonly navigation: readonly { readonly id: string; readonly label: string; readonly route: string }[]; readonly routeFallback: { readonly rootRoute: string | null; readonly unknownRoute: 'not-found' }; readonly commerce: { readonly orderEntity: string | null; readonly paymentEvent: string | null } };",
    "type RuntimeEntity = { readonly key: string; readonly label: string; readonly fields: readonly { readonly key: string; readonly required: boolean }[] };",
    "type RuntimeDefinition = { readonly applicationName: string; readonly themeMode: 'light' | 'dark' | 'system'; readonly entities: readonly RuntimeEntity[]; readonly policy: { readonly roles: readonly string[]; readonly permissions: readonly { readonly role: string; readonly resource: string; readonly actions: readonly string[] }[] }; readonly flow: { readonly flows: readonly { readonly entity: string; readonly transitions: readonly { readonly from: string; readonly event: string; readonly to: string; readonly roles: readonly string[] }[] }[] }; readonly commerce: { readonly orderEntity: string | null; readonly paymentEvent: string | null } };",
    "type BlockContext = { readonly role: string; readonly formRouteByEntity: Readonly<Record<string, string>>; readonly checkoutRoute: string | null; readonly cartItems: readonly JsonRecord[]; readonly cartId: string | null; readonly reportError: (reason: unknown) => void; readonly addToCart: (catalogEntity: string, catalogRecordId: string) => Promise<void>; readonly configureLine: (catalogEntity: string, catalogRecordId: string, optionIds: readonly string[]) => Promise<JsonRecord>; readonly checkoutCart: () => Promise<void> };",
    "",
    `const projection: PageRuntimeProjection = ${serializedProjection};`,
    `const definition: RuntimeDefinition = ${serializedDefinition};`,
    "",
    "function can(role: string, entity: string, action: string): boolean {",
    "  return definition.policy.permissions.some((permission) => permission.role === role && (permission.resource === entity || permission.resource === '*') && permission.actions.includes(action));",
    "}",
    "",
    "function canTriggerEvent(role: string, entity: string, event: string): boolean {",
    "  const transitions = definition.flow.flows.find((flow) => flow.entity === entity)?.transitions.filter((transition) => transition.event === event) ?? [];",
    "  return transitions.some((transition) => transition.roles.length ? transition.roles.includes(role) && (can(role, entity, event) || can(role, entity, 'update')) : can(role, entity, 'read'));",
    "}",
    "",
    "function requestHeaders(role: string): HeadersInit {",
    useFixtureSessions
      ? "  return { 'content-type': 'application/json', 'x-factory-fixture-session': `fixture-session-${role}` };"
      : "  return { 'content-type': 'application/json', 'x-factory-role': role };",
    "}",
    "",
    "function entityFor(key: string | undefined): RuntimeEntity | undefined {",
    "  return definition.entities.find((entity) => entity.key === key);",
    "}",
    "",
    "function errorMessage(reason: unknown): string {",
    "  return reason instanceof Error ? reason.message : 'The request could not be completed.';",
    "}",
    "",
    "function transitionBody(entityKey: string, record: JsonRecord, event: string): string {",
    "  if (entityKey !== definition.commerce.orderEntity) return '{}';",
    "  const version = Number(record.version);",
    "  const recordId = String(record.id ?? '');",
    "  if (!Number.isSafeInteger(version) || version < 0 || !recordId) throw new Error('The order version is invalid.');",
    "  return JSON.stringify({ expectedVersion: version, idempotencyKey: `generated-web-${recordId}-${event}-${version}` });",
    "}",
    "",
    "function useEntityRecords(entity: RuntimeEntity, role: string, allowed: boolean) {",
    "  const [records, setRecords] = useState<readonly JsonRecord[]>([]);",
    "  const [error, setError] = useState<string | null>(null);",
    "  const refresh = async () => {",
    "    if (!allowed) { setRecords([]); return; }",
    "    const response = await fetch(\`/api/${entity.key}\`, { headers: requestHeaders(role) });",
    "    if (!response.ok) throw new Error(await response.text());",
    "    setRecords(await response.json() as readonly JsonRecord[]);",
    "  };",
    "  useEffect(() => {",
    "    if (!allowed) { setRecords([]); return; }",
    "    void refresh().catch((reason) => setError(errorMessage(reason)));",
    "  }, [entity.key, role, allowed]);",
    "  return { records, error, refresh };",
    "}",
    "",
    "function HeroBlock({ block }: { readonly block: PageRuntimeBlock }) {",
    "  const primaryNavigation = projection.navigation[0];",
    "  return <section className='generated-hero'><p>{block.props.eyebrow ?? 'Published Graph'}</p><h1>{block.props.heading ?? block.props.title ?? projection.applicationName}</h1>{primaryNavigation ? <a className='generated-primary' href={primaryNavigation.route}>{primaryNavigation.label}</a> : null}</section>;",
    "}",
    "",
    "function FormBlock({ block, entity, role, reportError }: { readonly block: PageRuntimeBlock; readonly entity: RuntimeEntity; readonly role: string; readonly reportError: (reason: unknown) => void }) {",
    "  const [values, setValues] = useState<Record<string, string>>({});",
    "  const fields = entity.fields.filter((field) => field.key !== 'status');",
    "  if (!can(role, entity.key, 'create')) return <section className='generated-card'><h2>{block.props.title ?? \`Create ${entity.label}\`}</h2><p>Your selected role cannot create this record.</p></section>;",
    "  const createRecord = async () => {",
    "    const payload = Object.fromEntries(fields.map((field) => [field.key, values[field.key] ?? '']));",
    "    const response = await fetch(\`/api/${entity.key}\`, { method: 'POST', headers: requestHeaders(role), body: JSON.stringify(payload) });",
    "    if (!response.ok) throw new Error(await response.text());",
    "    setValues({});",
    "  };",
    "  return <section className='generated-card'><h2>{block.props.title ?? \`Create ${entity.label}\`}</h2><form onSubmit={(event) => { event.preventDefault(); void createRecord().catch(reportError); }}>{fields.map((field) => <label key={field.key}>{field.key}<input required={field.required} value={values[field.key] ?? ''} onChange={(event) => setValues((current) => ({ ...current, [field.key]: event.target.value }))} /></label>)}<button className='generated-primary' type='submit'>Create {entity.label}</button></form></section>;",
    "}",
    "",
    "function EntityRecords({ block, entity, role, formRoute, reportError }: { readonly block: PageRuntimeBlock; readonly entity: RuntimeEntity; readonly role: string; readonly formRoute?: string; readonly reportError: (reason: unknown) => void }) {",
    "  const allowed = can(role, entity.key, 'read');",
    "  const { records, error, refresh } = useEntityRecords(entity, role, allowed);",
    "  const events = definition.flow.flows.find((flow) => flow.entity === entity.key)?.transitions.map((transition) => transition.event) ?? [];",
    "  const transition = async (record: JsonRecord, event: string) => {",
    "    const recordId = String(record.id);",
    "    const response = await fetch(\`/api/${entity.key}/${recordId}/events/${event}\`, { method: 'POST', headers: requestHeaders(role), body: transitionBody(entity.key, record, event) });",
    "    if (!response.ok) throw new Error(await response.text());",
    "    await refresh();",
    "  };",
    "  if (!allowed) return <section className='generated-card'><h2>{block.props.title ?? entity.label}</h2><p>Your selected role cannot read these records.</p></section>;",
    "  return <section className='generated-card'><div className='generated-section-heading'><div><p>{block.type}</p><h2>{block.props.title ?? entity.label}</h2></div><div>{formRoute ? <a href={formRoute}>New {entity.label.toLowerCase()}</a> : null}<button type='button' onClick={() => void refresh().catch(reportError)}>Refresh</button></div></div>{error ? <p className='generated-error' role='alert'>{error}</p> : null}<ul className='generated-records'>{records.map((record) => <li key={String(record.id)}><code>{JSON.stringify(record)}</code><span>{events.filter((event) => canTriggerEvent(role, entity.key, event)).map((event) => <button key={event} type='button' onClick={() => void transition(record, event).catch(reportError)}>{event}</button>)}</span></li>)}</ul></section>;",
    "}",
    "",
    "function CollectionBlock({ block, entity, context }: { readonly block: PageRuntimeBlock; readonly entity: RuntimeEntity; readonly context: BlockContext }) {",
    "  return <EntityRecords block={block} entity={entity} role={context.role} formRoute={context.formRouteByEntity[entity.key]} reportError={context.reportError} />;",
    "}",
    "",
    "function QueueBlock({ block, entity, context }: { readonly block: PageRuntimeBlock; readonly entity: RuntimeEntity; readonly context: BlockContext }) {",
    "  return <EntityRecords block={block} entity={entity} role={context.role} reportError={context.reportError} />;",
    "}",
    "",
    "function CatalogBlock({ block, entity, context }: { readonly block: PageRuntimeBlock; readonly entity: RuntimeEntity; readonly context: BlockContext }) {",
    "  const allowed = can(context.role, entity.key, 'read');",
    "  const { records, error, refresh } = useEntityRecords(entity, context.role, allowed);",
    "  const mayAddToCart = definition.commerce.orderEntity !== null && can(context.role, definition.commerce.orderEntity, 'create');",
    "  if (!allowed) return <section className='generated-card'><h2>{block.props.title ?? entity.label}</h2><p>Your selected role cannot read this catalog.</p></section>;",
    "  return <section className='generated-card'><div className='generated-section-heading'><div><p>catalog</p><h2>{block.props.title ?? entity.label}</h2></div><button type='button' onClick={() => void refresh().catch(context.reportError)}>Refresh</button></div>{error ? <p className='generated-error' role='alert'>{error}</p> : null}<ul className='generated-records'>{records.map((record) => <li key={String(record.id)}><code>{JSON.stringify(record)}</code>{mayAddToCart ? <button className='generated-primary' type='button' onClick={() => void context.addToCart(entity.key, String(record.id)).catch(context.reportError)}>Add to cart</button> : null}</li>)}</ul><CartSummary context={context} /></section>;",
    "}",
    "",
    "function CatalogConfiguratorBlock({ block, entity, context }: { readonly block: PageRuntimeBlock; readonly entity: RuntimeEntity; readonly context: BlockContext }) {",
    "  const allowed = can(context.role, entity.key, 'read');",
    "  const { records, error, refresh } = useEntityRecords(entity, context.role, allowed);",
    "  const [catalogRecordId, setCatalogRecordId] = useState('');",
    "  const [optionIds, setOptionIds] = useState('');",
    "  const [configured, setConfigured] = useState<JsonRecord | null>(null);",
    "  if (!allowed) return <section className='generated-card'><h2>{block.props.title ?? 'Configure options'}</h2><p>Your selected role cannot read this catalog.</p></section>;",
    "  const submit = async () => { const selected = optionIds.split(',').map((option) => option.trim()).filter(Boolean); setConfigured(await context.configureLine(entity.key, catalogRecordId, selected)); };",
    "  return <section className='generated-card'><div className='generated-section-heading'><div><p>Server-authoritative selection</p><h2>{block.props.title ?? 'Configure options'}</h2></div><button type='button' onClick={() => void refresh().catch(context.reportError)}>Refresh</button></div>{error ? <p className='generated-error' role='alert'>{error}</p> : null}<form onSubmit={(event) => { event.preventDefault(); void submit().catch(context.reportError); }}><label>Catalog item<select required value={catalogRecordId} onChange={(event) => setCatalogRecordId(event.target.value)}><option value=''>Choose an item</option>{records.map((record) => <option key={String(record.id)} value={String(record.id)}>{String(record.name ?? record.id)}</option>)}</select></label><label>Option identifiers<input value={optionIds} onChange={(event) => setOptionIds(event.target.value)} placeholder='option-a, option-b' /></label><button className='generated-primary' type='submit'>Validate selection</button></form>{configured ? <pre className='generated-records'>{JSON.stringify(configured, null, 2)}</pre> : null}</section>;",
    "}",
    "",
    "function CartSummary({ context, checkout = false }: { readonly context: BlockContext; readonly checkout?: boolean }) {",
    "  if (!definition.commerce.orderEntity) return null;",
    "  const mayPay = context.cartId && definition.commerce.paymentEvent && canTriggerEvent(context.role, definition.commerce.orderEntity, definition.commerce.paymentEvent);",
    "  const control = !mayPay ? null : checkout || !context.checkoutRoute ? <button className='generated-primary' type='button' onClick={() => void context.checkoutCart().catch(context.reportError)}>Pay simulated payment</button> : <a className='generated-primary' href={context.checkoutRoute}>Continue to checkout</a>;",
    "  return <section className='generated-cart-summary'><h3>Cart</h3><p>{context.cartItems.length} item{context.cartItems.length === 1 ? '' : 's'}</p>{control}</section>;",
    "}",
    "",
    "function CartBlock({ block, context }: { readonly block: PageRuntimeBlock; readonly context: BlockContext }) {",
    "  return <section className='generated-card'><h2>{block.props.title ?? 'Cart'}</h2><CartSummary context={context} /><ul className='generated-records'>{context.cartItems.map((item, index) => <li key={\`${String(item.id)}-${index}\`}><code>{JSON.stringify(item)}</code></li>)}</ul></section>;",
    "}",
    "",
    "function CheckoutBlock({ block, context }: { readonly block: PageRuntimeBlock; readonly context: BlockContext }) {",
    "  return <section className='generated-card'><h2>{block.props.title ?? 'Checkout'}</h2><p>Payment can only run through the declared checkout flow.</p><CartSummary context={context} checkout /></section>;",
    "}",
    "",
    "function BlockRenderer({ block, context }: { readonly block: PageRuntimeBlock; readonly context: BlockContext }) {",
    "  const entity = entityFor(block.entity);",
    "  if (block.type === 'hero') return <HeroBlock block={block} />;",
    "  if (!entity) return null;",
    "  if (block.type === 'form') return <FormBlock block={block} entity={entity} role={context.role} reportError={context.reportError} />;",
    "  if (block.type === 'collection') return <CollectionBlock block={block} entity={entity} context={context} />;",
    "  if (block.type === 'catalog') return <CatalogBlock block={block} entity={entity} context={context} />;",
    "  if (block.type === 'catalog-configurator') return <CatalogConfiguratorBlock block={block} entity={entity} context={context} />;",
    "  if (block.type === 'cart') return <CartBlock block={block} context={context} />;",
    "  if (block.type === 'queue') return <QueueBlock block={block} entity={entity} context={context} />;",
    "  if (block.type === 'checkout') return <CheckoutBlock block={block} context={context} />;",
    "  return null;",
    "}",
    "",
    "export function GeneratedApplication({ requestedPath }: { readonly requestedPath: string }) {",
    "  const [role, setRole] = useState(definition.policy.roles[0] ?? 'anonymous');",
    "  const [error, setError] = useState<string | null>(null);",
    "  const [cartId, setCartId] = useState<string | null>(null);",
    "  const [cartItems, setCartItems] = useState<readonly JsonRecord[]>([]);",
    "  const reportError = (reason: unknown) => setError(errorMessage(reason));",
    "  const formRouteByEntity = Object.fromEntries(projection.pages.flatMap((page) => page.blocks.filter((block) => block.type === 'form' && block.entity).map((block) => [block.entity as string, page.route])));",
    "  const checkoutRoute = projection.pages.find((page) => page.blocks.some((block) => block.type === 'checkout'))?.route ?? null;",
    "  const refreshCart = async (activeCartId: string) => {",
    "    if (!definition.commerce.orderEntity) return;",
    "    const response = await fetch(\`/api/commerce/${definition.commerce.orderEntity}/${activeCartId}/items\`, { headers: requestHeaders(role) });",
    "    if (!response.ok) throw new Error(await response.text());",
    "    setCartItems(await response.json() as readonly JsonRecord[]);",
    "  };",
    "  useEffect(() => {",
    "    const storedCartId = window.sessionStorage.getItem('factory.generated.cart-id');",
    "    if (!storedCartId || !definition.commerce.orderEntity) return;",
    "    setCartId(storedCartId);",
    "    void fetch(`/api/commerce/${definition.commerce.orderEntity}/${storedCartId}/items`, { headers: requestHeaders(role) }).then(async (response) => { if (!response.ok) throw new Error(await response.text()); setCartItems(await response.json() as readonly JsonRecord[]); }).catch(reportError);",
    "  }, [role]);",
    "  const addToCart = async (catalogEntity: string, catalogRecordId: string) => {",
    "    const orderEntity = definition.commerce.orderEntity;",
    "    if (!orderEntity || !can(role, orderEntity, 'create')) throw new Error('Your selected role cannot create a cart.');",
    "    let activeCartId = cartId;",
    "    if (!activeCartId) {",
    "      const created = await fetch(\`/api/${orderEntity}\`, { method: 'POST', headers: requestHeaders(role), body: '{}' });",
    "      if (!created.ok) throw new Error(await created.text());",
    "      const cart = await created.json() as JsonRecord;",
    "      activeCartId = String(cart.id);",
    "      setCartId(activeCartId);",
    "      window.sessionStorage.setItem('factory.generated.cart-id', activeCartId);",
    "    }",
    "    const response = await fetch(\`/api/commerce/${orderEntity}/${activeCartId}/items\`, { method: 'POST', headers: requestHeaders(role), body: JSON.stringify({ catalogEntity, catalogRecordId, quantity: 1 }) });",
    "    if (!response.ok) throw new Error(await response.text());",
    "    await refreshCart(activeCartId);",
    "  };",
    "  const configureLine = async (catalogEntity: string, catalogRecordId: string, optionIds: readonly string[]): Promise<JsonRecord> => {",
    "    const response = await fetch('/api/commerce/configure-line', { method: 'POST', headers: requestHeaders(role), body: JSON.stringify({ catalogEntity, catalogRecordId, optionIds, quantity: 1 }) });",
    "    if (!response.ok) throw new Error(await response.text());",
    "    return await response.json() as JsonRecord;",
    "  };",
    "  const checkoutCart = async () => {",
    "    const orderEntity = definition.commerce.orderEntity;",
    "    const paymentEvent = definition.commerce.paymentEvent;",
    "    if (!orderEntity || !paymentEvent || !cartId || !canTriggerEvent(role, orderEntity, paymentEvent)) throw new Error('Checkout is not available for your selected role.');",
    "    const orders = await fetch(\`/api/${orderEntity}\`, { headers: requestHeaders(role) });",
    "    if (!orders.ok) throw new Error(await orders.text());",
    "    let order = (await orders.json() as readonly JsonRecord[]).find((candidate) => String(candidate.id) === cartId);",
    "    if (!order) throw new Error('The checkout cart no longer exists.');",
    "    const transitions = definition.flow.flows.find((flow) => flow.entity === orderEntity)?.transitions ?? [];",
    "    const trigger = async (event: string) => { const response = await fetch(\`/api/${orderEntity}/${cartId}/events/${event}\`, { method: 'POST', headers: requestHeaders(role), body: transitionBody(orderEntity, order!, event) }); if (!response.ok) throw new Error(await response.text()); order = await response.json() as JsonRecord; };",
    "    if (order.status === 'cart') { const submit = transitions.find((transition) => transition.from === 'cart' && transition.to === 'submitted'); if (!submit || !canTriggerEvent(role, orderEntity, submit.event)) throw new Error('The declared order flow cannot submit this cart.'); await trigger(submit.event); }",
    "    if (order.status === 'submitted') await trigger(paymentEvent);",
    "    if (order.status !== 'paid') throw new Error('The declared order flow did not reach a paid state.');",
    "    setCartId(null);",
    "    setCartItems([]);",
    "    window.sessionStorage.removeItem('factory.generated.cart-id');",
    "  };",
    "  const requestedRoute = requestedPath === '/' ? projection.routeFallback.rootRoute ?? '/' : requestedPath;",
    "  const activePage = projection.pages.find((page) => page.route === requestedRoute);",
    "  if (!activePage) return <main className='generated-app' data-theme={definition.themeMode}><section className='generated-card'><p>Not found</p><h1>Declared route unavailable</h1><a href={projection.routeFallback.rootRoute ?? '/'}>Return to the application</a></section></main>;",
    "  const context: BlockContext = { role, formRouteByEntity, checkoutRoute, cartItems, cartId, reportError, addToCart, configureLine, checkoutCart };",
    "  return <main className='generated-app' data-theme={definition.themeMode}><header className='generated-header'><div><p>Published Graph application</p><h1>{definition.applicationName}</h1></div><label>Role<select value={role} onChange={(event) => setRole(event.target.value)}>{definition.policy.roles.map((candidate) => <option key={candidate} value={candidate}>{candidate}</option>)}</select></label></header><nav aria-label='Application routes'>{projection.navigation.map((item) => <a href={item.route} key={item.id}>{item.label}</a>)}</nav>{error ? <p className='generated-error' role='alert'>{error}</p> : null}<section className='generated-page'>{activePage.blocks.map((block) => <BlockRenderer key={block.id} block={block} context={context} />)}</section></main>;",
    "}",
    "",
  ].join("\n");
}

function renderWebProxyRoute(
  restaurant: boolean,
  useFixtureSessions: boolean,
): string {
  return [
    'export const dynamic = "force-dynamic";',
    "",
    "type RouteContext = { params: Promise<{ path: string[] }> };",
    "",
    "async function proxy(request: Request, context: RouteContext): Promise<Response> {",
    "  const { path } = await context.params;",
    "  const incoming = new URL(request.url);",
    "  const upstream = new URL(`/api/${path.map(encodeURIComponent).join('/')}`, process.env.FACTORY_API_URL ?? process.env.NEXT_PUBLIC_FACTORY_API_URL ?? 'http://localhost:3001');",
    "  upstream.search = incoming.search;",
    ...(restaurant
      ? [
          "  const forwardedHeaders: Record<string, string> = { 'content-type': request.headers.get('content-type') ?? 'application/json', 'x-factory-role': request.headers.get('x-factory-role') ?? 'anonymous' };",
          "  const sessionToken = request.headers.get('x-factory-table-session-token');",
          "  const idempotencyKey = request.headers.get('x-factory-idempotency-key');",
          "  if (sessionToken) forwardedHeaders['x-factory-table-session-token'] = sessionToken;",
          "  if (idempotencyKey) forwardedHeaders['x-factory-idempotency-key'] = idempotencyKey;",
        ]
      : []),
    "  const response = await fetch(upstream, {",
    "    method: request.method,",
    restaurant
      ? "    headers: forwardedHeaders,"
      : useFixtureSessions
        ? "    headers: { 'content-type': request.headers.get('content-type') ?? 'application/json', 'x-factory-fixture-session': request.headers.get('x-factory-fixture-session') ?? '' },"
        : "    headers: { 'content-type': request.headers.get('content-type') ?? 'application/json', 'x-factory-role': request.headers.get('x-factory-role') ?? 'anonymous' },",
    "    body: ['GET', 'HEAD'].includes(request.method) ? undefined : await request.text(),",
    "  });",
    "  return new Response(await response.text(), { status: response.status, headers: { 'content-type': response.headers.get('content-type') ?? 'application/json' } });",
    "}",
    "",
    "export const GET = proxy;",
    "export const POST = proxy;",
    ...(restaurant ? ["export const PATCH = proxy;"] : []),
    "",
  ].join("\n");
}

function renderWebStyles(): string {
  const lightTheme =
    "--factory-bg: #f5f7f8; --factory-surface: #ffffff; --factory-surface-muted: #edf2f3; --factory-text: #152225; --factory-muted: #52646a; --factory-border: #cbd7da; --factory-accent: #0b766e; --factory-accent-text: #ffffff; --factory-danger: #b42318;";
  const darkTheme =
    "--factory-bg: #10191b; --factory-surface: #182426; --factory-surface-muted: #223235; --factory-text: #e8f1f2; --factory-muted: #b3c4c7; --factory-border: #3b5155; --factory-accent: #55c9ba; --factory-accent-text: #062522; --factory-danger: #ffb4ab;";
  return [
    ":root { font-family: Inter, ui-sans-serif, system-ui, sans-serif; }",
    `.generated-app[data-theme='light'] { color-scheme: light; ${lightTheme} }`,
    `.generated-app[data-theme='dark'] { color-scheme: dark; ${darkTheme} }`,
    `.generated-app[data-theme='system'] { color-scheme: light dark; ${lightTheme} }`,
    `@media (prefers-color-scheme: dark) { .generated-app[data-theme='system'] { ${darkTheme} } }`,
    "* { box-sizing: border-box; } body { margin: 0; } button, input, select { font: inherit; }",
    ".generated-app { min-height: 100vh; margin: 0; padding: 40px max(20px, calc((100vw - 1120px) / 2)); background: var(--factory-bg); color: var(--factory-text); }",
    ".generated-header, .generated-section-heading, .generated-app nav, .generated-records li { display: flex; align-items: center; gap: 16px; } .generated-header, .generated-section-heading { justify-content: space-between; } .generated-app h1, .generated-app h2, .generated-app h3, .generated-app p { margin: 0; } .generated-app p { color: var(--factory-muted); }",
    ".generated-app nav { flex-wrap: wrap; margin: 24px 0; } .generated-app a, .generated-app button { border: 1px solid var(--factory-border); border-radius: 8px; padding: 8px 12px; background: var(--factory-surface); color: inherit; text-decoration: none; cursor: pointer; } .generated-app button:disabled { cursor: not-allowed; opacity: .55; } .generated-primary { border-color: var(--factory-accent) !important; background: var(--factory-accent) !important; color: var(--factory-accent-text) !important; }",
    ".generated-page { display: grid; gap: 20px; } .generated-hero, .generated-card { border: 1px solid var(--factory-border); border-radius: 16px; background: var(--factory-surface); padding: 24px; } .generated-hero { display: grid; gap: 12px; min-height: 220px; align-content: center; } .generated-card { display: grid; gap: 16px; }",
    ".generated-card form { display: grid; gap: 12px; } .generated-card form label { display: grid; gap: 6px; } .generated-card input, .generated-card select, .generated-header select { width: 100%; border: 1px solid var(--factory-border); border-radius: 8px; padding: 9px; background: var(--factory-surface); color: inherit; } .generated-header label { display: grid; gap: 6px; }",
    ".generated-records { display: grid; gap: 8px; padding: 0; margin: 0; list-style: none; } .generated-records li { justify-content: space-between; flex-wrap: wrap; padding: 12px; background: var(--factory-surface-muted); border-radius: 10px; } .generated-records code { overflow-wrap: anywhere; } .generated-records span { display: flex; gap: 6px; flex-wrap: wrap; } .generated-cart-summary { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 16px; background: var(--factory-surface-muted); border-radius: 12px; } .generated-error { color: var(--factory-danger) !important; }",
    "@media (max-width: 720px) { .generated-app { padding: 24px 16px 48px; } .generated-header, .generated-section-heading, .generated-cart-summary { align-items: flex-start; flex-direction: column; } .generated-header label { width: 100%; } .generated-section-heading > div:last-child { display: flex; flex-wrap: wrap; gap: 8px; } }",
    "",
  ].join("\n");
}

function renderSimulator(graph: ApplicationGraphV1): string {
  const definition = JSON.stringify({
    applicationName: graph.metadata.name,
    roles: graph.policy.roles,
    flows: graph.flow.flows.map((flow) => ({
      id: flow.id,
      entity: flow.entity,
      initialState: flow.initialState,
      transitions: flow.transitions,
    })),
  }).replaceAll("<", "\\u003c");
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${graph.metadata.name} simulator</title>
    <style>
      :root { font-family: Inter, ui-sans-serif, system-ui, sans-serif; background: #f6f8fb; color: #122022; }
      body { margin: 0; } main { max-width: 880px; margin: 0 auto; padding: 48px 24px; } header, .controls, .event-list, .history li { display: flex; gap: 12px; align-items: center; } header { justify-content: space-between; } h1 { margin: 4px 0; } p { color: #5b6870; } select, button { border: 1px solid #cad5d9; border-radius: 8px; padding: 9px 12px; font: inherit; background: #fff; } button { cursor: pointer; } button:not(:disabled) { background: #08756d; border-color: #08756d; color: #fff; } button:disabled { cursor: not-allowed; opacity: .48; } .card { margin-top: 24px; padding: 24px; border: 1px solid #dce4e7; border-radius: 16px; background: #fff; } .state { font-size: 1.25rem; font-weight: 700; } .history { display: grid; gap: 8px; padding: 0; list-style: none; } .history li { padding: 9px 12px; border-radius: 8px; background: #f2f7f7; } .denied { color: #b42318; } @media (max-width: 640px) { header, .controls { align-items: flex-start; flex-direction: column; } }
    </style>
  </head>
  <body>
    <main>
      <header><div><p>Published Graph projection</p><h1 id="application-name"></h1></div><strong>Role simulator</strong></header>
      <section class="card"><div class="controls"><label>Role <select id="role"></select></label><label>Flow <select id="flow"></select></label><button id="reset" type="button">Reset scenario</button></div><p>Current state</p><div class="state" id="state"></div><div class="event-list" id="events"></div></section>
      <section class="card"><h2>Scenario history</h2><ul class="history" id="history"></ul></section>
    </main>
    <script>
      const definition = ${definition};
      const selectedRole = document.querySelector('#role');
      const selectedFlow = document.querySelector('#flow');
      const stateElement = document.querySelector('#state');
      const eventsElement = document.querySelector('#events');
      const historyElement = document.querySelector('#history');
      let currentState = '';
      let history = [];
      document.querySelector('#application-name').textContent = definition.applicationName;
      for (const role of definition.roles) { const option = document.createElement('option'); option.value = role; option.textContent = role; selectedRole.append(option); }
      for (const flow of definition.flows) { const option = document.createElement('option'); option.value = flow.id; option.textContent = flow.id + ' · ' + flow.entity; selectedFlow.append(option); }
      function flow() { return definition.flows.find((candidate) => candidate.id === selectedFlow.value); }
      function reset() { const active = flow(); currentState = active ? active.initialState : 'No FlowModel declared'; history = active ? ['Scenario reset to ' + currentState + '.'] : ['No FlowModel is available.']; render(); }
      function render() {
        const active = flow(); stateElement.textContent = currentState;
        eventsElement.replaceChildren();
        if (!active) return;
        const transitions = active.transitions.filter((transition) => transition.from === currentState);
        for (const transition of transitions) {
          const allowed = !transition.roles || transition.roles.includes(selectedRole.value);
          const button = document.createElement('button'); button.type = 'button'; button.textContent = transition.event; button.disabled = !allowed;
          button.onclick = () => { if (!allowed) { history.unshift('Transition denied: ' + selectedRole.value + ' cannot trigger ' + transition.event + '.'); render(); return; } currentState = transition.to; history.unshift(selectedRole.value + ' triggered ' + transition.event + ' → ' + currentState + '.'); render(); };
          eventsElement.append(button);
        }
        historyElement.replaceChildren(...history.map((entry) => { const item = document.createElement('li'); item.textContent = entry; if (entry.startsWith('Transition denied')) item.className = 'denied'; return item; }));
      }
      selectedRole.addEventListener('change', render); selectedFlow.addEventListener('change', reset); document.querySelector('#reset').addEventListener('click', reset); reset();
    </script>
  </body>
</html>
`;
}

function renderApiMain(
  graph: ApplicationGraphV1,
  usePackageLineConfigurationHandler: boolean,
  usePackageMoneyPricingHandler: boolean,
  identityPolicy: IdentityPolicyRuntimeContribution | undefined,
): string {
  const commerce = hasCommerceCapabilities(graph);
  const roleForEntityAction = (action: string): string =>
    identityPolicy
      ? `roleFrom(request, entity, ${action})`
      : "roleFrom(request)";
  const identityGuard = identityPolicy
    ? [
        'import { authorizeDeclaredAction, resolveFixturePrincipal, type LocalPrincipalContext } from "./capabilities/core.identity-policy.js";',
      ]
    : [];
  const roleResolver = identityPolicy
    ? [
        `const localFixtureSessions: readonly LocalPrincipalContext[] = ${JSON.stringify(identityPolicy.fixtureSessions, null, 2)};`,
        `const localPolicyRules = ${JSON.stringify(
          graph.policy.permissions.flatMap((permission) =>
            permission.actions.map((action) => ({
              role: permission.role,
              resource: permission.resource,
              action,
            })),
          ),
          null,
          2,
        )} as const;`,
        'const localFixtureNow = "2026-01-01T00:00:00.000Z";',
        "",
        "function headerValue(request: { headers: Record<string, string | string[] | undefined> }, name: string): string | undefined {",
        "  const value = request.headers[name];",
        "  return typeof value === 'string' && value ? value : undefined;",
        "}",
        "",
        "export function resolvePrincipalContext(request: { headers: Record<string, string | string[] | undefined> }): LocalPrincipalContext {",
        "  const sessionId = headerValue(request, 'x-factory-fixture-session');",
        "  const principal = resolveFixturePrincipal(localFixtureSessions.find((candidate) => candidate.sessionId === sessionId), localFixtureNow);",
        "  if (!principal) throw new Error('Identity policy denied: missing-session.');",
        "  return principal;",
        "}",
        "",
        "function roleFrom(request: { headers: Record<string, string | string[] | undefined> }, resource?: string, action?: string): string {",
        "  const principal = resolvePrincipalContext(request);",
        "  if (resource && action) {",
        "    const decision = authorizeDeclaredAction({ principal, resource, action, rules: localPolicyRules, now: localFixtureNow });",
        "    if (!decision.allowed) throw new Error(`Identity policy denied: ${decision.reason}.`);",
        "    const role = principal.roles.find((candidate) => localPolicyRules.some((rule) => rule.role === candidate && rule.resource === resource && rule.action === action));",
        "    if (!role) throw new Error('Identity policy denied: deny.');",
        "    return role;",
        "  }",
        "  const role = principal.roles[0];",
        "  if (!role) throw new Error('Identity policy denied: deny.');",
        "  return role;",
        "}",
      ]
    : [
        "function roleFrom(request: { headers: Record<string, string | string[] | undefined> }): string {",
        "  const value = request.headers['x-factory-role'];",
        "  return typeof value === 'string' && value ? value : 'anonymous';",
        "}",
      ];
  return [
    'import { Body, Controller, Get, HttpException, HttpStatus, Module, Param, Post, Req } from "@nestjs/common";',
    'import { NestFactory } from "@nestjs/core";',
    'import { PrismaClient } from "@prisma/client";',
    'import { ApplicationRuntime } from "./application-runtime.js";',
    'import { PrismaRecordStore } from "./prisma-record-store.js";',
    ...identityGuard,
    "",
    "const prisma = new PrismaClient();",
    "const applicationRuntime = new ApplicationRuntime(new PrismaRecordStore(prisma));",
    "",
    ...roleResolver,
    "",
    "function rejected(error: unknown): HttpException {",
    "  return new HttpException(error instanceof Error ? error.message : 'Request rejected.', HttpStatus.FORBIDDEN);",
    "}",
    "",
    '@Controller("api")',
    "class GeneratedController {",
    `  @Get("health") health() { return { application: ${JSON.stringify(graph.metadata.name)}, status: "ok" }; }`,
    "",
    "  @Get('audit')",
    "  async audit(@Req() request: { headers: Record<string, string | string[] | undefined> }) {",
    "    try { return await applicationRuntime.auditLog(roleFrom(request)); } catch (error) { throw rejected(error); }",
    "  }",
    "",
    ...(commerce
      ? [
          ...(usePackageLineConfigurationHandler
            ? [
                "  @Post('commerce/configure-line')",
                "  async configureLine(@Body() body: { catalogEntity: string; catalogRecordId: string; optionIds: readonly string[]; quantity: number }, @Req() request: { headers: Record<string, string | string[] | undefined> }) {",
                "    try { return await applicationRuntime.configureLine(roleFrom(request), body); } catch (error) { throw rejected(error); }",
                "  }",
                "",
              ]
            : []),
          ...(usePackageMoneyPricingHandler
            ? [
                "  @Post('commerce/quote-price')",
                "  async quotePrice(@Body() body: { catalogEntity: string; lines: readonly { catalogRecordId: string; quantity: number }[] }, @Req() request: { headers: Record<string, string | string[] | undefined> }) {",
                "    try { return await applicationRuntime.quotePrice(roleFrom(request), body); } catch (error) { throw rejected(error); }",
                "  }",
                "",
              ]
            : []),
          "  @Get('commerce/:entity/:recordId/items')",
          "  async cartItems(@Param('entity') entity: string, @Param('recordId') recordId: string, @Req() request: { headers: Record<string, string | string[] | undefined> }) {",
          "    try { return await applicationRuntime.cartItems(roleFrom(request), entity, recordId); } catch (error) { throw rejected(error); }",
          "  }",
          "",
          "  @Post('commerce/:entity/:recordId/items')",
          "  async addCartItem(@Param('entity') entity: string, @Param('recordId') recordId: string, @Body() body: { catalogEntity: string; catalogRecordId: string; quantity: number }, @Req() request: { headers: Record<string, string | string[] | undefined> }) {",
          "    try { return await applicationRuntime.addCartItem(roleFrom(request), entity, recordId, body); } catch (error) { throw rejected(error); }",
          "  }",
          "",
        ]
      : []),
    "  @Get('capability-events')",
    "  async capabilityEvents(@Req() request: { headers: Record<string, string | string[] | undefined> }) {",
    "    try { return await applicationRuntime.capabilityEvents(roleFrom(request)); } catch (error) { throw rejected(error); }",
    "  }",
    "",
    "  @Get(':entity')",
    "  async list(@Param('entity') entity: string, @Req() request: { headers: Record<string, string | string[] | undefined> }) {",
    `    try { return await applicationRuntime.list(${roleForEntityAction("'read'")}, entity); } catch (error) { throw rejected(error); }`,
    "  }",
    "",
    "  @Get(':entity/:recordId')",
    "  async read(@Param('entity') entity: string, @Param('recordId') recordId: string, @Req() request: { headers: Record<string, string | string[] | undefined> }) {",
    `    try { return await applicationRuntime.read(${roleForEntityAction("'read'")}, entity, recordId); } catch (error) { throw rejected(error); }`,
    "  }",
    "",
    "  @Post(':entity')",
    "  async create(@Param('entity') entity: string, @Body() body: Record<string, unknown>, @Req() request: { headers: Record<string, string | string[] | undefined> }) {",
    `    try { return await applicationRuntime.create(${roleForEntityAction("'create'")}, entity, body); } catch (error) { throw rejected(error); }`,
    "  }",
    "",
    "  @Post(':entity/:recordId/events/:event')",
    "  async transition(@Param('entity') entity: string, @Param('recordId') recordId: string, @Param('event') event: string, @Body() body: { expectedVersion: number; idempotencyKey: string }, @Req() request: { headers: Record<string, string | string[] | undefined> }) {",
    `    try { return await applicationRuntime.transition(${roleForEntityAction("event")}, entity, recordId, event, body); } catch (error) { throw rejected(error); }`,
    "  }",
    "}",
    "",
    "@Module({ controllers: [GeneratedController] })",
    "class GeneratedModule {}",
    "",
    "async function bootstrap() {",
    "  const app = await NestFactory.create(GeneratedModule);",
    "  app.enableCors({ origin: process.env.WEB_ORIGIN?.split(',') ?? true });",
    "  await app.listen(process.env.PORT ?? 3001);",
    "}",
    "void bootstrap();",
    "",
  ].join("\n");
}

function defaultJourneyValue(
  field: ApplicationGraphV1["domain"]["entities"][number]["fields"][number],
  initialState: string | undefined,
): unknown {
  if (field.key === "status" && initialState) return initialState;
  if (field.type === "integer" || field.type === "decimal") return 1;
  if (field.type === "boolean") return true;
  if (field.type === "date") return "2026-01-01";
  if (field.type === "datetime") return "2026-01-01T00:00:00.000Z";
  if (field.type === "enum") return field.values?.[0] ?? "sample";
  if (field.type === "email") return "user@example.test";
  if (field.type === "url") return "https://example.test";
  if (field.type === "json") return { sample: true };
  return `sample-${field.key}`;
}

function renderJourneyTest(graph: ApplicationGraphV1): string {
  const flow = graph.flow.flows[0];
  const entity =
    flow &&
    graph.domain.entities.find((candidate) => candidate.key === flow.entity);
  const createPermission =
    entity &&
    graph.policy.permissions.find(
      (permission) =>
        permission.resource === entity.key &&
        permission.actions.includes("create"),
    );
  if (!flow || !entity || !createPermission) {
    return [
      'import { describe, expect, it } from "vitest";',
      "",
      "describe('generated journey', () => {",
      "  it('records that this Graph has no declared create-and-flow journey', () => {",
      "    expect(true).toBe(true);",
      "  });",
      "});",
      "",
    ].join("\n");
  }
  const payload = Object.fromEntries(
    entity.fields
      .filter((field) => field.required)
      .map((field) => [
        field.key,
        defaultJourneyValue(field, flow.initialState),
      ]),
  );
  const transitions: ApplicationGraphV1["flow"]["flows"][number]["transitions"] =
    [];
  let state = flow.initialState;
  const visited = new Set<string>();
  while (true) {
    const transition = flow.transitions.find(
      (candidate) =>
        candidate.from === state &&
        !visited.has(`${candidate.from}:${candidate.event}`),
    );
    if (!transition) break;
    transitions.push(transition);
    visited.add(`${transition.from}:${transition.event}`);
    state = transition.to;
  }
  const auditRole = graph.policy.permissions.find((permission) =>
    permission.actions.includes("audit"),
  )?.role;
  const capabilityEffects = transitions.flatMap(
    (transition) => transition.effects ?? [],
  );
  const catalogEntity = graph.domain.relations.find(
    (relation) => relation.from === entity.key,
  )?.to;
  const catalogSeed = catalogEntity
    ? graph.domain.seedData?.find((seed) => seed.entity === catalogEntity)
    : undefined;
  const includesCartAdd = graph.integration.capabilities.some(
    (capability) =>
      capability.key === "cart.add" && capability.operation === "add",
  );
  const cartJourney =
    !!catalogEntity &&
    !!catalogSeed &&
    includesCartAdd &&
    transitions.some((transition) =>
      transition.effects?.some(
        (effect) =>
          effect.capability === "payment.simulate" ||
          effect.capability === "inventory.decrement",
      ),
    );
  const versionedOrderJourney =
    entity.key === "order" &&
    graph.integration.capabilities.some(
      (capability) =>
        capability.key === "order.transition" &&
        capability.operation === "transition",
    );
  const capabilityEventPairs = [
    ...(cartJourney ? [{ capability: "cart.add", operation: "add" }] : []),
    ...capabilityEffects.flatMap((effect) =>
      ["notification.send", "payment.simulate"].includes(effect.capability)
        ? [effect, effect]
        : [effect],
    ),
  ];
  const auditEffectCount = capabilityEffects.filter(
    (effect) => effect.capability === "audit.record",
  ).length;
  return [
    'import { describe, expect, it } from "vitest";',
    'import { applicationRuntime } from "../src/application-runtime.js";',
    "",
    "describe('generated role journey', () => {",
    "  it('executes the declared record flow', async () => {",
    `    const record = await applicationRuntime.create(${JSON.stringify(createPermission.role)}, ${JSON.stringify(entity.key)}, ${JSON.stringify(payload)});`,
    `    expect(record.status).toBe(${JSON.stringify(flow.initialState)});`,
    ...(cartJourney
      ? [
          `    await applicationRuntime.addCartItem(${JSON.stringify(createPermission.role)}, ${JSON.stringify(entity.key)}, record.id, ${JSON.stringify({ catalogEntity, catalogRecordId: catalogSeed!.id ?? `seed-${catalogSeed!.entity}-1`, quantity: 1 })});`,
        ]
      : []),
    ...transitions.flatMap((transition, index) => [
      `    await applicationRuntime.transition(${JSON.stringify(transition.roles?.[0] ?? createPermission.role)}, ${JSON.stringify(entity.key)}, record.id, ${JSON.stringify(transition.event)}${versionedOrderJourney ? `, { expectedVersion: ${index}, idempotencyKey: ${JSON.stringify(`generated-${transition.event}-${index + 1}`)} }` : ""});`,
      `    expect(record.status).toBe(${JSON.stringify(transition.to)});`,
    ]),
    ...(auditRole
      ? [
          `    expect(await applicationRuntime.auditLog(${JSON.stringify(auditRole)})).toHaveLength(${transitions.length + 1 + auditEffectCount + (cartJourney ? 1 : 0)});`,
        ]
      : []),
    ...(auditRole && capabilityEffects.length > 0
      ? [
          `    const capabilityEvents = await applicationRuntime.capabilityEvents(${JSON.stringify(auditRole)});`,
          `    expect(capabilityEvents.map((entry) => [entry.capability, entry.operation])).toEqual(${JSON.stringify(capabilityEventPairs.map((effect) => [effect.capability, effect.operation]))});`,
        ]
      : []),
    "  });",
    "});",
    "",
  ].join("\n");
}

function markdownCell(value: string): string {
  return value.replaceAll("|", "\\|").replaceAll("\n", " ");
}

function relationshipCardinality(
  kind: ApplicationGraphV1["domain"]["relations"][number]["kind"],
): readonly [string, string] {
  switch (kind) {
    case "one-to-one":
      return ["1", "1"];
    case "one-to-many":
      return ["1", "*"];
    case "many-to-one":
      return ["*", "1"];
    case "many-to-many":
      return ["*", "*"];
  }
}

function renderApiReference(
  graph: ApplicationGraphV1,
  usesFixtureSessions: boolean,
): string {
  const endpoints = [
    ["GET", "/api/health", "Return generated application health."],
    [
      "GET",
      "/api/:entity",
      "List a declared DomainModel entity for the caller role.",
    ],
    [
      "POST",
      "/api/:entity",
      "Create a declared DomainModel entity for the caller role.",
    ],
    [
      "POST",
      "/api/:entity/:recordId/events/:event",
      "Trigger a declared FlowModel event when policy and state allow it.",
    ],
    [
      "GET",
      "/api/audit",
      "Read immutable audit events when policy permits audit.",
    ],
    [
      "GET",
      "/api/capability-events",
      "Read executed declared capability effects when policy permits audit.",
    ],
    ...(hasCommerceCapabilities(graph)
      ? [
          [
            "GET",
            "/api/commerce/:entity/:recordId/items",
            "Read cart items for the caller role.",
          ],
          [
            "POST",
            "/api/commerce/:entity/:recordId/items",
            "Add a declared catalog item to a cart for the caller role.",
          ],
        ]
      : []),
  ] as const;
  const entities = graph.domain.entities.length
    ? graph.domain.entities
        .map((entity) => `- \`${entity.key}\` — ${entity.label}`)
        .join("\n")
    : "- No entities declared.";
  const flows = graph.flow.flows.length
    ? graph.flow.flows
        .map(
          (flow) =>
            `- \`${flow.id}\` on \`${flow.entity}\`: ${flow.events.map((event) => `\`${event}\``).join(", ") || "no events"}`,
        )
        .join("\n")
    : "- No flows declared.";
  const identityBoundary = usesFixtureSessions
    ? "Every request is bound to an opaque local fixture session during local compilation; the server resolves the principal and checks the declared resource/action before performing work."
    : "Every request is role-scoped through the `x-factory-role` header.";
  return `# API reference\n\nThis API is compiled from the immutable Published Graph for **${graph.metadata.name}**. ${identityBoundary}\n\n## Endpoints\n\n| Method | Path | Contract |\n| --- | --- | --- |\n${endpoints.map(([method, path, description]) => `| ${method} | \`${path}\` | ${description} |`).join("\n")}\n\n## Domain endpoints\n\n${entities}\n\n## Declared flow events\n\n${flows}\n`;
}

function renderEntityRelationshipDiagram(graph: ApplicationGraphV1): string {
  const entities = graph.domain.entities.map((entity) => {
    const fields = entity.fields.length
      ? entity.fields
          .map(
            (field) =>
              `- \`${field.key}\`: ${field.type}${field.required ? " (required)" : ""}${field.unique ? ", unique" : ""}`,
          )
          .join("\n")
      : "- No fields declared.";
    const indexes = entity.indexes.length
      ? `\n\nIndexes: ${entity.indexes.map((index) => `\`${index.fields.join(", ")}\`${index.unique ? " (unique)" : ""}`).join("; ")}`
      : "";
    return `### ${entity.label} (\`${entity.key}\`)\n\n${fields}${indexes}`;
  });
  const relationships = graph.domain.relations.length
    ? graph.domain.relations
        .map((relation) => {
          const [from, to] = relationshipCardinality(relation.kind);
          return `- \`${relation.from}\` ${from} → ${to} \`${relation.to}\`${relation.field ? ` via \`${relation.field}\`` : ""}`;
        })
        .join("\n")
    : "- No relationships declared.";
  return `# Entity relationship diagram\n\nThis document is a deterministic DomainModel projection, not a reverse-engineered database schema.\n\n## Relationships\n\n${relationships}\n\n## Entities\n\n${entities.join("\n\n") || "No entities declared."}\n`;
}

function renderPermissionMatrix(graph: ApplicationGraphV1): string {
  const rows = graph.policy.permissions.length
    ? graph.policy.permissions
        .map(
          (permission) =>
            `| ${markdownCell(permission.role)} | ${markdownCell(permission.resource)} | ${permission.actions.map(markdownCell).join(", ")} |`,
        )
        .join("\n")
    : "| — | — | No permissions declared |";
  return `# Permission matrix\n\nThis is the reviewable PolicyModel projection that compiles to \`api/policy/policy.csv\`.\n\n| Role | Resource | Allowed actions |\n| --- | --- | --- |\n${rows}\n\n## Declared roles\n\n${graph.policy.roles.length ? graph.policy.roles.map((role) => `- \`${role}\``).join("\n") : "- No roles declared."}\n`;
}

function renderDocumentation(graph: ApplicationGraphV1): string {
  const entities = graph.domain.entities.map(
    (entity) =>
      `- **${entity.label}**: ${entity.fields.map((field) => field.key).join(", ") || "No fields"}`,
  );
  return `# ${graph.metadata.name}\n\nThis application was compiled from a Factory Published Graph.\n\n## Generated documentation\n\n- [API reference](api-reference.md)\n- [Entity relationship diagram](entity-relationship.md)\n- [Permission matrix](permission-matrix.md)\n\n## Entities\n${entities.join("\n") || "- No entities declared."}\n`;
}

function renderCapabilityLock(
  graph: ApplicationGraphV1,
  compositionLock: CapabilityCompositionLockV1,
): string {
  const assets = compositionLock.packages.map(({ lock }) => lock);
  return (
    JSON.stringify(
      {
        apiVersion: "factory.capability-lock/v1",
        applicationId: graph.metadata.id,
        graphHash: hashApplicationGraph(graph),
        assets,
      },
      null,
      2,
    ) + "\n"
  );
}

function renderCapabilityTemplateLock(
  graph: ApplicationGraphV1,
  contributions: readonly ResolvedCapabilityTemplateContribution[],
): string {
  return (
    JSON.stringify(
      {
        apiVersion: "factory.capability-template-lock/v1",
        applicationId: graph.metadata.id,
        graphHash: hashApplicationGraph(graph),
        templates: contributions.map((contribution) => ({
          assetKey: contribution.assetKey,
          assetVersion: contribution.assetVersion,
          source: contribution.source,
          target: contribution.target,
          outputSlot: contribution.outputSlot,
          digest: contribution.digest,
        })),
      },
      null,
      2,
    ) + "\n"
  );
}

/**
 * Renders deterministic source files for one isolated generated application.
 * This function is pure: the Worker owns filesystem writes, Compose identity,
 * artifact digests, and cleanup.
 */
export function generateApplicationBundle(
  input: PublishedGraphInput,
  options: GenerateApplicationBundleOptions = {},
): GeneratedApplicationBundle {
  const plan = buildCompilationPlan(input);
  const graph = assertValidApplicationGraph(input.graph);
  // A Published Graph deliberately does not retain mutable Draft selections.
  // The Compiler materializes a private lock view for Profile-specific
  // renderers from the separately validated immutable composition lock. It
  // never writes this view back into the Published Graph or uses it for hashes.
  const rendererGraph = structuredClone(graph);
  rendererGraph.integration.assetLocks = input.compositionLock.packages.map(
    ({ lock }) => structuredClone(lock),
  );
  const restaurantRuntimeEnabled =
    hasRestaurantOrderingComposition(rendererGraph);
  let renderedRestaurantRuntime:
    ReturnType<typeof renderRestaurantRuntime> | undefined;
  const restaurantRuntime = () => {
    if (!restaurantRuntimeEnabled) return null;
    renderedRestaurantRuntime ??= renderRestaurantRuntime(rendererGraph);
    return renderedRestaurantRuntime;
  };
  const capabilityTemplates = resolveCapabilityTemplateContributions(
    graph,
    input.compositionLock,
    options.repositoryRoot,
  );
  const targetContributionPlans = resolveTargetContributionPlans(
    input,
    options,
  );
  const renderedTargetContributions = targetContributionPlans.map(
    renderTargetContribution,
  );
  const identityPolicy = resolveIdentityPolicyRuntimeContribution(
    input,
    renderedTargetContributions,
  );
  const orderOperationsPersistence =
    resolveOrderOperationsPersistenceContribution(
      input,
      renderedTargetContributions,
    );
  const moneyPricingPersistence = resolveMoneyPricingPersistenceContribution(
    input,
    renderedTargetContributions,
  );
  const useGenericOrderOperationsPersistence =
    !restaurantRuntimeEnabled && orderOperationsPersistence !== undefined;
  const useGenericMoneyPricingPersistence =
    !restaurantRuntimeEnabled && moneyPricingPersistence !== undefined;
  const notificationOutbox =
    resolveNotificationOutboxRuntimeContribution(input);
  if (restaurantRuntimeEnabled && notificationOutbox) {
    throw new Error(
      "Restaurant Ordering does not support notification.outbox/v1; remove the durable notification lock before compilation.",
    );
  }
  const additionalPrismaSchemaFragments = [
    ...(useGenericMoneyPricingPersistence
      ? [moneyPricingPersistence!.schema]
      : []),
    ...(notificationOutbox ? [notificationOutboxPrismaSchema] : []),
  ];
  const additionalMigrationFragments = [
    ...(useGenericMoneyPricingPersistence
      ? [moneyPricingPersistence!.migration]
      : []),
    ...(notificationOutbox ? [notificationOutboxMigration] : []),
  ];
  const useResolvedContributions =
    input.compositionLock.resolvedContributionDigests.length > 0;
  const usePackageCartHandler = input.compositionLock.packages.some(
    ({ lock }) => {
      const asset = resolveCapabilityAssetLock(lock);
      return (
        asset.manifest.key === "commerce.cart" &&
        asset.manifest.runtimeHandlers?.includes("cart")
      );
    },
  );
  const usePackageLineConfigurationHandler =
    input.compositionLock.packages.some(({ lock }) => {
      const asset = resolveCapabilityAssetLock(lock);
      return (
        asset.manifest.key === "commerce.line-configuration" &&
        asset.manifest.runtimeHandlers?.includes("catalogConfiguration")
      );
    });
  const usePackageMoneyPricingHandler = input.compositionLock.packages.some(
    ({ lock }) => {
      const asset = resolveCapabilityAssetLock(lock);
      return asset.manifest.key === "commerce.money-pricing";
    },
  );
  const catalogEntityKey = lockedRuntimeHandlerEntity(
    input.compositionLock,
    "commerce.catalog",
    "catalog",
    "catalogEntity",
  );
  const orderEntityKey = lockedRuntimeHandlerEntity(
    input.compositionLock,
    "commerce.order",
    "order",
    "orderEntity",
  );
  const orderOperationsEntityKey = lockedRuntimeHandlerEntity(
    input.compositionLock,
    "commerce.order-operations",
    "orderOperations",
    "orderEntity",
  );
  const rootDirectory = `${graph.metadata.id}-${input.publishedRevisionId}`;
  const plannedFiles: PlannedGeneratedFile[] = [
    {
      path: "package.json",
      render: () =>
        JSON.stringify(
          {
            name: rootDirectory,
            private: true,
            packageManager: "pnpm@9.0.0",
            workspaces: ["web", "api", "database"],
            scripts: { test: "pnpm --filter generated-api test" },
          },
          null,
          2,
        ) + "\n",
    },
    {
      path: "pnpm-workspace.yaml",
      render: () => "packages:\n  - web\n  - api\n  - database\n",
    },
    {
      path: "capability-lock.json",
      render: () => renderCapabilityLock(graph, input.compositionLock),
    },
    {
      path: "composition-lock.json",
      render: () => JSON.stringify(input.compositionLock, null, 2) + "\n",
    },
    {
      path: "capability-template-lock.json",
      render: () => renderCapabilityTemplateLock(graph, capabilityTemplates),
    },
    {
      path: "simulator/index.html",
      render: () => renderSimulator(graph),
    },
    {
      path: "web/package.json",
      render: () =>
        JSON.stringify(
          {
            name: "generated-web",
            private: true,
            scripts: {
              dev: "next dev --port 3000",
              build: "next build",
              start: "next start --port 3000",
            },
            dependencies: {
              next: "^15.5.0",
              react: "^19.0.0",
              "react-dom": "^19.0.0",
            },
            devDependencies: {
              "@types/node": "^22.10.0",
              "@types/react": "^19.0.0",
              typescript: "^5.7.0",
            },
          },
          null,
          2,
        ) + "\n",
    },
    {
      path: "web/tsconfig.json",
      render: () =>
        JSON.stringify(
          {
            compilerOptions: {
              target: "ES2017",
              lib: ["dom", "dom.iterable", "esnext"],
              allowJs: true,
              skipLibCheck: true,
              strict: true,
              noEmit: true,
              incremental: true,
              module: "esnext",
              esModuleInterop: true,
              moduleResolution: "node",
              resolveJsonModule: true,
              isolatedModules: true,
              jsx: "preserve",
              plugins: [{ name: "next" }],
            },
            include: [
              "next-env.d.ts",
              "app/**/*.ts",
              "app/**/*.tsx",
              ".next/types/**/*.ts",
            ],
            exclude: ["node_modules"],
          },
          null,
          2,
        ) + "\n",
    },
    {
      path: "web/next-env.d.ts",
      render: () =>
        '/// <reference types="next" />\n/// <reference types="next/image-types/global" />\n\n// This file is generated by Factory Pilot.\n',
    },
    {
      path: "web/app/layout.tsx",
      render: () =>
        'import type { ReactNode } from "react";\nimport "./globals.css";\n\nexport default function RootLayout({ children }: { children: ReactNode }) { return <html lang="en"><body>{children}</body></html>; }\n',
    },
    {
      path: "web/app/page-runtime.tsx",
      render: () =>
        restaurantRuntimeEnabled
          ? renderRestaurantPageRuntime(rendererGraph)
          : renderPageRuntime(graph, orderEntityKey, !!identityPolicy),
    },
    ...(restaurantRuntimeEnabled
      ? [
          {
            path: "web/app/restaurant-customer-command.ts",
            render: () => renderRestaurantCustomerCommandRuntime(),
          },
          {
            path: "web/app/restaurant-merchant-runtime.tsx",
            render: () => renderRestaurantMerchantPageRuntime(rendererGraph),
          },
        ]
      : []),
    { path: "web/app/page.tsx", render: () => renderWebRootPage() },
    {
      path: "web/app/[...path]/page.tsx",
      render: () => renderWebCatchAllPage(restaurantRuntimeEnabled),
    },
    {
      path: "web/app/favicon.ico/route.ts",
      render: () => renderFaviconRoute(),
    },
    {
      path: "web/app/api/[...path]/route.ts",
      render: () =>
        renderWebProxyRoute(restaurantRuntimeEnabled, !!identityPolicy),
    },
    {
      path: "web/app/globals.css",
      render: () => renderWebStyles(),
    },
    {
      path: "api/package.json",
      render: () =>
        JSON.stringify(
          {
            name: "generated-api",
            private: true,
            scripts: {
              dev: "tsx watch src/main.ts",
              build: "tsc -p tsconfig.json",
              start: "node dist/main.js",
              test: "vitest run",
              ...(notificationOutbox
                ? {
                    "notification:drain":
                      "tsx src/notification-outbox-drain.ts",
                  }
                : {}),
            },
            dependencies: {
              "@prisma/client": "^6.19.0",
              "@nestjs/common": "^10.4.0",
              "@nestjs/core": "^10.4.0",
              "@nestjs/platform-express": "^10.4.0",
              casbin: "^5.37.0",
              "reflect-metadata": "^0.2.2",
              rxjs: "^7.8.1",
              xstate: "^5.19.0",
            },
            devDependencies: {
              "@types/node": "^22.10.0",
              prisma: "^6.19.0",
              tsx: "^4.19.0",
              typescript: "^5.7.0",
              vitest: "^2.1.0",
            },
          },
          null,
          2,
        ) + "\n",
    },
    {
      path: "api/tsconfig.json",
      render: () =>
        JSON.stringify(
          {
            compilerOptions: {
              target: "ES2022",
              module: "NodeNext",
              moduleResolution: "NodeNext",
              outDir: "dist",
              strict: true,
              experimentalDecorators: true,
              emitDecoratorMetadata: true,
            },
            include: ["src/**/*.ts"],
          },
          null,
          2,
        ) + "\n",
    },
    {
      path: "api/Dockerfile",
      render: () =>
        'FROM node:22-alpine\nWORKDIR /app\nCOPY package.json ./\nCOPY prisma ./prisma\nRUN npm config set fetch-retries 5 && npm install --global pnpm@9.0.0 && pnpm install && pnpm prisma generate --schema prisma/schema.prisma\nCOPY tsconfig.json ./\nCOPY src ./src\nRUN pnpm build\nCMD ["node", "dist/main.js"]\n',
    },
    {
      path: "api/.dockerignore",
      render: () => "node_modules\ndist\n.env\n",
    },
    {
      path: "api/src/main.ts",
      render: () =>
        restaurantRuntime()?.main ??
        renderApiMain(
          graph,
          usePackageLineConfigurationHandler,
          usePackageMoneyPricingHandler,
          identityPolicy,
        ),
    },
    ...(restaurantRuntimeEnabled
      ? [
          {
            path: "api/src/restaurant/restaurant-command.service.ts",
            render: () => restaurantRuntime()!.commandService,
          },
        ]
      : []),
    {
      path: "api/src/capabilities/contract.ts",
      render: () => renderCapabilityContract(graph),
    },
    ...capabilityTemplates.map((template) => ({
      path: template.target,
      render: () => renderCapabilityTemplate(template, graph),
    })),
    ...renderedTargetContributions.map((contribution) => ({
      path: contribution.path,
      render: () => contribution.content,
    })),
    {
      path: "api/src/capabilities/registry.ts",
      render: () => renderCapabilityRegistry(capabilityTemplates),
    },
    {
      path: "api/src/application-runtime.ts",
      render: () =>
        restaurantRuntime()?.applicationRuntimeContract ??
        renderApplicationRuntime(
          graph,
          useResolvedContributions,
          usePackageCartHandler,
          usePackageLineConfigurationHandler,
          usePackageMoneyPricingHandler,
          catalogEntityKey,
          orderEntityKey,
          orderOperationsEntityKey,
          useGenericOrderOperationsPersistence,
          notificationOutbox,
        ),
    },
    {
      path: "api/src/prisma-record-store.ts",
      render: () =>
        renderPrismaRecordStore(
          graph,
          restaurantRuntimeEnabled,
          useGenericOrderOperationsPersistence,
          notificationOutbox !== undefined,
        ),
    },
    ...(notificationOutbox
      ? [
          {
            path: "api/src/notification-outbox-worker.ts",
            render: () => renderNotificationOutboxWorker(),
          },
          {
            path: "api/src/notification-outbox-drain.ts",
            render: () => renderNotificationOutboxDrain(),
          },
          {
            path: "api/README.md",
            render: () => renderNotificationOutboxDrainDocumentation(),
          },
        ]
      : []),
    {
      path: "api/src/policy.ts",
      render: () => renderPolicyModule(graph),
    },
    {
      path: "api/prisma/schema.prisma",
      render: () =>
        restaurantRuntime()?.prismaSchema ??
        renderPrismaSchema(
          graph,
          useGenericOrderOperationsPersistence
            ? orderOperationsPersistence?.schema
            : undefined,
          useGenericOrderOperationsPersistence,
          additionalPrismaSchemaFragments,
        ),
    },
    {
      path: "database/prisma/schema.prisma",
      render: () =>
        restaurantRuntime()?.prismaSchema ??
        renderPrismaSchema(
          graph,
          useGenericOrderOperationsPersistence
            ? orderOperationsPersistence?.schema
            : undefined,
          useGenericOrderOperationsPersistence,
          additionalPrismaSchemaFragments,
        ),
    },
    {
      path: "database/prisma/migrations/0001_initial/migration.sql",
      render: () =>
        restaurantRuntime()?.initialMigration ??
        renderInitialMigration(
          graph,
          useGenericOrderOperationsPersistence
            ? orderOperationsPersistence?.migration
            : undefined,
          useGenericOrderOperationsPersistence,
          additionalMigrationFragments,
        ),
    },
    {
      path: "database/package.json",
      render: () =>
        JSON.stringify(
          {
            name: "generated-database",
            private: true,
            scripts: {
              generate: "prisma generate --schema prisma/schema.prisma",
              "migrate:deploy":
                "prisma migrate deploy --schema prisma/schema.prisma",
              seed: "tsx prisma/seed.ts",
            },
            dependencies: { "@prisma/client": "^6.19.0" },
            devDependencies: { prisma: "^6.19.0", tsx: "^4.19.0" },
          },
          null,
          2,
        ) + "\n",
    },
    {
      path: "database/prisma/seed.ts",
      render: () => renderPrismaSeed(graph, restaurantRuntimeEnabled),
    },
    {
      path: "database/Dockerfile",
      render: () =>
        'FROM node:22-alpine\nWORKDIR /app\nCOPY package.json ./\nCOPY prisma ./prisma\nRUN npm config set fetch-retries 5 && npm install --global pnpm@9.0.0 && pnpm install && pnpm prisma generate --schema prisma/schema.prisma\nCMD ["sh", "-c", "pnpm prisma migrate deploy --schema prisma/schema.prisma && pnpm tsx prisma/seed.ts"]\n',
    },
    {
      path: "database/.dockerignore",
      render: () => "node_modules\n.env\n",
    },
    {
      path: "api/policy/model.conf",
      render: () =>
        "[request_definition]\nr = sub, obj, act\n\n[policy_definition]\np = sub, obj, act\n\n[policy_effect]\ne = some(where (p.eft == allow))\n\n[matchers]\nm = r.sub == p.sub && r.obj == p.obj && r.act == p.act\n",
    },
    {
      path: "api/policy/policy.csv",
      render: () => renderCasbinPolicy(graph),
    },
    {
      path: "api/src/flows/definitions.ts",
      render: () => renderFlowDefinitions(graph),
    },
    {
      path: "api/src/flows/machines.ts",
      render: () => renderFlowMachines(),
    },
    {
      path: "api/test/journey.generated.test.ts",
      render: () =>
        restaurantRuntime()?.generatedTests ?? renderJourneyTest(graph),
    },
    ...(restaurantRuntimeEnabled
      ? [
          {
            path: "api/src/restaurant/restaurant-event-publisher.ts",
            render: () => renderRestaurantEventPublisher(),
          },
          {
            path: "api/test/restaurant-runtime.generated.test.ts",
            render: () => restaurantRuntime()!.generatedTests,
          },
        ]
      : []),
    {
      path: "tests/journeys.generated.md",
      render: () => `# Generated role journeys\n\nGraph: ${plan.graphHash}\n`,
    },
    {
      path: "docs/api-reference.md",
      render: () =>
        restaurantRuntime()?.apiReference ??
        renderApiReference(graph, Boolean(identityPolicy)),
    },
    {
      path: "docs/entity-relationship.md",
      render: () => renderEntityRelationshipDiagram(graph),
    },
    {
      path: "docs/permission-matrix.md",
      render: () => renderPermissionMatrix(graph),
    },
    {
      path: "docs/application.md",
      render: () => renderDocumentation(graph),
    },
    {
      path: "web/Dockerfile",
      render: () =>
        'FROM node:22-alpine\nWORKDIR /app\nCOPY package.json ./\nRUN npm config set fetch-retries 5 && npm install --global pnpm@9.0.0 && pnpm install\nCOPY . .\nRUN pnpm build\nCMD ["pnpm", "start"]\n',
    },
    {
      path: "web/.dockerignore",
      render: () => "node_modules\n.next\n.env\n",
    },
    {
      path: "docker-compose.yml",
      render: () =>
        `name: \${FACTORY_COMPOSE_PROJECT_NAME:-factory-${rootDirectory}}\n\nservices:\n  postgres:\n    image: postgres:16-alpine\n    environment:\n      POSTGRES_USER: generated\n      POSTGRES_PASSWORD: generated\n      POSTGRES_DB: generated\n    healthcheck:\n      test: [\"CMD-SHELL\", \"pg_isready -U generated -d generated\"]\n      interval: 5s\n      timeout: 3s\n      retries: 20\n  migrate:\n    build: ./database\n    environment:\n      DATABASE_URL: postgresql://generated:generated@postgres:5432/generated\n${restaurantRuntimeEnabled ? '      RESTAURANT_DEMO_TABLE_TOKEN: \"${RESTAURANT_DEMO_TABLE_TOKEN:?Set RESTAURANT_DEMO_TABLE_TOKEN for local demo bootstrap}\"\n' : ""}    depends_on:\n      postgres:\n        condition: service_healthy\n  api:\n    build: ./api\n    environment:\n      DATABASE_URL: postgresql://generated:generated@postgres:5432/generated\n    ports:\n      - \"127.0.0.1:\${FACTORY_API_PORT:-0}:3001\"\n    depends_on:\n      migrate:\n        condition: service_completed_successfully\n  web:\n    build: ./web\n    environment:\n      FACTORY_API_URL: http://api:3001\n      NEXT_PUBLIC_FACTORY_API_URL: http://localhost:\${FACTORY_API_PORT:-0}\n    ports:\n      - \"127.0.0.1:\${FACTORY_WEB_PORT:-0}:3000\"\n    depends_on:\n      - api\n`,
    },
    {
      path: "README.md",
      render: () =>
        `# ${graph.metadata.name}\n\nThis application was compiled from the immutable Published Graph \`${plan.graphHash}\`.\n\n## Run locally\n\nThe default Compose project name is revision-isolated. Choose unique host ports for every generated application.${restaurantRuntimeEnabled ? " Set `RESTAURANT_DEMO_TABLE_TOKEN` to a local demo bootstrap input of at least 16 characters before running; Compose requires and forwards the current shell value without a default." : ""}\n\n\`\`\`sh\n${restaurantRuntimeEnabled ? 'RESTAURANT_DEMO_TABLE_TOKEN=\"$RESTAURANT_DEMO_TABLE_TOKEN\" ' : ""}FACTORY_COMPOSE_PROJECT_NAME=factory-${rootDirectory} FACTORY_WEB_PORT=4300 FACTORY_API_PORT=4301 docker compose up --build\n\`\`\`${notificationOutbox ? "\n\n## Drain notifications\n\nThe drain runs inside the API Compose service, so its Prisma connection reaches the internal PostgreSQL service:\n\n\`\`\`sh\ndocker compose exec api pnpm notification:drain\n\`\`\`" : ""}\n\nThe migration service must complete before the API starts. To remove this isolated local runtime and its database volume:\n\n\`\`\`sh\ndocker compose down --volumes --remove-orphans\n\`\`\`\n`,
    },
  ];

  assertUniqueGeneratedFilePaths(plannedFiles);
  const files = plannedFiles.map(({ path, render }) => ({
    path,
    content: render(),
  }));
  return { rootDirectory, graphHash: plan.graphHash, files };
}

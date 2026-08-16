import type { CapabilityCompositionLockV1 } from "@factory/capabilities";
import type { ApplicationGraphV1 } from "@factory/graph";

import type { GeneratedFile } from "./generated-files.js";

/**
 * The immutable, explicit view a target plugin may consume. Only the
 * validated Published Graph, the canonicalized composition lock, and the
 * facade-resolved compilation context drive output. The renderer graph is the
 * private lock view materialized by the facade (never hashed, never written
 * back); the context carries only composition-derived flags and resolved
 * contribution fragments, never mutable Draft state or profile-name semantics.
 */
export interface PublishedCompilationInput {
  readonly publishedRevisionId: string;
  readonly graph: ApplicationGraphV1;
  readonly compositionLock: CapabilityCompositionLockV1;
  readonly rendererGraph: ApplicationGraphV1;
  readonly context: CompilationContextV1;
}

/**
 * The explicit compiler context resolved once by the facade from the exact
 * validated input. Every field is composition- or contribution-derived; no
 * field selects behavior by Profile name. The specialized Restaurant runtime
 * artifacts are included only so a target can preserve byte parity for the
 * Restaurant composition without importing the runtime module.
 */
export interface CompilationContextV1 {
  readonly restaurantRuntimeEnabled: boolean;
  readonly restaurantArtifacts: {
    readonly apiReference?: string;
    readonly prismaSchema?: string;
    readonly initialMigration?: string;
    readonly seed?: string;
  };
  readonly identityPolicyEnabled: boolean;
  readonly orderOperationsPersistence?: {
    readonly schema: string;
    readonly migration: string;
  };
  readonly useGenericOrderOperationsPersistence: boolean;
  readonly moneyPricingPersistence?: {
    readonly schema: string;
    readonly migration: string;
  };
  readonly useGenericMoneyPricingPersistence: boolean;
  readonly notificationOutboxEnabled: boolean;
  readonly additionalPrismaSchemaFragments: readonly string[];
  readonly additionalMigrationFragments: readonly string[];
}

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

export interface TargetValidationIssue {
  readonly target: CompilationTargetKey;
  readonly path: string;
  readonly code: string;
  readonly message: string;
}

export type TargetValidationResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly issues: readonly TargetValidationIssue[] };

/**
 * The public, versioned compiler target contract:
 *
 *   supports -> plan -> render -> validate
 *
 * A plugin consumes only the immutable Published Compilation input, produces
 * a serializable plan, renders deterministically, and fails closed through
 * the Registry when validation reports a problem.
 */
export interface CompilerTargetPluginV1<TPlan> {
  readonly apiVersion: "factory.compiler-target/v1";
  readonly key: CompilationTargetKey;
  supports(input: PublishedCompilationInput): boolean;
  plan(input: PublishedCompilationInput): TPlan;
  render(plan: TPlan): readonly GeneratedFile[];
  validate(files: readonly GeneratedFile[]): TargetValidationResult;
}

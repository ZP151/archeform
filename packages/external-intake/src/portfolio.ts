import { readFileSync } from "node:fs";

import { z } from "zod";

import {
  intakeContractPrimitives,
  parseIntakeRequest,
  type IntakeRequestV1,
} from "./contracts.js";

const portfolioClassSchema = z.enum([
  "direct-dependency",
  "selective-source",
  "provider",
  "architecture-only",
  "excluded",
]);
const intakeClassificationSchema = z.enum([
  "direct-dependency",
  "source-study",
  "provider",
]);
const classToIntakeClassification = {
  "direct-dependency": "direct-dependency",
  "selective-source": "source-study",
  provider: "provider",
  "architecture-only": null,
  excluded: null,
} as const;

const portfolioSourceSchema = z
  .object({
    id: intakeContractPrimitives.opaqueIdSchema,
    name: z.string().min(1).max(160),
    canonicalRepositoryUrl:
      intakeContractPrimitives.canonicalRepositoryUrlSchema,
    fixedRef: z.string().min(1).max(128),
    licenceEvidenceUrl: intakeContractPrimitives.canonicalHttpsUrlSchema,
    portfolioClass: portfolioClassSchema,
    intakeClassification: intakeClassificationSchema.nullable(),
    capabilitySeams: z
      .array(z.string().min(1).max(160))
      .min(1)
      .max(32)
      .refine(
        (seams) => new Set(seams).size === seams.length,
        "Capability seams must be unique.",
      ),
  })
  .strict()
  .superRefine((source, context) => {
    const expected = classToIntakeClassification[source.portfolioClass];
    if (source.intakeClassification !== expected) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Portfolio class has an invalid Intake classification.",
        path: ["intakeClassification"],
      });
    }
    if (
      source.intakeClassification !== null &&
      !intakeContractPrimitives.fixedReferenceSchema.safeParse(source.fixedRef)
        .success
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Intake-eligible portfolio sources require an exact tag or commit.",
        path: ["fixedRef"],
      });
    }
  });

const scenarioSchema = z
  .object({
    number: z.number().int().min(1).max(108).finite(),
    name: z.string().min(1).max(160),
    capabilities: z
      .array(z.string().min(1).max(160))
      .min(1)
      .max(32)
      .refine(
        (capabilities) => new Set(capabilities).size === capabilities.length,
        "Scenario capabilities must be unique.",
      ),
  })
  .strict();

const externalPortfolioSchema = z
  .object({
    apiVersion: z.literal("factory.external-portfolio/v1"),
    researchDate: z.literal("2026-07-30"),
    sources: z.array(portfolioSourceSchema).length(43),
    scenarios: z.array(scenarioSchema).length(108),
  })
  .strict()
  .superRefine((portfolio, context) => {
    if (new Set(portfolio.sources.map(({ id }) => id)).size !== 43) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Portfolio source IDs must be unique.",
        path: ["sources"],
      });
    }
    const numbers = portfolio.scenarios.map(({ number }) => number);
    if (
      new Set(numbers).size !== 108 ||
      numbers.some((number, index) => number !== index + 1)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Scenario numbers must be unique and contiguous from 1 through 108.",
        path: ["scenarios"],
      });
    }
  });

export type ExternalPortfolioV1 = z.infer<typeof externalPortfolioSchema>;
export type ExternalPortfolioSourceV1 = z.infer<typeof portfolioSourceSchema>;

export function loadExternalPortfolio(path: string): ExternalPortfolioV1 {
  const bytes = readFileSync(path);
  if (bytes.byteLength > 2_000_000) {
    throw new Error("External portfolio exceeds the metadata-only size limit.");
  }
  const input = JSON.parse(
    new TextDecoder("utf-8", { fatal: true }).decode(bytes),
  ) as unknown;
  return externalPortfolioSchema.parse(input);
}

export function createPortfolioIntakeRequest(
  portfolio: ExternalPortfolioV1,
  sourceId: string,
): IntakeRequestV1 {
  const parsedPortfolio = externalPortfolioSchema.parse(portfolio);
  const parsedSourceId =
    intakeContractPrimitives.opaqueIdSchema.parse(sourceId);
  const source = parsedPortfolio.sources.find(
    ({ id }) => id === parsedSourceId,
  );
  if (source === undefined) {
    throw new Error(`Unknown external portfolio source: ${parsedSourceId}.`);
  }
  if (source.intakeClassification === null) {
    throw new Error(
      `External portfolio source ${parsedSourceId} is policy-only.`,
    );
  }
  return parseIntakeRequest({
    apiVersion: "factory.external-intake-request/v1",
    source: {
      canonicalRepositoryUrl: source.canonicalRepositoryUrl,
      requestedRef: source.fixedRef,
      portfolioRecord: source.id,
    },
    classification: source.intakeClassification,
    requestedModules: [],
    allowNetworkRetrieval: true,
  });
}

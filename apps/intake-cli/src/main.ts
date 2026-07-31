#!/usr/bin/env node

import { lstatSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import {
  ExternalIntakeStore,
  createExternalIntakeApi,
  isCredentialLikeCandidateValue,
  type ExternalIntakeApiV1,
} from "@factory/external-intake";

const OPAQUE_ID = /^[a-z][a-z0-9-]{0,127}$/u;
const VERSION = /^\d+\.\d+\.\d+(?:[-+][A-Za-z0-9.-]+)?$/u;
const DIGEST = /^sha256:[a-f0-9]{64}$/u;
const CANDIDATE_KEY = /^candidate\.[a-z][a-z0-9-]*(?:\.[a-z][a-z0-9-]*)*$/u;
const MAX_REQUEST_BYTES = 1024 * 1024;
const FORBIDDEN_OPERATION = /(?:promot|approv|waiv|--out)/iu;
const REDACTED_IDENTIFIERS = [
  "token",
  "auth",
  "apikey",
  "clientsecret",
  "privatekey",
  "password",
  "credential",
  "prompt",
  "response",
  "raw",
  "finding",
  "sourcebody",
  "sourcetext",
  "command",
  "executable",
] as const;

class CliInputError extends Error {}

type CliOutputContext =
  | "batch"
  | "status"
  | "evidence"
  | "candidate-show"
  | "candidate-test"
  | "candidate-terminal"
  | "verify-job"
  | "error";

export interface IntakeCliOptionsV1 {
  readonly api: ExternalIntakeApiV1;
  readonly cwd: string;
  readonly stdout: (line: string) => void;
  readonly stderr: (line: string) => void;
}

function opaqueId(input: string | undefined): string {
  if (input === undefined || !OPAQUE_ID.test(input)) {
    throw new CliInputError("opaque ID required");
  }
  return input;
}

function candidateIdentity(input: string | undefined): {
  readonly id: string;
  readonly version: string;
} {
  if (input === undefined)
    throw new CliInputError("Candidate identity required");
  const parts = input.split("@");
  if (
    parts.length !== 2 ||
    !OPAQUE_ID.test(parts[0]!) ||
    !VERSION.test(parts[1]!)
  ) {
    throw new CliInputError("Candidate identity must be opaque ID@version");
  }
  return { id: parts[0]!, version: parts[1]! };
}

function localJson(pathInput: string | undefined, cwd: string): unknown {
  if (
    pathInput === undefined ||
    pathInput.length === 0 ||
    /^(?:[a-z]+:)?\/\//iu.test(pathInput) ||
    pathInput.startsWith("\\\\") ||
    pathInput.includes("\0") ||
    !pathInput.toLowerCase().endsWith(".json")
  ) {
    throw new CliInputError("local JSON request file required");
  }
  const path = resolve(cwd, pathInput);
  const stat = lstatSync(path);
  if (
    stat.isSymbolicLink() ||
    !stat.isFile() ||
    stat.size > MAX_REQUEST_BYTES
  ) {
    throw new CliInputError("local regular JSON request file required");
  }
  return JSON.parse(readFileSync(path, "utf8")) as unknown;
}

function normalizedOutputKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/gu, "");
}

function isRedactedKey(key: string): boolean {
  const normalized = normalizedOutputKey(key);
  return REDACTED_IDENTIFIERS.some((identifier) =>
    normalized.includes(identifier),
  );
}

const ARRAY_ELEMENT = Symbol("array-element");
const OBJECT_PROPERTY = Symbol("object-property");
type OutputPathSegment = string | typeof ARRAY_ELEMENT;
type ExpectedOutputPathSegment = OutputPathSegment | typeof OBJECT_PROPERTY;

function outputPathMatches(
  path: readonly OutputPathSegment[],
  ...expected: readonly ExpectedOutputPathSegment[]
): boolean {
  return (
    path.length === expected.length &&
    path.every(
      (segment, index) =>
        (expected[index] === OBJECT_PROPERTY && typeof segment === "string") ||
        segment === expected[index],
    )
  );
}

const CANONICAL_DIGEST_PATHS: Partial<
  Record<CliOutputContext, readonly (readonly ExpectedOutputPathSegment[])[]>
> = {
  batch: [["byId", OBJECT_PROPERTY, "request", "digest"]],
  status: [["recordDigests", ARRAY_ELEMENT]],
  evidence: [
    ["digest"],
    ["snapshotDigest"],
    ["sbom", "digest"],
    ["scans", ARRAY_ELEMENT, "rulesetDigest"],
    ["scans", ARRAY_ELEMENT, "resultDigest"],
    ["ast", "inventoryDigest"],
  ],
  "candidate-show": [["candidateDigest"], ["evidenceDigest"]],
  "candidate-test": [
    ["candidateDigest"],
    ["manifestDigest"],
    ["fixtureDigest"],
    ["adapterDigest"],
    ["planDigest"],
  ],
  "candidate-terminal": [["digest"]],
};

function isAllowedCanonicalOutput(
  value: string,
  context: CliOutputContext,
  path: readonly OutputPathSegment[],
): boolean {
  if (
    DIGEST.test(value) &&
    (CANONICAL_DIGEST_PATHS[context] ?? []).some((expected) =>
      outputPathMatches(path, ...expected),
    )
  ) {
    return true;
  }
  if (context === "candidate-show") {
    return (
      (outputPathMatches(path, "id") && OPAQUE_ID.test(value)) ||
      (outputPathMatches(path, "version") && VERSION.test(value)) ||
      (outputPathMatches(path, "proposedFactoryKey") &&
        CANDIDATE_KEY.test(value)) ||
      (outputPathMatches(path, "lookupId") &&
        /^(?:candidate|job)-[a-f0-9]{64}$/u.test(value))
    );
  }
  if (context === "candidate-test") {
    return (
      (outputPathMatches(path, "apiVersion") &&
        value === "factory.candidate-conformance-result/v1") ||
      ((outputPathMatches(path, "candidateId") ||
        outputPathMatches(path, "cases", ARRAY_ELEMENT, "id")) &&
        OPAQUE_ID.test(value)) ||
      (outputPathMatches(path, "candidateVersion") && VERSION.test(value))
    );
  }
  if (context === "candidate-terminal") {
    return (
      (outputPathMatches(path, "id") && OPAQUE_ID.test(value)) ||
      (outputPathMatches(path, "version") && VERSION.test(value)) ||
      (outputPathMatches(path, "lookupId") &&
        /^(?:candidate|job)-[a-f0-9]{64}$/u.test(value))
    );
  }
  if (context === "batch") {
    return (
      path.length === 3 &&
      path[0] === "byId" &&
      typeof path[1] === "string" &&
      path[2] === "lookupId" &&
      /^(?:candidate|job)-[a-f0-9]{64}$/u.test(value)
    );
  }
  if (context === "status") {
    return (
      (outputPathMatches(path, "id") && OPAQUE_ID.test(value)) ||
      (outputPathMatches(path, "producerVersion") && VERSION.test(value))
    );
  }
  if (context === "verify-job") {
    return outputPathMatches(path, "id") && OPAQUE_ID.test(value);
  }
  if (context === "evidence") {
    return (
      (outputPathMatches(path, "apiVersion") &&
        value === "factory.external-evidence-summary/v1") ||
      (outputPathMatches(path, "producerVersion") && VERSION.test(value))
    );
  }
  return false;
}

function redact(
  input: unknown,
  context: CliOutputContext,
  path: readonly OutputPathSegment[] = [],
): unknown {
  if (Array.isArray(input))
    return input.map((value) =>
      redact(value, context, [...path, ARRAY_ELEMENT]),
    );
  if (typeof input === "string") {
    return isCredentialLikeCandidateValue(input) &&
      !isAllowedCanonicalOutput(input, context, path)
      ? "[redacted]"
      : input;
  }
  if (input === null || typeof input !== "object") return input;
  const output: Record<string, unknown> = Object.create(null) as Record<
    string,
    unknown
  >;
  for (const [outputKey, value] of Object.entries(input)) {
    output[outputKey] = isRedactedKey(outputKey)
      ? "[redacted]"
      : redact(value, context, [...path, outputKey]);
  }
  return output;
}

function render(input: unknown, context: CliOutputContext): string {
  return JSON.stringify(redact(input, context));
}

export async function runIntakeCli(
  args: readonly string[],
  options: IntakeCliOptionsV1,
): Promise<number> {
  try {
    if (
      args.length === 0 ||
      args.some((argument) => FORBIDDEN_OPERATION.test(argument))
    ) {
      throw new CliInputError("operation is not available");
    }
    let result: unknown;
    let outputContext: CliOutputContext;
    if (
      args.length === 4 &&
      args[0] === "batch" &&
      args[1] === "submit" &&
      args[2] === "--file"
    ) {
      outputContext = "batch";
      result = await options.api.submitBatch(localJson(args[3], options.cwd));
    } else if (args.length === 2 && args[0] === "status") {
      outputContext = "status";
      result = await options.api.status(opaqueId(args[1]));
    } else if (args.length === 2 && args[0] === "evidence") {
      outputContext = "evidence";
      if (!DIGEST.test(args[1]!))
        throw new CliInputError("evidence digest required");
      result = await options.api.evidence(args[1]!);
    } else if (
      args.length === 3 &&
      args[0] === "candidate" &&
      ["show", "test", "block", "reject"].includes(args[1]!)
    ) {
      const identity = candidateIdentity(args[2]);
      if (args[1] === "show") {
        outputContext = "candidate-show";
        result = await options.api.candidateShow(identity.id, identity.version);
      } else if (args[1] === "test") {
        outputContext = "candidate-test";
        result = await options.api.candidateTest(identity.id, identity.version);
      } else if (args[1] === "block") {
        outputContext = "candidate-terminal";
        result = await options.api.candidateBlock(
          identity.id,
          identity.version,
        );
      } else {
        outputContext = "candidate-terminal";
        result = await options.api.candidateReject(
          identity.id,
          identity.version,
        );
      }
    } else if (
      args.length === 3 &&
      args[0] === "verify" &&
      args[1] === "--job"
    ) {
      outputContext = "verify-job";
      result = await options.api.verifyJob(opaqueId(args[2]));
    } else {
      throw new CliInputError("unknown command");
    }
    options.stdout(render(result, outputContext));
    return 0;
  } catch (error) {
    options.stderr(
      render(
        {
          error:
            error instanceof CliInputError
              ? "invalid-command"
              : "operation-failed",
        },
        "error",
      ),
    );
    return error instanceof CliInputError ? 2 : 1;
  }
}

async function main(): Promise<void> {
  const quarantineRoot = resolve(process.cwd(), "ecosystem", "intake");
  const api = createExternalIntakeApi(
    new ExternalIntakeStore(quarantineRoot),
    quarantineRoot,
  );
  process.exitCode = await runIntakeCli(process.argv.slice(2), {
    api,
    cwd: process.cwd(),
    stdout: (line) => process.stdout.write(`${line}\n`),
    stderr: (line) => process.stderr.write(`${line}\n`),
  });
}

if (
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  await main();
}

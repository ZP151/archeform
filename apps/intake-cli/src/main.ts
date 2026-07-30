#!/usr/bin/env node

import { lstatSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import {
  ExternalIntakeStore,
  createExternalIntakeApi,
  type ExternalIntakeApiV1,
} from "@factory/external-intake";

const OPAQUE_ID = /^[a-z][a-z0-9-]{0,127}$/u;
const VERSION = /^\d+\.\d+\.\d+(?:[-+][A-Za-z0-9.-]+)?$/u;
const DIGEST = /^sha256:[a-f0-9]{64}$/u;
const MAX_REQUEST_BYTES = 1024 * 1024;
const FORBIDDEN_OPERATION = /(?:promot|approv|waiv|--out)/iu;
const REDACTED_KEY =
  /(?:credential|password|raw|finding|sourcebody|sourcetext|prompt|response|command|executable)/iu;

class CliInputError extends Error {}

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

function redact(input: unknown): unknown {
  if (Array.isArray(input)) return input.map(redact);
  if (input === null || typeof input !== "object") return input;
  const output: Record<string, unknown> = Object.create(null) as Record<
    string,
    unknown
  >;
  for (const [key, value] of Object.entries(input)) {
    output[key] = REDACTED_KEY.test(key) ? "[redacted]" : redact(value);
  }
  return output;
}

function render(input: unknown): string {
  return JSON.stringify(redact(input));
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
    if (
      args.length === 4 &&
      args[0] === "batch" &&
      args[1] === "submit" &&
      args[2] === "--file"
    ) {
      result = await options.api.submitBatch(localJson(args[3], options.cwd));
    } else if (args.length === 2 && args[0] === "status") {
      result = await options.api.status(opaqueId(args[1]));
    } else if (args.length === 2 && args[0] === "evidence") {
      if (!DIGEST.test(args[1]!))
        throw new CliInputError("evidence digest required");
      result = await options.api.evidence(args[1]!);
    } else if (
      args.length === 3 &&
      args[0] === "candidate" &&
      ["show", "test"].includes(args[1]!)
    ) {
      const identity = candidateIdentity(args[2]);
      result =
        args[1] === "show"
          ? await options.api.candidateShow(identity.id, identity.version)
          : await options.api.candidateTest(identity.id, identity.version);
    } else if (
      args.length === 3 &&
      args[0] === "verify" &&
      args[1] === "--job"
    ) {
      result = await options.api.verifyJob(opaqueId(args[2]));
    } else {
      throw new CliInputError("unknown command");
    }
    options.stdout(render(result));
    return 0;
  } catch (error) {
    options.stderr(
      render({
        error:
          error instanceof CliInputError
            ? "invalid-command"
            : "operation-failed",
      }),
    );
    return error instanceof CliInputError ? 2 : 1;
  }
}

async function main(): Promise<void> {
  const api = createExternalIntakeApi(
    new ExternalIntakeStore(resolve(process.cwd(), "ecosystem", "intake")),
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

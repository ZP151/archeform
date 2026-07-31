#!/usr/bin/env node

import {
  closeSync,
  fstatSync,
  fsyncSync,
  lstatSync,
  openSync,
  readFileSync,
  readSync,
  readdirSync,
  realpathSync,
  statSync,
  unlinkSync,
  writeSync,
} from "node:fs";
import { isAbsolute, relative, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";

import {
  ExternalIntakeStore,
  canonicalJson,
  canonicalRecordDigest,
  createExternalIntakeApi,
  isCredentialLikeCandidateValue,
  verifyPromotionPacket,
  type ExternalIntakeApiV1,
  type PromotionReviewInputV1,
} from "@factory/external-intake";

const OPAQUE_ID = /^[a-z][a-z0-9-]{0,127}$/u;
const VERSION = /^\d+\.\d+\.\d+(?:[-+][A-Za-z0-9.-]+)?$/u;
const DIGEST = /^sha256:[a-f0-9]{64}$/u;
const CANDIDATE_KEY = /^candidate\.[a-z][a-z0-9-]*(?:\.[a-z][a-z0-9-]*)*$/u;
const MAX_REQUEST_BYTES = 1024 * 1024;
const PROMOTION_PACKET_LEAF = "promotion-packet.json";
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
  | "promotion-packet"
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
  "promotion-packet": [["digest"]],
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
  if (context === "promotion-packet") {
    return (
      outputPathMatches(path, "path") ||
      (outputPathMatches(path, "status") && value === "written")
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

function safeRelativeSegments(input: string | undefined): readonly string[] {
  if (
    input === undefined ||
    input.length === 0 ||
    input.includes("\\") ||
    input.includes("\0") ||
    isAbsolute(input) ||
    /^(?:[a-z]+:)?\/\//iu.test(input)
  ) {
    throw new CliInputError("safe relative path required");
  }
  const segments = input.split("/");
  if (
    segments.some(
      (segment) =>
        segment.length === 0 ||
        segment === "." ||
        segment === ".." ||
        /[<>:"|?*\u0000-\u001f]/u.test(segment) ||
        /[. ]$/u.test(segment),
    )
  ) {
    throw new CliInputError("safe relative path required");
  }
  return segments;
}

function resolveUnderRealCwd(cwd: string, segments: readonly string[]): string {
  const cwdStat = lstatSync(cwd);
  if (cwdStat.isSymbolicLink() || !cwdStat.isDirectory()) {
    throw new CliInputError("CLI working directory must be real");
  }
  const realCwd = realpathSync.native(cwd);
  const path = resolve(realCwd, ...segments);
  const fromRoot = relative(realCwd, path);
  if (
    fromRoot === "" ||
    fromRoot === ".." ||
    fromRoot.startsWith(`..${sep}`) ||
    resolve(realCwd, fromRoot) !== path
  ) {
    throw new CliInputError("path escaped CLI working directory");
  }
  return path;
}

function assertRealComponents(
  cwd: string,
  segments: readonly string[],
  finalKind: "file" | "directory",
): string {
  const path = resolveUnderRealCwd(cwd, segments);
  const realCwd = realpathSync.native(cwd);
  for (let index = 0; index < segments.length; index += 1) {
    const component = resolve(realCwd, ...segments.slice(0, index + 1));
    let stat: ReturnType<typeof lstatSync>;
    try {
      stat = lstatSync(component);
    } catch {
      throw new CliInputError("path component is missing");
    }
    const final = index === segments.length - 1;
    if (
      stat.isSymbolicLink() ||
      (final && finalKind === "file" && !stat.isFile()) ||
      ((!final || finalKind === "directory") && !stat.isDirectory())
    ) {
      throw new CliInputError("path components must be real");
    }
  }
  return path;
}

function localPromotionReview(
  pathInput: string | undefined,
  cwd: string,
): unknown {
  const segments = safeRelativeSegments(pathInput);
  if (!segments.at(-1)!.toLowerCase().endsWith(".json")) {
    throw new CliInputError("relative review JSON required");
  }
  const path = assertRealComponents(cwd, segments, "file");
  const stat = lstatSync(path);
  if (stat.size > MAX_REQUEST_BYTES) {
    throw new CliInputError("review JSON exceeds one MiB");
  }
  try {
    return JSON.parse(readFileSync(path, "utf8")) as unknown;
  } catch {
    throw new CliInputError("review JSON is invalid");
  }
}

function promotionOutputPath(
  pathInput: string | undefined,
  cwd: string,
): PromotionOutputAnchor {
  const segments = safeRelativeSegments(pathInput);
  if (segments.length < 2 || segments.at(-1) !== PROMOTION_PACKET_LEAF) {
    throw new CliInputError("exact promotion packet output path required");
  }
  const directorySegments = segments.slice(0, -1);
  const directory = assertRealComponents(cwd, directorySegments, "directory");
  const realCwd = realpathSync.native(cwd);
  const realDirectory = realpathSync.native(directory);
  if (readdirSync(directory).length !== 0) {
    throw new CliInputError("promotion review directory must be empty");
  }
  return {
    requestCwd: anchoredDirectoryIdentity(realCwd),
    processCwd: anchoredDirectoryIdentity(realpathSync.native(process.cwd())),
    directory: anchoredDirectoryIdentity(realDirectory),
  };
}

interface AnchoredDirectoryIdentity {
  readonly path: string;
  readonly dev: bigint;
  readonly ino: bigint;
}

interface PromotionOutputAnchor {
  readonly requestCwd: AnchoredDirectoryIdentity;
  readonly processCwd: AnchoredDirectoryIdentity;
  readonly directory: AnchoredDirectoryIdentity;
}

interface OwnedOutputIdentity {
  readonly dev: bigint;
  readonly ino: bigint;
}

function anchoredDirectoryIdentity(path: string): AnchoredDirectoryIdentity {
  const stat = lstatSync(path, { bigint: true });
  if (
    stat.isSymbolicLink() ||
    !stat.isDirectory() ||
    stat.dev < 0n ||
    stat.ino <= 0n
  ) {
    throw new CliInputError(
      "promotion output directory identity is unavailable",
    );
  }
  return { path, dev: stat.dev, ino: stat.ino };
}

function assertDirectoryIdentity(expected: AnchoredDirectoryIdentity): void {
  const actual = anchoredDirectoryIdentity(expected.path);
  if (actual.dev !== expected.dev || actual.ino !== expected.ino) {
    throw new CliInputError("promotion output directory identity changed");
  }
  if (realpathSync.native(expected.path) !== expected.path) {
    throw new CliInputError("promotion output directory identity changed");
  }
}

function assertPromotionOutputAnchor(
  anchor: PromotionOutputAnchor,
  expectedEntries: readonly string[],
): void {
  assertDirectoryIdentity(anchor.requestCwd);
  assertDirectoryIdentity(anchor.processCwd);
  assertDirectoryIdentity(anchor.directory);
  const entries = readdirSync(anchor.directory.path).sort();
  if (
    entries.length !== expectedEntries.length ||
    entries.some((entry, index) => entry !== expectedEntries[index])
  ) {
    throw new CliInputError("promotion review directory contents changed");
  }
}

function assertCurrentPromotionDirectory(
  anchor: PromotionOutputAnchor,
  expectedEntries: readonly string[],
): void {
  const stat = statSync(".", { bigint: true });
  if (
    !stat.isDirectory() ||
    stat.dev !== anchor.directory.dev ||
    stat.ino !== anchor.directory.ino
  ) {
    throw new CliInputError("promotion output directory identity changed");
  }
  const entries = readdirSync(".").sort();
  if (
    entries.length !== expectedEntries.length ||
    entries.some((entry, index) => entry !== expectedEntries[index])
  ) {
    throw new CliInputError("promotion review directory contents changed");
  }
}

function sameOwnedOutput(
  actual: {
    readonly dev: bigint;
    readonly ino: bigint;
    isFile(): boolean;
    isSymbolicLink(): boolean;
  },
  expected: OwnedOutputIdentity,
): boolean {
  return (
    !actual.isSymbolicLink() &&
    actual.isFile() &&
    actual.dev === expected.dev &&
    actual.ino === expected.ino
  );
}

function cleanupOwnedPromotionOutput(
  anchor: PromotionOutputAnchor,
  owned: OwnedOutputIdentity,
): void {
  try {
    assertCurrentPromotionDirectory(anchor, [PROMOTION_PACKET_LEAF]);
    const stat = lstatSync(PROMOTION_PACKET_LEAF, { bigint: true });
    if (sameOwnedOutput(stat, owned)) {
      unlinkSync(PROMOTION_PACKET_LEAF);
    }
  } catch {
    // Cleanup is intentionally best-effort and never follows a changed path.
  }
}

function writeVerifiedPromotionPacket(
  anchor: PromotionOutputAnchor,
  packet: unknown,
  expectedDigest: string,
): string {
  const bytes = canonicalJson(packet);
  const encoded = Buffer.from(bytes, "utf8");
  let descriptor: number | undefined;
  let owned: OwnedOutputIdentity | undefined;
  let succeeded = false;
  let changedDirectory = false;
  try {
    assertPromotionOutputAnchor(anchor, []);
    process.chdir(anchor.directory.path);
    changedDirectory = true;
    assertCurrentPromotionDirectory(anchor, []);
    try {
      descriptor = openSync(PROMOTION_PACKET_LEAF, "wx+", 0o600);
    } catch (error) {
      if (
        error !== null &&
        typeof error === "object" &&
        "code" in error &&
        error.code === "EEXIST"
      ) {
        throw new CliInputError("promotion packet output already exists");
      }
      throw error;
    }
    const opened = fstatSync(descriptor, { bigint: true });
    if (
      !opened.isFile() ||
      opened.dev < 0n ||
      opened.ino <= 0n ||
      opened.size !== 0n
    ) {
      throw new Error("PromotionPacket output descriptor is invalid.");
    }
    owned = { dev: opened.dev, ino: opened.ino };
    let written = 0;
    while (written < encoded.byteLength) {
      const count = writeSync(
        descriptor,
        encoded,
        written,
        encoded.byteLength - written,
        written,
      );
      if (count <= 0) {
        throw new Error("PromotionPacket output write was incomplete.");
      }
      written += count;
    }
    fsyncSync(descriptor);
    const afterWrite = fstatSync(descriptor, { bigint: true });
    if (
      afterWrite.dev !== owned.dev ||
      afterWrite.ino !== owned.ino ||
      afterWrite.size !== BigInt(encoded.byteLength)
    ) {
      throw new Error("PromotionPacket output changed after write.");
    }
    assertCurrentPromotionDirectory(anchor, [PROMOTION_PACKET_LEAF]);
    const reread = Buffer.alloc(encoded.byteLength);
    let read = 0;
    while (read < reread.byteLength) {
      const count = readSync(
        descriptor,
        reread,
        read,
        reread.byteLength - read,
        read,
      );
      if (count <= 0) {
        throw new Error("PromotionPacket output reread was incomplete.");
      }
      read += count;
    }
    if (
      readSync(descriptor, Buffer.alloc(1), 0, 1, reread.byteLength) !== 0 ||
      !reread.equals(encoded)
    ) {
      throw new Error("PromotionPacket output changed after exclusive write.");
    }
    const rebound = verifyPromotionPacket(
      JSON.parse(reread.toString("utf8")) as unknown,
    );
    if (
      !rebound.valid ||
      rebound.digest !== expectedDigest ||
      rebound.digest !== canonicalRecordDigest(packet)
    ) {
      throw new Error("PromotionPacket output failed re-verification.");
    }
    const afterRead = fstatSync(descriptor, { bigint: true });
    if (
      afterRead.dev !== owned.dev ||
      afterRead.ino !== owned.ino ||
      afterRead.size !== BigInt(encoded.byteLength)
    ) {
      throw new Error("PromotionPacket output changed after re-verification.");
    }
    assertCurrentPromotionDirectory(anchor, [PROMOTION_PACKET_LEAF]);
    succeeded = true;
    return rebound.digest;
  } finally {
    if (descriptor !== undefined) {
      closeSync(descriptor);
    }
    if (!succeeded && owned !== undefined) {
      cleanupOwnedPromotionOutput(anchor, owned);
    }
    if (changedDirectory) {
      process.chdir(anchor.processCwd.path);
      const restored = statSync(".", { bigint: true });
      if (
        restored.dev !== anchor.processCwd.dev ||
        restored.ino !== anchor.processCwd.ino
      ) {
        throw new Error("CLI working directory restoration failed.");
      }
    }
  }
}

export async function runIntakeCli(
  args: readonly string[],
  options: IntakeCliOptionsV1,
): Promise<number> {
  try {
    if (args.length === 0) {
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
      args.length === 7 &&
      args[0] === "promotion" &&
      args[1] === "packet" &&
      args[3] === "--review" &&
      args[5] === "--out"
    ) {
      const identity = candidateIdentity(args[2]);
      const review = localPromotionReview(
        args[4],
        options.cwd,
      ) as PromotionReviewInputV1;
      const outputAnchor = promotionOutputPath(args[6], options.cwd);
      const packet = await options.api.promotionPacket(
        identity.id,
        identity.version,
        review,
      );
      const verification = verifyPromotionPacket(packet);
      if (!verification.valid || verification.digest === undefined) {
        throw new Error("PromotionPacket failed verification before output.");
      }
      const reboundDigest = writeVerifiedPromotionPacket(
        outputAnchor,
        packet,
        verification.digest,
      );
      outputContext = "promotion-packet";
      result = {
        status: "written",
        path: args[6],
        digest: reboundDigest,
      };
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

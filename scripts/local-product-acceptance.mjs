import { fork, spawn } from "node:child_process";
import { createHash, randomBytes as nodeRandomBytes } from "node:crypto";
import {
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  realpath,
  rename,
  rm,
  rmdir,
  unlink,
  writeFile,
} from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { isAbsolute, relative, resolve, sep, join } from "node:path";
import { performance } from "node:perf_hooks";
import { fileURLToPath, pathToFileURL } from "node:url";

const outputLimit = 1_048_576;
const ansiPattern = /\u001b\[[0-?]*[ -/]*[@-~]/gu;
const evidencePrefix = "FACTORY_ACCEPTANCE_EVIDENCE ";
const stagePrefix = "FACTORY_ACCEPTANCE_STAGE ";
const cleanupStagePrefix = "FACTORY_ACCEPTANCE_CLEANUP_STAGE ";
const acceptanceStages = new Set([
  "template-entry",
  "template-start",
  "template-opened",
  "template-preview-ready",
  "template-menu-selected",
  "template-menu-editor",
  "template-title-saved",
  "publish",
  "compile",
  "verify",
  "workbench-accessibility",
  "preview-start",
  "customer-page-created",
  "customer-root",
  "customer-dish",
  "customer-item-response",
  "customer-item-added",
  "customer-cart",
  "customer-checkout",
  "customer-payment-response",
  "customer-checkout-reloaded",
  "customer-orders",
  "customer-paid",
  "merchant-denial",
  "generated-accessibility",
  "evidence",
]);
const cleanupStages = new Set([
  "start",
  "page-closed",
  "stop",
  "stopped",
  "resource-proof",
  "resources-removed",
]);
const digestPattern = /^sha256:[a-f0-9]{64}$/u;
const minimumComposeVersion = [2, 24, 4];
const localPreviewProfile = "factory.local-preview-profile/v1:acceptance";
const localPreviewLeaseApiVersion = "factory.local-preview-lease/v1";
const previewRequestFilename = "preview.request";
const previewLeaseFilename = "preview.lease.json";
const previewStartTimeoutMilliseconds = 300_000;
const operationLeaseApiVersion = "factory.local-acceptance-operation-lease/v1";
const supervisorIpcApiVersion = "factory.local-acceptance-supervisor-ipc/v1";
const timingHarnessApiVersion =
  "factory.local-acceptance-interruption-harness/v1";
const timingHarnessStages = new Set([
  "before-ready",
  "after-ack",
  "before-outer-up",
  "during-outer-up",
  "after-outer-up",
  "before-preview-intent",
  "after-preview-intent",
  "during-preview-post",
  "after-preview-response",
  "during-preview-startup",
  "after-preview-ready",
  "during-playwright",
  "during-preview-reconcile",
  "during-preview-stop",
  "after-preview-proof",
  "during-outer-down",
  "after-outer-down",
  "during-outer-proof",
  "during-global-guard",
  "before-root-removal",
]);
const loopbackComposeOverride = `services:
  postgres:
    ports: !override
      - "127.0.0.1:\${FACTORY_POSTGRES_PORT:-5432}:5432"
  redis:
    ports: !override
      - "127.0.0.1:\${FACTORY_REDIS_PORT:-6379}:6379"
  control-plane:
    ports: !override
      - "127.0.0.1:\${FACTORY_CONTROL_PLANE_PORT:-3000}:3000"
    environment:
      FACTORY_LOCAL_ACCEPTANCE_TOKEN: "\${FACTORY_LOCAL_ACCEPTANCE_TOKEN:?}"
  workbench:
    ports: !override
      - "127.0.0.1:\${FACTORY_WORKBENCH_PORT:-5174}:5174"
  compiler-worker:
    environment:
      FACTORY_LOCAL_PREVIEW_PROFILE: "factory.local-preview-profile/v1:acceptance"
`;
const composePrefix = (projectName, overridePath) => [
  "compose",
  "-p",
  projectName,
  "--env-file",
  ".env",
  "-f",
  "infra/docker-compose.yml",
  ...(overridePath === undefined ? [] : ["-f", overridePath]),
];

function sha256(contents) {
  return `sha256:${createHash("sha256").update(contents).digest("hex")}`;
}

export function createLocalAcceptanceSupervisorReady(nonce) {
  return { apiVersion: supervisorIpcApiVersion, nonce, type: "ready" };
}

const safeSummaryStepNames = new Set([
  "cleanup-containers",
  "cleanup-networks",
  "cleanup-volumes",
  "compose-config",
  "compose-down",
  "compose-up",
  "doctor",
  "host-readiness",
  "outer-artifacts-volume",
  "outer-control-plane-containers",
  "outer-control-plane-stop",
  "outer-guard-before-containers",
  "outer-guard-before-networks",
  "outer-guard-before-volumes",
  "outer-worker-containers",
  "outer-worker-stop",
  "playwright",
  "preview-containers-list",
  "preview-containers-remove",
  "preview-guard-after",
  "preview-guard-before",
  "preview-helper",
  "preview-helper-recovery-proof",
  "preview-helper-recovery-query",
  "preview-helper-recovery-remove",
  "preview-networks-list",
  "preview-networks-remove",
  "preview-volumes-list",
  "preview-volumes-remove",
  "preview-worker-container",
  "preview-worker-image",
]);

function exactObjectKeys(value, expected) {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.keys(value).sort().join(",") === [...expected].sort().join(",")
  );
}

function validateLocalAcceptanceSummary(summary) {
  if (!exactObjectKeys(summary, ["schemaVersion"])) {
    if (
      !exactObjectKeys(summary, [
        "accessibility",
        "cleanup",
        "cleanupStage",
        "digests",
        "failureStage",
        "projectName",
        "schemaVersion",
        "steps",
        "versions",
      ])
    ) {
      return false;
    }
    const accessibilityValid =
      summary.accessibility === null ||
      (exactObjectKeys(summary.accessibility, [
        "generatedDesktop",
        "generatedNarrow",
        "workbenchDesktop",
        "workbenchNarrow",
      ]) &&
        Object.values(summary.accessibility).every((value) => value === 0));
    const cleanupValid =
      exactObjectKeys(summary.cleanup, [
        "containers",
        "networks",
        "previewDirectories",
        "volumes",
      ]) &&
      Object.values(summary.cleanup).every(
        (value) => Number.isSafeInteger(value) && value >= -1,
      );
    const digestsValid =
      summary.digests === null ||
      (exactObjectKeys(summary.digests, ["compilation", "publishedRevision"]) &&
        Object.values(summary.digests).every((value) =>
          digestPattern.test(value),
        ));
    const stagesValid =
      (summary.cleanupStage === null ||
        cleanupStages.has(summary.cleanupStage)) &&
      (summary.failureStage === null ||
        acceptanceStages.has(summary.failureStage));
    const projectValid =
      summary.projectName === null ||
      /^factory-local-[a-f0-9]{36}$/u.test(summary.projectName);
    const versionsValid =
      summary.versions === null ||
      (exactObjectKeys(summary.versions, ["node", "pnpm"]) &&
        Object.values(summary.versions).every((value) =>
          /^\d+\.\d+\.\d+$/u.test(value),
        ));
    const stepsValid =
      Array.isArray(summary.steps) &&
      summary.steps.length <= 256 &&
      summary.steps.every(
        (step) =>
          exactObjectKeys(step, ["exitCode", "name"]) &&
          Number.isSafeInteger(step.exitCode) &&
          step.exitCode >= 0 &&
          step.exitCode <= 255 &&
          (safeSummaryStepNames.has(step.name) ||
            /^stable-proof-(?:control-plane|worker|containers|networks|volumes|helper)-[0-2]$/u.test(
              step.name,
            )),
      );
    if (
      !accessibilityValid ||
      !cleanupValid ||
      !digestsValid ||
      !stagesValid ||
      !projectValid ||
      !versionsValid ||
      !stepsValid
    ) {
      return false;
    }
  }
  if (summary.schemaVersion !== "factory.local-acceptance-summary/v1") {
    return false;
  }
  try {
    return JSON.stringify(summary).length <= outputLimit;
  } catch {
    return false;
  }
}

function parseTimingHarnessStage(environment) {
  if (
    !Object.prototype.hasOwnProperty.call(
      environment,
      "FACTORY_LOCAL_ACCEPTANCE_TIMING_GATE",
    )
  ) {
    return undefined;
  }
  const value = environment.FACTORY_LOCAL_ACCEPTANCE_TIMING_GATE;
  const prefix = `${timingHarnessApiVersion}:`;
  if (typeof value !== "string" || !value.startsWith(prefix)) return null;
  const stage = value.slice(prefix.length);
  return timingHarnessStages.has(stage) ? stage : null;
}

function validateTimingGateMessage(value) {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.keys(value).sort().join(",") === "apiVersion,stage,type" &&
    value.apiVersion === timingHarnessApiVersion &&
    value.type === "gate" &&
    timingHarnessStages.has(value.stage)
  );
}

export function validateLocalAcceptanceSupervisorMessage(value, nonce, type) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const expectedKeys =
    type === "result"
      ? ["apiVersion", "exitCode", "nonce", "summary", "type"]
      : ["apiVersion", "nonce", "type"];
  const keys = Object.keys(value).sort();
  if (
    keys.length !== expectedKeys.length ||
    keys.some((key, index) => key !== expectedKeys[index]) ||
    value.apiVersion !== supervisorIpcApiVersion ||
    value.type !== type ||
    value.nonce !== nonce ||
    !/^[a-f0-9]{64}$/u.test(nonce)
  ) {
    return false;
  }
  if (type !== "result") return true;
  return (
    (value.exitCode === 0 || value.exitCode === 1) &&
    validateLocalAcceptanceSummary(value.summary)
  );
}

export function createLocalAcceptanceSupervisorIpcSession(nonce) {
  let acknowledged = false;
  let terminal = false;
  return {
    accept(value) {
      if (acknowledged || terminal) return false;
      if (!validateLocalAcceptanceSupervisorMessage(value, nonce, "ack")) {
        terminal = true;
        return false;
      }
      acknowledged = true;
      return true;
    },
    result(value) {
      if (!acknowledged || terminal) return false;
      if (!validateLocalAcceptanceSupervisorMessage(value, nonce, "result")) {
        terminal = true;
        return false;
      }
      terminal = true;
      return true;
    },
  };
}

export function createLocalAcceptanceWorkloadResult({
  cleanupComplete,
  exitCode,
  summary = { schemaVersion: "factory.local-acceptance-summary/v1" },
}) {
  return {
    exitCode: exitCode === 0 ? 0 : 1,
    summary,
    terminalProof: cleanupComplete === true,
  };
}

function validateOperationLeasePermissions(entry, kind) {
  if (process.platform === "win32") return;
  if ((entry.mode & 0o077) !== 0 || entry.uid !== process.geteuid()) {
    throw new Error(`Operation lease ${kind} permissions are invalid.`);
  }
}

function sameFilesystemEntry(left, right) {
  return left.dev === right.dev && left.ino === right.ino;
}

function validatedOperationLeaseOwner(raw, workspaceDigest) {
  const owner = JSON.parse(raw);
  if (
    !owner ||
    Object.keys(owner).sort().join(",") !==
      "apiVersion,createdAtUnixMs,ownerNonce,ownerPid,workspaceDigest" ||
    owner.apiVersion !== operationLeaseApiVersion ||
    !Number.isSafeInteger(owner.createdAtUnixMs) ||
    owner.workspaceDigest !== workspaceDigest ||
    !/^[a-f0-9]{64}$/u.test(owner.ownerNonce) ||
    !Number.isSafeInteger(owner.ownerPid) ||
    owner.ownerPid < 1
  ) {
    throw new Error("Operation lease owner is invalid.");
  }
  const canonical = `${JSON.stringify({
    apiVersion: owner.apiVersion,
    createdAtUnixMs: owner.createdAtUnixMs,
    ownerNonce: owner.ownerNonce,
    ownerPid: owner.ownerPid,
    workspaceDigest: owner.workspaceDigest,
  })}\n`;
  if (raw !== canonical) {
    throw new Error("Operation lease owner is not canonical.");
  }
  return owner;
}

export async function acquireLocalAcceptanceOperationLease({
  leaseParent = join(tmpdir(), "factory-local-acceptance-operation-v1"),
  workspace = process.cwd(),
} = {}) {
  const canonicalWorkspace = await realpath(workspace);
  const workspaceDigest = createHash("sha256")
    .update(
      process.platform === "win32"
        ? canonicalWorkspace.toLowerCase()
        : canonicalWorkspace,
    )
    .digest("hex");
  await mkdir(leaseParent, { mode: 0o700, recursive: true });
  const parent = await lstat(leaseParent);
  if (!parent.isDirectory() || parent.isSymbolicLink()) {
    throw new Error("Operation lease parent is invalid.");
  }
  validateOperationLeasePermissions(parent, "parent");
  const canonicalParent = await realpath(leaseParent);
  const resolvedParent = resolve(leaseParent);
  if (
    (process.platform === "win32"
      ? canonicalParent.toLowerCase()
      : canonicalParent) !==
    (process.platform === "win32"
      ? resolvedParent.toLowerCase()
      : resolvedParent)
  ) {
    throw new Error("Operation lease parent path is indirect.");
  }
  const root = join(leaseParent, workspaceDigest);
  try {
    await mkdir(root, { mode: 0o700 });
  } catch (error) {
    if (error?.code !== "EEXIST") throw error;
    const ownerPath = join(root, "owner.json");
    const rootEntry = await lstat(root);
    if (rootEntry.isSymbolicLink() || !rootEntry.isDirectory()) {
      throw new Error("Operation lease entry is invalid.");
    }
    validateOperationLeasePermissions(rootEntry, "entry");
    let raw;
    try {
      raw = await readFile(ownerPath, "utf8");
      const ownerEntry = await lstat(ownerPath);
      if (ownerEntry.isSymbolicLink() || !ownerEntry.isFile()) {
        throw new Error("Operation lease owner is invalid.");
      }
      validateOperationLeasePermissions(ownerEntry, "owner");
    } catch (ownerError) {
      const entries = await readdir(root);
      if (
        ownerError?.code !== "ENOENT" ||
        entries.length !== 0 ||
        Date.now() - rootEntry.mtimeMs < 15_000
      ) {
        throw ownerError;
      }
      await rmdir(root);
      await mkdir(root, { mode: 0o700 });
      raw = null;
    }
    if (raw === null) {
      // The sole allowed incomplete-entry reclamation is complete.
    } else {
      const owner = validatedOperationLeaseOwner(raw, workspaceDigest);
      try {
        process.kill(owner.ownerPid, 0);
        throw new Error("Operation lease owner is live.");
      } catch (liveness) {
        if (liveness?.code !== "ESRCH") throw liveness;
      }
      const rootIdentity = await lstat(root);
      const tombstone = `${root}.reclaim-${owner.ownerNonce}-${nodeRandomBytes(16).toString("hex")}`;
      await rename(root, tombstone);
      const tombstoneIdentity = await lstat(tombstone);
      if (!sameFilesystemEntry(rootIdentity, tombstoneIdentity)) {
        throw new Error("Operation lease reclaim identity changed.");
      }
      if ((await readdir(tombstone)).join(",") !== "owner.json") {
        throw new Error("Operation lease reclaim is invalid.");
      }
      const tombstoneOwnerPath = join(tombstone, "owner.json");
      const tombstoneOwnerEntry = await lstat(tombstoneOwnerPath);
      if (
        tombstoneOwnerEntry.isSymbolicLink() ||
        !tombstoneOwnerEntry.isFile() ||
        (await readFile(tombstoneOwnerPath, "utf8")) !== raw
      ) {
        throw new Error("Operation lease reclaim owner changed.");
      }
      validateOperationLeasePermissions(tombstoneOwnerEntry, "owner");
      try {
        process.kill(owner.ownerPid, 0);
        throw new Error("Operation lease owner revived.");
      } catch (liveness) {
        if (liveness?.code !== "ESRCH") throw liveness;
      }
      await unlink(tombstoneOwnerPath);
      await rmdir(tombstone);
      await mkdir(root, { mode: 0o700 });
    }
  }
  const nonce = nodeRandomBytes(32).toString("hex");
  const ownerPath = join(root, "owner.json");
  const canonicalRoot = await realpath(root);
  const expectedRoot = join(canonicalParent, workspaceDigest);
  if (
    (process.platform === "win32"
      ? canonicalRoot.toLowerCase()
      : canonicalRoot) !==
    (process.platform === "win32" ? expectedRoot.toLowerCase() : expectedRoot)
  ) {
    throw new Error("Operation lease entry path is indirect.");
  }
  const owner = {
    apiVersion: operationLeaseApiVersion,
    createdAtUnixMs: Date.now(),
    ownerNonce: nonce,
    ownerPid: process.pid,
    workspaceDigest,
  };
  const serialized = `${JSON.stringify(owner)}\n`;
  try {
    await writeFile(ownerPath, serialized, {
      encoding: "utf8",
      flag: "wx",
      mode: 0o600,
    });
  } catch (error) {
    await rmdir(root).catch(() => {});
    throw error;
  }
  const writtenOwner = await lstat(ownerPath);
  if (writtenOwner.isSymbolicLink() || !writtenOwner.isFile()) {
    throw new Error("Operation lease owner is invalid.");
  }
  validateOperationLeasePermissions(writtenOwner, "owner");
  const rootIdentity = await lstat(root);
  const parentIdentity = await lstat(leaseParent);
  const serializedDigest = sha256(serialized);
  return {
    async release() {
      const currentParent = await lstat(leaseParent);
      if (
        !currentParent.isDirectory() ||
        currentParent.isSymbolicLink() ||
        !sameFilesystemEntry(parentIdentity, currentParent)
      ) {
        throw new Error("Operation lease parent changed before release.");
      }
      validateOperationLeasePermissions(currentParent, "parent");
      const entry = await lstat(root);
      if (!entry.isDirectory() || entry.isSymbolicLink()) {
        throw new Error("Operation lease changed before release.");
      }
      validateOperationLeasePermissions(entry, "entry");
      if (!sameFilesystemEntry(rootIdentity, entry)) {
        throw new Error("Operation lease identity changed before release.");
      }
      if ((await readdir(root)).join(",") !== "owner.json") {
        throw new Error("Operation lease contents changed before release.");
      }
      const ownerEntry = await lstat(ownerPath);
      if (ownerEntry.isSymbolicLink() || !ownerEntry.isFile()) {
        throw new Error("Operation lease owner changed before release.");
      }
      validateOperationLeasePermissions(ownerEntry, "owner");
      const currentOwner = await readFile(ownerPath, "utf8");
      if (
        currentOwner !== serialized ||
        sha256(currentOwner) !== serializedDigest
      ) {
        throw new Error("Operation lease owner changed before release.");
      }
      await unlink(ownerPath);
      await rmdir(root);
    },
  };
}

function containedPath(root, candidate) {
  const resolvedRoot = resolve(root);
  const resolvedCandidate = resolve(candidate);
  const fromRoot = relative(resolvedRoot, resolvedCandidate);
  return (
    fromRoot !== "" &&
    fromRoot !== ".." &&
    !fromRoot.startsWith(`..${sep}`) &&
    !isAbsolute(fromRoot)
  );
}

async function verifyOwnedOverride(
  root,
  path,
  digest,
  expectedCanonicalRoot,
  expectedRootIdentity,
  expectedPathIdentity,
) {
  if (!containedPath(root, path)) return false;
  try {
    const rootEntry = await lstat(root);
    const entry = await lstat(path);
    const canonicalRoot = await realpath(root);
    if (
      rootEntry.isSymbolicLink() ||
      !rootEntry.isDirectory() ||
      entry.isSymbolicLink() ||
      !entry.isFile() ||
      (expectedCanonicalRoot !== undefined &&
        (process.platform === "win32"
          ? canonicalRoot.toLowerCase()
          : canonicalRoot) !== expectedCanonicalRoot) ||
      (expectedRootIdentity !== undefined &&
        !sameFilesystemEntry(expectedRootIdentity, rootEntry)) ||
      (expectedPathIdentity !== undefined &&
        !sameFilesystemEntry(expectedPathIdentity, entry))
    ) {
      return false;
    }
    return sha256(await readFile(path)) === digest;
  } catch {
    return false;
  }
}

async function createOwnedOverride(projectName, timingHarness = false) {
  const root = await mkdtemp(join(tmpdir(), `${projectName}-acceptance-`));
  const path = join(root, "compose.override.yml");
  const contents = Buffer.from(loopbackComposeOverride, "utf8");
  const digest = sha256(contents);
  const canonicalRootValue = await realpath(root);
  const canonicalRoot =
    process.platform === "win32"
      ? canonicalRootValue.toLowerCase()
      : canonicalRootValue;
  const rootIdentity = await lstat(root);
  let pathIdentity;
  try {
    await writeFile(path, contents, { encoding: "utf8", flag: "wx" });
    pathIdentity = await lstat(path);
    if (
      !(await verifyOwnedOverride(
        root,
        path,
        digest,
        canonicalRoot,
        rootIdentity,
        pathIdentity,
      ))
    ) {
      throw new Error("Local acceptance override is invalid.");
    }
    return {
      canonicalRoot,
      digest,
      path,
      pathIdentity,
      root,
      rootIdentity,
      timingHarness,
    };
  } catch (error) {
    await removeOwnedOverride({
      canonicalRoot,
      digest,
      path,
      pathIdentity,
      root,
      rootIdentity,
      timingHarness,
    });
    throw error;
  }
}

function localPreviewLease({
  compilationId,
  factoryProjectName,
  previewRunId,
}) {
  if (
    typeof compilationId !== "string" ||
    !/^[a-z0-9-]+$/u.test(compilationId) ||
    typeof factoryProjectName !== "string" ||
    !/^factory-local-[a-z0-9-]+$/u.test(factoryProjectName) ||
    typeof previewRunId !== "string" ||
    !/^preview-[a-z0-9-]+$/u.test(previewRunId)
  ) {
    throw new Error("Local preview lease identity is invalid.");
  }
  return {
    apiVersion: localPreviewLeaseApiVersion,
    compilationId,
    composeProjectName: `factory-preview-${previewRunId}`,
    factoryProjectName,
    previewDirectoryRelativePath: `.preview-runs/${previewRunId}`,
    previewRunId,
  };
}

export async function createLocalPreviewLease(root, identity) {
  const lease = localPreviewLease(identity);
  const path = join(root, previewLeaseFilename);
  if (!containedPath(root, path)) {
    throw new Error("Local preview lease is outside its run root.");
  }
  await writeFile(path, `${JSON.stringify(lease)}\n`, {
    encoding: "utf8",
    flag: "wx",
  });
  const entry = await lstat(path);
  if (entry.isSymbolicLink() || !entry.isFile()) {
    throw new Error("Local preview lease is invalid.");
  }
  return lease;
}

function isExactPreviewLease(lease, factoryProjectName, compilationId) {
  if (!lease || typeof lease !== "object" || Array.isArray(lease)) return false;
  const expectedKeys = [
    "apiVersion",
    "compilationId",
    "composeProjectName",
    "factoryProjectName",
    "previewDirectoryRelativePath",
    "previewRunId",
  ];
  const keys = Object.keys(lease).sort();
  if (
    keys.length !== expectedKeys.length ||
    keys.some((key, index) => key !== expectedKeys[index]) ||
    lease.apiVersion !== localPreviewLeaseApiVersion ||
    lease.factoryProjectName !== factoryProjectName ||
    lease.compilationId !== compilationId ||
    typeof lease.previewRunId !== "string" ||
    !/^preview-[a-z0-9-]+$/u.test(lease.previewRunId)
  ) {
    return false;
  }
  return (
    lease.composeProjectName === `factory-preview-${lease.previewRunId}` &&
    lease.previewDirectoryRelativePath === `.preview-runs/${lease.previewRunId}`
  );
}

async function readLocalPreviewLease(root, factoryProjectName, compilationId) {
  const path = join(root, previewLeaseFilename);
  if (!containedPath(root, path)) return null;
  try {
    const rootEntry = await lstat(root);
    const entry = await lstat(path);
    if (
      rootEntry.isSymbolicLink() ||
      !rootEntry.isDirectory() ||
      entry.isSymbolicLink() ||
      !entry.isFile()
    ) {
      return null;
    }
    const lease = JSON.parse(await readFile(path, "utf8"));
    return isExactPreviewLease(lease, factoryProjectName, compilationId)
      ? lease
      : null;
  } catch {
    return null;
  }
}

async function readPreviewRequest(
  root,
  signal,
  timeoutMilliseconds = previewStartTimeoutMilliseconds,
) {
  const path = join(root, previewRequestFilename);
  if (!containedPath(root, path))
    throw new Error("Preview request is invalid.");
  const deadline = performance.now() + timeoutMilliseconds;
  while (!signal.aborted && performance.now() < deadline) {
    try {
      const rootEntry = await lstat(root);
      const entry = await lstat(path);
      if (
        rootEntry.isSymbolicLink() ||
        !rootEntry.isDirectory() ||
        entry.isSymbolicLink() ||
        !entry.isFile()
      ) {
        throw new Error("Preview request is invalid.");
      }
      const compilationId = (await readFile(path, "utf8")).trim();
      if (!/^[a-z0-9-]{1,128}$/u.test(compilationId)) {
        throw new Error("Preview request is invalid.");
      }
      return compilationId;
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
    await delay(25);
  }
  throw new Error("Preview request did not arrive.");
}

function controlPlaneUrl(baseUrl, path) {
  return new URL(path, `${baseUrl}/`).toString();
}

export async function fetchWithDeadline(
  fetchImpl,
  url,
  options = {},
  timeoutMilliseconds,
  consumeResponse = (response) => response,
) {
  if (!Number.isSafeInteger(timeoutMilliseconds) || timeoutMilliseconds < 1) {
    throw new Error("HTTP deadline is invalid.");
  }
  const controller = new AbortController();
  const upstreamSignal = options.signal;
  const abort = () => controller.abort();
  upstreamSignal?.addEventListener("abort", abort, { once: true });
  if (upstreamSignal?.aborted) abort();
  let timeout;
  try {
    return await Promise.race([
      Promise.resolve().then(async () => {
        const response = await fetchImpl(url, {
          ...options,
          signal: controller.signal,
        });
        return await consumeResponse(response);
      }),
      new Promise((_, reject) => {
        timeout = setTimeout(() => {
          controller.abort();
          reject(new Error("HTTP deadline expired."));
        }, timeoutMilliseconds);
      }),
    ]);
  } finally {
    clearTimeout(timeout);
    upstreamSignal?.removeEventListener("abort", abort);
  }
}

async function boundedJsonResponse(response, limit = 65_536) {
  if (!response.body || typeof response.body.getReader !== "function") {
    const text = await response.text();
    if (Buffer.byteLength(text, "utf8") > limit) {
      throw new Error("HTTP response body is too large.");
    }
    return { ok: response.ok, value: JSON.parse(text) };
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let bytes = 0;
  let text = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    bytes += value.byteLength;
    if (bytes > limit) {
      await reader.cancel().catch(() => {});
      throw new Error("HTTP response body is too large.");
    }
    text += decoder.decode(value, { stream: true });
  }
  text += decoder.decode();
  return { ok: response.ok, value: JSON.parse(text) };
}

function previewIdentity(value, compilationId) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  if (
    value.compilationId !== compilationId ||
    typeof value.id !== "string" ||
    !/^preview-[a-z0-9-]+$/u.test(value.id) ||
    value.composeProjectName !== `factory-preview-${value.id}`
  ) {
    return null;
  }
  return {
    composeProjectName: value.composeProjectName,
    previewRunId: value.id,
  };
}

function localPreviewIntentResponse(value, compilationId, previewRunId) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const expectedKeys = [
    "apiVersion",
    "compilationId",
    "composeProjectName",
    "previewRunId",
    "status",
  ];
  const keys = Object.keys(value).sort();
  if (
    keys.length !== expectedKeys.length ||
    keys.some((key, index) => key !== expectedKeys[index]) ||
    value.apiVersion !== "factory.local-preview-intent/v1" ||
    value.compilationId !== compilationId ||
    value.previewRunId !== previewRunId ||
    value.composeProjectName !== `factory-preview-${previewRunId}` ||
    !["starting", "ready", "stopping", "stopped", "failed"].includes(
      value.status,
    )
  ) {
    return null;
  }
  return {
    composeProjectName: value.composeProjectName,
    previewRunId: value.previewRunId,
  };
}

async function startRunnerOwnedPreview(
  previewFetch,
  baseUrl,
  root,
  factoryProjectName,
  compilationId,
  previewRunId,
  acceptanceToken,
  internalToken,
  intentTimeoutMilliseconds = 300_000,
  ordinaryTimeoutMilliseconds = 10_000,
  signal,
  timingGate = async () => {},
) {
  const compilation = await fetchWithDeadline(
    previewFetch,
    controlPlaneUrl(
      baseUrl,
      `/compilations/${encodeURIComponent(compilationId)}`,
    ),
    { signal },
    ordinaryTimeoutMilliseconds,
    boundedJsonResponse,
  );
  if (!compilation.ok) throw new Error("Selected compilation is unavailable.");
  const selected = compilation.value;
  if (
    !selected ||
    selected.id !== compilationId ||
    selected.result?.status !== "succeeded"
  ) {
    throw new Error("Selected compilation is not immutable and succeeded.");
  }
  const cleanupLease = localPreviewLease({
    compilationId,
    factoryProjectName,
    previewRunId,
  });
  await timingGate("after-preview-intent");
  const responsePromise = fetchWithDeadline(
    previewFetch,
    controlPlaneUrl(
      baseUrl,
      `/internal/compilations/${encodeURIComponent(compilationId)}/preview-runs`,
    ),
    {
      body: JSON.stringify({
        apiVersion: "factory.local-preview-intent/v1",
        previewRunId,
      }),
      headers: {
        "content-type": "application/json",
        "x-factory-internal-token": internalToken,
        "x-factory-local-acceptance-token": acceptanceToken,
      },
      method: "POST",
      signal,
    },
    intentTimeoutMilliseconds,
    boundedJsonResponse,
  );
  await timingGate("during-preview-post");
  const response = await responsePromise;
  await timingGate("after-preview-response");
  if (!response.ok) throw new Error("Preview start was rejected.");
  const preview = localPreviewIntentResponse(
    response.value,
    compilationId,
    previewRunId,
  );
  if (!preview) throw new Error("Preview start identity is invalid.");
  await timingGate("during-preview-startup");
  try {
    await createLocalPreviewLease(root, {
      compilationId,
      factoryProjectName,
      previewRunId,
    });
  } catch {
    return { cleanupLease, lease: null };
  }
  const lease = await readLocalPreviewLease(
    root,
    factoryProjectName,
    compilationId,
  );
  await timingGate("after-preview-ready");
  return { cleanupLease, lease };
}

async function removeOwnedOverride(override) {
  if (override === null) return true;
  try {
    const rootValid = async () => {
      const entry = await lstat(override.root);
      const canonicalValue = await realpath(override.root);
      const canonical =
        process.platform === "win32"
          ? canonicalValue.toLowerCase()
          : canonicalValue;
      return (
        entry.isDirectory() &&
        !entry.isSymbolicLink() &&
        sameFilesystemEntry(override.rootIdentity, entry) &&
        canonical === override.canonicalRoot
      );
    };
    if (!(await rootValid())) return false;
    const entries = (await readdir(override.root)).sort();
    const allowedEntries = new Set([
      "compose.override.yml",
      "preview.lease.json",
      "preview.request",
      ...(override.timingHarness
        ? ["compose.override.moved", "preview.lease.moved"]
        : []),
    ]);
    if (entries.some((entry) => !allowedEntries.has(entry))) {
      return false;
    }
    let integrityValid = true;
    for (const entry of entries) {
      if (!(await rootValid())) return false;
      const ownedPath = join(override.root, entry);
      const ownedEntry = await lstat(ownedPath);
      if (ownedEntry.isDirectory()) return false;
      if (entry === "compose.override.yml") {
        if (override.pathIdentity === undefined) return false;
        if (
          ownedEntry.isSymbolicLink() ||
          !ownedEntry.isFile() ||
          !sameFilesystemEntry(override.pathIdentity, ownedEntry) ||
          sha256(await readFile(ownedPath)) !== override.digest
        ) {
          integrityValid = false;
        }
      } else if (!ownedEntry.isFile() && !ownedEntry.isSymbolicLink()) {
        return false;
      }
      await unlink(ownedPath);
      if (!(await rootValid())) return false;
    }
    if ((await readdir(override.root)).length !== 0) return false;
    await rmdir(override.root);
    return integrityValid;
  } catch {
    return false;
  }
}

function appendBounded(current, chunk) {
  if (current.length >= outputLimit) return current;
  return `${current}${chunk.toString("utf8")}`.slice(0, outputLimit);
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function endpointReady(url, signal, fetchImpl) {
  const controller = new AbortController();
  const abort = () => controller.abort();
  const timeout = setTimeout(abort, 2_000);
  signal.addEventListener("abort", abort, { once: true });
  try {
    const response = await fetchImpl(url, {
      redirect: "manual",
      signal: controller.signal,
    });
    return response.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
    signal.removeEventListener("abort", abort);
  }
}

export async function waitForHostReadiness(
  urls,
  {
    signal,
    fetchImpl = fetch,
    timeoutMilliseconds = 120_000,
    retryMilliseconds = 250,
  },
) {
  const deadline = performance.now() + timeoutMilliseconds;
  while (!signal.aborted && performance.now() < deadline) {
    const ready = await Promise.all(
      urls.map((url) => endpointReady(url, signal, fetchImpl)),
    );
    if (ready.every(Boolean)) return true;
    await delay(retryMilliseconds);
  }
  return false;
}

function processGroupExists(processId) {
  try {
    process.kill(-processId, 0);
    return true;
  } catch (error) {
    return error?.code !== "ESRCH";
  }
}

async function waitForProcessGroupExit(processId, timeoutMilliseconds) {
  const deadline = performance.now() + timeoutMilliseconds;
  while (performance.now() < deadline) {
    if (!processGroupExists(processId)) return true;
    await delay(25);
  }
  return !processGroupExists(processId);
}

async function terminateUnixProcessGroup(processId) {
  try {
    process.kill(-processId, "SIGTERM");
  } catch (error) {
    if (error?.code === "ESRCH") return true;
    return false;
  }
  if (await waitForProcessGroupExit(processId, 1_000)) return true;
  try {
    process.kill(-processId, "SIGKILL");
  } catch (error) {
    if (error?.code === "ESRCH") return true;
    return false;
  }
  return await waitForProcessGroupExit(processId, 1_000);
}

async function terminateWindowsProcessTree(
  processId,
  spawnProcess,
  timeoutMilliseconds,
) {
  return await new Promise((resolve) => {
    let settled = false;
    let timeout;
    let reapTimeout;
    let activeProcess;
    let verifying = false;
    const deadline = performance.now() + timeoutMilliseconds;
    const finish = (result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      clearTimeout(reapTimeout);
      resolve(result);
    };
    const verifyAbsent = () => {
      if (settled || verifying) return;
      verifying = true;
      const proofMilliseconds = Math.max(
        1,
        Math.floor(deadline - performance.now() - 250),
      );
      const proofCommand = [
        "$ErrorActionPreference = 'Stop'",
        `$rootProcessId = ${processId}`,
        `$proofDeadline = [DateTime]::UtcNow.AddMilliseconds(${proofMilliseconds})`,
        "function Get-TreeIds($rows, $root) { $ids = @([uint32]$root); for ($index = 0; $index -lt $ids.Count; $index++) { $parent = $ids[$index]; foreach ($row in $rows) { $candidate = [uint32]$row.ProcessId; if ([uint32]$row.ParentProcessId -eq $parent -and $ids -notcontains $candidate) { $ids += $candidate } } }; return ,$ids }",
        "try { $stable = 0 ; while ([DateTime]::UtcNow -lt $proofDeadline) { $rows = @(Get-CimInstance Win32_Process) ; $currentIds = @(Get-TreeIds $rows $rootProcessId) ; $live = ($rows | Where-Object { $currentIds -contains [uint32]$_.ProcessId }).Count -gt 0 ; if ($live) { $stable = 0 } else { $stable += 1 ; if ($stable -ge 3) { exit 0 } } ; Start-Sleep -Milliseconds 25 } ; exit 1 } catch { exit 1 }",
      ].join("; ");
      activeProcess = spawnProcess(
        "powershell.exe",
        ["-NoLogo", "-NoProfile", "-NonInteractive", "-Command", proofCommand],
        {
          shell: false,
          stdio: "ignore",
          windowsHide: true,
        },
      );
      activeProcess.once("error", () => finish(false));
      activeProcess.once("close", (code) => finish(code === 0));
    };
    activeProcess = spawnProcess(
      "taskkill.exe",
      ["/pid", String(processId), "/T", "/F"],
      {
        shell: false,
        stdio: "ignore",
        windowsHide: true,
      },
    );
    activeProcess.once("error", verifyAbsent);
    activeProcess.once("close", (code) => {
      if (code === 0) finish(true);
      else verifyAbsent();
    });
    timeout = setTimeout(() => {
      activeProcess?.kill?.();
      reapTimeout = setTimeout(() => finish(false), 1_000);
    }, timeoutMilliseconds);
  });
}

export async function executeCommand(
  command,
  args,
  {
    environment,
    signal,
    input = "",
    cwd = process.cwd(),
    platform = process.platform,
    spawnProcess = spawn,
    timeoutMilliseconds,
    windowsTerminationTimeoutMilliseconds = 10_000,
  },
) {
  return await new Promise((resolve) => {
    const child = spawnProcess(command, args, {
      cwd,
      detached: platform !== "win32",
      env: environment,
      shell: false,
      stdio: ["pipe", "pipe", "pipe"],
      windowsHide: true,
    });
    let stdout = "";
    let stderr = "";
    let settled = false;
    let aborted = false;
    let closeResult;
    let termination;
    let terminationDeadline;
    let reapTimeout;
    let timeout;
    const finish = (result) => {
      if (settled) return;
      settled = true;
      clearTimeout(reapTimeout);
      clearTimeout(timeout);
      signal?.removeEventListener("abort", abort);
      resolve(result);
    };
    const completeIfReady = () => {
      if (settled || closeResult === undefined) return;
      if (!aborted) {
        finish({ ...closeResult, terminationProven: true });
        return;
      }
      void (termination ?? Promise.resolve(false)).then((terminated) => {
        finish({
          ...closeResult,
          exitCode:
            terminated && closeResult.exitCode !== 0 ? closeResult.exitCode : 1,
          terminationProven: terminated,
        });
      });
    };
    const abort = () => {
      if (aborted) return;
      aborted = true;
      terminationDeadline =
        platform === "win32"
          ? performance.now() + windowsTerminationTimeoutMilliseconds
          : undefined;
      termination =
        child.pid === undefined
          ? Promise.resolve(false)
          : platform === "win32"
            ? terminateWindowsProcessTree(
                child.pid,
                spawnProcess,
                windowsTerminationTimeoutMilliseconds,
              )
            : terminateUnixProcessGroup(child.pid);
      void termination.then((terminated) => {
        if (closeResult !== undefined) {
          completeIfReady();
          return;
        }
        if (!terminated) {
          finish({ exitCode: 1, stderr, stdout, terminationProven: false });
          return;
        }
        const remainingReapMilliseconds =
          platform === "win32"
            ? Math.max(1, Math.ceil(terminationDeadline - performance.now()))
            : 1_000;
        reapTimeout = setTimeout(
          () =>
            finish({
              exitCode: 1,
              stderr,
              stdout,
              terminationProven: false,
            }),
          remainingReapMilliseconds,
        );
      });
      completeIfReady();
    };
    signal?.addEventListener("abort", abort, { once: true });
    if (signal?.aborted) abort();
    if (Number.isSafeInteger(timeoutMilliseconds) && timeoutMilliseconds > 0) {
      timeout = setTimeout(abort, timeoutMilliseconds);
    }
    child.stdin.on("error", () => {});
    child.stdin.end(input);
    child.stdout.on("data", (chunk) => {
      stdout = appendBounded(stdout, chunk);
    });
    child.stderr.on("data", (chunk) => {
      stderr = appendBounded(stderr, chunk);
    });
    child.once("error", () => {
      closeResult = { exitCode: 1, stderr: "", stdout: "" };
      completeIfReady();
    });
    child.once("close", (code) => {
      closeResult = { exitCode: code ?? 1, stderr, stdout };
      completeIfReady();
    });
  });
}

function installSignalHandler(handler) {
  const onInterrupt = () => handler("SIGINT");
  const onTerminate = () => handler("SIGTERM");
  process.once("SIGINT", onInterrupt);
  process.once("SIGTERM", onTerminate);
  return () => {
    process.removeListener("SIGINT", onInterrupt);
    process.removeListener("SIGTERM", onTerminate);
  };
}

async function reserveLoopbackPorts() {
  const servers = [];
  const ports = [];
  const close = async (server) => {
    if (!server.listening) return;
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  };
  try {
    for (let index = 0; index < 4; index += 1) {
      const server = createServer();
      await new Promise((resolve, reject) => {
        server.once("error", reject);
        server.listen(0, "127.0.0.1", resolve);
      });
      const address = server.address();
      if (typeof address === "string" || address === null) {
        throw new Error("Unable to reserve a loopback port.");
      }
      servers.push(server);
      ports.push(address.port);
    }
  } catch (error) {
    await Promise.allSettled(servers.map(close));
    throw error;
  }
  let released = false;
  return {
    ports,
    release: async () => {
      if (released) return;
      released = true;
      await Promise.all(servers.map(close));
    },
  };
}

function safeSecret(randomBytes) {
  return randomBytes(18).toString("base64url");
}

function versionAtLeast(version, minimum) {
  for (let index = 0; index < minimum.length; index += 1) {
    if (version[index] > minimum[index]) return true;
    if (version[index] < minimum[index]) return false;
  }
  return true;
}

function createChildEnvironment(environment, projectName, ports, secrets) {
  const childEnvironment = { ...environment };
  delete childEnvironment.OPENAI_MODEL;
  delete childEnvironment.FACTORY_LOCAL_PREVIEW_PROFILE;
  return {
    ...childEnvironment,
    FACTORY_FIXTURE_MODE: "",
    FACTORY_CONTROL_PLANE_PORT: String(ports.controlPlane),
    FACTORY_E2E_BASE_URL: `http://127.0.0.1:${ports.workbench}`,
    FACTORY_E2E_CONTROL_PLANE_URL: `http://127.0.0.1:${ports.controlPlane}`,
    FACTORY_E2E_FACTORY_PROJECT: projectName,
    FACTORY_E2E_ISOLATED: "1",
    FACTORY_LOCAL_PREVIEW_PROFILE: localPreviewProfile,
    FACTORY_INTERNAL_WORKER_TOKEN: secrets.workerToken,
    OPENAI_API_KEY: "",
    FACTORY_POSTGRES_PORT: String(ports.postgres),
    FACTORY_PUBLIC_CONTROL_PLANE_URL: `http://127.0.0.1:${ports.controlPlane}`,
    FACTORY_REDIS_PASSWORD: secrets.redisPassword,
    FACTORY_REDIS_PORT: String(ports.redis),
    FACTORY_WORKBENCH_PORT: String(ports.workbench),
    RESTAURANT_DEMO_TABLE_TOKEN: secrets.tableToken,
  };
}

export async function createRunInputs({
  environment = process.env,
  randomBytes = nodeRandomBytes,
  reservePorts = reserveLoopbackPorts,
} = {}) {
  const reservation = await reservePorts();
  if (!Array.isArray(reservation.ports) || reservation.ports.length !== 4) {
    await reservation.release?.();
    throw new Error("Exactly four loopback ports are required.");
  }
  if (new Set(reservation.ports).size !== 4) {
    await reservation.release?.();
    throw new Error("Reserved loopback ports must be unique.");
  }
  const projectName = `factory-local-${randomBytes(18).toString("hex")}`;
  const ports = {
    postgres: reservation.ports[0],
    redis: reservation.ports[1],
    controlPlane: reservation.ports[2],
    workbench: reservation.ports[3],
  };
  const secrets = {
    redisPassword: safeSecret(randomBytes),
    workerToken: safeSecret(randomBytes),
    tableToken: safeSecret(randomBytes),
  };
  return {
    environment: createChildEnvironment(
      environment,
      projectName,
      ports,
      secrets,
    ),
    ports,
    projectName,
    releasePorts: reservation.release,
    secrets,
  };
}

function parseDoctorVersions(stdout) {
  const node = /^PASS node: v(\d+\.\d+\.\d+)$/mu.exec(stdout)?.[1];
  const pnpm = /^PASS pnpm: (\d+\.\d+\.\d+)$/mu.exec(stdout)?.[1];
  const compose = /^PASS docker-compose: v?(\d+\.\d+\.\d+)$/mu.exec(
    stdout,
  )?.[1];
  const composeParts = compose?.split(".").map(Number);
  const composeSupported =
    composeParts !== undefined &&
    composeParts.length === minimumComposeVersion.length &&
    composeParts.every(Number.isInteger) &&
    versionAtLeast(composeParts, minimumComposeVersion);
  return node && pnpm && composeSupported ? { node, pnpm } : null;
}

function parseEvidence(stdout) {
  const marker = stdout
    .replace(ansiPattern, "")
    .split(/\r?\n/u)
    .find((line) => line.includes(evidencePrefix));
  if (!marker) return null;
  try {
    const markerIndex = marker.indexOf(evidencePrefix);
    const parsed = JSON.parse(
      marker.slice(markerIndex + evidencePrefix.length).trim(),
    );
    const accessibility = parsed?.accessibility;
    const digests = parsed?.digests;
    const counts = [
      accessibility?.generatedDesktop,
      accessibility?.generatedNarrow,
      accessibility?.workbenchDesktop,
      accessibility?.workbenchNarrow,
    ];
    if (!counts.every((value) => value === 0)) {
      return null;
    }
    if (
      !digestPattern.test(digests?.publishedRevision ?? "") ||
      !digestPattern.test(digests?.compilation ?? "")
    ) {
      return null;
    }
    return {
      accessibility: {
        generatedDesktop: accessibility.generatedDesktop,
        generatedNarrow: accessibility.generatedNarrow,
        workbenchDesktop: accessibility.workbenchDesktop,
        workbenchNarrow: accessibility.workbenchNarrow,
      },
      digests: {
        compilation: digests.compilation,
        publishedRevision: digests.publishedRevision,
      },
    };
  } catch {
    return null;
  }
}

function parseLastAllowlistedMarker(stdout, prefix, allowlist) {
  let lastStage = null;
  for (const line of stdout.replace(ansiPattern, "").split(/\r?\n/u)) {
    const markerIndex = line.indexOf(prefix);
    if (markerIndex === -1) continue;
    const stage = line.slice(markerIndex + prefix.length).trim();
    if (allowlist.has(stage)) lastStage = stage;
  }
  return lastStage;
}

function outputCount(stdout) {
  return stdout.split(/\r?\n/u).filter((line) => line.trim() !== "").length;
}

function hasExactLoopbackBindings(stdout, ports) {
  try {
    const services = JSON.parse(stdout)?.services;
    const expected = {
      "control-plane": { published: ports.controlPlane, target: 3000 },
      postgres: { published: ports.postgres, target: 5432 },
      redis: { published: ports.redis, target: 6379 },
      workbench: { published: ports.workbench, target: 5174 },
    };
    return Object.entries(expected).every(([service, binding]) => {
      const published = services?.[service]?.ports;
      return (
        Array.isArray(published) &&
        published.length === 1 &&
        published[0]?.host_ip === "127.0.0.1" &&
        published[0]?.protocol === "tcp" &&
        published[0]?.target === binding.target &&
        published[0]?.published === String(binding.published)
      );
    });
  } catch {
    return false;
  }
}

function exactOutputLines(stdout, pattern, { allowEmpty = false } = {}) {
  const lines = stdout
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter(Boolean);
  if (
    (!allowEmpty && lines.length === 0) ||
    lines.some((line) => !pattern.test(line))
  ) {
    return null;
  }
  return [...new Set(lines)].length === lines.length ? lines : null;
}

const previewDirectoryCleanupProgram = [
  'const fs=require("node:fs");',
  'const path=require("node:path");',
  'const crypto=require("node:crypto");',
  "const id=process.argv[1];",
  "if(!/^preview-[a-f0-9]{64}$/.test(id))process.exit(1);",
  'const base="/artifacts";',
  'const root="/artifacts/.preview-runs";',
  "const target=path.join(root,id);",
  "function same(a,b){return a.dev===b.dev&&a.ino===b.ino;}",
  "function absent(candidate){try{fs.lstatSync(candidate);return false;}catch(e){if(e.code==='ENOENT')return true;throw e;}}",
  "const baseIdentity=fs.lstatSync(base);",
  "function baseOk(){const e=fs.lstatSync(base);return e.isDirectory()&&!e.isSymbolicLink()&&same(e,baseIdentity)&&fs.realpathSync(base)===base;}",
  "let rootIdentity=null;",
  "function rootOk(){if(!baseOk()||rootIdentity===null)return false;const e=fs.lstatSync(root);return e.isDirectory()&&!e.isSymbolicLink()&&same(e,rootIdentity)&&fs.realpathSync(root)===root;}",
  "function removeNoFollow(candidate){if(!rootOk())throw new Error();const before=fs.lstatSync(candidate);if(before.isSymbolicLink()||before.isFile()){fs.unlinkSync(candidate);if(!rootOk()||!absent(candidate))throw new Error();return;}if(!before.isDirectory())throw new Error();const names=fs.readdirSync(candidate);const afterRead=fs.lstatSync(candidate);if(!same(before,afterRead)||afterRead.isSymbolicLink())throw new Error();for(const name of names){if(name==='.'||name==='..'||path.basename(name)!==name)throw new Error();removeNoFollow(path.join(candidate,name));const unchanged=fs.lstatSync(candidate);if(!same(before,unchanged)||!rootOk())throw new Error();}const beforeRemove=fs.lstatSync(candidate);if(!same(before,beforeRemove))throw new Error();fs.rmdirSync(candidate);if(!rootOk()||!absent(candidate))throw new Error();}",
  "async function main(){if(!baseOk())throw new Error();if(!absent(root)){rootIdentity=fs.lstatSync(root);if(!rootOk())throw new Error();if(!absent(target)){const before=fs.lstatSync(target);if(before.isSymbolicLink()){fs.unlinkSync(target);}else{if(!before.isDirectory())throw new Error();const tombstone=path.join(root,`${id}.cleanup-${crypto.randomBytes(16).toString('hex')}`);fs.renameSync(target,tombstone);const moved=fs.lstatSync(tombstone);if(!same(before,moved)||moved.isSymbolicLink())throw new Error();removeNoFollow(tombstone);}}}for(let i=0;i<3;i+=1){if(!baseOk()||(!absent(root)&&(!rootOk()||!absent(target))))throw new Error();if(i<2)await new Promise(r=>setTimeout(r,1000));}}",
  "main().catch(()=>{process.exitCode=1;});",
].join("");

export async function cleanupExactPreownedPreview({
  baseUrl,
  factoryProjectName,
  lease,
  previewFetch,
  previewStopTimeoutMilliseconds = 120_000,
  runStep,
  signal,
  stableProofTimeoutMilliseconds = 95_000,
  timingGate = async () => {},
  wait = delay,
}) {
  if (!isExactPreviewLease(lease, factoryProjectName, lease?.compilationId)) {
    return false;
  }
  const containerPattern = /^[a-f0-9]{12,64}$/u;
  const volumePattern = /^[A-Za-z0-9][A-Za-z0-9_.-]*$/u;
  const serviceContainers = async (
    name,
    service,
    { all = false, timeoutMilliseconds } = {},
  ) => {
    const result = await runStep(
      name,
      "docker",
      [
        "ps",
        ...(all ? ["-a"] : []),
        "--filter",
        `label=com.docker.compose.project=${factoryProjectName}`,
        "--filter",
        `label=com.docker.compose.service=${service}`,
        "--format",
        "{{.ID}}",
      ],
      { abortable: false, timeoutMilliseconds },
    );
    if (result.exitCode !== 0) return null;
    return exactOutputLines(result.stdout, containerPattern, {
      allowEmpty: true,
    });
  };
  const workers = await serviceContainers(
    "preview-worker-container",
    "compiler-worker",
    { all: true },
  );
  if (workers?.length !== 1) return false;
  const image = await runStep(
    "preview-worker-image",
    "docker",
    ["inspect", "--format", "{{.Image}}", workers[0]],
    { abortable: false },
  );
  const imageIds =
    image.exitCode === 0
      ? exactOutputLines(image.stdout, /^sha256:[a-f0-9]{64}$/u)
      : null;
  if (imageIds?.length !== 1) return false;

  try {
    await timingGate("during-preview-stop");
    await fetchWithDeadline(
      previewFetch,
      controlPlaneUrl(
        baseUrl,
        `/preview-runs/${encodeURIComponent(lease.previewRunId)}/stop`,
      ),
      { method: "POST", signal },
      previewStopTimeoutMilliseconds,
    );
  } catch {
    // Exact fallback cleanup proceeds only after both producers are quiesced.
  }

  const controlPlanes = await serviceContainers(
    "outer-control-plane-containers",
    "control-plane",
    { all: true },
  );
  const confirmedWorkers = await serviceContainers(
    "outer-worker-containers",
    "compiler-worker",
    { all: true },
  );
  if (
    controlPlanes?.length !== 1 ||
    confirmedWorkers?.length !== 1 ||
    confirmedWorkers[0] !== workers[0]
  ) {
    return false;
  }
  for (const [name, ids] of [
    ["outer-control-plane-stop", controlPlanes],
    ["outer-worker-stop", confirmedWorkers],
  ]) {
    const stopped = await runStep(
      name,
      "docker",
      ["stop", "--time", "60", ...ids],
      { abortable: false },
    );
    if (stopped.exitCode !== 0) return false;
  }

  const previewFilter = `label=com.docker.compose.project=${lease.composeProjectName}`;
  const listPreviewResources = async (kind, name, timeoutMilliseconds) => {
    const args =
      kind === "containers"
        ? ["ps", "-a", "--filter", previewFilter, "--format", "{{.ID}}"]
        : kind === "networks"
          ? ["network", "ls", "--filter", previewFilter, "--format", "{{.ID}}"]
          : [
              "volume",
              "ls",
              "--filter",
              previewFilter,
              "--format",
              "{{.Name}}",
            ];
    const listed = await runStep(name, "docker", args, {
      abortable: false,
      timeoutMilliseconds,
    });
    if (listed.exitCode !== 0) return null;
    return exactOutputLines(
      listed.stdout,
      kind === "volumes" ? volumePattern : containerPattern,
      { allowEmpty: true },
    );
  };
  for (const kind of ["containers", "networks", "volumes"]) {
    const names = await listPreviewResources(kind, `preview-${kind}-list`);
    if (names === null) return false;
    if (names.length > 0) {
      const command =
        kind === "containers" ? ["rm", "-f"] : [kind.slice(0, -1), "rm"];
      const removed = await runStep(
        `preview-${kind}-remove`,
        "docker",
        [...command, ...names],
        { abortable: false },
      );
      if (removed.exitCode !== 0) return false;
    }
  }

  const volume = await runStep(
    "outer-artifacts-volume",
    "docker",
    [
      "volume",
      "ls",
      "--filter",
      `label=com.docker.compose.project=${factoryProjectName}`,
      "--filter",
      "label=com.docker.compose.volume=factory-artifacts",
      "--format",
      "{{.Name}}",
    ],
    { abortable: false },
  );
  const artifactVolumes =
    volume.exitCode === 0
      ? exactOutputLines(volume.stdout, volumePattern)
      : null;
  if (artifactVolumes?.length !== 1) return false;
  const helperName = `factory-local-acceptance-helper-${lease.previewRunId}`;
  const helperLabels = [
    "--label",
    "factory.archeform.helper=factory.local-acceptance-helper/v1",
    "--label",
    `factory.archeform.outer-project=${factoryProjectName}`,
    "--label",
    `factory.archeform.preview-run=${lease.previewRunId}`,
  ];
  const helperQueryArgs = [
    "ps",
    "-a",
    "--filter",
    `name=^/${helperName}$`,
    "--filter",
    "label=factory.archeform.helper=factory.local-acceptance-helper/v1",
    "--filter",
    `label=factory.archeform.outer-project=${factoryProjectName}`,
    "--filter",
    `label=factory.archeform.preview-run=${lease.previewRunId}`,
    "--format",
    "{{.ID}}",
  ];
  const helper = await runStep(
    "preview-helper",
    "docker",
    [
      "run",
      "--rm",
      "--name",
      helperName,
      ...helperLabels,
      "--pull",
      "never",
      "--network",
      "none",
      "--cap-drop",
      "ALL",
      "--security-opt",
      "no-new-privileges",
      "--read-only",
      "--mount",
      `type=volume,src=${artifactVolumes[0]},dst=/artifacts`,
      "--entrypoint",
      "node",
      imageIds[0],
      "-e",
      previewDirectoryCleanupProgram,
      lease.previewRunId,
    ],
    { abortable: false },
  );
  if (helper.exitCode !== 0) {
    const residual = await runStep(
      "preview-helper-recovery-query",
      "docker",
      helperQueryArgs,
      { abortable: false },
    );
    const residualIds =
      residual.exitCode === 0
        ? exactOutputLines(residual.stdout, containerPattern, {
            allowEmpty: true,
          })
        : null;
    if (residualIds?.length === 1) {
      await runStep(
        "preview-helper-recovery-remove",
        "docker",
        ["rm", "-f", residualIds[0]],
        { abortable: false },
      );
    }
    await runStep("preview-helper-recovery-proof", "docker", helperQueryArgs, {
      abortable: false,
    });
    return false;
  }

  const stableProofDeadline =
    performance.now() + stableProofTimeoutMilliseconds;
  const withinStableProofDeadline = async (
    operation,
    { terminationReserveMilliseconds = 10_000 } = {},
  ) => {
    const remaining = Math.floor(stableProofDeadline - performance.now());
    const operationBudget = remaining - terminationReserveMilliseconds;
    if (operationBudget < 1) return null;
    const result = await operation(Math.min(30_000, operationBudget));
    return performance.now() <= stableProofDeadline ? result : null;
  };
  for (let observation = 0; observation < 3; observation += 1) {
    const proofs = [
      await withinStableProofDeadline((timeoutMilliseconds) =>
        serviceContainers(
          `stable-proof-control-plane-${observation}`,
          "control-plane",
          { timeoutMilliseconds },
        ),
      ),
      await withinStableProofDeadline((timeoutMilliseconds) =>
        serviceContainers(
          `stable-proof-worker-${observation}`,
          "compiler-worker",
          { timeoutMilliseconds },
        ),
      ),
      await withinStableProofDeadline((timeoutMilliseconds) =>
        listPreviewResources(
          "containers",
          `stable-proof-containers-${observation}`,
          timeoutMilliseconds,
        ),
      ),
      await withinStableProofDeadline((timeoutMilliseconds) =>
        listPreviewResources(
          "networks",
          `stable-proof-networks-${observation}`,
          timeoutMilliseconds,
        ),
      ),
      await withinStableProofDeadline((timeoutMilliseconds) =>
        listPreviewResources(
          "volumes",
          `stable-proof-volumes-${observation}`,
          timeoutMilliseconds,
        ),
      ),
    ];
    const helperProof = await withinStableProofDeadline((timeoutMilliseconds) =>
      runStep(`stable-proof-helper-${observation}`, "docker", helperQueryArgs, {
        abortable: false,
        timeoutMilliseconds,
      }),
    );
    const helpers =
      helperProof?.exitCode === 0
        ? exactOutputLines(helperProof.stdout, containerPattern, {
            allowEmpty: true,
          })
        : null;
    if ([...proofs, helpers].some((entries) => entries?.length !== 0)) {
      return false;
    }
    if (observation < 2) {
      const remaining = stableProofDeadline - performance.now();
      if (remaining < 1_000) return false;
      const waited = await withinStableProofDeadline(
        async () => {
          await wait(1_000);
          return true;
        },
        { terminationReserveMilliseconds: 0 },
      );
      if (waited !== true) return false;
    }
  }
  return true;
}

function localAcceptanceStepTimeout(name) {
  if (name === "compose-up") return 630_000;
  if (name === "playwright") return 900_000;
  if (name === "compose-down") return 180_000;
  if (name === "preview-helper") return 60_000;
  if (name === "outer-control-plane-stop" || name === "outer-worker-stop") {
    return 60_000;
  }
  return 30_000;
}

async function detectOuterAcceptanceResources(
  runStep,
  { abortable = true } = {},
) {
  const commands = [
    ["containers", ["ps", "-a"]],
    ["networks", ["network", "ls"]],
    ["volumes", ["volume", "ls"]],
  ];
  const outerLabel =
    /(?:^|,)com\.docker\.compose\.project=factory-local-[a-z0-9-]+(?:,|$)/u;
  for (const [kind, args] of commands) {
    const result = await runStep(
      `outer-guard-before-${kind}`,
      "docker",
      [
        ...args,
        "--filter",
        "label=com.docker.compose.project",
        "--format",
        "{{.Labels}}",
      ],
      { abortable },
    );
    if (
      result.exitCode !== 0 ||
      result.stdout
        .split(/\r?\n/u)
        .map((line) => line.trim())
        .filter(Boolean)
        .some((line) => outerLabel.test(line))
    ) {
      return false;
    }
  }
  return true;
}

export async function runLocalProductAcceptanceWorkload({
  cleanupWait = delay,
  environment = process.env,
  evidenceOnly = false,
  intentPostTimeoutMilliseconds = 300_000,
  installSignalHandler: registerSignalHandler = installSignalHandler,
  lifetimeSignal,
  platform = process.platform,
  randomBytes = nodeRandomBytes,
  previewFetch = fetch,
  previewStopTimeoutMilliseconds = 120_000,
  reservePorts = reserveLoopbackPorts,
  runCommand = executeCommand,
  timingGate = async () => {},
  waitForReady = waitForHostReadiness,
  windowsCommand = process.env.ComSpec ?? "cmd.exe",
} = {}) {
  const {
    FACTORY_LOCAL_ACCEPTANCE_TOKEN: _callerAcceptanceToken,
    FACTORY_LOCAL_ACCEPTANCE_TIMING_GATE: _callerTimingGate,
    ...preflightEnvironment
  } = environment;
  delete preflightEnvironment.OPENAI_MODEL;
  delete preflightEnvironment.FACTORY_LOCAL_PREVIEW_PROFILE;
  preflightEnvironment.OPENAI_API_KEY = "";
  preflightEnvironment.FACTORY_FIXTURE_MODE = "";
  let inputs = null;
  const controller = new AbortController();
  let interrupted = false;
  let portsReleased = false;
  let composeAttempted = false;
  let failed = evidenceOnly;
  let versions = null;
  let acceptanceEvidence = null;
  let cleanupStage = null;
  let failureStage = null;
  let override = null;
  let previewCleanupLease = null;
  let previewLease = null;
  let requestedCompilationId = null;
  let preGuardPassed = false;
  let previewMayExist = false;
  let previewProofComplete = true;
  let outerProofComplete = true;
  let privateRootRemoved = false;
  let processTerminationUncertain = false;
  let cleanupUncertain = false;
  let summary = null;
  let acceptanceToken = null;
  let composeEnvironment = preflightEnvironment;
  let childEnvironment = preflightEnvironment;
  const steps = [];
  const cleanup = {
    containers: -1,
    networks: -1,
    previewDirectories: -1,
    volumes: -1,
  };
  const releasePorts = async () => {
    if (portsReleased || inputs === null) return;
    portsReleased = true;
    await inputs.releasePorts();
  };
  const unregister = registerSignalHandler(() => {
    interrupted = true;
    controller.abort();
  });
  const stepSignal = (abortable) => {
    const signals = [
      ...(abortable ? [controller.signal] : []),
      ...(lifetimeSignal ? [lifetimeSignal] : []),
    ];
    if (signals.length === 0) return undefined;
    if (signals.length === 1) return signals[0];
    return AbortSignal.any(signals);
  };
  const runStep = async (
    name,
    command,
    args,
    {
      abortable = true,
      environment: stepEnvironment = childEnvironment,
      input = "",
      timeoutMilliseconds = localAcceptanceStepTimeout(name),
    } = {},
  ) => {
    let result;
    if (processTerminationUncertain) {
      steps.push({ exitCode: 1, name });
      return { exitCode: 1, stdout: "", terminationProven: false };
    }
    try {
      result = await runCommand(command, args, {
        environment: stepEnvironment,
        input,
        signal: stepSignal(abortable),
        timeoutMilliseconds,
      });
    } catch {
      result = { exitCode: 1, stderr: "", stdout: "" };
    }
    if (result?.terminationProven === false) {
      processTerminationUncertain = true;
      failed = true;
      cleanupUncertain = true;
    }
    const exitCode = Number.isInteger(result?.exitCode) ? result.exitCode : 1;
    steps.push({ exitCode, name });
    return {
      exitCode,
      stdout: typeof result?.stdout === "string" ? result.stdout : "",
      terminationProven: result?.terminationProven !== false,
    };
  };
  let composeArgs = [];
  productWork: {
    try {
      const doctor = await runStep("doctor", "node", [
        "scripts/doctor.mjs",
        "local",
      ]);
      versions =
        doctor.exitCode === 0 ? parseDoctorVersions(doctor.stdout) : null;
      if (doctor.exitCode !== 0 || versions === null || interrupted) {
        failed = true;
        break productWork;
      }

      const preGuard = await runStep("preview-guard-before", "node", [
        "scripts/verify-no-preview-resources.mjs",
      ]);
      if (preGuard.exitCode !== 0 || interrupted) {
        failed = true;
        break productWork;
      }
      const outerGuardPassed = await detectOuterAcceptanceResources(runStep);
      if (!outerGuardPassed || interrupted) {
        failed = true;
        break productWork;
      }
      preGuardPassed = true;

      try {
        inputs = await createRunInputs({
          environment: preflightEnvironment,
          randomBytes,
          reservePorts,
        });
        acceptanceToken = randomBytes(32).toString("hex");
        composeEnvironment = {
          ...inputs.environment,
          FACTORY_LOCAL_ACCEPTANCE_TOKEN: acceptanceToken,
        };
        childEnvironment = inputs.environment;
        composeArgs = composePrefix(inputs.projectName);
      } catch {
        failed = true;
        break productWork;
      }

      try {
        override = await createOwnedOverride(inputs.projectName, evidenceOnly);
        composeArgs = composePrefix(inputs.projectName, override.path);
        childEnvironment = {
          ...inputs.environment,
          FACTORY_E2E_PREVIEW_LEASE_PATH: join(
            override.root,
            previewLeaseFilename,
          ),
          FACTORY_E2E_PREVIEW_REQUEST_PATH: join(
            override.root,
            previewRequestFilename,
          ),
        };
      } catch {
        failed = true;
        cleanupUncertain = true;
        break productWork;
      }

      if (
        !(await verifyOwnedOverride(
          override.root,
          override.path,
          override.digest,
          override.canonicalRoot,
          override.rootIdentity,
          override.pathIdentity,
        ))
      ) {
        failed = true;
        break productWork;
      }
      const composeConfig = await runStep(
        "compose-config",
        "docker",
        [...composeArgs, "config", "--format", "json"],
        { environment: composeEnvironment, input: "" },
      );
      if (
        composeConfig.exitCode !== 0 ||
        !hasExactLoopbackBindings(composeConfig.stdout, inputs.ports) ||
        interrupted
      ) {
        failed = true;
        break productWork;
      }

      await releasePorts();
      if (
        !(await verifyOwnedOverride(
          override.root,
          override.path,
          override.digest,
          override.canonicalRoot,
          override.rootIdentity,
          override.pathIdentity,
        ))
      ) {
        failed = true;
        break productWork;
      }
      composeAttempted = true;
      outerProofComplete = false;
      await timingGate("before-outer-up");
      const upPromise = runStep(
        "compose-up",
        "docker",
        [
          ...composeArgs,
          "up",
          "-d",
          "--build",
          "--wait",
          "--wait-timeout",
          "600",
        ],
        { environment: composeEnvironment, input: "" },
      );
      await timingGate("during-outer-up");
      const up = await upPromise;
      await timingGate("after-outer-up");
      if (up.exitCode !== 0 || interrupted) {
        failed = true;
      } else {
        const ready = await waitForReady(
          [
            inputs.environment.FACTORY_E2E_BASE_URL,
            `${inputs.environment.FACTORY_E2E_CONTROL_PLANE_URL}/health`,
          ],
          { signal: controller.signal },
        );
        steps.push({ exitCode: ready ? 0 : 1, name: "host-readiness" });
        if (!ready || interrupted) {
          failed = true;
          break productWork;
        }
        const playwrightArguments = [
          "exec",
          "playwright",
          "test",
          "e2e/restaurant-template-acceptance.spec.ts",
          "--workers=1",
          "--reporter=line",
        ];
        const playwrightPromise = runStep(
          "playwright",
          platform === "win32" ? windowsCommand : "pnpm",
          platform === "win32"
            ? ["/d", "/s", "/c", "pnpm", ...playwrightArguments]
            : playwrightArguments,
        );
        await timingGate("during-playwright");
        let previewRequest = await Promise.race([
          readPreviewRequest(override.root, controller.signal),
          playwrightPromise.then(() => null),
        ]).catch(() => null);
        if (previewRequest === null && !interrupted) {
          previewRequest = await readPreviewRequest(
            override.root,
            controller.signal,
            100,
          ).catch(() => null);
        }
        if (previewRequest === null || interrupted) {
          failed = true;
          controller.abort();
        } else {
          await timingGate("before-preview-intent");
          requestedCompilationId = previewRequest;
          const requestedPreviewRunId = `preview-${randomBytes(32).toString("hex")}`;
          previewCleanupLease = localPreviewLease({
            compilationId: requestedCompilationId,
            factoryProjectName: inputs.projectName,
            previewRunId: requestedPreviewRunId,
          });
          previewMayExist = true;
          previewProofComplete = false;
          try {
            const startedPreview = await startRunnerOwnedPreview(
              previewFetch,
              childEnvironment.FACTORY_E2E_CONTROL_PLANE_URL,
              override.root,
              inputs.projectName,
              requestedCompilationId,
              requestedPreviewRunId,
              acceptanceToken,
              inputs.environment.FACTORY_INTERNAL_WORKER_TOKEN,
              intentPostTimeoutMilliseconds,
              10_000,
              stepSignal(true),
              timingGate,
            );
            previewCleanupLease = startedPreview.cleanupLease;
            previewLease = startedPreview.lease;
            if (previewLease === null)
              throw new Error("Preview lease is invalid.");
          } catch {
            failed = true;
            controller.abort();
          }
        }
        const playwright = await playwrightPromise;
        failureStage =
          playwright.exitCode === 0
            ? null
            : parseLastAllowlistedMarker(
                playwright.stdout,
                stagePrefix,
                acceptanceStages,
              );
        cleanupStage =
          playwright.exitCode === 0
            ? null
            : parseLastAllowlistedMarker(
                playwright.stdout,
                cleanupStagePrefix,
                cleanupStages,
              );
        acceptanceEvidence =
          playwright.exitCode === 0 ? parseEvidence(playwright.stdout) : null;
        if (
          playwright.exitCode !== 0 ||
          acceptanceEvidence === null ||
          interrupted
        ) {
          failed = true;
        }
      }
    } finally {
      await releasePorts().catch(() => {
        failed = true;
        cleanupUncertain = true;
      });
      if (composeAttempted && !processTerminationUncertain) {
        if (previewCleanupLease !== null) {
          await timingGate("during-preview-reconcile");
          const previewStopped = await cleanupExactPreownedPreview({
            baseUrl: childEnvironment.FACTORY_E2E_CONTROL_PLANE_URL,
            factoryProjectName: inputs.projectName,
            lease: previewCleanupLease,
            previewFetch,
            previewStopTimeoutMilliseconds,
            runStep,
            signal: lifetimeSignal,
            timingGate,
            wait: cleanupWait,
          });
          if (previewStopped) {
            cleanup.previewDirectories = 0;
            previewProofComplete = true;
          } else {
            failed = true;
            cleanupUncertain = true;
          }
          await timingGate("after-preview-proof");
        }
        const trustedOverride =
          override !== null &&
          (await verifyOwnedOverride(
            override.root,
            override.path,
            override.digest,
            override.canonicalRoot,
            override.rootIdentity,
            override.pathIdentity,
          ));
        if (!trustedOverride) {
          failed = true;
          cleanupUncertain = true;
        }
        if (previewProofComplete) {
          const downPromise = runStep(
            "compose-down",
            "docker",
            [
              ...composePrefix(
                inputs.projectName,
                trustedOverride ? override.path : undefined,
              ),
              "down",
              "--volumes",
              "--remove-orphans",
            ],
            { abortable: false, environment: composeEnvironment, input: "" },
          );
          await timingGate("during-outer-down");
          const down = await downPromise;
          await timingGate("after-outer-down");
          if (down.exitCode !== 0) {
            failed = true;
            cleanupUncertain = true;
          }

          await timingGate("during-global-guard");
          const postGuard = await runStep(
            "preview-guard-after",
            "node",
            ["scripts/verify-no-preview-resources.mjs"],
            { abortable: false },
          );
          if (postGuard.exitCode !== 0) {
            failed = true;
            cleanupUncertain = true;
          }

          await timingGate("during-outer-proof");
          for (const [kind, args] of [
            [
              "containers",
              [
                "ps",
                "-a",
                "--filter",
                `label=com.docker.compose.project=${inputs.projectName}`,
                "--format",
                "{{.ID}}",
              ],
            ],
            [
              "networks",
              [
                "network",
                "ls",
                "--filter",
                `label=com.docker.compose.project=${inputs.projectName}`,
                "--format",
                "{{.ID}}",
              ],
            ],
            [
              "volumes",
              [
                "volume",
                "ls",
                "--filter",
                `label=com.docker.compose.project=${inputs.projectName}`,
                "--format",
                "{{.Name}}",
              ],
            ],
          ]) {
            const query = await runStep(`cleanup-${kind}`, "docker", args, {
              abortable: false,
            });
            cleanup[kind] =
              query.exitCode === 0 ? outputCount(query.stdout) : -1;
            if (query.exitCode !== 0 || cleanup[kind] !== 0) {
              failed = true;
              cleanupUncertain = true;
            }
          }
          const outerGuardAfter = await detectOuterAcceptanceResources(
            runStep,
            { abortable: false },
          );
          if (!outerGuardAfter) {
            failed = true;
            cleanupUncertain = true;
          }
          outerProofComplete =
            down.exitCode === 0 &&
            postGuard.exitCode === 0 &&
            cleanup.containers === 0 &&
            cleanup.networks === 0 &&
            cleanup.volumes === 0 &&
            outerGuardAfter;
        } else {
          outerProofComplete = false;
        }
      }
      await timingGate("before-root-removal");
      privateRootRemoved = processTerminationUncertain
        ? false
        : await removeOwnedOverride(override);
      if (!privateRootRemoved) {
        failed = true;
        cleanupUncertain = true;
      }
      unregister();
      summary = {
        accessibility: acceptanceEvidence?.accessibility ?? null,
        cleanup,
        cleanupStage,
        digests: acceptanceEvidence?.digests ?? null,
        failureStage,
        projectName: inputs?.projectName ?? null,
        schemaVersion: "factory.local-acceptance-summary/v1",
        steps,
        versions,
      };
    }
  }
  return createLocalAcceptanceWorkloadResult({
    cleanupComplete:
      !cleanupUncertain &&
      preGuardPassed &&
      previewProofComplete &&
      outerProofComplete &&
      privateRootRemoved,
    exitCode: failed || interrupted ? 1 : 0,
    summary,
  });
}

function removeEmitterListener(emitter, event, listener) {
  if (typeof emitter.off === "function") emitter.off(event, listener);
  else emitter.removeListener?.(event, listener);
}

function failedLocalAcceptanceSummary() {
  return {
    accessibility: null,
    cleanup: {
      containers: -1,
      networks: -1,
      previewDirectories: -1,
      volumes: -1,
    },
    cleanupStage: null,
    digests: null,
    failureStage: null,
    projectName: null,
    schemaVersion: "factory.local-acceptance-summary/v1",
    steps: [],
    versions: null,
  };
}

export async function runLocalAcceptanceSupervisor({
  ackTimeoutMilliseconds = 5_000,
  acquireOperationLease = acquireLocalAcceptanceOperationLease,
  channel = process,
  environment = process.env,
  exitProcess = (code) => process.exit(code),
  leaseTimeoutMilliseconds = 5_000,
  productWorkTimeoutMilliseconds = 2_700_000,
  randomBytes = nodeRandomBytes,
  runWorkload = runLocalProductAcceptanceWorkload,
  signalSource = process,
  totalSupervisorTimeoutMilliseconds = 3_600_000,
  workspace = process.cwd(),
} = {}) {
  const timingStage = parseTimingHarnessStage(environment);
  if (timingStage === null) return 1;
  if (
    !Number.isSafeInteger(leaseTimeoutMilliseconds) ||
    leaseTimeoutMilliseconds < 1 ||
    !Number.isSafeInteger(totalSupervisorTimeoutMilliseconds) ||
    totalSupervisorTimeoutMilliseconds < 1
  ) {
    return 1;
  }
  const shutdownReserveMilliseconds = Math.min(
    15_000,
    Math.max(1, Math.floor(totalSupervisorTimeoutMilliseconds / 4)),
  );
  const lifetimeController = new AbortController();
  const hardDeadlineExpired = Symbol("supervisor-hard-deadline-expired");
  let resolveHardDeadline;
  const hardDeadline = new Promise((resolve) => {
    resolveHardDeadline = resolve;
  });
  const nonce = randomBytes(32).toString("hex");
  if (!/^[a-f0-9]{64}$/u.test(nonce)) return 1;
  let acknowledged = false;
  let hardLifetimeExpired = false;
  let readySent = false;
  let settled = false;
  let interrupted = false;
  let protocolFailed = false;
  let interruptWorkload = () => {};
  let releaseTimingHold = () => {};
  let resolveAcknowledgement;
  let rejectAcknowledgement;
  const acknowledgement = new Promise((resolve, reject) => {
    resolveAcknowledgement = resolve;
    rejectAcknowledgement = reject;
  });
  const requestInterruption = () => {
    interrupted = true;
    interruptWorkload();
    releaseTimingHold();
    if (readySent && !acknowledged && !settled) {
      settled = true;
      rejectAcknowledgement(new Error("IPC closed."));
    }
  };
  const holdTimingGate = async (stage) => {
    if (timingStage !== stage || interrupted) return;
    channel.send({ apiVersion: timingHarnessApiVersion, stage, type: "gate" });
    let timeout;
    await new Promise((resolve) => {
      releaseTimingHold = resolve;
      timeout = setTimeout(() => {
        requestInterruption();
        resolve();
      }, 10_000);
    });
    clearTimeout(timeout);
    releaseTimingHold = () => {};
  };
  let totalTimeout;
  let hardTimeout;
  const startSupervisorLifetime = () => {
    totalTimeout = setTimeout(() => {
      hardLifetimeExpired = true;
      requestInterruption();
      lifetimeController.abort();
    }, totalSupervisorTimeoutMilliseconds - shutdownReserveMilliseconds);
    hardTimeout = setTimeout(() => {
      hardLifetimeExpired = true;
      requestInterruption();
      lifetimeController.abort();
      resolveHardDeadline(hardDeadlineExpired);
      exitProcess(1);
    }, totalSupervisorTimeoutMilliseconds);
  };
  const onMessage = (message) => {
    if (acknowledged || settled) {
      protocolFailed = true;
      requestInterruption();
      return;
    }
    if (!validateLocalAcceptanceSupervisorMessage(message, nonce, "ack")) {
      protocolFailed = true;
      settled = true;
      rejectAcknowledgement(new Error("Supervisor ACK is invalid."));
      return;
    }
    acknowledged = true;
    resolveAcknowledgement();
  };
  channel.on("message", onMessage);
  channel.on("disconnect", requestInterruption);
  for (const signal of ["SIGINT", "SIGTERM", "SIGBREAK"]) {
    signalSource.on(signal, requestInterruption);
  }
  let lease = null;
  const removeListeners = () => {
    removeEmitterListener(channel, "message", onMessage);
    removeEmitterListener(channel, "disconnect", requestInterruption);
    for (const signal of ["SIGINT", "SIGTERM", "SIGBREAK"]) {
      removeEmitterListener(signalSource, signal, requestInterruption);
    }
  };
  try {
    const acquisition = Promise.resolve().then(() =>
      acquireOperationLease({
        signal: lifetimeController.signal,
        workspace,
      }),
    );
    const leaseAcquisitionExpired = Symbol("lease-acquisition-expired");
    let leaseTimeout;
    const acquired = await Promise.race([
      acquisition,
      new Promise((resolve) => {
        leaseTimeout = setTimeout(
          () => resolve(leaseAcquisitionExpired),
          leaseTimeoutMilliseconds,
        );
      }),
    ]);
    clearTimeout(leaseTimeout);
    if (acquired === leaseAcquisitionExpired) {
      acquisition.then((lateLease) => lateLease.release()).catch(() => {});
      return 1;
    }
    lease = acquired;
    if (interrupted || channel.connected === false) {
      await lease.release();
      return 1;
    }
    await holdTimingGate("before-ready");
    if (interrupted || channel.connected === false) {
      await lease.release();
      return 1;
    }
    readySent = true;
    channel.send(createLocalAcceptanceSupervisorReady(nonce));
    const timeout = setTimeout(() => {
      if (!acknowledged && !settled) {
        settled = true;
        rejectAcknowledgement(new Error("Supervisor ACK timed out."));
      }
    }, ackTimeoutMilliseconds);
    try {
      await acknowledgement;
    } catch {
      await lease.release();
      return 1;
    } finally {
      clearTimeout(timeout);
    }

    startSupervisorLifetime();
    await holdTimingGate("after-ack");

    let result;
    if (interrupted) {
      result = createLocalAcceptanceWorkloadResult({
        cleanupComplete: true,
        exitCode: 1,
        summary: failedLocalAcceptanceSummary(),
      });
    } else {
      const productTimeout = setTimeout(
        requestInterruption,
        productWorkTimeoutMilliseconds,
      );
      try {
        const workload = Promise.resolve()
          .then(() =>
            runWorkload({
              environment,
              evidenceOnly: timingStage !== undefined,
              installSignalHandler(handler) {
                interruptWorkload = handler;
                if (interrupted) handler();
                return () => {
                  if (interruptWorkload === handler)
                    interruptWorkload = () => {};
                };
              },
              lifetimeSignal: lifetimeController.signal,
              timingGate: holdTimingGate,
            }),
          )
          .catch(() =>
            createLocalAcceptanceWorkloadResult({
              cleanupComplete: false,
              exitCode: 1,
              summary: failedLocalAcceptanceSummary(),
            }),
          );
        const workloadResult = await Promise.race([workload, hardDeadline]);
        result =
          workloadResult === hardDeadlineExpired
            ? createLocalAcceptanceWorkloadResult({
                cleanupComplete: false,
                exitCode: 1,
                summary: failedLocalAcceptanceSummary(),
              })
            : workloadResult;
      } catch {
        result = createLocalAcceptanceWorkloadResult({
          cleanupComplete: false,
          exitCode: 1,
          summary: failedLocalAcceptanceSummary(),
        });
      } finally {
        clearTimeout(productTimeout);
      }
    }
    const candidateMessage = {
      apiVersion: supervisorIpcApiVersion,
      exitCode: protocolFailed || interrupted ? 1 : result.exitCode,
      nonce,
      summary: result.summary,
      type: "result",
    };
    const validResult = validateLocalAcceptanceSupervisorMessage(
      candidateMessage,
      nonce,
      "result",
    );
    if (!hardLifetimeExpired && result.terminalProof === true && validResult) {
      await lease.release();
    }
    settled = true;
    if (channel.connected !== false && validResult)
      channel.send(candidateMessage);
    return candidateMessage.exitCode;
  } catch {
    if (lease !== null && !acknowledged) await lease.release().catch(() => {});
    return 1;
  } finally {
    clearTimeout(hardTimeout);
    clearTimeout(totalTimeout);
    settled = true;
    removeListeners();
  }
}

export async function runLocalAcceptanceClient({
  environment = process.env,
  forkProcess = fork,
  modulePath = fileURLToPath(import.meta.url),
  readyTimeoutMilliseconds = 5_000,
  resultTimeoutMilliseconds = 3_605_000,
  signalSource = process,
  writeOutput = (value) => process.stdout.write(value),
} = {}) {
  const {
    FACTORY_LOCAL_ACCEPTANCE_TOKEN: _acceptanceToken,
    ...cleanEnvironment
  } = environment;
  let child;
  try {
    child = forkProcess(modulePath, ["--factory-local-acceptance-supervisor"], {
      detached: true,
      env: cleanEnvironment,
      serialization: "json",
      stdio: ["ignore", "ignore", "ignore", "ipc"],
      windowsHide: true,
    });
  } catch {
    return 1;
  }
  let nonce = null;
  let settled = false;
  let timeout;
  return await new Promise((resolveClient) => {
    const removeListeners = () => {
      clearTimeout(timeout);
      removeEmitterListener(child, "message", onMessage);
      removeEmitterListener(child, "error", onFailure);
      removeEmitterListener(child, "exit", onExit);
      for (const signal of ["SIGINT", "SIGTERM", "SIGBREAK"]) {
        removeEmitterListener(signalSource, signal, onFailure);
      }
    };
    const finish = (exitCode, summary) => {
      if (settled) return;
      settled = true;
      removeListeners();
      if (summary !== undefined) writeOutput(`${JSON.stringify(summary)}\n`);
      if (child.connected !== false) child.disconnect?.();
      resolveClient(exitCode === 0 ? 0 : 1);
    };
    const onFailure = () => finish(1);
    const onExit = () => finish(1);
    const onMessage = (message) => {
      if (validateTimingGateMessage(message)) {
        writeOutput(`${JSON.stringify(message)}\n`);
        return;
      }
      if (nonce === null) {
        const candidateNonce = message?.nonce;
        if (
          typeof candidateNonce !== "string" ||
          !validateLocalAcceptanceSupervisorMessage(
            message,
            candidateNonce,
            "ready",
          )
        ) {
          finish(1);
          return;
        }
        nonce = candidateNonce;
        clearTimeout(timeout);
        timeout = setTimeout(onFailure, resultTimeoutMilliseconds);
        try {
          child.send({
            apiVersion: supervisorIpcApiVersion,
            nonce,
            type: "ack",
          });
        } catch {
          finish(1);
        }
        return;
      }
      if (!validateLocalAcceptanceSupervisorMessage(message, nonce, "result")) {
        finish(1);
        return;
      }
      finish(message.exitCode, message.summary);
    };
    child.on("message", onMessage);
    child.on("error", onFailure);
    child.on("exit", onExit);
    for (const signal of ["SIGINT", "SIGTERM", "SIGBREAK"]) {
      signalSource.on(signal, onFailure);
    }
    timeout = setTimeout(onFailure, readyTimeoutMilliseconds);
    child.unref();
  });
}

export async function runLocalProductAcceptance(options = {}) {
  const writeOutput =
    options.writeOutput ?? ((value) => process.stdout.write(value));
  const result = await runLocalProductAcceptanceWorkload(options);
  writeOutput(`${JSON.stringify(result.summary)}\n`);
  return result.exitCode;
}

if (
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  process.exitCode = process.argv.includes(
    "--factory-local-acceptance-supervisor",
  )
    ? await runLocalAcceptanceSupervisor()
    : await runLocalAcceptanceClient();
}

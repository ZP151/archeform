import { posix } from "node:path";
import {
  compareInventoryResponse,
  inventoryAuditObservationProgram,
  validInventoryExpectation,
  validInventoryObservation,
  type InventoryReadExpectation,
  type InventoryObservation,
} from "./inventory-operations-verification.js";

import {
  PreviewRunFailure,
  dockerHostLookupEnvironment,
  type PreviewProcessRunner,
  type PreviewRuntimeRequest,
  type StartedPreview,
  type startPreviewRun,
  type stopPreviewRun,
} from "../preview-runner.js";

/**
 * A bounded, isolated runtime environment for one verification run. Every
 * operation carries the run's operation timeout, never persists raw process
 * output or HTTP bodies, and returns only bounded status results — the probes
 * in the verifier turn those into allowlisted evidence summaries. The one
 * exceptions are bounded Directory/Inventory response comparisons and ephemeral,
 * pattern-validated identifiers of records the probe itself created. Neither
 * response bodies nor captured identifiers enter persisted evidence.
 */

export class VerificationLifecycleError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "VerificationLifecycleError";
  }
}

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type BoundedCommandResult = {
  readonly succeeded: boolean;
  readonly durationMs: number;
};

export type BoundedRequestResult = {
  readonly inventoryReadMatches?: boolean;
  /** Ephemeral identifier of this journey's movement; never evidence. */
  readonly inventoryMovementId?: string;
  /** Directory-only bounded comparison; response content never crosses this boundary. */
  readonly directoryReadMatches?: boolean;
  readonly status: number;
  readonly ok: boolean;
  readonly durationMs: number;
  /**
   * The pattern-validated top-level `id` of a record this probe itself
   * created, captured only when the caller requested it. It is never
   * persisted and never enters evidence — chain journeys use it to address
   * the fresh record they created.
   */
  readonly recordId?: string;
};

/**
 * Declared fixture data carried on one bounded request: an allowlisted role
 * header and a flat JSON body. Both are validated before the request is sent;
 * neither is ever persisted or echoed into evidence.
 */
export type RequestOptions = {
  readonly inventoryRead?: InventoryReadExpectation;
  readonly directoryRead?: DirectoryReadExpectation;
  readonly headers?: readonly {
    readonly name: string;
    readonly value: string;
  }[];
  readonly body?: string;
};

export type DirectoryReadExpectation = {
  readonly kind: "list" | "detail";
  readonly listedOnly: boolean;
  readonly presence: "present" | "absent";
  readonly recordId: string;
};

const httpMethods: readonly HttpMethod[] = [
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
];

const safeCommandToken = /^[a-zA-Z0-9._-]+$/;
const maximumCommandTokens = 10;

/**
 * Declared request headers are fixture data: an explicitly allowlisted name
 * (the API role header `x-factory-role` and the session-bound generated-app
 * header `x-factory-fixture-session`) and an identifier-style value. A shape
 * check would let credential-named headers through with benign-shaped values,
 * so the name must match the allowlist exactly.
 */
const allowedHeaderNames = new Set([
  "x-factory-role",
  "x-factory-fixture-session",
  // The Restaurant runtime's declared contract: the table-session token and
  // the command idempotency key travel as headers, never in the body.
  "x-factory-table-session-token",
  "x-factory-idempotency-key",
]);
const safeHeaderValue = /^[a-zA-Z0-9._-]{1,64}$/;
const maximumDeclaredHeaders = 8;

/**
 * Request bodies are bounded declared JSON fixtures: flat primitive records
 * or the exact create/update values envelopes. Values never nest further.
 */
const maximumRequestBodyBytes = 512;
const maximumBodyKeys = 16;
const maximumBodyStringValueLength = 200;
const bodyKeyPattern = /^[a-zA-Z0-9._-]{1,64}$/;

function isFlatDeclaredJsonBody(body: string): boolean {
  if (typeof body !== "string" || body.length > maximumRequestBodyBytes) {
    return false;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    return false;
  }
  if (isFlatDeclaredValues(parsed)) return true;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
    return false;
  const envelope = parsed as Record<string, unknown>;
  const keys = Object.keys(envelope);
  if (keys.length === 1 && keys[0] === "values") {
    return isFlatDeclaredValues(envelope.values);
  }
  return (
    keys.length === 2 &&
    keys.includes("values") &&
    keys.includes("expectedVersion") &&
    typeof envelope.expectedVersion === "number" &&
    Number.isSafeInteger(envelope.expectedVersion) &&
    envelope.expectedVersion >= 0 &&
    isFlatDeclaredValues(envelope.values)
  );
}

function isFlatDeclaredValues(parsed: unknown): boolean {
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return false;
  }
  const entries = Object.entries(parsed as Record<string, unknown>);
  if (entries.length === 0 || entries.length > maximumBodyKeys) {
    return false;
  }
  return entries.every(([key, value]) => {
    if (!bodyKeyPattern.test(key)) {
      return false;
    }
    if (typeof value === "string") {
      return value.length <= maximumBodyStringValueLength;
    }
    return (
      (typeof value === "number" && Number.isFinite(value)) ||
      typeof value === "boolean"
    );
  });
}

/**
 * A bounded Graph-facing route: absolute, forward-slash segments only, with no
 * traversal segments, query strings, or wildcards.
 */
export function isSafeRequestPath(path: string): boolean {
  if (!path.startsWith("/") || path.includes("?") || path.includes("#")) {
    return false;
  }
  const segments = path.split("/").slice(1);
  return (
    segments.length > 0 &&
    segments.every(
      (segment) =>
        segment !== "" &&
        segment !== "." &&
        segment !== ".." &&
        /^[a-zA-Z0-9._~-]+$/.test(segment),
    )
  );
}

function boundedErrorCode(error: unknown, fallback: string): string {
  if (error instanceof Error && "code" in error) {
    const code = (error as Error & { code?: unknown }).code;
    if (typeof code === "string" && code.length > 0) {
      return code;
    }
  }
  return fallback;
}

export type VerificationEnvironmentOptions = {
  readonly artifactRoot: string;
  readonly previewRunId: string;
  readonly rootDirectory: string;
  readonly composeProjectName: string;
  readonly artifacts: PreviewRuntimeRequest["artifacts"];
  readonly operationTimeoutMs: number;
  readonly startPreviewRun: typeof startPreviewRun;
  readonly stopPreviewRun: typeof stopPreviewRun;
  readonly processRunner?: PreviewProcessRunner;
  readonly fetch?: typeof fetch;
  readonly nowMs?: () => number;
};

export class VerificationEnvironment {
  private readonly previewRequest: PreviewRuntimeRequest;
  private startedPreview: StartedPreview | null = null;
  private cleanupComplete = false;

  constructor(private readonly options: VerificationEnvironmentOptions) {
    this.previewRequest = {
      previewRunId: options.previewRunId,
      rootDirectory: options.rootDirectory,
      composeProjectName: options.composeProjectName,
      artifacts: options.artifacts,
    };
  }

  get previewRunId(): string {
    return this.options.previewRunId;
  }

  get rootDirectory(): string {
    return this.options.rootDirectory;
  }

  get started(): boolean {
    return this.startedPreview !== null;
  }

  private elapsed(startedMs: number): number {
    const now = this.options.nowMs?.() ?? performance.now();
    return Math.max(0, Math.round(now - startedMs));
  }

  async boot(): Promise<StartedPreview> {
    if (this.startedPreview) {
      return this.startedPreview;
    }
    try {
      this.startedPreview = await this.options.startPreviewRun(
        this.options.artifactRoot,
        this.previewRequest,
        this.options.processRunner,
        { operationTimeoutMs: this.options.operationTimeoutMs },
      );
      return this.startedPreview;
    } catch (error) {
      this.cleanupComplete =
        error instanceof PreviewRunFailure && error.cleanupComplete;
      const code = boundedErrorCode(error, "preview_start_failed");
      throw new VerificationLifecycleError(
        code === "preview_artifact_failed" ||
          code === "preview_compose_up_failed" ||
          code === "preview_port_discovery_failed" ||
          code === "preview_start_failed" ||
          code === "preview_start_timeout" ||
          code === "preview_start_cancelled" ||
          code === "preview_readiness_failed" ||
          code === "preview_health_check_failed"
          ? code
          : "preview_start_failed",
        "The isolated preview failed to start.",
      );
    }
  }

  async cleanup(): Promise<void> {
    if (this.cleanupComplete) return;
    try {
      await this.options.stopPreviewRun(
        this.options.artifactRoot,
        this.previewRequest,
        this.options.processRunner,
        { operationTimeoutMs: this.options.operationTimeoutMs },
      );
    } catch (error) {
      throw new VerificationLifecycleError(
        boundedErrorCode(error, "preview_stop_failed"),
        "The isolated preview failed to stop.",
      );
    }
  }

  /**
   * Runs one bounded, allowlisted migration command inside the api service.
   * Only plain identifier-style tokens are accepted, and the command can
   * never escape the fixed `compose exec -T api` invocation. The generated
   * migrate service is one-shot (it applies the schema, seeds, and exits), so
   * a migration command cannot `exec` into it; the api service runs the same
   * generated schema, carries the Prisma CLI, and stays up for the journeys.
   */
  async migrate(command: readonly string[]): Promise<BoundedCommandResult> {
    if (
      !Array.isArray(command) ||
      command.length === 0 ||
      command.length > maximumCommandTokens ||
      command.some(
        (token) => typeof token !== "string" || !safeCommandToken.test(token),
      )
    ) {
      throw new VerificationLifecycleError(
        "invalid_command",
        "Migration commands are allowlisted only.",
      );
    }
    if (!this.startedPreview) {
      throw new VerificationLifecycleError(
        "environment_not_started",
        "The isolated environment has not started.",
      );
    }
    // A missing runner is a programming error, never a bounded result —
    // otherwise a migration could report success without running anything.
    if (!this.options.processRunner) {
      throw new VerificationLifecycleError(
        "process_runner_required",
        "The migration runner is not configured.",
      );
    }
    const previewDirectory = posix.join(
      this.options.artifactRoot,
      ".preview-runs",
      this.options.previewRunId,
    );
    const controller = new AbortController();
    const timer = setTimeout(
      () => controller.abort(),
      this.options.operationTimeoutMs,
    );
    const startedMs = this.options.nowMs?.() ?? performance.now();
    try {
      await this.options.processRunner(
        {
          file: "docker",
          args: [
            "compose",
            "--file",
            "docker-compose.yml",
            "--project-name",
            this.options.composeProjectName,
            "--project-directory",
            previewDirectory,
            "exec",
            "-T",
            "api",
            ...command,
          ],
          // The migration probe runs real Docker Compose, so it needs the
          // same host lookup allowlist as boot/stop: without PROGRAMFILES
          // the CLI cannot resolve its compose plugin and every migration
          // probe fails instantly ("unknown command: docker compose").
          environment: dockerHostLookupEnvironment(),
        },
        controller.signal,
      );
      return { succeeded: true, durationMs: this.elapsed(startedMs) };
    } catch {
      // Timeouts and docker failures are bounded results, never raw output.
      return { succeeded: false, durationMs: this.elapsed(startedMs) };
    } finally {
      clearTimeout(timer);
    }
  }

  async health(): Promise<BoundedRequestResult> {
    return this.boundedFetch("GET", "/health", "web");
  }

  /** Narrow AMN-008 observer inside this verifier's existing owned API service.
   * No caller can supply a program, SQL, database URL, command or result shape. */
  async observeInventoryAudit(
    observation: InventoryObservation,
  ): Promise<BoundedCommandResult> {
    if (!validInventoryObservation(observation))
      throw new VerificationLifecycleError(
        "invalid_inventory_observation",
        "Inventory observation requires bounded captured identities.",
      );
    if (!this.startedPreview)
      throw new VerificationLifecycleError(
        "environment_not_started",
        "The isolated environment has not started.",
      );
    if (!this.options.processRunner)
      throw new VerificationLifecycleError(
        "process_runner_required",
        "The observation runner is not configured.",
      );
    const controller = new AbortController();
    const timer = setTimeout(
      () => controller.abort(),
      this.options.operationTimeoutMs,
    );
    const startedMs = this.options.nowMs?.() ?? performance.now();
    try {
      const output = await this.options.processRunner(
        {
          file: "docker",
          args: [
            "compose",
            "--file",
            "docker-compose.yml",
            "--project-name",
            this.options.composeProjectName,
            "--project-directory",
            posix.join(
              this.options.artifactRoot,
              ".preview-runs",
              this.options.previewRunId,
            ),
            "exec",
            "-T",
            "api",
            "node",
            "-e",
            inventoryAuditObservationProgram,
            JSON.stringify(observation),
          ],
          environment: dockerHostLookupEnvironment(),
        },
        controller.signal,
      );
      return {
        succeeded:
          !controller.signal.aborted && (output === undefined || output === ""),
        durationMs: this.elapsed(startedMs),
      };
    } catch {
      return { succeeded: false, durationMs: this.elapsed(startedMs) };
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * Sends one bounded HTTP request to the isolated API. Declared comparisons
   * may privately read bounded responses, returning only booleans and captured
   * identifiers; bodies are never persisted. Declared
   * fixture options (role header, flat JSON body) are validated fail closed
   * before the request is sent.
   */
  async request(
    method: HttpMethod,
    path: string,
    port: "web" | "api" = "api",
    options?: RequestOptions,
    captureRecordId = false,
  ): Promise<BoundedRequestResult> {
    return this.boundedFetch(method, path, port, options, captureRecordId);
  }

  private async boundedFetch(
    method: HttpMethod,
    path: string,
    port: "web" | "api",
    options?: RequestOptions,
    captureRecordId = false,
  ): Promise<BoundedRequestResult> {
    if (!httpMethods.includes(method)) {
      throw new VerificationLifecycleError(
        "invalid_request",
        "HTTP methods are allowlisted only.",
      );
    }
    if (!isSafeRequestPath(path)) {
      throw new VerificationLifecycleError(
        "invalid_request_path",
        "Request paths must be bounded Graph-facing routes.",
      );
    }
    if (!this.startedPreview) {
      throw new VerificationLifecycleError(
        "environment_not_started",
        "The isolated environment has not started.",
      );
    }
    // A missing client is a programming error, never a bounded result —
    // otherwise every HTTP probe would silently report a dead endpoint.
    if (!this.options.fetch) {
      throw new VerificationLifecycleError(
        "fetch_required",
        "The HTTP client is not configured.",
      );
    }
    if (options) {
      if (
        options.inventoryRead !== undefined &&
        (port !== "api" ||
          captureRecordId ||
          options.directoryRead !== undefined ||
          !validInventoryExpectation(options.inventoryRead))
      ) {
        throw new VerificationLifecycleError(
          "invalid_inventory_read",
          "Inventory reads require bounded declared expectations.",
        );
      }
      if (
        options.directoryRead !== undefined &&
        (method !== "GET" ||
          port !== "api" ||
          captureRecordId ||
          !validDirectoryExpectation(options.directoryRead))
      ) {
        throw new VerificationLifecycleError(
          "invalid_directory_read",
          "Directory read expectations must be bounded declared fixtures.",
        );
      }
      if (options.headers !== undefined) {
        if (
          !Array.isArray(options.headers) ||
          options.headers.length > maximumDeclaredHeaders ||
          options.headers.some(
            (header) =>
              !header ||
              typeof header.name !== "string" ||
              !allowedHeaderNames.has(header.name.toLowerCase()) ||
              typeof header.value !== "string" ||
              !safeHeaderValue.test(header.value),
          )
        ) {
          throw new VerificationLifecycleError(
            "invalid_request_header",
            "Request headers must be declared fixture data.",
          );
        }
      }
      if (options.body !== undefined && !isFlatDeclaredJsonBody(options.body)) {
        throw new VerificationLifecycleError(
          "invalid_request_body",
          "Request bodies must be bounded declared fixtures.",
        );
      }
    }
    const controller = new AbortController();
    const timer = setTimeout(
      () => controller.abort(),
      this.options.operationTimeoutMs,
    );
    const startedMs = this.options.nowMs?.() ?? performance.now();
    const portKey = port === "web" ? "webPort" : "apiPort";
    const url = `http://127.0.0.1:${this.startedPreview[portKey]}${path}`;
    const init: RequestInit = { method, signal: controller.signal };
    if (options?.headers && options.headers.length > 0) {
      init.headers = Object.fromEntries(
        options.headers.map(({ name, value }) => [name, value]),
      );
    }
    if (options?.body !== undefined) {
      // JSON bodies always carry the JSON content type; the fixture can never
      // override it.
      init.headers = {
        ...(init.headers ?? {}),
        "content-type": "application/json",
      };
      init.body = options.body;
    }
    try {
      const response = await this.options.fetch(url, init);
      // The one narrow exception to the never-read-body invariant: when a
      // chain journey explicitly asks, the response of the create it authored
      // is read — bounded and pattern-validated — for the top-level `id` of
      // the record the probe itself just created. The id is used only to
      // address that same fresh record in subsequent chain steps; it never
      // enters evidence and is never persisted.
      const recordId =
        captureRecordId &&
        (response?.status ?? 0) >= 200 &&
        (response?.status ?? 0) < 300
          ? await captureCreatedRecordId(response)
          : undefined;
      const directoryReadMatches =
        options?.directoryRead === undefined
          ? undefined
          : response.status === 200 &&
            (await compareDirectoryRead(
              response,
              options.directoryRead,
              controller.signal,
            ));
      const inventory =
        options?.inventoryRead === undefined
          ? undefined
          : response.status >= 200 && response.status < 300
            ? await compareInventoryResponse(
                response,
                options.inventoryRead,
                controller.signal,
              )
            : { matches: false };
      return {
        status: response?.status ?? 0,
        ok: response?.ok ?? false,
        durationMs: this.elapsed(startedMs),
        ...(recordId === undefined ? {} : { recordId }),
        ...(directoryReadMatches === undefined ? {} : { directoryReadMatches }),
        ...(inventory === undefined
          ? {}
          : {
              inventoryReadMatches: inventory.matches,
              ...(inventory.recordId ? { recordId: inventory.recordId } : {}),
              ...(inventory.movementId
                ? { inventoryMovementId: inventory.movementId }
                : {}),
            }),
      };
    } catch {
      // Network failures and timeouts are bounded results, never raw output.
      return {
        status: 0,
        ok: false,
        durationMs: this.elapsed(startedMs),
        ...(options?.directoryRead ? { directoryReadMatches: false } : {}),
        ...(options?.inventoryRead ? { inventoryReadMatches: false } : {}),
      };
    } finally {
      clearTimeout(timer);
    }
  }
}

const maximumCapturedResponseBytes = 16 * 1024;
const capturedRecordIdPattern = /^[a-zA-Z0-9._~-]{1,64}$/;

function validDirectoryExpectation(value: DirectoryReadExpectation): boolean {
  return (
    !!value &&
    typeof value === "object" &&
    Object.keys(value).length === 4 &&
    ["list", "detail"].includes(value.kind) &&
    typeof value.listedOnly === "boolean" &&
    ["present", "absent"].includes(value.presence) &&
    (value.kind !== "detail" || value.presence === "present") &&
    typeof value.recordId === "string" &&
    capturedRecordIdPattern.test(value.recordId)
  );
}
// 64 KiB covers a 12,000-code-unit body even at three UTF-8 bytes per code unit,
// plus bounded fields. Larger list responses fail closed. Authored probes use
// fewer than twenty small fixtures; this is not permission to truncate a page.
const maximumDirectoryResponseBytes = 64 * 1024;
async function compareDirectoryRead(
  response: Response,
  expected: DirectoryReadExpectation,
  signal: AbortSignal,
): Promise<boolean> {
  if (!response.body || signal.aborted) return false;
  const reader = response.body.getReader(),
    chunks: Uint8Array[] = [];
  let total = 0,
    aborted = false;
  const abort = () => {
    aborted = true;
    void reader.cancel().catch(() => undefined);
  };
  signal.addEventListener("abort", abort, { once: true });
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (aborted || signal.aborted) return false;
      if (done) break;
      total += value.byteLength;
      if (total > maximumDirectoryResponseBytes) return false;
      chunks.push(value);
    }
    const parsed: unknown = JSON.parse(
      new TextDecoder("utf-8", { fatal: true }).decode(Buffer.concat(chunks)),
    );
    const own = (
      value: unknown,
      keys: readonly string[],
    ): value is Record<string, unknown> =>
      !!value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      Object.keys(value).length === keys.length &&
      keys.every((key) => Object.hasOwn(value, key));
    const text = (value: unknown, max: number) =>
      typeof value === "string" &&
      value.trim() === value &&
      value.length > 0 &&
      value.length <= max;
    const record = (
      value: unknown,
      detail = false,
    ): value is Record<string, unknown> =>
      own(value, [
        "id",
        "title",
        "summary",
        "category",
        "status",
        "version",
        ...(detail ? ["body"] : []),
      ]) &&
      typeof value.id === "string" &&
      capturedRecordIdPattern.test(value.id) &&
      text(value.title, 120) &&
      text(value.summary, 280) &&
      text(value.category, 40) &&
      (value.status === "hidden" || value.status === "listed") &&
      (!expected.listedOnly || value.status === "listed") &&
      Number.isSafeInteger(value.version) &&
      Number(value.version) >= 0 &&
      (!detail || text(value.body, 12000));
    if (expected.kind === "detail")
      return record(parsed, true) && parsed.id === expected.recordId;
    if (
      !own(parsed, ["apiVersion", "records", "offset", "limit", "hasMore"]) ||
      parsed.apiVersion !== "factory.generated.directory-list/v1" ||
      parsed.offset !== 0 ||
      parsed.limit !== 20 ||
      typeof parsed.hasMore !== "boolean" ||
      !Array.isArray(parsed.records) ||
      parsed.records.length > 20 ||
      !parsed.records.every((value) => record(value))
    )
      return false;
    const ids = parsed.records.map((value) => value.id);
    if (new Set(ids).size !== ids.length) return false;
    // A first page cannot prove absence while another page remains unread.
    if (expected.presence === "absent" && parsed.hasMore) return false;
    return (
      ids.includes(expected.recordId) === (expected.presence === "present")
    );
  } catch {
    return false;
  } finally {
    signal.removeEventListener("abort", abort);
    void reader.cancel().catch(() => undefined);
  }
}

/**
 * Reads at most `maximumCapturedResponseBytes` of a response and extracts the
 * top-level `id` string, pattern-validated. Any over-limit body, malformed
 * JSON, or shape mismatch yields no capture (the caller fails closed) — the
 * body is never stored, logged, or echoed anywhere else.
 */
async function captureCreatedRecordId(
  response: Response,
): Promise<string | undefined> {
  if (!response.body) {
    return undefined;
  }
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value === undefined) continue;
      total += value.byteLength;
      if (total > maximumCapturedResponseBytes) {
        return undefined;
      }
      chunks.push(value);
    }
  } catch {
    return undefined;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(new TextDecoder().decode(Buffer.concat(chunks)));
  } catch {
    return undefined;
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return undefined;
  }
  const id = (parsed as Record<string, unknown>).id;
  if (typeof id !== "string" || !capturedRecordIdPattern.test(id)) {
    return undefined;
  }
  return id;
}

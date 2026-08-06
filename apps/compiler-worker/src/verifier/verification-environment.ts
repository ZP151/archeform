import { posix } from "node:path";

import type {
  PreviewProcessRunner,
  PreviewRuntimeRequest,
  StartedPreview,
  startPreviewRun,
  stopPreviewRun,
} from "../preview-runner.js";

/**
 * A bounded, isolated runtime environment for one verification run. Every
 * operation carries the run's operation timeout, never persists raw process
 * output or HTTP bodies, and returns only bounded status results — the probes
 * in the verifier turn those into allowlisted evidence summaries.
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
  readonly status: number;
  readonly ok: boolean;
  readonly durationMs: number;
};

/**
 * Declared fixture data carried on one bounded request: an allowlisted role
 * header and a flat JSON body. Both are validated before the request is sent;
 * neither is ever persisted or echoed into evidence.
 */
export type RequestOptions = {
  readonly headers?: readonly {
    readonly name: string;
    readonly value: string;
  }[];
  readonly body?: string;
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
 * Declared request headers are fixture data: an allowlisted lowercase name
 * (never a credential header) and an identifier-style value. The API role
 * header `x-factory-role` is the supported case.
 */
const safeHeaderName = /^[a-z][a-z0-9-]{0,63}$/;
const safeHeaderValue = /^[a-zA-Z0-9._-]{1,64}$/;
const maximumDeclaredHeaders = 8;

/**
 * Request bodies are bounded declared JSON fixtures: a flat record of
 * primitive values, never nested objects, arrays, or unbounded text.
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
      throw new VerificationLifecycleError(
        boundedErrorCode(error, "preview_start_failed"),
        "The isolated preview failed to start.",
      );
    }
  }

  async cleanup(): Promise<void> {
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
   * Runs one bounded, allowlisted migration command inside the migrate
   * service. Only plain identifier-style tokens are accepted, and the command
   * can never escape the fixed `compose exec -T migrate` invocation.
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
            "migrate",
            ...command,
          ],
          environment: {},
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

  /**
   * Sends one bounded HTTP request to the isolated API. The response body is
   * never read or persisted — only the bounded status is returned. Declared
   * fixture options (role header, flat JSON body) are validated fail closed
   * before the request is sent.
   */
  async request(
    method: HttpMethod,
    path: string,
    port: "web" | "api" = "api",
    options?: RequestOptions,
  ): Promise<BoundedRequestResult> {
    return this.boundedFetch(method, path, port, options);
  }

  private async boundedFetch(
    method: HttpMethod,
    path: string,
    port: "web" | "api",
    options?: RequestOptions,
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
      if (options.headers !== undefined) {
        if (
          !Array.isArray(options.headers) ||
          options.headers.length > maximumDeclaredHeaders ||
          options.headers.some(
            (header) =>
              !header ||
              typeof header.name !== "string" ||
              typeof header.value !== "string" ||
              !safeHeaderName.test(header.name) ||
              header.name.toLowerCase() === "content-type" ||
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
      return {
        status: response?.status ?? 0,
        ok: response?.ok ?? false,
        durationMs: this.elapsed(startedMs),
      };
    } catch {
      // Network failures and timeouts are bounded results, never raw output.
      return { status: 0, ok: false, durationMs: this.elapsed(startedMs) };
    } finally {
      clearTimeout(timer);
    }
  }
}

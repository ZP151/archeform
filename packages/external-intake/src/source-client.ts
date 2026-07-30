import { digestBytes, type Sha256Digest } from "./canonical.js";
import { parseIntakeRequest, type IntakeRequestV1 } from "./contracts.js";
import {
  preflightSourceTreeMetadata,
  type SnapshotLimits,
  type SourceTreeMetadataEntryV1,
} from "./snapshot.js";

const FULL_COMMIT = /^[a-f0-9]{40}$/u;
const GIT_OBJECT = /^[a-f0-9]{40}$/u;
const ALLOWED_RETRIEVAL_HOSTS = new Set([
  "api.github.com",
  "codeload.github.com",
]);
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);
const EVIDENCE_BASENAME = /^(?:licen[cs]e|copying|notice)(?:[._-].*)?$/iu;

export type SourceFetch = (
  input: string | URL,
  init?: RequestInit,
) => Promise<Response>;

export type SourceTreeEntryV1 =
  | {
      readonly path: string;
      readonly mode: string;
      readonly type: "blob";
      readonly size: number;
      readonly blobDigest: Sha256Digest;
    }
  | {
      readonly path: string;
      readonly mode: string;
      readonly type: "tree" | "commit";
    };

export interface ResolvedSourceReferenceV1 {
  readonly apiVersion: "factory.resolved-source-reference/v1";
  readonly repositoryUrl: string;
  readonly requestedRef: string;
  readonly resolvedCommit: string;
  readonly retrievedAt: string;
  readonly archiveUrl: string;
  readonly treeUrl: string;
  readonly requiredNoticePaths: readonly string[];
}

export interface FixedSourceClient {
  resolve(request: IntakeRequestV1): Promise<ResolvedSourceReferenceV1>;
  fetchArchive(reference: ResolvedSourceReferenceV1): Promise<Uint8Array>;
  fetchTree(reference: ResolvedSourceReferenceV1): Promise<SourceTreeEntryV1[]>;
  fetchEvidence(
    reference: ResolvedSourceReferenceV1,
    path: string,
  ): Promise<Uint8Array>;
}

export interface GitHubFixedSourceClientOptions {
  readonly fetch?: SourceFetch;
  readonly now?: () => Date;
  readonly responseTimeoutMs?: number;
  readonly maxRedirects?: number;
  readonly maxMetadataResponseBytes?: number;
  readonly maxArchiveResponseBytes?: number;
  readonly maxEvidenceResponseBytes?: number;
  readonly maxEvidenceCacheBytes?: number;
  readonly snapshotLimits?: Partial<SnapshotLimits>;
  readonly requiredNoticePaths?: Readonly<Record<string, readonly string[]>>;
}

type RepositoryIdentity = { owner: string; repository: string };

function repositoryIdentity(repositoryUrl: string): RepositoryIdentity {
  const url = new URL(repositoryUrl);
  const match = /^\/([^/]+)\/([^/]+)\.git$/u.exec(url.pathname);
  if (
    url.protocol !== "https:" ||
    url.hostname !== "github.com" ||
    url.port !== "" ||
    url.username !== "" ||
    url.password !== "" ||
    url.search !== "" ||
    url.hash !== "" ||
    match === null
  ) {
    throw new TypeError(
      "Only canonical public GitHub repositories are allowed.",
    );
  }
  return {
    owner: match[1]!,
    repository: match[2]!,
  };
}

function canonicalTimestamp(date: Date): string {
  const timestamp = date.toISOString();
  if (!Number.isFinite(date.getTime())) {
    throw new TypeError("Source retrieval clock returned an invalid time.");
  }
  return timestamp;
}

function positiveInteger(value: number, label: string): number {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new TypeError(`${label} must be a positive safe integer.`);
  }
  return value;
}

function nonnegativeInteger(value: number, label: string): number {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new TypeError(`${label} must be a non-negative safe integer.`);
  }
  return value;
}

function record(input: unknown, label: string): Record<string, unknown> {
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    throw new Error(`GitHub ${label} response was malformed.`);
  }
  return input as Record<string, unknown>;
}

function stringField(
  input: Record<string, unknown>,
  field: string,
  label: string,
): string {
  const value = input[field];
  if (typeof value !== "string") {
    throw new Error(`GitHub ${label} response omitted ${field}.`);
  }
  return value;
}

function validateReference(
  reference: ResolvedSourceReferenceV1,
): RepositoryIdentity {
  const identity = repositoryIdentity(reference.repositoryUrl);
  if (
    reference.apiVersion !== "factory.resolved-source-reference/v1" ||
    !FULL_COMMIT.test(reference.resolvedCommit)
  ) {
    throw new TypeError("Resolved source reference is invalid.");
  }
  const expectedArchive = `https://codeload.github.com/${identity.owner}/${identity.repository}/tar.gz/${reference.resolvedCommit}`;
  const expectedTree = `https://api.github.com/repos/${identity.owner}/${identity.repository}/git/trees/${reference.resolvedCommit}`;
  if (
    reference.archiveUrl !== expectedArchive ||
    reference.treeUrl !== expectedTree
  ) {
    throw new TypeError(
      "Resolved source endpoints do not match the repository and commit.",
    );
  }
  return identity;
}

function allowedEvidencePath(
  reference: ResolvedSourceReferenceV1,
  path: string,
): boolean {
  const basename = path.split("/").at(-1) ?? "";
  return (
    EVIDENCE_BASENAME.test(basename) ||
    reference.requiredNoticePaths.includes(path)
  );
}

function assertSafeRelativePath(path: string): void {
  if (
    path.length === 0 ||
    path.length > 512 ||
    path.startsWith("/") ||
    path.includes("\\") ||
    path.includes("\0") ||
    path
      .split("/")
      .some(
        (segment) =>
          segment.length === 0 ||
          segment === "." ||
          segment === ".." ||
          /[<>:"|?*\u0000-\u001f]/u.test(segment),
      )
  ) {
    throw new Error("Source evidence path must be a safe relative path.");
  }
}

export class GitHubFixedSourceClient implements FixedSourceClient {
  readonly #fetch: SourceFetch;
  readonly #now: () => Date;
  readonly #responseTimeoutMs: number;
  readonly #maxRedirects: number;
  readonly #maxMetadataResponseBytes: number;
  readonly #maxArchiveResponseBytes: number;
  readonly #maxEvidenceResponseBytes: number;
  readonly #maxEvidenceCacheBytes: number;
  readonly #snapshotLimits: Partial<SnapshotLimits>;
  readonly #requiredNoticePaths: Readonly<Record<string, readonly string[]>>;
  readonly #treeBytes = new Map<string, Uint8Array>();
  #cachedEvidenceBytes = 0;

  constructor(options: GitHubFixedSourceClientOptions = {}) {
    if (options.fetch === undefined && globalThis.fetch === undefined) {
      throw new TypeError("A source fetch transport is required.");
    }
    this.#fetch = options.fetch ?? globalThis.fetch.bind(globalThis);
    this.#now = options.now ?? (() => new Date());
    this.#responseTimeoutMs = positiveInteger(
      options.responseTimeoutMs ?? 30_000,
      "Response timeout",
    );
    this.#maxRedirects = positiveInteger(
      options.maxRedirects ?? 3,
      "Redirect limit",
    );
    this.#maxMetadataResponseBytes = positiveInteger(
      options.maxMetadataResponseBytes ?? 8 * 1024 * 1024,
      "Metadata response limit",
    );
    this.#maxArchiveResponseBytes = positiveInteger(
      options.maxArchiveResponseBytes ?? 100 * 1024 * 1024,
      "Archive response limit",
    );
    this.#maxEvidenceResponseBytes = positiveInteger(
      options.maxEvidenceResponseBytes ?? 10 * 1024 * 1024,
      "Evidence response limit",
    );
    this.#maxEvidenceCacheBytes = nonnegativeInteger(
      options.maxEvidenceCacheBytes ?? 32 * 1024 * 1024,
      "Evidence cache limit",
    );
    this.#snapshotLimits = options.snapshotLimits ?? {};
    this.#requiredNoticePaths = options.requiredNoticePaths ?? {};
  }

  async resolve(request: IntakeRequestV1): Promise<ResolvedSourceReferenceV1> {
    const parsed = parseIntakeRequest(request);
    const { owner, repository } = repositoryIdentity(
      parsed.source.canonicalRepositoryUrl,
    );
    const apiRoot = `https://api.github.com/repos/${owner}/${repository}`;
    let resolvedCommit: string | undefined;

    if (FULL_COMMIT.test(parsed.source.requestedRef)) {
      resolvedCommit = await this.#verifyCommit(
        apiRoot,
        parsed.source.requestedRef,
      );
    } else {
      const tag = encodeURIComponent(parsed.source.requestedRef);
      const tagReference = record(
        await this.#requestJson(`${apiRoot}/git/ref/tags/${tag}`),
        "tag reference",
      );
      let object = record(tagReference.object, "tag object");
      for (let depth = 0; depth < 16; depth += 1) {
        const type = stringField(object, "type", "tag object");
        const sha = stringField(object, "sha", "tag object");
        if (!GIT_OBJECT.test(sha)) {
          throw new Error(
            "GitHub tag object SHA was not a full lower-case hash.",
          );
        }
        if (type === "commit") {
          resolvedCommit = await this.#verifyCommit(apiRoot, sha);
          break;
        }
        if (type !== "tag") {
          throw new Error("GitHub tag did not resolve to a commit.");
        }
        const annotated = record(
          await this.#requestJson(`${apiRoot}/git/tags/${sha}`),
          "annotated tag",
        );
        object = record(annotated.object, "annotated tag object");
      }
      if (resolvedCommit === undefined) {
        throw new Error("GitHub annotated-tag chain exceeded the peel limit.");
      }
    }

    if (
      parsed.source.expectedCommit !== undefined &&
      parsed.source.expectedCommit !== resolvedCommit
    ) {
      throw new Error("Resolved commit mismatch for expectedCommit.");
    }

    return {
      apiVersion: "factory.resolved-source-reference/v1",
      repositoryUrl: parsed.source.canonicalRepositoryUrl,
      requestedRef: parsed.source.requestedRef,
      resolvedCommit,
      retrievedAt: canonicalTimestamp(this.#now()),
      archiveUrl: `https://codeload.github.com/${owner}/${repository}/tar.gz/${resolvedCommit}`,
      treeUrl: `${apiRoot}/git/trees/${resolvedCommit}`,
      requiredNoticePaths: [
        ...(this.#requiredNoticePaths[parsed.source.canonicalRepositoryUrl] ??
          []),
      ],
    };
  }

  async fetchArchive(
    reference: ResolvedSourceReferenceV1,
  ): Promise<Uint8Array> {
    validateReference(reference);
    return this.#requestBytes(
      reference.archiveUrl,
      this.#maxArchiveResponseBytes,
      "application/x-gzip",
    );
  }

  async fetchTree(
    reference: ResolvedSourceReferenceV1,
  ): Promise<SourceTreeEntryV1[]> {
    const identity = validateReference(reference);
    const response = record(
      await this.#requestJson(`${reference.treeUrl}?recursive=1`),
      "tree",
    );
    if (response.truncated === true || !Array.isArray(response.tree)) {
      throw new Error("GitHub tree inventory is truncated or malformed.");
    }

    const metadata: SourceTreeMetadataEntryV1[] = [];
    const objectIds = new Map<string, string>();
    for (const input of response.tree) {
      const entry = record(input, "tree entry");
      const path = stringField(entry, "path", "tree entry");
      const mode = stringField(entry, "mode", "tree entry");
      const type = stringField(entry, "type", "tree entry");
      if (type === "tree" || type === "commit") {
        metadata.push({ path, mode, type });
        continue;
      }
      if (type !== "blob") {
        throw new Error("GitHub tree entry has an unsupported object type.");
      }
      const size = entry.size;
      const objectId = stringField(entry, "sha", "tree entry");
      if (!Number.isSafeInteger(size) || (size as number) < 0) {
        throw new Error("GitHub tree entry has an invalid byte size.");
      }
      if (!GIT_OBJECT.test(objectId)) {
        throw new Error("GitHub tree entry has an invalid object hash.");
      }
      metadata.push({ path, mode, type, size: size as number });
      objectIds.set(path, objectId);
    }

    const preflight = preflightSourceTreeMetadata(
      metadata,
      this.#snapshotLimits,
    );
    const entries: SourceTreeEntryV1[] = [];
    for (const entry of preflight.entries) {
      if (entry.type !== "blob") {
        entries.push(entry);
        continue;
      }
      const objectId = objectIds.get(entry.path)!;
      const raw = await this.#requestBytes(
        `https://api.github.com/repos/${identity.owner}/${identity.repository}/git/blobs/${objectId}`,
        this.#maxEvidenceResponseBytes,
        "application/vnd.github.raw+json",
      );
      if (raw.byteLength !== entry.size) {
        throw new Error("GitHub blob bytes differ from the tree byte size.");
      }
      const cacheKey = `${reference.repositoryUrl}\0${reference.resolvedCommit}\0${entry.path}`;
      if (
        allowedEvidencePath(reference, entry.path) &&
        !this.#treeBytes.has(cacheKey) &&
        this.#cachedEvidenceBytes + raw.byteLength <=
          this.#maxEvidenceCacheBytes
      ) {
        this.#treeBytes.set(cacheKey, raw);
        this.#cachedEvidenceBytes += raw.byteLength;
      }
      entries.push({ ...entry, blobDigest: digestBytes(raw) });
    }
    return entries;
  }

  async fetchEvidence(
    reference: ResolvedSourceReferenceV1,
    path: string,
  ): Promise<Uint8Array> {
    const identity = validateReference(reference);
    assertSafeRelativePath(path);
    if (!allowedEvidencePath(reference, path)) {
      throw new Error("Source evidence path is not allow-listed.");
    }
    const cacheKey = `${reference.repositoryUrl}\0${reference.resolvedCommit}\0${path}`;
    const cached = this.#treeBytes.get(cacheKey);
    if (cached !== undefined) {
      return cached.slice();
    }
    const encodedPath = path.split("/").map(encodeURIComponent).join("/");
    return this.#requestBytes(
      `https://api.github.com/repos/${identity.owner}/${identity.repository}/contents/${encodedPath}?ref=${reference.resolvedCommit}`,
      this.#maxEvidenceResponseBytes,
      "application/vnd.github.raw+json",
    );
  }

  async #verifyCommit(apiRoot: string, requested: string): Promise<string> {
    const response = record(
      await this.#requestJson(`${apiRoot}/commits/${requested}`),
      "commit",
    );
    const sha = stringField(response, "sha", "commit");
    if (!FULL_COMMIT.test(sha) || sha !== requested) {
      throw new Error(
        "GitHub commit verification did not match the exact SHA.",
      );
    }
    return sha;
  }

  async #requestJson(url: string): Promise<unknown> {
    const bytes = await this.#requestBytes(
      url,
      this.#maxMetadataResponseBytes,
      "application/vnd.github+json",
    );
    try {
      return JSON.parse(
        new TextDecoder("utf-8", { fatal: true }).decode(bytes),
      ) as unknown;
    } catch {
      throw new Error("GitHub metadata response was not valid JSON.");
    }
  }

  async #requestBytes(
    input: string,
    limit: number,
    accept: string,
  ): Promise<Uint8Array> {
    let url = new URL(input);
    for (let redirects = 0; redirects <= this.#maxRedirects; redirects += 1) {
      this.#assertAllowedUrl(url);
      const controller = new AbortController();
      const timer = setTimeout(
        () => controller.abort(),
        this.#responseTimeoutMs,
      );
      timer.unref?.();
      let response: Response;
      try {
        response = await this.#fetch(url, {
          method: "GET",
          redirect: "manual",
          signal: controller.signal,
          headers: {
            accept,
            "user-agent": "factory-external-intake/0.1.0",
            "x-github-api-version": "2022-11-28",
          },
        });
        if (REDIRECT_STATUSES.has(response.status)) {
          if (redirects === this.#maxRedirects) {
            throw new Error("Source redirect limit exceeded.");
          }
          const location = response.headers.get("location");
          if (location === null) {
            throw new Error("Source redirect omitted its location.");
          }
          const next = new URL(location, url);
          this.#assertAllowedRedirect(url, next);
          await response.body?.cancel();
          url = next;
          continue;
        }
        if (!response.ok) {
          await response.body?.cancel();
          throw new Error(
            `GitHub source response failed with status ${response.status}.`,
          );
        }
        return await this.#readBoundedBody(response, limit, controller.signal);
      } catch (error) {
        if (controller.signal.aborted) {
          throw new Error(
            "Source response exceeded the configured time limit.",
          );
        }
        throw error;
      } finally {
        clearTimeout(timer);
      }
    }
    throw new Error("Source redirect limit exceeded.");
  }

  #assertAllowedUrl(url: URL): void {
    if (
      url.protocol !== "https:" ||
      url.port !== "" ||
      url.username !== "" ||
      url.password !== "" ||
      !ALLOWED_RETRIEVAL_HOSTS.has(url.hostname)
    ) {
      throw new Error("Source URL is outside the GitHub retrieval allow-list.");
    }
  }

  #assertAllowedRedirect(from: URL, next: URL): void {
    this.#assertAllowedUrl(next);
    if (from.hostname !== next.hostname) {
      throw new Error("Source retrieval rejected a cross-host redirect.");
    }
  }

  async #readBoundedBody(
    response: Response,
    limit: number,
    signal: AbortSignal,
  ): Promise<Uint8Array> {
    const contentLength = response.headers.get("content-length");
    if (contentLength !== null) {
      const declared = Number(contentLength);
      if (!Number.isSafeInteger(declared) || declared < 0 || declared > limit) {
        await response.body?.cancel();
        throw new Error(
          "Source response exceeds the configured response limit.",
        );
      }
    }
    if (response.body === null) {
      return new Uint8Array();
    }
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let length = 0;
    while (true) {
      const next = await this.#readChunk(reader, signal);
      if (next.done) {
        break;
      }
      length += next.value.byteLength;
      if (length > limit) {
        await reader.cancel();
        throw new Error(
          "Source response exceeds the configured response limit.",
        );
      }
      chunks.push(next.value);
    }
    const bytes = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return bytes;
  }

  #readChunk(
    reader: ReadableStreamDefaultReader<Uint8Array>,
    signal: AbortSignal,
  ): ReturnType<ReadableStreamDefaultReader<Uint8Array>["read"]> {
    if (signal.aborted) {
      return Promise.reject(new DOMException("aborted", "AbortError"));
    }
    return new Promise((resolve, reject) => {
      const abort = (): void => {
        reject(new DOMException("aborted", "AbortError"));
      };
      signal.addEventListener("abort", abort, { once: true });
      reader.read().then(
        (result) => {
          signal.removeEventListener("abort", abort);
          resolve(result);
        },
        (error: unknown) => {
          signal.removeEventListener("abort", abort);
          reject(error);
        },
      );
    });
  }
}

export function sourceEvidenceUrl(
  reference: ResolvedSourceReferenceV1,
  path: string,
): string {
  const { owner, repository } = validateReference(reference);
  const encodedPath = path.split("/").map(encodeURIComponent).join("/");
  return `https://github.com/${owner}/${repository}/blob/${reference.resolvedCommit}/${encodedPath}`;
}

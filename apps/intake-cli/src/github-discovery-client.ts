import {
  capabilityFamilyKeys,
  type CapabilityFamilyKey,
  type DiscoveryRecordInputV1,
} from "@factory/external-intake";

import { createGitHubReadTokenFetch } from "./github-source-client.js";

const GITHUB_API_ORIGIN = "https://api.github.com";
const MAX_RESULTS = 20;

/**
 * Deliberately carries only a bounded retry hint. It never includes GitHub's
 * response body, URL, query, or token.
 */
export class GitHubDiscoveryRateLimitError extends Error {
  readonly retryAfterSeconds?: number;

  constructor(retryAfterSeconds?: number) {
    super("GitHub discovery rate limit reached.");
    this.name = "GitHubDiscoveryRateLimitError";
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export interface GitHubDiscoveryCheckpointV1 {
  readonly apiVersion: "factory.github-discovery-checkpoint/v1";
  readonly completedFamilies: readonly CapabilityFamilyKey[];
}

export interface GitHubDiscoveryBatchResultV1 {
  readonly apiVersion: "factory.github-discovery-batch/v1";
  readonly status: "complete" | "rate-limited";
  readonly records: readonly DiscoveryRecordInputV1[];
  readonly completedFamilies: readonly CapabilityFamilyKey[];
  readonly pendingFamilies: readonly CapabilityFamilyKey[];
  readonly checkpoint: GitHubDiscoveryCheckpointV1;
  readonly retryAfterSeconds?: number;
}

const queryByFamily: Readonly<Record<CapabilityFamilyKey, string>> = {
  identity: "topic:authentication archived:false",
  catalog: "topic:catalog archived:false",
  "commerce-transaction": "topic:ecommerce archived:false",
  inventory: "topic:inventory-management archived:false",
  availability: "topic:reservation archived:false",
  queue: "topic:queue-management archived:false",
  payment: "topic:payment archived:false",
  fulfillment: "topic:delivery archived:false",
  notification: "topic:notification archived:false",
  document: "topic:document-management archived:false",
  search: "topic:search-engine archived:false",
  analytics: "topic:analytics archived:false",
  integration: "topic:integration archived:false",
};

export interface GitHubDiscoveryClientV1 {
  discover(
    family: CapabilityFamilyKey,
  ): Promise<readonly DiscoveryRecordInputV1[]>;
}

type SourceFetch = (
  input: string | URL,
  init?: RequestInit,
) => Promise<Response>;

interface GitHubSearchItem {
  readonly name: string;
  readonly full_name: string;
  readonly owner: { readonly login: string };
  readonly default_branch: string;
  readonly license: { readonly spdx_id: string | null } | null;
}

function isCapabilityFamilyKey(value: string): value is CapabilityFamilyKey {
  return (capabilityFamilyKeys as readonly string[]).includes(value);
}

function parseRetryAfterSeconds(response: Response): number | undefined {
  const value = response.headers.get("retry-after");
  if (value === null || !/^\d{1,5}$/u.test(value)) return undefined;
  const seconds = Number(value);
  return Number.isSafeInteger(seconds) && seconds >= 0 ? seconds : undefined;
}

function rateLimitError(
  response: Response,
): GitHubDiscoveryRateLimitError | undefined {
  if (
    response.status !== 429 &&
    !(
      response.status === 403 &&
      response.headers.get("x-ratelimit-remaining") === "0"
    )
  ) {
    return undefined;
  }
  return new GitHubDiscoveryRateLimitError(parseRetryAfterSeconds(response));
}

function checkpointFor(
  completedFamilies: readonly CapabilityFamilyKey[],
): GitHubDiscoveryCheckpointV1 {
  return Object.freeze({
    apiVersion: "factory.github-discovery-checkpoint/v1",
    completedFamilies: Object.freeze([...completedFamilies]),
  });
}

function validateBatchFamilies(
  families: readonly CapabilityFamilyKey[],
): readonly CapabilityFamilyKey[] {
  if (families.length === 0 || families.length > capabilityFamilyKeys.length) {
    throw new TypeError("GitHub discovery families are invalid.");
  }
  const unique = new Set<CapabilityFamilyKey>();
  for (const family of families) {
    if (!isCapabilityFamilyKey(family) || unique.has(family)) {
      throw new TypeError("GitHub discovery families are invalid.");
    }
    unique.add(family);
  }
  return Object.freeze([...families]);
}

function resumedFamilyCount(
  families: readonly CapabilityFamilyKey[],
  checkpoint: GitHubDiscoveryCheckpointV1 | undefined,
): number {
  if (checkpoint === undefined) return 0;
  if (
    checkpoint.apiVersion !== "factory.github-discovery-checkpoint/v1" ||
    !Array.isArray(checkpoint.completedFamilies) ||
    checkpoint.completedFamilies.length > families.length
  ) {
    throw new TypeError("GitHub discovery checkpoint is invalid.");
  }
  for (const [index, family] of checkpoint.completedFamilies.entries()) {
    if (families[index] !== family) {
      throw new TypeError(
        "GitHub discovery checkpoint does not match the batch.",
      );
    }
  }
  return checkpoint.completedFamilies.length;
}

/**
 * Runs Factory-owned family queries sequentially. A rate limit returns a
 * source-free continuation checkpoint so a scheduler can resume from the
 * first unscanned family without replaying the already completed prefix.
 */
export async function discoverGitHubFamilies(
  inputFamilies: readonly CapabilityFamilyKey[],
  client: GitHubDiscoveryClientV1,
  checkpoint?: GitHubDiscoveryCheckpointV1,
): Promise<GitHubDiscoveryBatchResultV1> {
  const families = validateBatchFamilies(inputFamilies);
  const completed = [
    ...families.slice(0, resumedFamilyCount(families, checkpoint)),
  ];
  const records: DiscoveryRecordInputV1[] = [];

  for (const family of families.slice(completed.length)) {
    try {
      records.push(...(await client.discover(family)));
      completed.push(family);
    } catch (error) {
      if (error instanceof GitHubDiscoveryRateLimitError) {
        return Object.freeze({
          apiVersion: "factory.github-discovery-batch/v1",
          status: "rate-limited",
          records: Object.freeze([...records]),
          completedFamilies: Object.freeze([...completed]),
          pendingFamilies: Object.freeze([...families.slice(completed.length)]),
          checkpoint: checkpointFor(completed),
          ...(error.retryAfterSeconds === undefined
            ? {}
            : { retryAfterSeconds: error.retryAfterSeconds }),
        });
      }
      throw error;
    }
  }

  return Object.freeze({
    apiVersion: "factory.github-discovery-batch/v1",
    status: "complete",
    records: Object.freeze([...records]),
    completedFamilies: Object.freeze([...completed]),
    pendingFamilies: Object.freeze([]),
    checkpoint: checkpointFor(completed),
  });
}

function safeId(value: string): string | undefined {
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-+|-+$/gu, "");
  const result = `github-${normalized}`;
  return /^[a-z][a-z0-9-]{0,127}$/u.test(result) ? result : undefined;
}

function parseSearchItems(input: unknown): readonly GitHubSearchItem[] {
  if (
    input === null ||
    typeof input !== "object" ||
    !Array.isArray((input as { items?: unknown }).items)
  ) {
    throw new Error("GitHub discovery metadata response is invalid.");
  }
  const entries: GitHubSearchItem[] = [];
  for (const item of (input as { items: unknown[] }).items) {
    if (
      item !== null &&
      typeof item === "object" &&
      typeof (item as { name?: unknown }).name === "string" &&
      typeof (item as { full_name?: unknown }).full_name === "string" &&
      typeof (item as { default_branch?: unknown }).default_branch ===
        "string" &&
      (item as { owner?: unknown }).owner !== null &&
      typeof (item as { owner?: unknown }).owner === "object" &&
      typeof (item as { owner: { login?: unknown } }).owner.login === "string"
    ) {
      const license = (item as { license?: unknown }).license;
      if (
        license !== null &&
        license !== undefined &&
        (typeof license !== "object" ||
          !(
            typeof (license as { spdx_id?: unknown }).spdx_id === "string" ||
            (license as { spdx_id?: unknown }).spdx_id === null
          ))
      ) {
        continue;
      }
      entries.push(item as GitHubSearchItem);
    }
  }
  return entries;
}

function canonicalTimestamp(now: Date): string {
  if (!(now instanceof Date) || !Number.isFinite(now.getTime())) {
    throw new TypeError("GitHub discovery clock is invalid.");
  }
  return now.toISOString();
}

async function resolveDefaultBranchCommit(
  fetch: SourceFetch,
  item: GitHubSearchItem,
): Promise<string | undefined> {
  const response = await fetch(
    `${GITHUB_API_ORIGIN}/repos/${item.full_name
      .split("/")
      .map((segment) => encodeURIComponent(segment))
      .join("/")}/commits/${encodeURIComponent(item.default_branch)}`,
    {
      headers: { accept: "application/vnd.github+json" },
      redirect: "error",
    },
  );
  if (!response.ok) {
    const rateLimit = rateLimitError(response);
    if (rateLimit !== undefined) throw rateLimit;
    return undefined;
  }
  const payload = (await response.json()) as { sha?: unknown };
  return typeof payload.sha === "string" && /^[a-f0-9]{40}$/u.test(payload.sha)
    ? payload.sha
    : undefined;
}

export function createEnvironmentGitHubDiscoveryClient(
  environment: Readonly<Record<string, string | undefined>> = process.env,
  sourceFetch: SourceFetch = globalThis.fetch,
  now: () => Date = () => new Date(),
): GitHubDiscoveryClientV1 {
  const fetch = createGitHubReadTokenFetch(
    environment.FACTORY_GITHUB_READ_TOKEN,
    sourceFetch,
  );
  return {
    async discover(family) {
      if (!isCapabilityFamilyKey(family)) {
        throw new TypeError("GitHub discovery family is invalid.");
      }
      const query = queryByFamily[family];
      const response = await fetch(
        `${GITHUB_API_ORIGIN}/search/repositories?q=${encodeURIComponent(query)}&per_page=${MAX_RESULTS}&sort=stars&order=desc`,
        {
          headers: { accept: "application/vnd.github+json" },
          redirect: "error",
        },
      );
      if (!response.ok) {
        const rateLimit = rateLimitError(response);
        if (rateLimit !== undefined) throw rateLimit;
        throw new Error("GitHub discovery metadata request failed.");
      }
      const discoveredAt = canonicalTimestamp(now());
      const seen = new Set<string>();
      const items = parseSearchItems(await response.json()).filter((item) => {
        const identifier = `github:${item.full_name}`;
        if (safeId(item.full_name) === undefined || seen.has(identifier)) {
          return false;
        }
        seen.add(identifier);
        return true;
      });
      const records: DiscoveryRecordInputV1[] = [];
      for (const item of items) {
        records.push({
          apiVersion: "factory.discovery-record-input/v1" as const,
          id: safeId(item.full_name)!,
          discoveredAt,
          sourceKind: "repository" as const,
          sourceHost: "github" as const,
          immutableReference: {
            canonicalIdentifier: `github:${item.full_name}`,
            resolvedVersionOrCommit:
              (await resolveDefaultBranchCommit(fetch, item)) ??
              item.default_branch,
          },
          declaredLicense: item.license?.spdx_id ?? null,
          familyHints: [family],
          profileHints: [],
          reuseMode: "selective-source-copy" as const,
        });
      }
      return Object.freeze(records);
    },
  };
}

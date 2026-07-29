import { posix, win32 } from "node:path";

export type PreviewDispatchAction = "start" | "stop";

export type PreviewDispatch = {
  readonly action: PreviewDispatchAction;
  readonly previewRunId: string;
  readonly rootDirectory: string;
  readonly composeProjectName: string;
  readonly artifacts: readonly {
    readonly path: string;
    readonly digest: string;
    readonly sizeBytes: number;
  }[];
};

export interface PreviewDispatchClient {
  get(
    action: PreviewDispatchAction,
    previewRunId: string,
  ): Promise<PreviewDispatch>;
}

type UnknownRecord = Record<string, unknown>;

function exactRecord(
  input: unknown,
  keys: readonly string[],
): UnknownRecord | undefined {
  if (!input || typeof input !== "object" || Array.isArray(input)) return;
  const record = input as UnknownRecord;
  const actualKeys = Object.keys(record).sort();
  const expectedKeys = [...keys].sort();
  if (
    actualKeys.length !== expectedKeys.length ||
    actualKeys.some((key, index) => key !== expectedKeys[index])
  ) {
    return;
  }
  return record;
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function parseArtifact(input: unknown) {
  const artifact = exactRecord(input, ["path", "digest", "sizeBytes"]);
  if (!artifact || !nonEmptyString(artifact.path)) return;
  const path = artifact.path;
  if (
    posix.isAbsolute(path) ||
    win32.isAbsolute(path) ||
    win32.parse(path).root.length > 0 ||
    path.includes("\\") ||
    path
      .split("/")
      .some(
        (segment) => segment === "" || segment === "." || segment === "..",
      ) ||
    typeof artifact.digest !== "string" ||
    !/^sha256:[a-f0-9]{64}$/.test(artifact.digest) ||
    typeof artifact.sizeBytes !== "number" ||
    !Number.isSafeInteger(artifact.sizeBytes) ||
    artifact.sizeBytes < 0
  ) {
    return;
  }
  return {
    path,
    digest: artifact.digest,
    sizeBytes: artifact.sizeBytes,
  };
}

function parseDispatch(input: unknown): PreviewDispatch | undefined {
  const dispatch = exactRecord(input, [
    "action",
    "previewRunId",
    "rootDirectory",
    "composeProjectName",
    "artifacts",
  ]);
  if (
    !dispatch ||
    (dispatch.action !== "start" && dispatch.action !== "stop") ||
    !nonEmptyString(dispatch.previewRunId) ||
    !nonEmptyString(dispatch.rootDirectory) ||
    !/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(dispatch.rootDirectory) ||
    dispatch.composeProjectName !==
      `factory-preview-${dispatch.previewRunId}` ||
    !Array.isArray(dispatch.artifacts)
  ) {
    return;
  }
  const artifacts = dispatch.artifacts.map(parseArtifact);
  if (
    artifacts.some((artifact) => artifact === undefined) ||
    new Set(artifacts.map((artifact) => artifact?.path)).size !==
      artifacts.length
  ) {
    return;
  }
  return {
    action: dispatch.action,
    previewRunId: dispatch.previewRunId,
    rootDirectory: dispatch.rootDirectory,
    composeProjectName: dispatch.composeProjectName,
    artifacts: artifacts as PreviewDispatch["artifacts"],
  };
}

export function createPreviewDispatchClient(
  controlPlaneUrl: string,
  internalWorkerToken: string,
  fetchImplementation: typeof fetch = fetch,
): PreviewDispatchClient {
  const baseUrl = controlPlaneUrl.replace(/\/+$/, "");
  return {
    async get(action, previewRunId) {
      const response = await fetchImplementation(
        `${baseUrl}/internal/preview-runs/${encodeURIComponent(previewRunId)}/dispatch?action=${action}`,
        {
          method: "GET",
          headers: {
            "x-factory-internal-token": internalWorkerToken,
          },
        },
      );
      if (!response.ok) {
        throw new Error("Control Plane rejected the preview dispatch request.");
      }
      const dispatch = parseDispatch(await response.json());
      if (!dispatch) {
        throw new Error("Control Plane returned an invalid preview dispatch.");
      }
      return dispatch;
    },
  };
}

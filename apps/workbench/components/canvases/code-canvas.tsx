"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { previewRunPresentation } from "../../lib/workbench-model";
import { diffApplicationGraphs } from "../../lib/graph-diff";
import type {
  WorkbenchArtifactContent,
  WorkbenchCompilation,
  WorkbenchCompilationArtifact,
  WorkbenchPreviewRun,
  WorkbenchPublishedRevision,
} from "../../lib/control-plane-client";
import type { ApplicationGraphV1 } from "@factory/graph";

const ADAPTER_METADATA = [
  ["Puck", "PageModel adapter", "puck/v1"],
  ["React Flow", "Flow and relation adapter", "react-flow/v1"],
  ["Prisma", "Domain compiler", "prisma/v1"],
  ["XState", "Flow compiler", "xstate/v1"],
  ["Casbin", "Policy compiler", "casbin/v1"],
] as const;

const maximumSourceQueryLength = 120;
const maximumRenderedSourceMatches = 500;
const unsafeSourceFilenameCharacterPattern =
  /[\u0000-\u001f\u007f<>:"\/\\|?*]/gu;
const trailingSourceFilenameCharacterPattern = /[. ]+$/u;
const windowsDeviceSourceFilenamePattern =
  /^(?:con|prn|aux|nul|clock\$|com[1-9]|lpt[1-9])(?:\.|$)/iu;

type SourceTransferStatus =
  | "Copying current file…"
  | "Copied current file."
  | "Current file could not be copied."
  | "Download started."
  | "Current file could not be downloaded."
  | null;

type SourceTransferAuthority = {
  readonly compilation: WorkbenchCompilation;
  readonly path: string;
  readonly digest: string;
};

type SourceMatchPlan = {
  readonly count: number;
  readonly ranges: readonly {
    readonly start: number;
    readonly end: number;
  }[];
};

function buildSourceMatchPlan(content: string, query: string): SourceMatchPlan {
  if (!query) return { count: 0, ranges: [] };

  const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const expression = new RegExp(escapedQuery, "giu");
  const ranges: { start: number; end: number }[] = [];
  let count = 0;
  let match: RegExpExecArray | null;
  while ((match = expression.exec(content)) !== null) {
    count += 1;
    if (ranges.length < maximumRenderedSourceMatches) {
      ranges.push({ start: match.index, end: match.index + match[0].length });
    }
  }
  return { count, ranges };
}

function renderSourceWithMarks(
  content: string,
  ranges: SourceMatchPlan["ranges"],
) {
  const renderedSource = [];
  let cursor = 0;
  for (const range of ranges) {
    renderedSource.push(content.slice(cursor, range.start));
    renderedSource.push(
      <mark key={`${range.start}:${range.end}`}>
        {content.slice(range.start, range.end)}
      </mark>,
    );
    cursor = range.end;
  }
  renderedSource.push(content.slice(cursor));
  return renderedSource;
}

function sourceMatchStatus(plan: SourceMatchPlan) {
  if (plan.count === 0) return "No matches.";
  if (plan.count === 1) return "1 match.";
  if (plan.count > maximumRenderedSourceMatches) {
    return `${plan.count} matches. Highlighting the first 500.`;
  }
  return `${plan.count} matches.`;
}

function sourceDownloadFilename(path: string): string {
  const basename = path.split("/").at(-1) ?? "";
  const scrubbed = basename
    .replace(unsafeSourceFilenameCharacterPattern, "_")
    .replace(trailingSourceFilenameCharacterPattern, "");
  if (scrubbed === "" || scrubbed === "." || scrubbed === "..") {
    return "source.txt";
  }
  return windowsDeviceSourceFilenamePattern.test(scrubbed)
    ? `_${scrubbed}`
    : scrubbed;
}

function sameSourceTransferAuthority(
  left: SourceTransferAuthority,
  right: SourceTransferAuthority | null,
) {
  return (
    right !== null &&
    left.compilation === right.compilation &&
    left.path === right.path &&
    left.digest === right.digest
  );
}

/**
 * The Code canvas: the published Graph projection, its diff from the Draft,
 * the immutable Compilation status, its registered Source artifacts, and the
 * isolated preview controls. The Source viewer only renders descriptor-bound,
 * admitted content from a succeeded Compilation.
 */
export function CodeCanvas({
  graph,
  artifactError,
  artifactLoading,
  artifactSnapshot,
  publishedRevision,
  compilation,
  canExport,
  exchangeStatus,
  onExportPublishedGraph,
  onImportPublishedGraph,
  onInspectArtifact,
  onOpenPreview,
  onStartPreview,
  onStopPreview,
  previewRun,
  selectedArtifact,
}: {
  graph: ApplicationGraphV1;
  artifactError: string | null;
  artifactLoading: boolean;
  artifactSnapshot: WorkbenchArtifactContent | null;
  publishedRevision: WorkbenchPublishedRevision | null;
  compilation: WorkbenchCompilation | null;
  canExport: boolean;
  exchangeStatus: string | null;
  onExportPublishedGraph: () => void;
  onImportPublishedGraph: (file: File) => void;
  onInspectArtifact: (artifactPath: string) => void;
  onOpenPreview: () => void;
  onStartPreview: () => void;
  onStopPreview: () => void;
  previewRun: WorkbenchPreviewRun | null;
  selectedArtifact: WorkbenchCompilationArtifact | null;
}) {
  const importInput = useRef<HTMLInputElement>(null);
  const [pathFilterQuery, setPathFilterQuery] = useState("");
  const [findQuery, setFindQuery] = useState("");
  const [sourceTransferStatus, setSourceTransferStatus] =
    useState<SourceTransferStatus>(null);
  const [sourceTransferIsPending, setSourceTransferIsPending] = useState(false);
  const [sourceTransferIsInvalidated, setSourceTransferIsInvalidated] =
    useState(false);
  const sourceTransferToken = useRef(0);
  const sourceTransferPending = useRef(false);
  const sourceTransferInvalidated = useRef(false);
  const currentSourceTransferAuthority = useRef<SourceTransferAuthority | null>(
    null,
  );
  const graphDiff = publishedRevision?.graph
    ? diffApplicationGraphs(publishedRevision.graph, graph)
    : null;
  const preview = previewRunPresentation(
    compilation?.result.status === "succeeded",
    previewRun,
  );
  const artifacts = [...(compilation?.artifacts ?? [])].sort((left, right) =>
    left.path < right.path ? -1 : left.path > right.path ? 1 : 0,
  );
  const filteredArtifacts = useMemo(() => {
    const normalizedQuery = pathFilterQuery.toLowerCase();
    return normalizedQuery
      ? artifacts.filter((artifact) =>
          artifact.path.toLowerCase().includes(normalizedQuery),
        )
      : artifacts;
  }, [artifacts, pathFilterQuery]);
  const verifiedArtifact =
    compilation?.result.status === "succeeded" &&
    !artifactLoading &&
    !artifactError &&
    artifactSnapshot !== null &&
    selectedArtifact !== null &&
    artifactSnapshot.path === selectedArtifact.path &&
    artifactSnapshot.digest === selectedArtifact.digest
      ? artifactSnapshot
      : null;
  currentSourceTransferAuthority.current =
    verifiedArtifact && compilation
      ? {
          compilation,
          path: verifiedArtifact.path,
          digest: verifiedArtifact.digest,
        }
      : null;
  const effectiveFindQuery = verifiedArtifact ? findQuery : "";
  const sourceMatchPlan = useMemo(
    () =>
      buildSourceMatchPlan(verifiedArtifact?.content ?? "", effectiveFindQuery),
    [effectiveFindQuery, verifiedArtifact?.content],
  );
  useEffect(() => {
    setFindQuery("");
  }, [
    compilation,
    selectedArtifact?.path,
    selectedArtifact?.digest,
    artifactLoading,
    artifactError,
    verifiedArtifact?.path,
    verifiedArtifact?.digest,
  ]);
  useEffect(() => {
    sourceTransferToken.current += 1;
    sourceTransferPending.current = false;
    sourceTransferInvalidated.current = false;
    setSourceTransferIsPending(false);
    setSourceTransferIsInvalidated(false);
    setSourceTransferStatus(null);
  }, [
    compilation,
    selectedArtifact?.path,
    selectedArtifact?.digest,
    artifactLoading,
    artifactError,
    verifiedArtifact?.path,
    verifiedArtifact?.digest,
  ]);
  function invalidateSourceTransfer() {
    sourceTransferToken.current += 1;
    sourceTransferPending.current = false;
    sourceTransferInvalidated.current = true;
    setSourceTransferIsPending(false);
    setSourceTransferIsInvalidated(true);
    setSourceTransferStatus(null);
  }
  function inspectArtifact(artifactPath: string) {
    invalidateSourceTransfer();
    onInspectArtifact(artifactPath);
  }
  async function copyCurrentFile() {
    if (
      sourceTransferPending.current ||
      sourceTransferInvalidated.current ||
      !verifiedArtifact ||
      !compilation
    ) {
      return;
    }
    const authority: SourceTransferAuthority = {
      compilation,
      path: verifiedArtifact.path,
      digest: verifiedArtifact.digest,
    };
    const token = sourceTransferToken.current + 1;
    sourceTransferToken.current = token;
    sourceTransferPending.current = true;
    setSourceTransferIsPending(true);
    setSourceTransferStatus("Copying current file…");
    try {
      await navigator.clipboard.writeText(verifiedArtifact.content);
      if (
        token === sourceTransferToken.current &&
        !sourceTransferInvalidated.current &&
        sameSourceTransferAuthority(
          authority,
          currentSourceTransferAuthority.current,
        )
      ) {
        setSourceTransferStatus("Copied current file.");
      }
    } catch {
      if (
        token === sourceTransferToken.current &&
        !sourceTransferInvalidated.current &&
        sameSourceTransferAuthority(
          authority,
          currentSourceTransferAuthority.current,
        )
      ) {
        setSourceTransferStatus("Current file could not be copied.");
      }
    } finally {
      if (
        token === sourceTransferToken.current &&
        !sourceTransferInvalidated.current &&
        sameSourceTransferAuthority(
          authority,
          currentSourceTransferAuthority.current,
        )
      ) {
        sourceTransferPending.current = false;
        setSourceTransferIsPending(false);
      }
    }
  }
  function downloadCurrentFile() {
    if (
      sourceTransferPending.current ||
      sourceTransferInvalidated.current ||
      !verifiedArtifact
    ) {
      return;
    }
    sourceTransferToken.current += 1;
    let objectUrl: string | null = null;
    try {
      objectUrl = URL.createObjectURL(
        new Blob([verifiedArtifact.content], {
          type: "application/octet-stream",
        }),
      );
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = sourceDownloadFilename(verifiedArtifact.path);
      link.click();
      setSourceTransferStatus("Download started.");
    } catch {
      setSourceTransferStatus("Current file could not be downloaded.");
    } finally {
      if (objectUrl !== null) {
        try {
          URL.revokeObjectURL(objectUrl);
        } catch {
          // Revocation is best-effort after the one required attempt.
        }
      }
    }
  }
  const sourceTransferDisabled =
    !verifiedArtifact || sourceTransferIsPending || sourceTransferIsInvalidated;
  const artifactStatus = !selectedArtifact
    ? "Select a registered artifact."
    : artifactLoading
      ? "Verifying registered artifact"
      : artifactError
        ? artifactError
        : verifiedArtifact
          ? "Verified registered artifact."
          : "Registered artifact content is not verified.";
  return (
    <div className="code-canvas">
      <div className="code-tabs">
        <span className="selected">application-graph.json</span>
        <span>
          {publishedRevision
            ? `Published r.${publishedRevision.revisionNumber}`
            : "Draft only"}
        </span>
        <span>
          {compilation
            ? `Compile ${compilation.result.status}`
            : "No compilation"}
        </span>
      </div>
      <pre>
        <code>
          <i>01</i> metadata: <b>{JSON.stringify(graph.metadata.id)}</b>,{"\n"}
          <i>02</i> pages: <b>{graph.page.pages.length}</b>,{"\n"}
          <i>03</i> entities: <b>{graph.domain.entities.length}</b>,{"\n"}
          <i>04</i> flows: <b>{graph.flow.flows.length}</b>,{"\n"}
          <i>05</i> lifecycle:{" "}
          <b>{JSON.stringify("Draft → Publish → Compile")}</b>,{"\n"}
          <i>06</i> graphHash:{" "}
          <b>
            {JSON.stringify(publishedRevision?.graphHash ?? "pending publish")}
          </b>
          ,{"\n"}
          <i>07</i> compilation:{" "}
          <b>{JSON.stringify(compilation?.result.status ?? "not queued")}</b>
        </code>
      </pre>
      {compilation?.result.status === "succeeded" && (
        <section className="source-explorer" aria-label="Source">
          <header>
            <strong>Source</strong>
            <small>Registered output from this immutable Compilation</small>
          </header>
          <div className="source-explorer-layout">
            <nav
              aria-label="Registered source artifacts"
              className="source-artifact-tree"
            >
              <div className="source-search-control source-path-filter">
                <label htmlFor="source-path-filter">Filter source files</label>
                <input
                  id="source-path-filter"
                  maxLength={maximumSourceQueryLength}
                  onChange={(event) =>
                    setPathFilterQuery(
                      event.currentTarget.value.slice(
                        0,
                        maximumSourceQueryLength,
                      ),
                    )
                  }
                  type="search"
                  value={pathFilterQuery}
                />
              </div>
              {filteredArtifacts.length === 0 ? (
                <p
                  aria-live="polite"
                  className="source-filter-status"
                  role="status"
                >
                  No source files match.
                </p>
              ) : (
                <ul>
                  {filteredArtifacts.map((artifact) => {
                    const size = formatArtifactSize(artifact.sizeBytes);
                    return (
                      <li key={artifact.path}>
                        <button
                          aria-current={
                            selectedArtifact?.path === artifact.path
                              ? "true"
                              : undefined
                          }
                          aria-label={`Open ${artifact.path}; ${artifact.mediaType}${size ? `; ${size}` : ""}; digest ${artifact.digest}`}
                          data-source-path={artifact.path}
                          onClick={() => inspectArtifact(artifact.path)}
                          type="button"
                        >
                          <strong>{artifact.path}</strong>
                          <span>{artifact.mediaType}</span>
                          {size && <span>{size}</span>}
                          <code className="source-artifact-digest">
                            {artifact.digest}
                          </code>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </nav>
            <section
              aria-label="Verified source content"
              className="source-content-viewer"
            >
              <div className="source-content-heading">
                <strong>
                  {selectedArtifact?.path ?? "No artifact selected"}
                </strong>
                {selectedArtifact && (
                  <span className="source-selected-digest">
                    {selectedArtifact.digest}
                  </span>
                )}
                <div className="source-transfer-actions">
                  <button
                    disabled={sourceTransferDisabled}
                    onClick={copyCurrentFile}
                    type="button"
                  >
                    Copy current file
                  </button>
                  <button
                    disabled={sourceTransferDisabled}
                    onClick={downloadCurrentFile}
                    type="button"
                  >
                    Download current file
                  </button>
                </div>
              </div>
              <div className="source-search-control source-current-file-find">
                <label htmlFor="source-current-file-find">
                  Find in current file
                </label>
                <input
                  disabled={!verifiedArtifact}
                  id="source-current-file-find"
                  maxLength={maximumSourceQueryLength}
                  onChange={(event) =>
                    setFindQuery(
                      event.currentTarget.value.slice(
                        0,
                        maximumSourceQueryLength,
                      ),
                    )
                  }
                  type="search"
                  value={effectiveFindQuery}
                />
              </div>
              <p
                aria-live="polite"
                className="source-artifact-status"
                role="status"
              >
                {artifactStatus}
              </p>
              {effectiveFindQuery && (
                <p
                  aria-live="polite"
                  className="source-match-status"
                  role="status"
                >
                  {sourceMatchStatus(sourceMatchPlan)}
                </p>
              )}
              {sourceTransferStatus && (
                <p
                  aria-live="polite"
                  className="source-transfer-status"
                  role="status"
                >
                  {sourceTransferStatus}
                </p>
              )}
              {verifiedArtifact && (
                <pre>
                  <code>
                    {renderSourceWithMarks(
                      verifiedArtifact.content,
                      sourceMatchPlan.ranges,
                    )}
                  </code>
                </pre>
              )}
            </section>
          </div>
        </section>
      )}
      <section className="graph-diff" aria-label="Application Graph diff">
        <div>
          <strong>Graph diff</strong>
          <small>
            {graphDiff
              ? graphDiff.changed
                ? `${graphDiff.entries.length} semantic change${graphDiff.entries.length === 1 ? "" : "s"} from Published`
                : "Matches Published semantics"
              : "Publish a revision to compare"}
          </small>
        </div>
        {graphDiff?.changed && (
          <ul>
            {graphDiff.entries.slice(0, 8).map((entry) => (
              <li key={`${entry.scope}:${entry.kind}:${entry.key}`}>
                <span className={`graph-diff-${entry.kind}`}>{entry.kind}</span>
                <code>{entry.scope}</code>
                <strong>{entry.key}</strong>
              </li>
            ))}
            {graphDiff.entries.length > 8 && (
              <li>+{graphDiff.entries.length - 8} more Graph changes</li>
            )}
          </ul>
        )}
      </section>
      <section className="adapter-metadata" aria-label="Adapter metadata">
        <div>
          <strong>Adapter metadata</strong>
          <small>
            Declared projections; generated source is not reverse-imported.
          </small>
        </div>
        <ul>
          {ADAPTER_METADATA.map(([name, responsibility, version]) => (
            <li key={name}>
              <strong>{name}</strong>
              <span>{responsibility}</span>
              <code>{version}</code>
            </li>
          ))}
        </ul>
      </section>
      <div className="graph-exchange-actions">
        <div>
          <strong>Graph-first Git exchange</strong>
          <small>Published Graph only · no source or runtime artifacts</small>
        </div>
        <span className="graph-exchange-spacer" />
        <input
          ref={importInput}
          accept="application/json,.json"
          className="graph-exchange-input"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) onImportPublishedGraph(file);
            event.target.value = "";
          }}
          type="file"
        />
        <button onClick={() => importInput.current?.click()} type="button">
          Import Draft
        </button>
        <button
          disabled={!canExport}
          onClick={onExportPublishedGraph}
          type="button"
        >
          Export Published
        </button>
      </div>
      {exchangeStatus && (
        <p className="graph-exchange-status" role="status">
          {exchangeStatus}
        </p>
      )}
      {preview.visible && (
        <section
          className="generated-preview"
          aria-label="Generated application preview"
        >
          <div>
            <strong>Generated preview</strong>
            <small role="status">{preview.label}</small>
          </div>
          <p>
            Runs only this immutable generated Compilation. Stopping removes its
            isolated preview resources.
          </p>
          {previewRun?.status === "failed" && previewRun.diagnostic && (
            <small className="generated-preview-diagnostic">
              {previewRun.diagnostic}
            </small>
          )}
          <div className="generated-preview-actions">
            <button
              disabled={!preview.canStart}
              onClick={onStartPreview}
              type="button"
            >
              Start preview
            </button>
            <button
              disabled={!preview.canOpen}
              onClick={onOpenPreview}
              type="button"
            >
              Open preview
            </button>
            <button
              disabled={!preview.canStop}
              onClick={onStopPreview}
              type="button"
            >
              Stop preview
            </button>
          </div>
        </section>
      )}
    </div>
  );
}

function formatArtifactSize(
  sizeBytes: number | null | undefined,
): string | null {
  if (sizeBytes === null || sizeBytes === undefined) return null;
  if (sizeBytes < 1_000) return `${sizeBytes} B`;
  if (sizeBytes < 1_000_000) return `${(sizeBytes / 1_000).toFixed(1)} KB`;
  return `${(sizeBytes / 1_000_000).toFixed(1)} MB`;
}

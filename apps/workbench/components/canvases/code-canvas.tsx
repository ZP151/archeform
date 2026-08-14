"use client";

import { useRef } from "react";

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
  const verifiedArtifact =
    !artifactLoading &&
    !artifactError &&
    artifactSnapshot !== null &&
    selectedArtifact !== null &&
    artifactSnapshot.path === selectedArtifact.path &&
    artifactSnapshot.digest === selectedArtifact.digest
      ? artifactSnapshot
      : null;
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
              <ul>
                {artifacts.map((artifact) => {
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
                        onClick={() => onInspectArtifact(artifact.path)}
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
              </div>
              <p aria-live="polite" role="status">
                {artifactStatus}
              </p>
              {verifiedArtifact && (
                <pre>
                  <code>{verifiedArtifact.content}</code>
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

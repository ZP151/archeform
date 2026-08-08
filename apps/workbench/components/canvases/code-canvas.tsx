"use client";

import { useRef } from "react";

import { previewRunPresentation } from "../../lib/workbench-model";
import { diffApplicationGraphs } from "../../lib/graph-diff";
import type {
  WorkbenchCompilation,
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
 * the immutable Compilation status, and the isolated preview controls.
 * Artifact evidence lives in the Activity sheet — one inspect click away —
 * so the canvas itself stays a facts surface, not a source browser.
 */
export function CodeCanvas({
  graph,
  publishedRevision,
  compilation,
  canExport,
  exchangeStatus,
  onExportPublishedGraph,
  onImportPublishedGraph,
  onOpenPreview,
  onStartPreview,
  onStopPreview,
  previewRun,
}: {
  graph: ApplicationGraphV1;
  publishedRevision: WorkbenchPublishedRevision | null;
  compilation: WorkbenchCompilation | null;
  canExport: boolean;
  exchangeStatus: string | null;
  onExportPublishedGraph: () => void;
  onImportPublishedGraph: (file: File) => void;
  onOpenPreview: () => void;
  onStartPreview: () => void;
  onStopPreview: () => void;
  previewRun: WorkbenchPreviewRun | null;
}) {
  const importInput = useRef<HTMLInputElement>(null);
  const graphDiff = publishedRevision?.graph
    ? diffApplicationGraphs(publishedRevision.graph, graph)
    : null;
  const preview = previewRunPresentation(
    compilation?.result.status === "succeeded",
    previewRun,
  );
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

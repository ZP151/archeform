"use client";

import {
  CheckCircle2,
  ChevronRight,
  Info,
  Monitor,
  Save,
  Smartphone,
} from "lucide-react";
import React from "react";
import { useEffect, useMemo, useState } from "react";

import type {
  WorkbenchTemplateDraftInstance,
  WorkbenchTemplatePreviewSurface,
} from "../lib/control-plane-client";

type SurfaceKey = WorkbenchTemplatePreviewSurface["surface"]["surfaceKey"];

function titleFromKey(key: string): string {
  return key
    .split("-")
    .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1))
    .join(" ");
}

function previewLabel(type: string): string {
  const known: Record<string, string> = {
    "menu-hero": "Seasonal menu",
    "category-rail": "Menu categories",
    "menu-item-card": "Signature dishes",
    "dish-configurator": "Dish options",
    "order-summary": "Order summary",
    "active-order-list": "Live orders",
    "kitchen-ticket": "Kitchen queue",
    "metric-card": "Service metrics",
    "table-map": "Dining room",
    "role-matrix": "Team access",
    "restaurant-settings-form": "Restaurant settings",
  };
  return known[type] ?? titleFromKey(type);
}

function ProductPagePreview({
  page,
  surfaceKey,
  applicationName,
}: {
  readonly page: WorkbenchTemplatePreviewSurface["surface"]["pages"][number];
  readonly surfaceKey: SurfaceKey;
  readonly applicationName: string;
}) {
  return (
    <article
      className={`template-product-preview template-product-${surfaceKey}`}
      aria-label={`${page.title} preview`}
    >
      <header>
        <span>{applicationName}</span>
        <small>
          {surfaceKey === "customer-mobile" ? "Table 12" : "Live service"}
        </small>
      </header>
      <section className="template-product-heading">
        <small>
          {surfaceKey === "customer-mobile" ? "Private dining" : "Operations"}
        </small>
        <h2>{page.title}</h2>
        <p>
          {surfaceKey === "customer-mobile"
            ? "Warm hospitality, clear choices, and a seamless table order."
            : "The service picture your team needs, without the noise."}
        </p>
      </section>
      <div className="template-block-grid">
        {page.blocks.length === 0 ? (
          <section>
            <strong>Page ready</strong>
            <span>
              The governed recipe has no visual block in this fixture.
            </span>
          </section>
        ) : (
          page.blocks.map((block, index) => (
            <section
              key={block.id}
              className={index === 0 ? "is-primary" : undefined}
            >
              <small>{String(index + 1).padStart(2, "0")}</small>
              <strong>{previewLabel(block.type)}</strong>
              <span>{titleFromKey(block.type)} · bound to the Draft</span>
            </section>
          ))
        )}
      </div>
    </article>
  );
}

export function TemplateDraftWorkspace({
  instance,
  busy,
  error,
  onRename,
}: {
  readonly instance: WorkbenchTemplateDraftInstance;
  readonly busy: boolean;
  readonly error: string | null;
  readonly onRename: (name: string) => void;
}) {
  const [surfaceKey, setSurfaceKey] = useState<SurfaceKey>("customer-mobile");
  const [selectedPageId, setSelectedPageId] = useState<string>(
    instance.previews[0].surface.pages[0]?.id ?? "",
  );
  const [name, setName] = useState(instance.draft.graph.metadata.name);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const preview = useMemo(
    () =>
      instance.previews.find(
        (candidate) => candidate.surface.surfaceKey === surfaceKey,
      ) ?? instance.previews[0],
    [instance.previews, surfaceKey],
  );
  const page =
    preview.surface.pages.find(({ id }) => id === selectedPageId) ??
    preview.surface.pages[0];

  useEffect(() => {
    setName(instance.draft.graph.metadata.name);
  }, [instance.draft.graph.metadata.name]);

  const changeSurface = (next: SurfaceKey): void => {
    const nextPreview = instance.previews.find(
      (candidate) => candidate.surface.surfaceKey === next,
    );
    setSurfaceKey(next);
    setSelectedPageId(nextPreview?.surface.pages[0]?.id ?? "");
  };

  return (
    <section
      className="template-draft-workspace"
      aria-label="Template Draft workspace"
    >
      <header className="template-draft-heading">
        <div>
          <span className="template-origin">
            Created from Restaurant dual surface · v
            {instance.origin.templateVersion}
          </span>
          <h1>{instance.draft.graph.metadata.name}</h1>
          <p>
            <CheckCircle2 size={14} aria-hidden="true" /> Preview synced · Draft
            r.
            {instance.draft.revisionNumber}
          </p>
        </div>
        <div className="template-name-editor">
          <label htmlFor="template-application-name">Application name</label>
          <div>
            <input
              id="template-application-name"
              aria-label="Application name"
              value={name}
              maxLength={80}
              onChange={(event) => setName(event.target.value)}
            />
            <button
              type="button"
              aria-label="Save application name"
              disabled={
                busy ||
                name.trim().length < 2 ||
                name.trim() === instance.draft.graph.metadata.name
              }
              onClick={() => onRename(name.trim())}
            >
              <Save size={14} aria-hidden="true" />
              {busy ? "Saving…" : "Save"}
            </button>
          </div>
          {error && <p role="alert">{error}</p>}
        </div>
      </header>

      <div
        className="template-surface-tabs"
        role="tablist"
        aria-label="Product surface"
      >
        <button
          type="button"
          role="tab"
          aria-label="Customer mobile"
          aria-selected={surfaceKey === "customer-mobile"}
          onClick={() => changeSurface("customer-mobile")}
        >
          <Smartphone size={15} aria-hidden="true" /> Customer mobile
          <small>8 customer pages</small>
        </button>
        <button
          type="button"
          role="tab"
          aria-label="Merchant desktop"
          aria-selected={surfaceKey === "merchant-desktop"}
          onClick={() => changeSurface("merchant-desktop")}
        >
          <Monitor size={15} aria-hidden="true" /> Merchant desktop
          <small>7 merchant pages</small>
        </button>
      </div>

      <div className="template-preview-layout">
        <nav aria-label={`${surfaceKey} pages`}>
          <span>Pages</span>
          {preview.surface.pages.map((candidate) => (
            <button
              type="button"
              key={candidate.id}
              aria-current={candidate.id === page?.id ? "page" : undefined}
              onClick={() => setSelectedPageId(candidate.id)}
            >
              <span>{candidate.title}</span>
              <small>{candidate.route}</small>
              <ChevronRight size={13} aria-hidden="true" />
            </button>
          ))}
        </nav>
        <div className="template-preview-stage">
          {page && (
            <ProductPagePreview
              page={page}
              surfaceKey={surfaceKey}
              applicationName={instance.draft.graph.metadata.name}
            />
          )}
        </div>
      </div>

      <footer className="template-preview-details">
        <button
          type="button"
          aria-label="Preview details"
          aria-expanded={detailsOpen}
          onClick={() => setDetailsOpen((open) => !open)}
        >
          <Info size={13} aria-hidden="true" /> Preview details
        </button>
        {detailsOpen && (
          <dl>
            <div>
              <dt>Snapshot</dt>
              <dd>{instance.snapshot.id}</dd>
            </div>
            <div>
              <dt>Checksum</dt>
              <dd>{instance.snapshot.snapshotChecksum}</dd>
            </div>
            <div>
              <dt>Expires</dt>
              <dd>{instance.snapshot.expiresAt}</dd>
            </div>
          </dl>
        )}
      </footer>
    </section>
  );
}

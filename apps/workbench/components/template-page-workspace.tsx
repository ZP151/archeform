"use client";

import { ArrowLeft, Save } from "lucide-react";
import React from "react";
import { useEffect, useRef, useState } from "react";

import type { WorkbenchTemplateDraftInstance } from "../lib/control-plane-client";
import {
  ProductPagePreview,
  type TemplatePageSelection,
} from "./template-draft-workspace";
import { TemplatePageBlockOrder } from "./template-page-block-order";

type SaveInput =
  | (TemplatePageSelection & { readonly title: string })
  | (TemplatePageSelection & {
      readonly regionKey: "main";
      readonly blockIds: readonly string[];
    });

function validTitle(value: string, current: string): boolean {
  const title = value.trim();
  return (
    title.length >= 2 &&
    title.length <= 80 &&
    !/[\u0000-\u001f\u007f]/u.test(title) &&
    title !== current
  );
}

export function TemplatePageWorkspace({
  instance,
  selection,
  busy,
  error,
  onSave,
  onBack,
}: {
  readonly instance: WorkbenchTemplateDraftInstance;
  readonly selection: TemplatePageSelection;
  readonly busy: boolean;
  readonly error: string | null;
  readonly onSave: (input: SaveInput) => void;
  readonly onBack: () => void;
}) {
  const preview = instance.previews.find(
    ({ surface }) => surface.surfaceKey === selection.surfaceKey,
  );
  const page = preview?.surface.pages.find(({ id }) => id === selection.pageId);
  const currentTitle = page?.title ?? "";
  const [title, setTitle] = useState(currentTitle);
  const previousRevision = useRef(instance.draft.revisionNumber);
  const successRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => setTitle(currentTitle), [currentTitle, selection.pageId]);
  useEffect(() => {
    if (previousRevision.current !== instance.draft.revisionNumber) {
      previousRevision.current = instance.draft.revisionNumber;
      successRef.current?.focus();
    }
  }, [instance.draft.revisionNumber]);
  useEffect(() => {
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onBack();
    };
    window.addEventListener("keydown", escape);
    return () => window.removeEventListener("keydown", escape);
  }, [onBack]);

  if (!page || !preview) {
    return (
      <section aria-label="Template Page workspace">
        <p role="alert">The selected page is unavailable.</p>
        <button type="button" onClick={onBack}>
          Back to preview
        </button>
      </section>
    );
  }
  const canSave = !busy && validTitle(title, currentTitle);
  const surfaceLabel =
    selection.surfaceKey === "customer-mobile"
      ? "Customer mobile"
      : "Merchant desktop";

  return (
    <section
      className="template-page-workspace"
      aria-label="Template Page workspace"
    >
      <header className="template-page-heading">
        <button type="button" aria-label="Back to preview" onClick={onBack}>
          <ArrowLeft size={16} aria-hidden="true" /> Back to preview
        </button>
        <div>
          <span>Page</span>
          <h1>{page.title}</h1>
          <p>
            {surfaceLabel} · {page.route}
          </p>
        </div>
        <p
          ref={successRef}
          tabIndex={-1}
          data-page-save-status="success"
          role="status"
          aria-live="polite"
        >
          Draft r.{instance.draft.revisionNumber} · Preview active
        </p>
      </header>
      <div className="template-page-layout">
        <div className="template-page-editor-stack">
          {error && (
            <p className="template-page-error" role="alert">
              {error}
            </p>
          )}
          <form
            className="template-page-editor"
            onSubmit={(event) => {
              event.preventDefault();
              if (canSave) onSave({ ...selection, title: title.trim() });
            }}
          >
            <div>
              <span>Content</span>
              <h2>Page title</h2>
              <p>Update the name people see in navigation and this preview.</p>
            </div>
            <label htmlFor="template-page-title">Page title</label>
            <input
              id="template-page-title"
              aria-label="Page title"
              value={title}
              maxLength={80}
              onChange={(event) => setTitle(event.target.value)}
            />
            <button
              type="submit"
              aria-label="Save page title"
              disabled={!canSave}
            >
              <Save size={15} aria-hidden="true" />{" "}
              {busy ? "Saving…" : "Save as new Draft"}
            </button>
          </form>
          {page.blocks.length >= 2 && (
            <TemplatePageBlockOrder
              blocks={page.blocks}
              busy={busy}
              onSave={(blockIds) =>
                onSave({
                  ...selection,
                  regionKey: "main",
                  blockIds,
                })
              }
            />
          )}
        </div>
        <div className="template-page-preview">
          <span>Live preview</span>
          <ProductPagePreview
            page={page}
            surfaceKey={selection.surfaceKey}
            applicationName={instance.draft.graph.metadata.name}
          />
        </div>
      </div>
    </section>
  );
}

"use client";

import { ArrowLeft, Save } from "lucide-react";
import React from "react";
import { useEffect, useRef, useState } from "react";

import {
  deriveTemplateDataFieldValue,
  type WorkbenchTemplateDraftInstance,
} from "../lib/control-plane-client";

const fixedError = "Template data could not be saved.";

function validValue(value: string, current: string): boolean {
  const normalized = value.trim();
  return (
    normalized.length >= 2 &&
    normalized.length <= 120 &&
    !/[\u0000-\u001f\u007f]/u.test(normalized) &&
    normalized !== current
  );
}

export function TemplateDataWorkspace({
  instance,
  busy,
  error,
  onSave,
  onBack,
}: {
  readonly instance: WorkbenchTemplateDraftInstance;
  readonly busy: boolean;
  readonly error: string | null;
  readonly onSave: (value: string) => void;
  readonly onBack: () => void;
}) {
  let currentValue: string | null = null;
  try {
    currentValue = deriveTemplateDataFieldValue(instance);
  } catch {
    currentValue = null;
  }
  const [value, setValue] = useState(currentValue ?? "");
  const inputRef = useRef<HTMLInputElement>(null);
  const statusRef = useRef<HTMLParagraphElement>(null);
  const saveInFlight = useRef(false);
  const attemptedRevision = useRef<number | null>(null);
  const previousRevision = useRef(instance.draft.revisionNumber);

  useEffect(() => {
    if (currentValue !== null) setValue(currentValue);
  }, [currentValue, instance.draft.revisionNumber]);
  useEffect(() => {
    if (previousRevision.current !== instance.draft.revisionNumber) {
      previousRevision.current = instance.draft.revisionNumber;
      statusRef.current?.focus();
    }
  }, [instance.draft.revisionNumber]);
  useEffect(() => {
    if (error) inputRef.current?.focus();
  }, [error]);
  useEffect(() => {
    if (
      saveInFlight.current &&
      !busy &&
      (error !== null ||
        (attemptedRevision.current !== null &&
          attemptedRevision.current !== instance.draft.revisionNumber))
    ) {
      saveInFlight.current = false;
      attemptedRevision.current = null;
    }
  });
  useEffect(() => {
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onBack();
    };
    window.addEventListener("keydown", escape);
    return () => window.removeEventListener("keydown", escape);
  }, [onBack]);

  if (currentValue === null) {
    return (
      <section
        className="template-data-workspace"
        aria-label="Template Data workspace"
      >
        <p role="alert">{fixedError}</p>
        <p role="status">Data unavailable</p>
        <button type="button" onClick={onBack}>
          Back to preview
        </button>
      </section>
    );
  }

  const canSave = !busy && validValue(value, currentValue);
  return (
    <section
      className="template-data-workspace"
      aria-label="Template Data workspace"
    >
      <header className="template-data-heading">
        <button type="button" aria-label="Back to preview" onClick={onBack}>
          <ArrowLeft size={16} aria-hidden="true" /> Back to preview
        </button>
        <div>
          <span>Data</span>
          <h1>{currentValue}</h1>
          <p>Menu items · one governed Restaurant record</p>
        </div>
        <p
          ref={statusRef}
          tabIndex={-1}
          data-template-data-save-status="success"
          role="status"
          aria-live="polite"
        >
          Draft r.{instance.draft.revisionNumber} · Preview active
        </p>
      </header>

      <div className="template-data-layout">
        <div className="template-data-editor">
          <nav aria-label="Restaurant data hierarchy">
            <span>Menu items</span>
            <strong>{currentValue}</strong>
            <small>Dish name</small>
          </nav>
          {error && (
            <p className="template-data-error" role="alert">
              {fixedError}
            </p>
          )}
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (canSave && !saveInFlight.current) {
                saveInFlight.current = true;
                attemptedRevision.current = instance.draft.revisionNumber;
                onSave(value.trim());
              }
            }}
          >
            <div>
              <span>Menu item</span>
              <h2>Dish name</h2>
              <p id="template-data-description">
                Save this name as a new immutable Draft preview.
              </p>
            </div>
            <label htmlFor="template-dish-name">Dish name</label>
            <input
              ref={inputRef}
              id="template-dish-name"
              aria-label="Dish name"
              aria-describedby="template-data-description"
              value={value}
              maxLength={120}
              onChange={(event) => setValue(event.target.value)}
            />
            <button
              type="submit"
              aria-label="Save dish name as new Draft"
              disabled={!canSave}
            >
              <Save size={15} aria-hidden="true" />
              {busy ? "Saving…" : "Save as new Draft"}
            </button>
          </form>
        </div>

        <div className="template-data-previews" aria-label="Data previews">
          {[
            ["Customer Menu", "Guest menu"],
            ["Merchant Menu Management", "Operations menu"],
          ].map(([title, description]) => (
            <article key={title} data-template-data-preview>
              <span>{description}</span>
              <h2>{title}</h2>
              <strong>{currentValue}</strong>
              <small>Snapshot {instance.snapshot.id}</small>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

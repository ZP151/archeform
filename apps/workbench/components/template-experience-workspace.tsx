"use client";

import { ArrowLeft, Palette, Save } from "lucide-react";
import React from "react";
import { useEffect, useRef, useState } from "react";

import {
  deriveTemplateExperienceThemeMode,
  type WorkbenchTemplateDraftInstance,
} from "../lib/control-plane-client";

const fixedError = "Template experience could not be saved.";

export function TemplateExperienceWorkspace({
  instance,
  busy,
  error,
  onSave,
  onBack,
}: {
  readonly instance: WorkbenchTemplateDraftInstance;
  readonly busy: boolean;
  readonly error: string | null;
  readonly onSave: (mode: "dark") => void;
  readonly onBack: () => void;
}) {
  let currentMode: "light" | "dark" | null = null;
  try {
    currentMode = deriveTemplateExperienceThemeMode(instance);
  } catch {
    currentMode = null;
  }
  const [proposal, setProposal] = useState<"light" | "dark">(
    currentMode ?? "light",
  );
  const darkRef = useRef<HTMLInputElement>(null);
  const statusRef = useRef<HTMLParagraphElement>(null);
  const saveInFlight = useRef(false);
  const attemptedRevision = useRef<number | null>(null);
  const previousRevision = useRef(instance.draft.revisionNumber);

  useEffect(() => {
    if (currentMode !== null) setProposal(currentMode);
  }, [currentMode, instance.draft.revisionNumber]);
  useEffect(() => {
    if (previousRevision.current !== instance.draft.revisionNumber) {
      previousRevision.current = instance.draft.revisionNumber;
      statusRef.current?.focus();
    }
  }, [instance.draft.revisionNumber]);
  useEffect(() => {
    if (error) darkRef.current?.focus();
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

  if (currentMode === null) {
    return (
      <section
        className="template-experience-workspace"
        aria-label="Template Experience workspace"
      >
        <p role="alert">{fixedError}</p>
        <p role="status">Experience unavailable</p>
        <button type="button" onClick={onBack}>
          Back to preview
        </button>
      </section>
    );
  }

  const canSave = !busy && currentMode === "light" && proposal === "dark";
  return (
    <section
      className="template-experience-workspace"
      aria-label="Template Experience workspace"
    >
      <header className="template-experience-heading">
        <button type="button" aria-label="Back to preview" onClick={onBack}>
          <ArrowLeft size={16} aria-hidden="true" /> Back to preview
        </button>
        <div>
          <span>Experience</span>
          <h1>Theme</h1>
          <p>One governed Restaurant presentation mode</p>
        </div>
        <p
          ref={statusRef}
          tabIndex={-1}
          data-template-experience-save-status="success"
          role="status"
          aria-live="polite"
        >
          Draft r.{instance.draft.revisionNumber} · Preview active
        </p>
      </header>

      <div className="template-experience-layout">
        <div className="template-experience-editor">
          <div>
            <Palette size={18} aria-hidden="true" />
            <span>Theme</span>
            <h2>Light or Dark</h2>
            <p>Save Dark as a new immutable Draft preview.</p>
          </div>
          {error && (
            <p className="template-experience-error" role="alert">
              {fixedError}
            </p>
          )}
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (canSave && !saveInFlight.current) {
                saveInFlight.current = true;
                attemptedRevision.current = instance.draft.revisionNumber;
                onSave("dark");
              }
            }}
          >
            <div
              className="template-experience-options"
              role="radiogroup"
              aria-label="Theme"
            >
              {(["light", "dark"] as const).map((mode) => (
                <label className="template-experience-option" key={mode}>
                  <input
                    ref={mode === "dark" ? darkRef : undefined}
                    type="radio"
                    name="template-experience-theme"
                    value={mode}
                    aria-label={mode === "light" ? "Light" : "Dark"}
                    checked={proposal === mode}
                    onChange={() => setProposal(mode)}
                  />
                  <span>{mode === "light" ? "Light" : "Dark"}</span>
                  <small>
                    {mode === currentMode ? "Current Graph" : "New Draft"}
                  </small>
                </label>
              ))}
            </div>
            <button
              type="submit"
              aria-label="Save dark theme as new Draft"
              disabled={!canSave}
            >
              <Save size={15} aria-hidden="true" />
              {busy ? "Saving…" : "Save as new Draft"}
            </button>
          </form>
        </div>

        <div
          className="template-experience-previews"
          aria-label="Experience previews"
        >
          {[
            ["Customer", "Guest restaurant"],
            ["Merchant", "Operations workspace"],
          ].map(([title, description]) => (
            <article
              key={title}
              aria-label={`${title} theme preview`}
              data-template-experience-preview
              data-template-theme={currentMode}
            >
              <span>{description}</span>
              <h2>{title}</h2>
              <strong>{currentMode === "light" ? "Light" : "Dark"}</strong>
              <small>Snapshot {instance.snapshot.id}</small>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

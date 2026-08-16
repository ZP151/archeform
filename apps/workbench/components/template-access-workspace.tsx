"use client";

import { ArrowLeft, Save, ShieldCheck } from "lucide-react";
import React from "react";
import { useEffect, useRef, useState } from "react";

import {
  deriveTemplateAccessState,
  type WorkbenchTemplateDraftInstance,
} from "../lib/control-plane-client";

const fixedError = "Template access could not be saved.";
const ROLE_KEY = /^[a-z][a-zA-Z0-9-]*$/;

function validRoleKey(value: string, declared: readonly string[]): boolean {
  const normalized = value.trim();
  return (
    normalized.length >= 1 &&
    normalized.length <= 128 &&
    ROLE_KEY.test(normalized) &&
    !declared.includes(normalized)
  );
}

export function TemplateAccessWorkspace({
  instance,
  busy,
  error,
  onSave,
  onBack,
}: {
  readonly instance: WorkbenchTemplateDraftInstance;
  readonly busy: boolean;
  readonly error: string | null;
  readonly onSave: (roleKey: string) => void;
  readonly onBack: () => void;
}) {
  let access = null as ReturnType<typeof deriveTemplateAccessState> | null;
  try {
    access = deriveTemplateAccessState(instance);
  } catch {
    access = null;
  }
  const [roleKey, setRoleKey] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const statusRef = useRef<HTMLParagraphElement>(null);
  const saveInFlight = useRef(false);
  const attemptedRevision = useRef<number | null>(null);
  const previousRevision = useRef(instance.draft.revisionNumber);

  useEffect(() => {
    if (access !== null && !access.roles.includes(roleKey.trim())) {
      setRoleKey("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [instance.draft.revisionNumber]);
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

  if (access === null) {
    return (
      <section
        className="template-access-workspace"
        aria-label="Template Access workspace"
      >
        <p role="alert">{fixedError}</p>
        <p role="status">Access unavailable</p>
        <button type="button" onClick={onBack}>
          Back to preview
        </button>
      </section>
    );
  }

  const canSave = !busy && validRoleKey(roleKey, access.roles);
  return (
    <section
      className="template-access-workspace"
      aria-label="Template Access workspace"
    >
      <header className="template-access-heading">
        <button type="button" aria-label="Back to preview" onClick={onBack}>
          <ArrowLeft size={16} aria-hidden="true" /> Back to preview
        </button>
        <div>
          <span>Access</span>
          <h1>Team roles</h1>
          <p>Declared roles and their governed permissions</p>
        </div>
        <p
          ref={statusRef}
          tabIndex={-1}
          data-template-access-save-status="success"
          role="status"
          aria-live="polite"
        >
          Draft r.{instance.draft.revisionNumber} · Preview active
        </p>
      </header>

      <div className="template-access-layout">
        <div className="template-access-editor">
          <nav aria-label="Declared roles">
            <ShieldCheck size={16} aria-hidden="true" />
            <span>Declared roles</span>
            {access.roles.map((role) => (
              <strong key={role}>{role}</strong>
            ))}
            <small>{access.permissions.length} permission rows</small>
          </nav>
          {error && (
            <p className="template-access-error" role="alert">
              {fixedError}
            </p>
          )}
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (canSave && !saveInFlight.current) {
                saveInFlight.current = true;
                attemptedRevision.current = instance.draft.revisionNumber;
                onSave(roleKey.trim());
              }
            }}
          >
            <div>
              <span>Team role</span>
              <h2>Add a role</h2>
              <p id="template-access-description">
                Save a new role with table-session read access as a new
                immutable Draft preview.
              </p>
            </div>
            <label htmlFor="template-role-key">Role key</label>
            <input
              ref={inputRef}
              id="template-role-key"
              aria-label="Role key"
              aria-describedby="template-access-description"
              value={roleKey}
              maxLength={128}
              onChange={(event) => setRoleKey(event.target.value)}
            />
            <button
              type="submit"
              aria-label="Save role as new Draft"
              disabled={!canSave}
            >
              <Save size={15} aria-hidden="true" />
              {busy ? "Saving…" : "Save as new Draft"}
            </button>
          </form>
        </div>

        <div className="template-access-previews" aria-label="Access previews">
          {[
            ["Customer", "Guest ordering"],
            ["Merchant", "Operations workspace"],
          ].map(([title, description]) => (
            <article
              key={title}
              aria-label={`${title} access preview`}
              data-template-access-preview
            >
              <span>{description}</span>
              <h2>{title}</h2>
              <strong>{access.roles.length} roles</strong>
              <small>Snapshot {instance.snapshot.id}</small>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

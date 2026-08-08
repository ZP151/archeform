"use client";

import React, { useMemo, useState } from "react";
import { History, LayoutTemplate, Palette, Save } from "lucide-react";

import {
  resolveExperienceDesignSystem,
  type DraftRevisionV1,
  type PageLayoutVariant,
} from "@factory/graph";

import type { PersistedDraft } from "../../lib/golden-path/journey-model";

const COLOUR_VALUE_PATTERN =
  /^(#[0-9a-fA-F]{3}|#[0-9a-fA-F]{4}|#[0-9a-fA-F]{6}|#[0-9a-fA-F]{8}|[a-z][a-z0-9-]*)$/;

const PAGE_LAYOUT_VARIANTS: readonly PageLayoutVariant[] = [
  "table",
  "form",
  "detail",
  "dashboard",
];

interface BuildPanelProps {
  readonly acceptedPlanLabel: string | null;
  readonly planId: string | null;
  readonly draftHistory: readonly DraftRevisionV1[];
  readonly adjustmentLog: readonly string[];
  readonly persistedDraft: PersistedDraft | null;
  readonly busy: boolean;
  readonly error: string | null;
  readonly onApplyPlan: () => void;
  readonly onAdjustToken: (token: string, value: string) => void;
  readonly onAdjustLayout: (pageId: string, variant: PageLayoutVariant) => void;
  readonly onApplyToDraft: () => void;
  readonly onRestore: (revisionId: string, revision: number) => void;
  readonly onProceed?: () => void;
}

/**
 * Build mode: apply the accepted plan, adjust one approved Experience token
 * and one approved page layout over the immutable Draft revisions, restore
 * earlier content as the next revision, and apply the built Draft to the
 * application. Token values are validated before any adjustment is proposed.
 */
export function BuildPanel(props: BuildPanelProps): React.JSX.Element {
  const latest = props.draftHistory[props.draftHistory.length - 1] ?? null;
  const pageOptions = useMemo(
    () => latest?.graph.page.pages.map((page) => page.id) ?? [],
    [latest],
  );
  const resolved = useMemo(
    () =>
      latest === null
        ? null
        : resolveExperienceDesignSystem(latest.graph.experience),
    [latest],
  );
  const tokenOptions = useMemo(() => {
    if (resolved === null) return [];
    return Object.keys(resolved.tokens.colour.light);
  }, [resolved]);

  const [selectedToken, setSelectedToken] = useState<string | null>(null);
  const [selectedPage, setSelectedPage] = useState<string | null>(null);
  const [variant, setVariant] = useState<PageLayoutVariant>("table");
  const [tokenValue, setTokenValue] = useState("");
  const [tokenError, setTokenError] = useState<string | null>(null);

  const effectiveToken =
    selectedToken ??
    (tokenOptions.includes("brand") ? "brand" : (tokenOptions[0] ?? ""));
  const effectivePage = selectedPage ?? pageOptions[0] ?? "";

  const planApplied = props.draftHistory.length > 1;
  const canApplyPlan =
    props.acceptedPlanLabel !== null && !planApplied && !props.busy;
  const canApplyToDraft =
    planApplied && props.persistedDraft === null && !props.busy;
  const canAdjust = planApplied && props.persistedDraft === null && !props.busy;

  const applyToken = (): void => {
    if (!COLOUR_VALUE_PATTERN.test(tokenValue)) {
      setTokenError("Enter a valid colour value.");
      return;
    }
    setTokenError(null);
    props.onAdjustToken(effectiveToken, tokenValue);
  };

  return (
    <section
      className="golden-path-panel"
      aria-label="Build the Expense Approval Draft"
    >
      <h2>Build</h2>
      {props.error !== null ? (
        <p className="golden-path-error" role="alert">
          {props.error}
        </p>
      ) : null}
      {props.busy ? (
        <p className="golden-path-busy" role="status">
          Working…
        </p>
      ) : null}

      <div className="golden-path-plan-status">
        <p>
          <strong>Accepted plan:</strong>{" "}
          {props.acceptedPlanLabel ?? "None yet"}
          {props.planId !== null ? ` · ${props.planId}` : ""}
        </p>
        <button
          type="button"
          className="golden-path-primary"
          aria-label="Apply plan to Draft"
          disabled={!canApplyPlan}
          onClick={props.onApplyPlan}
        >
          Apply plan to Draft
        </button>
      </div>

      <div className="golden-path-adjust">
        <div className="golden-path-adjust-tokens">
          <h3>
            <Palette size={14} aria-hidden="true" /> Experience token
          </h3>
          <label>
            Token
            <select
              aria-label="Colour token"
              value={effectiveToken}
              onChange={(event) => setSelectedToken(event.target.value)}
            >
              {tokenOptions.map((token) => (
                <option key={token} value={token}>
                  {token}
                </option>
              ))}
            </select>
          </label>
          <label>
            Value
            <input
              aria-label="Colour token value"
              value={tokenValue}
              onChange={(event) => setTokenValue(event.target.value)}
              placeholder="#0f6f5c"
            />
          </label>
          <button
            type="button"
            className="golden-path-secondary"
            aria-label="Apply token adjustment"
            disabled={!canAdjust}
            onClick={applyToken}
          >
            Apply token adjustment
          </button>
          {tokenError !== null ? (
            <p className="golden-path-error">{tokenError}</p>
          ) : null}
        </div>
        <div className="golden-path-adjust-layout">
          <h3>
            <LayoutTemplate size={14} aria-hidden="true" /> Approved page layout
          </h3>
          <label>
            Page
            <select
              aria-label="Page"
              value={effectivePage}
              onChange={(event) => setSelectedPage(event.target.value)}
            >
              {pageOptions.map((pageId) => (
                <option key={pageId} value={pageId}>
                  {pageId}
                </option>
              ))}
            </select>
          </label>
          <label>
            Variant
            <select
              aria-label="Page layout variant"
              value={variant}
              onChange={(event) =>
                setVariant(event.target.value as PageLayoutVariant)
              }
            >
              {PAGE_LAYOUT_VARIANTS.map((candidate) => (
                <option key={candidate} value={candidate}>
                  {candidate}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="golden-path-secondary"
            aria-label="Apply layout adjustment"
            disabled={!canAdjust}
            onClick={() => props.onAdjustLayout(effectivePage, variant)}
          >
            Apply layout adjustment
          </button>
        </div>
      </div>

      <div className="golden-path-revisions">
        <h3>
          <History size={14} aria-hidden="true" /> Immutable Draft revisions
        </h3>
        <ul>
          {props.draftHistory.map((revision) => {
            // Revisions are appended (never mutated): appendDraftRevision
            // keeps the Draft id and advances the revision number, so rows
            // are keyed and compared by (id, revision).
            const isCurrent =
              latest !== null &&
              revision.id === latest.id &&
              revision.revision === latest.revision;
            return (
              <li
                key={`${revision.id}@${revision.revision}`}
                className={isCurrent ? "is-current" : ""}
              >
                <code>{revision.id}</code> · r.{revision.revision} ·{" "}
                {revision.status}
                {isCurrent ? (
                  " · current"
                ) : (
                  <button
                    type="button"
                    aria-label={`Restore ${revision.id} · r.${revision.revision}`}
                    disabled={props.busy || props.persistedDraft !== null}
                    onClick={() =>
                      props.onRestore(revision.id, revision.revision)
                    }
                  >
                    Restore
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      {props.adjustmentLog.length > 0 ? (
        <div className="golden-path-log">
          <h3>Adjustment log</h3>
          <ul>
            {props.adjustmentLog.map((label) => (
              <li key={label}>{label}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="golden-path-actions">
        {props.persistedDraft !== null ? (
          <p className="golden-path-note">
            Applied as revision {props.persistedDraft.draftRevisionId} · r.
            {props.persistedDraft.revisionNumber} on{" "}
            {props.persistedDraft.applicationGraphId}
          </p>
        ) : null}
        <button
          type="button"
          className="golden-path-primary"
          aria-label="Apply to Draft"
          disabled={!canApplyToDraft}
          onClick={props.onApplyToDraft}
        >
          <Save size={16} aria-hidden="true" />
          Apply to Draft
        </button>
        {props.onProceed !== undefined ? (
          <button
            type="button"
            className="golden-path-secondary"
            aria-label="Proceed to Simulate"
            disabled={props.persistedDraft === null}
            onClick={props.onProceed}
          >
            Proceed to Simulate
          </button>
        ) : null}
      </div>
    </section>
  );
}

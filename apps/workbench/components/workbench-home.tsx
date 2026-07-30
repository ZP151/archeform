"use client";

import { getProfileComposition } from "@factory/capabilities";
import React from "react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  CircleDot,
  Clock3,
  Code2,
  Layers3,
  Plus,
} from "lucide-react";

import type { WorkbenchApplicationSummary } from "../lib/control-plane-client";
import { profileStarterOptions } from "../lib/profile-starters";

type Props = {
  readonly applications: readonly WorkbenchApplicationSummary[];
  readonly loading: boolean;
  readonly compilingKey?: string | null;
  readonly onCreate: () => void;
  readonly onOpen: (applicationKey: string) => void;
  readonly onCompile: (applicationKey: string) => void;
};

function lifecycleLabel(application: WorkbenchApplicationSummary): string {
  const revisions = [
    application.latestDraft
      ? `Draft r.${application.latestDraft.revisionNumber}`
      : null,
    application.latestPublished
      ? `Published r.${application.latestPublished.revisionNumber}`
      : null,
  ].filter((revision): revision is string => revision !== null);
  return revisions.length > 0 ? revisions.join(" · ") : "No revisions";
}

function activityTime(application: WorkbenchApplicationSummary): string {
  return (
    application.latestCompilation?.completedAt ??
    application.latestPublished?.publishedAt ??
    application.latestDraft?.createdAt ??
    ""
  );
}

function activityLabel(application: WorkbenchApplicationSummary): string {
  if (application.latestCompilation) {
    return `Compilation ${application.latestCompilation.status}`;
  }
  if (application.latestPublished) {
    return `Published r.${application.latestPublished.revisionNumber}`;
  }
  return application.latestDraft
    ? `Draft r.${application.latestDraft.revisionNumber}`
    : "Application created";
}

const sectionStyle = {
  border: "1px solid var(--line, #d8ddd8)",
  borderRadius: 14,
  background: "var(--panel, #fff)",
  padding: 18,
} as const;

function ApplicationCard({
  application,
  compiling,
  onCompile,
  onOpen,
}: {
  readonly application: WorkbenchApplicationSummary;
  readonly compiling: boolean;
  readonly onCompile: (applicationKey: string) => void;
  readonly onOpen: (applicationKey: string) => void;
}) {
  const canCompile = application.latestPublished !== null;
  const failed = application.latestCompilation?.status === "failed";
  return (
    <article
      style={{
        border: `1px solid ${failed ? "#bf665d" : "var(--line, #d8ddd8)"}`,
        borderRadius: 12,
        padding: 14,
        display: "grid",
        gap: 10,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <div>
          <strong>{application.name}</strong>
          <div style={{ fontSize: 13, color: "var(--muted, #66706a)" }}>
            <CircleDot size={13} aria-hidden="true" />{" "}
            {lifecycleLabel(application)}
          </div>
        </div>
        <span>
          {application.goldenAssetMaturity.goldenAssets} /{" "}
          {application.goldenAssetMaturity.totalAssets} Golden assets
        </span>
      </div>
      {failed && (
        <p role="alert" style={{ margin: 0, color: "#a33f36" }}>
          <AlertTriangle size={15} aria-hidden="true" /> Needs attention ·
          latest compilation failed
        </p>
      )}
      <div style={{ display: "flex", gap: 8 }}>
        <button
          aria-label={`Open ${application.name}`}
          className="quiet-button"
          onClick={() => onOpen(application.key)}
          type="button"
        >
          Open <ArrowRight size={14} />
        </button>
        <button
          aria-label={`Compile ${application.name}`}
          className="compile-button"
          disabled={!canCompile || compiling}
          onClick={() => onCompile(application.key)}
          title={
            canCompile
              ? "Compile the latest Published revision."
              : "Publish this application before compiling."
          }
          type="button"
        >
          <Code2 size={14} /> {compiling ? "Queueing…" : "Compile"}
        </button>
      </div>
    </article>
  );
}

export function WorkbenchHome({
  applications,
  loading,
  compilingKey = null,
  onCreate,
  onOpen,
  onCompile,
}: Props) {
  const recent = [...applications]
    .sort((left, right) =>
      activityTime(right).localeCompare(activityTime(left)),
    )
    .slice(0, 5);
  const knownProfiles = new Set(
    profileStarterOptions.map((profile) => profile.profile),
  );
  const applicationGroups = [
    ...profileStarterOptions.map((profile) => ({
      id: profile.profile,
      label: profile.label,
      applications: applications.filter(
        (application) => application.compositionProfile === profile.profile,
      ),
    })),
    {
      id: "custom",
      label: "Custom Profile",
      applications: applications.filter(
        (application) =>
          !application.compositionProfile ||
          !knownProfiles.has(
            application.compositionProfile as (typeof profileStarterOptions)[number]["profile"],
          ),
      ),
    },
  ].filter((group) => group.applications.length > 0);

  return (
    <div
      aria-label="Workbench Home"
      style={{ display: "grid", gap: 18, width: "100%", alignContent: "start" }}
    >
      <section
        style={{
          ...sectionStyle,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 20,
          background:
            "linear-gradient(120deg, var(--panel, #fff), rgba(121, 133, 121, 0.08))",
        }}
      >
        <div>
          <p className="eyebrow">
            <span /> Application portfolio
          </p>
          <h2 style={{ margin: "4px 0 6px", fontSize: "1.45rem" }}>
            Build from a verified Profile
          </h2>
          <p style={{ margin: 0, color: "var(--muted, #66706a)" }}>
            Open a Draft, publish an immutable revision, then compile it.
          </p>
        </div>
        <button
          aria-label="Create a new application"
          className="new-application-button"
          onClick={onCreate}
          type="button"
        >
          <Plus size={15} /> New application
        </button>
      </section>

      <section aria-labelledby="home-profiles" style={sectionStyle}>
        <h2 id="home-profiles" style={{ marginTop: 0 }}>
          Profiles
        </h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 12,
          }}
        >
          {profileStarterOptions.map((profile) => {
            const composition = getProfileComposition(profile.profile);
            const capabilities = [
              ...composition.requiredCapabilities,
              ...composition.optionalCapabilities,
            ];
            const projectCount = applications.filter(
              (application) =>
                application.compositionProfile === profile.profile,
            ).length;
            return (
              <article
                key={profile.profile}
                style={{
                  border: "1px solid var(--line, #d8ddd8)",
                  borderRadius: 12,
                  padding: 14,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 10,
                  }}
                >
                  <h3 style={{ margin: 0, fontSize: "1rem" }}>
                    {profile.label}
                  </h3>
                  <span title="Golden Profile">
                    <CheckCircle2 size={16} aria-hidden="true" /> Golden
                  </span>
                </div>
                <p style={{ color: "var(--muted, #66706a)" }}>
                  {profile.description}
                </p>
                <p style={{ fontSize: 13 }}>
                  <Layers3 size={14} aria-hidden="true" /> {capabilities.length}{" "}
                  capabilities · {projectCount} applications
                </p>
                <small>
                  {capabilities.map((item) => item.name).join(" · ")}
                </small>
              </article>
            );
          })}
        </div>
      </section>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 2fr) minmax(240px, 1fr)",
          gap: 18,
        }}
      >
        <section aria-labelledby="home-applications" style={sectionStyle}>
          <h2 id="home-applications" style={{ marginTop: 0 }}>
            Applications
          </h2>
          {loading ? (
            <p role="status">Loading local applications…</p>
          ) : applications.length === 0 ? (
            <p>No applications yet. Start from a Golden Profile.</p>
          ) : (
            <div style={{ display: "grid", gap: 16 }}>
              {applicationGroups.map((group) => (
                <section key={group.id} aria-label={`${group.label} projects`}>
                  <h3 style={{ margin: "0 0 8px", fontSize: "0.95rem" }}>
                    {group.label} projects
                  </h3>
                  <div style={{ display: "grid", gap: 10 }}>
                    {group.applications.map((application) => (
                      <ApplicationCard
                        application={application}
                        compiling={compilingKey === application.key}
                        key={application.id}
                        onCompile={onCompile}
                        onOpen={onOpen}
                      />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </section>

        <section aria-labelledby="home-activity" style={sectionStyle}>
          <h2 id="home-activity" style={{ marginTop: 0 }}>
            Recent activity
          </h2>
          {recent.length === 0 ? (
            <p>No local activity yet.</p>
          ) : (
            <ol style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {recent.map((application) => (
                <li
                  key={application.id}
                  style={{
                    borderBottom: "1px solid var(--line, #d8ddd8)",
                    padding: "10px 0",
                  }}
                >
                  <strong>{application.name}</strong>
                  <div style={{ fontSize: 13 }}>
                    <Clock3 size={13} aria-hidden="true" />{" "}
                    {activityLabel(application)}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </div>
  );
}

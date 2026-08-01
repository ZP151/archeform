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
import {
  toPortfolioHomeModel,
  type PortfolioMetric,
  type ProfileCoverageHomeModel,
  type ProfileReadinessHomeModel,
} from "../lib/portfolio-summary";
import type { WorkbenchWorkspacePortfolioSummary } from "../lib/control-plane-client";

type Props = {
  readonly applications: readonly WorkbenchApplicationSummary[];
  readonly loading: boolean;
  readonly portfolioLoading?: boolean;
  readonly portfolioSummary?: WorkbenchWorkspacePortfolioSummary | null;
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

function PortfolioMetricPanel({
  title,
  metrics,
}: {
  readonly title: string;
  readonly metrics: readonly PortfolioMetric[];
}) {
  return (
    <section
      aria-label={title}
      style={{
        border: "1px solid var(--line, #d8ddd8)",
        borderRadius: 12,
        padding: 14,
        display: "grid",
        gap: 12,
      }}
    >
      <h3 style={{ margin: 0, fontSize: "0.95rem" }}>{title}</h3>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
          gap: 10,
        }}
      >
        {metrics.map((metric) => (
          <div key={metric.label} style={{ display: "grid", gap: 2 }}>
            <span
              style={{
                color:
                  metric.tone === "attention"
                    ? "#a33f36"
                    : metric.tone === "ready"
                      ? "var(--accent, #0b7a68)"
                      : "var(--muted, #66706a)",
                fontSize: 12,
              }}
            >
              {metric.label}
            </span>
            <strong style={{ fontSize: "1.15rem" }}>{metric.value}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}

function ProfileReadinessPanel({
  readiness,
}: {
  readonly readiness: ProfileReadinessHomeModel;
}) {
  const metrics = [
    {
      label: "Available",
      value: readiness.available,
      icon: <CheckCircle2 size={13} aria-hidden="true" />,
      color: "var(--accent, #0b7a68)",
    },
    {
      label: "Partial",
      value: readiness.partial,
      icon: <CircleDot size={13} aria-hidden="true" />,
      color: "var(--muted, #66706a)",
    },
    {
      label: "Planned",
      value: readiness.planned,
      icon: <Clock3 size={13} aria-hidden="true" />,
      color: "var(--muted, #66706a)",
    },
    {
      label: "Provider",
      value: readiness.providerRequired,
      icon: <Layers3 size={13} aria-hidden="true" />,
      color: "var(--muted, #66706a)",
    },
  ];
  return (
    <article
      aria-label={`${readiness.label} readiness`}
      style={{
        border: "1px solid var(--line, #d8ddd8)",
        borderRadius: 12,
        padding: 14,
        display: "grid",
        gap: 12,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
        <strong>{readiness.label}</strong>
        <span
          style={{ color: "var(--muted, #66706a)", fontSize: 12 }}
          title="Generated targets"
        >
          {readiness.generatedTargetCount} targets
        </span>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {metrics.map((metric) => (
          <span
            key={metric.label}
            style={{
              alignItems: "center",
              color: metric.color,
              display: "inline-flex",
              fontSize: 12,
              gap: 4,
            }}
          >
            {metric.icon}
            {metric.label} {metric.value}
          </span>
        ))}
      </div>
    </article>
  );
}

function CapabilitySupplyPanel({
  supply,
}: {
  readonly supply: ReturnType<typeof toPortfolioHomeModel>["supply"];
}) {
  return (
    <section aria-labelledby="home-capability-supply" style={sectionStyle}>
      <div
        style={{ display: "flex", justifyContent: "space-between", gap: 12 }}
      >
        <h2 id="home-capability-supply" style={{ margin: 0 }}>
          Capability supply
        </h2>
        <span style={{ color: "var(--muted, #66706a)", fontSize: 13 }}>
          Read-only queue
        </span>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
          gap: 10,
          marginTop: 14,
        }}
      >
        {supply.map((family) => (
          <article
            aria-label={`${family.key} supply`}
            key={family.key}
            style={{
              border: "1px solid var(--line, #d8ddd8)",
              borderRadius: 10,
              padding: 12,
            }}
          >
            <strong>{family.key}</strong>
            <div
              style={{
                color: "var(--muted, #66706a)",
                fontSize: 12,
                marginTop: 5,
              }}
            >
              {family.action} · {family.discovery} discovered
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function ProfileCoveragePanel({
  coverage,
}: {
  readonly coverage: readonly ProfileCoverageHomeModel[];
}) {
  return (
    <section aria-labelledby="home-profile-coverage" style={sectionStyle}>
      <div
        style={{ display: "flex", justifyContent: "space-between", gap: 12 }}
      >
        <h2 id="home-profile-coverage" style={{ margin: 0 }}>
          Profile coverage
        </h2>
        <span style={{ color: "var(--muted, #66706a)", fontSize: 13 }}>
          Reusable foundation
        </span>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
          gap: 10,
          marginTop: 14,
        }}
      >
        {coverage.map((item) => (
          <article
            aria-label={`${item.label} coverage`}
            key={item.id}
            style={{
              border: "1px solid var(--line, #d8ddd8)",
              borderRadius: 10,
              padding: 12,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 8,
              }}
            >
              <strong>{item.label}</strong>
              <span style={{ color: "var(--muted, #66706a)", fontSize: 12 }}>
                {item.status === "provider-required"
                  ? "Provider"
                  : item.status[0].toUpperCase() + item.status.slice(1)}
              </span>
            </div>
            <div
              style={{
                color: "var(--muted, #66706a)",
                fontSize: 12,
                marginTop: 5,
              }}
            >
              {item.packageCount} packages · {item.profileCount} profiles
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

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
  portfolioLoading = false,
  portfolioSummary = null,
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
  const portfolio = portfolioSummary
    ? toPortfolioHomeModel(portfolioSummary)
    : null;
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
            Build from verified capability packages
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

      <section aria-label="Portfolio intelligence" style={sectionStyle}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            gap: 12,
          }}
        >
          <div>
            <h2 style={{ margin: 0 }}>Portfolio intelligence</h2>
            <p style={{ margin: "4px 0 0", color: "var(--muted, #66706a)" }}>
              Current reusable assets and safe intake state.
            </p>
          </div>
          <span
            aria-label={
              portfolio
                ? "Portfolio summary ready"
                : "Portfolio summary unavailable"
            }
          >
            <CircleDot size={16} aria-hidden="true" />
          </span>
        </div>
        {portfolio ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
              gap: 12,
              marginTop: 14,
            }}
          >
            <PortfolioMetricPanel
              metrics={portfolio.capabilityMetrics}
              title="Capability coverage"
            />
            <PortfolioMetricPanel
              metrics={portfolio.intakeMetrics}
              title="Source intake"
            />
            <PortfolioMetricPanel
              metrics={portfolio.compilationMetrics}
              title="Compilation health"
            />
          </div>
        ) : (
          <p role="status" style={{ marginBottom: 0 }}>
            {portfolioLoading
              ? "Loading portfolio intelligence…"
              : "Portfolio intelligence unavailable."}
          </p>
        )}
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
                  <span title="Profile starter">
                    <CheckCircle2 size={16} aria-hidden="true" /> Starter
                  </span>
                </div>
                <p style={{ color: "var(--muted, #66706a)" }}>
                  {profile.description}
                </p>
                <p style={{ fontSize: 13 }}>
                  <Layers3 size={14} aria-hidden="true" />{" "}
                  {composition.requiredCapabilities.length} required ·{" "}
                  {composition.defaultOptionalCapabilities.length} optional ·{" "}
                  {projectCount} applications
                </p>
              </article>
            );
          })}
        </div>
      </section>

      {portfolio && <CapabilitySupplyPanel supply={portfolio.supply} />}

      {portfolio && <ProfileCoveragePanel coverage={portfolio.coverage} />}

      {portfolio && (
        <section aria-labelledby="home-profile-readiness" style={sectionStyle}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              gap: 12,
            }}
          >
            <h2 id="home-profile-readiness" style={{ margin: 0 }}>
              Profile readiness
            </h2>
            <span style={{ color: "var(--muted, #66706a)", fontSize: 13 }}>
              Package and Provider coverage
            </span>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 12,
              marginTop: 14,
            }}
          >
            {portfolio.readiness.map((readiness) => (
              <ProfileReadinessPanel key={readiness.id} readiness={readiness} />
            ))}
          </div>
        </section>
      )}

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
            <p>No applications yet. Start from a verified Profile.</p>
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

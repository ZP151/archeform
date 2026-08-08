"use client";

import { CheckCircle2, CircleDot, Clock3, Layers3 } from "lucide-react";

import type {
  CapabilityFamilyHomeModel,
  PortfolioMetric,
  ProfileCoverageHomeModel,
  ProfileReadinessHomeModel,
} from "../../lib/portfolio-summary";

/**
 * The read-only portfolio intelligence panels shared by the Library drawer
 * and the Activity sheet. All content is counts and status derived from the
 * control-plane portfolio summary; nothing here opens a flow or edits state.
 */

export function MetricPanel({
  title,
  metrics,
}: {
  readonly title: string;
  readonly metrics: readonly PortfolioMetric[];
}) {
  return (
    <section className="metric-panel" aria-label={title}>
      <h3>{title}</h3>
      <div className="metric-grid">
        {metrics.map((metric) => (
          <div className="metric-cell" key={metric.label}>
            <span className={`metric-label metric-${metric.tone}`}>
              {metric.label}
            </span>
            <strong>{metric.value}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}

export function CapabilitySupplyPanel({
  supply,
}: {
  readonly supply: readonly {
    readonly key: string;
    readonly action: string;
    readonly discovery: number;
  }[];
}) {
  if (supply.length === 0) return null;
  return (
    <section className="metric-panel" aria-label="Capability supply">
      <h3>Capability supply</h3>
      <ul className="panel-list">
        {supply.map((family) => (
          <li key={family.key}>
            <code>{family.key}</code>
            <span>
              {family.action} · {family.discovery} discovered
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function CapabilityFamilyPanel({
  families,
}: {
  readonly families: readonly CapabilityFamilyHomeModel[];
}) {
  if (families.length === 0) return null;
  return (
    <section className="metric-panel" aria-label="Verified capability packages">
      <h3>Verified capability packages</h3>
      <ul className="panel-list">
        {families.map((family) => (
          <li key={family.id}>
            <strong>{family.label}</strong>
            <span>
              v{family.version} · {family.profileCount} profiles
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function CoveragePanel({
  coverage,
}: {
  readonly coverage: readonly ProfileCoverageHomeModel[];
}) {
  if (coverage.length === 0) return null;
  return (
    <section className="metric-panel" aria-label="Profile coverage">
      <h3>Profile coverage</h3>
      <ul className="panel-list">
        {coverage.map((item) => (
          <li key={item.id}>
            <strong>{item.label}</strong>
            <span>
              {item.status[0].toUpperCase() + item.status.slice(1)} ·{" "}
              {item.packageCount} packages · {item.profileCount} profiles
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function ReadinessPanel({
  readiness,
}: {
  readonly readiness: readonly ProfileReadinessHomeModel[];
}) {
  if (readiness.length === 0) return null;
  const icons = {
    available: <CheckCircle2 size={13} aria-hidden="true" />,
    partial: <CircleDot size={13} aria-hidden="true" />,
    planned: <Clock3 size={13} aria-hidden="true" />,
    provider: <Layers3 size={13} aria-hidden="true" />,
  } as const;
  return (
    <section className="metric-panel" aria-label="Profile readiness">
      <h3>Profile readiness</h3>
      <ul className="panel-list">
        {readiness.map((item) => (
          <li key={item.id}>
            <strong>{item.label}</strong>
            <span className="readiness-counts">
              {[
                ["Available", item.available, "available"],
                ["Partial", item.partial, "partial"],
                ["Planned", item.planned, "planned"],
                ["Provider", item.providerRequired, "provider"],
              ].map(([label, value, tone]) => (
                <span
                  className={`readiness-count readiness-${tone}`}
                  key={label}
                >
                  {icons[tone as keyof typeof icons]}
                  {label} {value}
                </span>
              ))}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

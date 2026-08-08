"use client";

import { useEffect, useRef } from "react";

import type { WorkbenchWorkspacePortfolioSummary } from "../../lib/control-plane-client";
import { toPortfolioHomeModel } from "../../lib/portfolio-summary";
import {
  CapabilityFamilyPanel,
  CapabilitySupplyPanel,
  CoveragePanel,
  MetricPanel,
  ReadinessPanel,
} from "./portfolio-metrics";

type Props = {
  readonly open: boolean;
  readonly loading: boolean;
  readonly portfolio: WorkbenchWorkspacePortfolioSummary | null;
  readonly triggerRef: React.RefObject<HTMLButtonElement | null>;
  readonly onClose: () => void;
};

/**
 * The Library drawer: portfolio intelligence over the local workspace —
 * capability coverage, source intake, compilation health, capability supply,
 * verified packages, profile coverage and readiness. Read-only status views;
 * creation decisions stay on Home.
 */
export function LibraryDrawer({
  open,
  loading,
  portfolio,
  triggerRef,
  onClose,
}: Props) {
  const panelRef = useRef<HTMLElement>(null);
  const model = portfolio ? toPortfolioHomeModel(portfolio) : null;

  useEffect(() => {
    if (!open) {
      triggerRef.current?.focus();
      return;
    }
    panelRef.current?.focus();
  }, [open, triggerRef]);

  if (!open) return null;

  return (
    <aside
      className="library-drawer overlay-sheet"
      aria-label="Library"
      ref={panelRef}
      tabIndex={-1}
    >
      <div className="overlay-sheet-heading">
        <div>
          <span className="eyebrow-label">Library</span>
          <h2>Portfolio intelligence</h2>
        </div>
        <button
          className="overlay-close"
          aria-label="Close library"
          onClick={onClose}
          type="button"
        >
          ×
        </button>
      </div>
      {loading ? (
        <p role="status">Loading portfolio intelligence…</p>
      ) : !model ? (
        <p role="status">Portfolio intelligence unavailable.</p>
      ) : (
        <div className="portfolio-sections">
          <MetricPanel
            metrics={model.capabilityMetrics}
            title="Capability coverage"
          />
          <MetricPanel metrics={model.intakeMetrics} title="Source intake" />
          <MetricPanel
            metrics={model.compilationMetrics}
            title="Compilation health"
          />
          <CapabilitySupplyPanel supply={model.supply} />
          <CapabilityFamilyPanel families={model.capabilityFamilies} />
          <CoveragePanel coverage={model.coverage} />
          <ReadinessPanel readiness={model.readiness} />
        </div>
      )}
    </aside>
  );
}

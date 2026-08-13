"use client";

import { useRef, type KeyboardEvent } from "react";
import {
  Bot,
  Code2,
  Database,
  LayoutGrid,
  PanelsTopLeft,
  Rocket,
  ShieldCheck,
  Workflow,
  type LucideIcon,
} from "lucide-react";
import {
  findWorkbenchContext,
  type WorkbenchDestinationKey,
} from "@factory/workbench-ui";

import type { Surface } from "../../lib/workbench-model";

const builderSurfaceByDestination: Readonly<
  Record<Exclude<WorkbenchDestinationKey, "apps">, Surface>
> = {
  page: "page",
  data: "domain",
  workflow: "flow",
  access: "policy",
  ai: "ai",
  code: "code",
  release: "release",
};

const iconByDestination: Readonly<Record<WorkbenchDestinationKey, LucideIcon>> =
  {
    apps: LayoutGrid,
    page: PanelsTopLeft,
    data: Database,
    workflow: Workflow,
    access: ShieldCheck,
    ai: Bot,
    code: Code2,
    release: Rocket,
  };

function moveFocus(
  event: KeyboardEvent<HTMLElement>,
  orientation: "horizontal" | "vertical",
): void {
  const buttons = Array.from(
    event.currentTarget.querySelectorAll<HTMLButtonElement>("button"),
  );
  const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
  if (index === -1) return;
  const moveTo = (next: number) => buttons[next]?.focus();
  const forward = orientation === "vertical" ? "ArrowDown" : "ArrowRight";
  const backward = orientation === "vertical" ? "ArrowUp" : "ArrowLeft";
  if (event.key === forward) moveTo(Math.min(index + 1, buttons.length - 1));
  else if (event.key === backward) moveTo(Math.max(index - 1, 0));
  else if (event.key === "Home") moveTo(0);
  else if (event.key === "End") moveTo(buttons.length - 1);
  else return;
  event.preventDefault();
}

export function IconRail({
  activeSurface,
  onNavigate,
}: {
  readonly activeSurface: Surface;
  readonly onNavigate: (surface: Surface) => void;
}) {
  const navRef = useRef<HTMLElement>(null);
  const Icon = iconByDestination.apps;

  return (
    <aside className="rail">
      <nav
        className="rail-nav workspace-navigation"
        aria-label="Workspace navigation"
        onKeyDown={(event) => moveFocus(event, "vertical")}
        ref={navRef}
      >
        <button
          className={`brand-mark${activeSurface === "home" ? " is-active" : ""}`}
          aria-current={activeSurface === "home" ? "page" : undefined}
          aria-label="Apps"
          onClick={() => onNavigate("home")}
          type="button"
          title="Apps: describe or resume a product"
        >
          <Icon size={18} strokeWidth={2.1} aria-hidden="true" />
          <span>Apps</span>
        </button>
      </nav>
    </aside>
  );
}

export function BuilderNavigation({
  activeSurface,
  onNavigate,
}: {
  readonly activeSurface: Surface;
  readonly onNavigate: (surface: Surface) => void;
}) {
  const destinations = findWorkbenchContext("builder").destinations;
  return (
    <nav
      className="builder-navigation"
      aria-label="Builder navigation"
      onKeyDown={(event) => moveFocus(event, "horizontal")}
    >
      {destinations.map(({ key, label }) => {
        if (key === "apps") return null;
        const surface = builderSurfaceByDestination[key];
        const Icon = iconByDestination[key];
        const selected = activeSurface === surface;
        return (
          <button
            key={key}
            className={selected ? "is-active" : undefined}
            aria-current={selected ? "page" : undefined}
            aria-label={label}
            onClick={() => onNavigate(surface)}
            type="button"
          >
            <Icon size={15} strokeWidth={1.9} aria-hidden="true" />
            <span>{label}</span>
          </button>
        );
      })}
    </nav>
  );
}

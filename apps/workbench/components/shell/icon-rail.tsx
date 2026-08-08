"use client";

import { useRef, type KeyboardEvent } from "react";
import {
  Bot,
  Code2,
  FolderKanban,
  House,
  LayoutPanelLeft,
  ShieldCheck,
  Sparkles,
  Workflow,
  type LucideIcon,
} from "lucide-react";

import type { Surface } from "../../lib/workbench-model";

/**
 * The rail destinations that are actually implemented. Every entry renders a
 * real canvas; nothing is advertised before its behavior exists.
 */
export const RAIL_DESTINATIONS: readonly {
  readonly id: Surface;
  readonly label: string;
  readonly icon: LucideIcon;
  readonly hint: string;
}[] = [
  {
    id: "home",
    label: "Home",
    icon: House,
    hint: "Compose products and operate applications",
  },
  {
    id: "page",
    label: "Page",
    icon: LayoutPanelLeft,
    hint: "Shape the experience",
  },
  { id: "domain", label: "Domain", icon: FolderKanban, hint: "Define records" },
  { id: "flow", label: "Flow", icon: Workflow, hint: "Connect decisions" },
  { id: "policy", label: "Policy", icon: ShieldCheck, hint: "Set controls" },
  { id: "ai", label: "AI", icon: Bot, hint: "Configure intelligence" },
  { id: "code", label: "Code", icon: Code2, hint: "Inspect generated output" },
];

type Props = {
  readonly activeSurface: Surface;
  readonly onNavigate: (surface: Surface) => void;
};

/**
 * The icon rail: destinations carry icons with accessible names and tooltips;
 * the text label is visible only on the active destination. Arrow keys move
 * focus between destinations, Home and End jump to the ends.
 */
export function IconRail({ activeSurface, onNavigate }: Props) {
  const navRef = useRef<HTMLElement>(null);

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    const buttons = Array.from(
      navRef.current?.querySelectorAll<HTMLButtonElement>("button") ?? [],
    );
    const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
    if (index === -1) return;
    const moveTo = (next: number) => buttons[next]?.focus();
    switch (event.key) {
      case "ArrowDown":
        moveTo(Math.min(index + 1, buttons.length - 1));
        break;
      case "ArrowUp":
        moveTo(Math.max(index - 1, 0));
        break;
      case "Home":
        moveTo(0);
        break;
      case "End":
        moveTo(buttons.length - 1);
        break;
      default:
        return;
    }
    event.preventDefault();
  };

  return (
    <aside className="rail" aria-label="Workbench navigation">
      <button
        className="brand-mark"
        aria-label="Factory Pilot home"
        onClick={() => onNavigate("home")}
        type="button"
        title="Home"
      >
        <Sparkles size={18} strokeWidth={2.2} />
      </button>
      <nav
        className="rail-nav"
        aria-label="Workbench navigation"
        onKeyDown={handleKeyDown}
        ref={navRef}
      >
        {RAIL_DESTINATIONS.map(({ id, label, icon: Icon, hint }) => (
          <button
            key={id}
            className={`rail-item${activeSurface === id ? " is-active" : ""}`}
            onClick={() => onNavigate(id)}
            aria-current={activeSurface === id ? "page" : undefined}
            aria-label={label}
            title={`${label}: ${hint}`}
            type="button"
          >
            <Icon size={18} strokeWidth={1.8} aria-hidden="true" />
            <span>{label}</span>
          </button>
        ))}
      </nav>
    </aside>
  );
}

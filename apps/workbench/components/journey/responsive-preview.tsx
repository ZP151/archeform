"use client";

import { Monitor, Smartphone, Tablet } from "lucide-react";
import { useMemo, useState } from "react";
import type { PageModel } from "@factory/graph";
import {
  resolveExperienceDesignSystem,
  type ExperienceDesignSystemV1,
  type ExperienceModel,
} from "@factory/graph";

/**
 * The honest studio preview: the selected page rendered with the same block
 * semantics and the same `--factory-*` token variables the compiler emits
 * into the generated application. Preview CSS only consumes resolved design
 * tokens — never free values — so the preview cannot show anything the
 * compiled app would not render.
 */

export const previewViewports = [
  { key: "desktop", width: 1280, label: "Desktop" },
  { key: "tablet", width: 768, label: "Tablet" },
  { key: "mobile", width: 375, label: "Mobile" },
] as const;

export type PreviewViewportKey = (typeof previewViewports)[number]["key"];

type PageEntry = PageModel["pages"][number];
type PageBlock = PageEntry["blocks"][number];

/**
 * Mirrors the compiler's theme blocks: every token group becomes a CSS
 * variable, the colour containers become the light/dark attribute themes,
 * and the legacy alias surface stays available to preview classes.
 */
function designTokenCss(system: ExperienceDesignSystemV1): string {
  const themeBlock = (mode: "light" | "dark"): string => {
    const vars: string[] = [];
    for (const [group, tokens] of Object.entries(system.tokens)) {
      for (const [key, value] of Object.entries(
        tokens as Record<string, unknown>,
      )) {
        if (typeof value !== "string") continue;
        vars.push(`--factory-${group}-${key}: ${value};`);
      }
    }
    const colours = system.tokens.colour[mode];
    for (const [key, value] of Object.entries(colours)) {
      vars.push(`--factory-colour-${key}: ${value};`);
    }
    vars.push(
      "--factory-bg: var(--factory-colour-background);",
      "--factory-surface-muted: var(--factory-colour-surface);",
      "--factory-muted: var(--factory-colour-text-muted);",
      "--factory-accent: var(--factory-colour-brand);",
      "--factory-accent-text: var(--factory-colour-background);",
      "--factory-surface: var(--factory-colour-surface);",
      "--factory-text: var(--factory-colour-text);",
      "--factory-border: var(--factory-colour-border);",
      "--factory-danger: var(--factory-colour-danger);",
    );
    return vars.join(" ");
  };
  return `:root { ${themeBlock("light")} }
:root[data-theme="dark"] { ${themeBlock("dark")} }`;
}

function readText(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function humanize(blockType: string): string {
  return blockType
    .split("-")
    .map((word) => word.slice(0, 1).toUpperCase() + word.slice(1))
    .join(" ");
}

function PreviewBlock({ block }: { block: PageBlock }) {
  if (block.type === "hero") {
    return (
      <section className="generated-hero">
        <small>{readText(block.props?.eyebrow, "Operations")}</small>
        <h1>{readText(block.props?.heading, "Shape the next decision.")}</h1>
        <button type="button">Start a request</button>
      </section>
    );
  }
  const kind = humanize(block.type);
  return (
    <section className="generated-block">
      <small>{kind}</small>
      <h2>{readText(block.props?.title, kind)}</h2>
      <span>
        {block.entity ? `Bound to ${block.entity}` : "Declared block"}
      </span>
    </section>
  );
}

export function ResponsivePreview({
  page,
  experience,
}: {
  page: PageEntry;
  experience: ExperienceModel;
}) {
  const [viewport, setViewport] = useState<PreviewViewportKey>("desktop");
  const designSystem = useMemo(
    () => resolveExperienceDesignSystem(experience),
    [experience],
  );
  const tokenCss = useMemo(() => designTokenCss(designSystem), [designSystem]);
  const width =
    previewViewports.find((candidate) => candidate.key === viewport)?.width ??
    previewViewports[0].width;
  const theme =
    experience.theme.mode === "dark"
      ? "dark"
      : experience.theme.mode === "light"
        ? "light"
        : "light";

  return (
    <section className="responsive-preview" aria-label="Responsive preview">
      <header className="responsive-preview-heading">
        <span>Preview</span>
        <small>{page.route}</small>
        <div className="preview-viewports" role="group" aria-label="Viewport">
          {previewViewports.map((candidate) => {
            const Icon =
              candidate.key === "desktop"
                ? Monitor
                : candidate.key === "tablet"
                  ? Tablet
                  : Smartphone;
            return (
              <button
                key={candidate.key}
                type="button"
                aria-pressed={candidate.key === viewport}
                onClick={() => setViewport(candidate.key)}
              >
                <Icon size={14} />
                <span>{candidate.label}</span>
              </button>
            );
          })}
        </div>
      </header>
      <div className="preview-stage" style={{ maxWidth: width }}>
        <style>{tokenCss}</style>
        <div className="generated-app" data-theme={theme}>
          {page.blocks.map((block) => (
            <PreviewBlock key={block.id} block={block} />
          ))}
        </div>
      </div>
    </section>
  );
}

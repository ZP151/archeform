import type { ApplicationGraphV1 } from "@factory/graph";

export type GraphDiffEntry = {
  readonly scope:
    "page" | "domain" | "flow" | "policy" | "integration" | "experience";
  readonly kind: "changed";
  readonly key: string;
};

export type GraphDiff = {
  readonly changed: boolean;
  readonly entries: readonly GraphDiffEntry[];
};

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nested]) => [key, canonicalize(nested)]),
    );
  }
  return value;
}

function hasChanged(before: unknown, after: unknown) {
  return (
    JSON.stringify(canonicalize(before)) !== JSON.stringify(canonicalize(after))
  );
}

/**
 * Compares every Graph model semantically. Generated artifacts and source are
 * never used as input, so Code Studio remains Graph-first rather than
 * reverse-parsing code.
 */
export function diffApplicationGraphs(
  base: ApplicationGraphV1,
  current: ApplicationGraphV1,
): GraphDiff {
  const entries: GraphDiffEntry[] = [
    ...(hasChanged(base.page, current.page)
      ? [{ scope: "page" as const, kind: "changed" as const, key: "PageModel" }]
      : []),
    ...(hasChanged(base.domain, current.domain)
      ? [
          {
            scope: "domain" as const,
            kind: "changed" as const,
            key: "DomainModel",
          },
        ]
      : []),
    ...(hasChanged(base.flow, current.flow)
      ? [{ scope: "flow" as const, kind: "changed" as const, key: "FlowModel" }]
      : []),
    ...(hasChanged(base.policy, current.policy)
      ? [
          {
            scope: "policy" as const,
            kind: "changed" as const,
            key: "PolicyModel",
          },
        ]
      : []),
    ...(hasChanged(base.integration, current.integration)
      ? [
          {
            scope: "integration" as const,
            kind: "changed" as const,
            key: "IntegrationModel",
          },
        ]
      : []),
    ...(hasChanged(base.experience, current.experience)
      ? [
          {
            scope: "experience" as const,
            kind: "changed" as const,
            key: "ExperienceModel",
          },
        ]
      : []),
  ];

  return { changed: entries.length > 0, entries };
}

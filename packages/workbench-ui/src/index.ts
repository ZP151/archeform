import { deepFreeze, uiPrimitiveRegistry } from "@factory/ui-primitives";

export const workbenchUiBoundary = deepFreeze({
  key: "archeform-workbench",
  version: "1.0.0",
  generatedRuntimeDependency: false,
} as const);

export type WorkbenchContextKey = "workspace-home" | "builder";

export type WorkbenchDestinationKey =
  | "apps"
  | "page"
  | "data"
  | "workflow"
  | "access"
  | "experience"
  | "ai"
  | "code"
  | "release";

export type WorkbenchContextDefinition = {
  readonly key: WorkbenchContextKey;
  readonly label: string;
  readonly destinations: readonly {
    readonly key: WorkbenchDestinationKey;
    readonly label: string;
    readonly icon: string;
  }[];
};

export const workbenchContextRegistry: readonly WorkbenchContextDefinition[] =
  deepFreeze([
    {
      key: "workspace-home",
      label: "Apps",
      destinations: [{ key: "apps", label: "Apps", icon: "layout-grid" }],
    },
    {
      key: "builder",
      label: "Builder",
      destinations: [
        { key: "page", label: "Page", icon: "panels-top-left" },
        { key: "data", label: "Data", icon: "database" },
        { key: "workflow", label: "Workflow", icon: "workflow" },
        { key: "access", label: "Access", icon: "shield-check" },
        { key: "experience", label: "Experience", icon: "palette" },
        { key: "ai", label: "AI", icon: "sparkles" },
        { key: "code", label: "Code", icon: "code-2" },
        { key: "release", label: "Publish", icon: "rocket" },
      ],
    },
  ] satisfies WorkbenchContextDefinition[]);

export function findWorkbenchContext(
  key: WorkbenchContextKey,
): WorkbenchContextDefinition {
  const context = workbenchContextRegistry.find(
    (candidate) => candidate.key === key,
  );
  if (!context) throw new Error("Unknown Workbench context.");
  return context;
}

export function workbenchPrimitiveKeys(): readonly string[] {
  return uiPrimitiveRegistry.map(({ key }) => key);
}

export function assertCopyableGeneratedSource(source: string): true {
  if (/from\s+["']@factory\//.test(source) || /@factory\//.test(source)) {
    throw new Error(
      "Copyable generated source cannot contain a private workspace import.",
    );
  }
  return true;
}

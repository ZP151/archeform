import { deepFreeze, uiPrimitiveRegistry } from "@factory/ui-primitives";

export const workbenchUiBoundary = deepFreeze({
  key: "archeform-workbench",
  version: "1.0.0",
  generatedRuntimeDependency: false,
} as const);

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

import type { ApplicationGraphV1 } from "@factory/graph";

import type { GeneratedFile } from "../../core/generated-files.js";
import type {
  CompilerTargetPluginV1,
  PublishedCompilationInput,
  TargetValidationResult,
} from "../../core/target-plugin.js";

/**
 * The serializable decision record for the policy target. It projects the
 * immutable Published Graph's PolicyModel into Casbin rows and the explicit
 * model texts; the render step formats the three generated authorization
 * files deterministically.
 */
export interface PolicyPlanV1 {
  readonly apiVersion: "factory.compiler-target/v1";
  readonly policyRows: readonly string[];
  readonly modelConf: string;
  readonly policyModuleModel: string;
}

const POLICY_PATHS = [
  "api/policy/model.conf",
  "api/policy/policy.csv",
  "api/src/policy.ts",
] as const;

const MODEL_CONF =
  "[request_definition]\nr = sub, obj, act\n\n[policy_definition]\np = sub, obj, act\n\n[policy_effect]\ne = some(where (p.eft == allow))\n\n[matchers]\nm = r.sub == p.sub && r.obj == p.obj && r.act == p.act\n";

function projectPolicyRows(graph: ApplicationGraphV1): readonly string[] {
  return graph.policy.permissions.flatMap((permission) =>
    permission.actions.map(
      (action) => `p, ${permission.role}, ${permission.resource}, ${action}`,
    ),
  );
}

function buildPolicyPlan(input: PublishedCompilationInput): PolicyPlanV1 {
  return {
    apiVersion: "factory.compiler-target/v1",
    policyRows: projectPolicyRows(input.graph),
    modelConf: MODEL_CONF,
    policyModuleModel: [
      "[request_definition]",
      "r = sub, obj, act",
      "",
      "[policy_definition]",
      "p = sub, obj, act",
      "",
      "[policy_effect]",
      "e = some(where (p.eft == allow))",
      "",
      "[matchers]",
      'm = r.sub == p.sub && (r.obj == p.obj || p.obj == "*") && r.act == p.act',
    ].join("\n"),
  };
}

function renderPolicyCsv(plan: PolicyPlanV1): string {
  return `${plan.policyRows.join("\n")}\n`;
}

function renderPolicyModule(plan: PolicyPlanV1): string {
  return [
    'import { newEnforcer, newModelFromString, StringAdapter } from "casbin";',
    "",
    `const model = ${JSON.stringify(plan.policyModuleModel)};`,
    `const policy = ${JSON.stringify(renderPolicyCsv(plan))};`,
    "let enforcerPromise: ReturnType<typeof newEnforcer> | undefined;",
    "",
    "async function enforcer() {",
    "  enforcerPromise ??= newEnforcer(newModelFromString(model), new StringAdapter(policy));",
    "  return enforcerPromise;",
    "}",
    "",
    "export async function enforce(role: string, resource: string, action: string): Promise<boolean> {",
    "  return (await enforcer()).enforce(role, resource, action);",
    "}",
    "",
  ].join("\n");
}

function validatePolicyFiles(
  files: readonly GeneratedFile[],
): TargetValidationResult {
  const issues = POLICY_PATHS.filter(
    (path) => !files.some((file) => file.path === path),
  ).map((path) => ({
    target: "casbin-policy" as const,
    path,
    code: "missing.policy-file",
    message: "The policy set must contain every declared file.",
  }));
  const unexpected = files
    .filter((file) => !POLICY_PATHS.some((path) => path === file.path))
    .map((file) => ({
      target: "casbin-policy" as const,
      path: file.path,
      code: "unexpected.policy-file",
      message: "The policy set must not contain undeclared files.",
    }));
  const malformed = files
    .filter(
      (file) =>
        POLICY_PATHS.some((path) => path === file.path) &&
        ((file.path === "api/policy/model.conf" &&
          !file.content.includes("[matchers]")) ||
          (file.path === "api/policy/policy.csv" &&
            !file.content.endsWith("\n")) ||
          (file.path === "api/src/policy.ts" &&
            !file.content.includes("newEnforcer"))),
    )
    .map((file) => ({
      target: "casbin-policy" as const,
      path: file.path,
      code: "malformed.policy-file",
      message: "A policy file must keep its declared structure.",
    }));
  const allIssues = [...issues, ...unexpected, ...malformed];
  return allIssues.length === 0
    ? { ok: true }
    : { ok: false, issues: allIssues };
}

export const policyTargetPlugin: CompilerTargetPluginV1<PolicyPlanV1> = {
  apiVersion: "factory.compiler-target/v1",
  key: "casbin-policy",
  supports: () => true,
  plan: buildPolicyPlan,
  render: (plan) => [
    { path: "api/policy/model.conf", content: plan.modelConf },
    { path: "api/policy/policy.csv", content: renderPolicyCsv(plan) },
    { path: "api/src/policy.ts", content: renderPolicyModule(plan) },
  ],
  validate: validatePolicyFiles,
};

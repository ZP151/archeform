import type { PolicyModel } from "@factory/graph";

export type CasbinPolicyPreview = {
  readonly model: string;
  readonly policy: string;
  readonly rows: readonly string[];
};

const casbinModel = [
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
].join("\n");

/**
 * Mirrors the Factory compiler's Casbin projection without making the
 * Workbench a policy runtime. Enforcement remains in a generated Nest API.
 */
export function compileCasbinPolicyPreview(
  policy: PolicyModel,
): CasbinPolicyPreview {
  const rows = policy.permissions
    .flatMap((permission) =>
      permission.actions.map(
        (action) => `p, ${permission.role}, ${permission.resource}, ${action}`,
      ),
    )
    .sort((left, right) => left.localeCompare(right));
  return {
    model: casbinModel,
    policy: rows.length ? `${rows.join("\n")}\n` : "",
    rows,
  };
}

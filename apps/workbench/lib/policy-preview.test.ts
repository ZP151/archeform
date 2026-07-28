import { describe, expect, it } from "vitest";

import { compileCasbinPolicyPreview } from "./policy-preview";
import { workbenchGraph } from "./workbench-graph";

describe("compileCasbinPolicyPreview", () => {
  it("derives a deterministic Casbin model and normalized policy rows from PolicyModel", () => {
    const preview = compileCasbinPolicyPreview(workbenchGraph.policy);

    expect(preview.model).toContain("r = sub, obj, act");
    expect(preview.policy).toBe(
      "p, employee, request, create\np, employee, request, read\np, manager, request, approve\np, manager, request, read\n",
    );
    expect(preview.rows).toHaveLength(4);
  });
});

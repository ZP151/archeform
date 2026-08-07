import { describe, expect, it } from "vitest";

import {
  applyApprovedComposition,
  applyGraphDiffToDraft,
  assertPlanAgainstRequirement,
  CompositionError,
  createDraftRevision,
  hashApplicationGraph,
  hashCompositionDiff,
  hashCompositionPlan,
  hashRequirementSpec,
  parseCompositionClarification,
  parseCompositionDecision,
  parseCompositionPlan,
  type ApplicationGraphV1,
  type CompositionDecisionV1,
  type CompositionPlanV1,
  type RequirementSpecV1,
} from "../src/index.js";

const requirement: RequirementSpecV1 = {
  apiVersion: "factory.requirement-spec/v1",
  requirementId: "expense-tracking",
  outcome: "Employees submit expenses that managers review and approve.",
  actors: [
    { key: "employee", label: "Employee" },
    { key: "manager", label: "Manager" },
  ],
  domainConcepts: [{ key: "expense", label: "Expense claim" }],
  workflows: [{ key: "submit-approve", label: "Submit and approve" }],
  constraints: [],
  openQuestions: [],
  acceptanceScenarios: [
    {
      key: "submit-then-approve",
      given: "an employee with a draft",
      when: "the employee submits",
      then: "the expense reaches submitted status",
    },
  ],
};

const expenseGraph: ApplicationGraphV1 = {
  apiVersion: "factory.application-graph/v1",
  metadata: {
    id: "expense-approval",
    workspaceId: "local-workspace",
    name: "Expense approval",
  },
  page: {
    pages: [
      {
        id: "expense-list",
        route: "/expenses",
        title: "Expenses",
        blocks: [
          { id: "expense-table", type: "data-table", entity: "expense" },
        ],
      },
    ],
    navigation: [{ id: "expenses", label: "Expenses", pageId: "expense-list" }],
  },
  domain: {
    entities: [
      {
        key: "expense",
        label: "Expense",
        fields: [
          { key: "amount", type: "decimal", required: true },
          { key: "status", type: "enum", required: true },
        ],
        indexes: [{ fields: ["status"] }],
      },
    ],
    relations: [],
  },
  policy: {
    roles: ["employee", "manager"],
    permissions: [
      { role: "employee", resource: "expense", actions: ["create", "read"] },
      { role: "manager", resource: "expense", actions: ["read", "approve"] },
    ],
  },
  flow: {
    flows: [
      {
        id: "expense-approval",
        entity: "expense",
        initialState: "draft",
        states: ["draft", "submitted", "approved", "rejected"],
        events: ["submit", "approve", "reject"],
        transitions: [
          { from: "draft", event: "submit", to: "submitted" },
          {
            from: "submitted",
            event: "approve",
            to: "approved",
            roles: ["manager"],
          },
        ],
      },
    ],
  },
  integration: {
    providers: [],
    capabilities: [
      { key: "core.workflow", providerId: "factory", operation: "advance" },
    ],
  },
  experience: {
    theme: { mode: "system", tokens: {} },
    locales: ["en"],
  },
};

const draft = createDraftRevision(expenseGraph, "expense-approval");

function planFixture(): CompositionPlanV1 {
  return {
    apiVersion: "factory.composition-plan/v1",
    planId: "expense-plan-1",
    requirementChecksum: hashRequirementSpec(requirement),
    draftBaseChecksum: hashApplicationGraph(draft.graph),
    capabilityLocks: [
      {
        key: "core.workflow",
        version: "1.1.0",
        manifestDigest:
          "sha256:1111111111111111111111111111111111111111111111111111111111111111",
      },
    ],
    graphBindings: [
      {
        capabilityKey: "core.workflow",
        inputKey: "subjectEntity",
        graphSymbol: "graph.domain.expense",
      },
    ],
    outputSlots: [
      {
        capabilityKey: "core.workflow",
        slot: "flow",
        surface: "flow",
      },
    ],
    dependencyGraph: [],
    compatibility: {
      result: "compatible",
      reasons: ["core.workflow is compatible with the expense Draft."],
    },
    risks: [],
    assumptions: ["Expense amounts are decimals."],
    complexity: "low",
    acceptanceJourneys: [
      {
        key: "submit-then-approve",
        description: "Employee submits; manager approves.",
      },
    ],
    explanation:
      "core.workflow drives the declared submit/approve state machine over the expense entity.",
    proposedOperations: [
      {
        op: "add",
        path: "/flow/flows/0/transitions/-",
        value: { from: "submitted", event: "reject", to: "rejected" },
      },
    ],
  };
}

const safeDiff = {
  apiVersion: "factory.graph-diff/v1",
  operations: planFixture().proposedOperations,
};

function approvedDecision(plan: CompositionPlanV1): CompositionDecisionV1 {
  return {
    apiVersion: "factory.composition-decision/v1",
    decisionId: "expense-decision-1",
    draftId: draft.id,
    planChecksum: hashCompositionPlan(plan),
    diffChecksum: hashCompositionDiff(safeDiff),
    reviewer: "reviewer-a",
    decision: "approved",
    rationale: "Plan and Diff are consistent with the requirement.",
    decidedAt: "2026-08-08T00:00:00.000Z",
  };
}

describe("CompositionPlanV1", () => {
  it("parses a complete plan bound to a requirement and Draft", () => {
    const plan = parseCompositionPlan(planFixture());
    expect(plan.planId).toBe("expense-plan-1");
  });

  it("rejects a mutable asset lock without a manifest digest", () => {
    const { manifestDigest: _digest, ...mutableLock } =
      planFixture().capabilityLocks[0];
    expect(() =>
      parseCompositionPlan({
        ...planFixture(),
        capabilityLocks: [mutableLock],
      }),
    ).toThrow(CompositionError);
  });

  it("rejects package paths and URLs in lock keys and text", () => {
    expect(() =>
      parseCompositionPlan({
        ...planFixture(),
        capabilityLocks: [
          {
            key: "packages/core/workflow",
            version: "1.1.0",
            manifestDigest:
              "sha256:1111111111111111111111111111111111111111111111111111111111111111",
          },
        ],
      }),
    ).toThrow(CompositionError);
    expect(() =>
      parseCompositionPlan({
        ...planFixture(),
        explanation: "Fetch pricing from https://pricing.example.com.",
      }),
    ).toThrow(CompositionError);
  });

  it("rejects duplicate graph bindings for the same capability input", () => {
    const bindings = planFixture().graphBindings;
    expect(() =>
      parseCompositionPlan({
        ...planFixture(),
        graphBindings: [...bindings, bindings[0]],
      }),
    ).toThrow(CompositionError);
  });

  it("rejects output slots for a capability that is not locked", () => {
    expect(() =>
      parseCompositionPlan({
        ...planFixture(),
        outputSlots: [
          { capabilityKey: "core.crud", slot: "crud", surface: "api" },
        ],
      }),
    ).toThrow(CompositionError);
  });

  it("rejects a stale requirement checksum at binding time", () => {
    const plan = parseCompositionPlan({
      ...planFixture(),
      requirementChecksum:
        "sha256:0000000000000000000000000000000000000000000000000000000000000000",
    });
    expect(() => assertPlanAgainstRequirement(plan, requirement)).toThrow(
      CompositionError,
    );
  });

  it("rejects bindings whose Graph symbols do not exist in the base Draft", () => {
    const plan = parseCompositionPlan({
      ...planFixture(),
      graphBindings: [
        {
          capabilityKey: "core.workflow",
          inputKey: "subjectEntity",
          graphSymbol: "graph.domain.nonexistent",
        },
      ],
    });
    expect(() =>
      applyApprovedComposition(approvedDecision(plan), plan, draft, safeDiff),
    ).toThrow(CompositionError);
  });

  it("parses a bounded clarification set", () => {
    const clarification = parseCompositionClarification({
      apiVersion: "factory.composition-clarification/v1",
      requirementChecksum: hashRequirementSpec(requirement),
      questions: [
        { key: "currency", question: "Which currency do expenses use?" },
      ],
    });
    expect(clarification.questions).toHaveLength(1);
  });

  it("hashes canonically regardless of object key order", () => {
    const plan = planFixture();
    const first = hashCompositionPlan(plan);
    const reordered: unknown = {
      acceptanceJourneys: plan.acceptanceJourneys,
      apiVersion: plan.apiVersion,
      assumptions: plan.assumptions,
      capabilityLocks: plan.capabilityLocks,
      compatibility: plan.compatibility,
      complexity: plan.complexity,
      dependencyGraph: plan.dependencyGraph,
      draftBaseChecksum: plan.draftBaseChecksum,
      explanation: plan.explanation,
      graphBindings: plan.graphBindings,
      outputSlots: plan.outputSlots,
      planId: plan.planId,
      proposedOperations: plan.proposedOperations,
      requirementChecksum: plan.requirementChecksum,
      risks: plan.risks,
    };
    expect(hashCompositionPlan(reordered)).toBe(first);
  });
});

describe("CompositionDecisionV1 and Draft-only application", () => {
  it("applies an approved plan-bound Diff to a mutable Draft", () => {
    const plan = parseCompositionPlan(planFixture());
    const decision = approvedDecision(plan);
    const next = applyApprovedComposition(decision, plan, draft, safeDiff);
    expect(next.revision).toBe(draft.revision + 1);
    expect(next.graph.flow.flows[0].transitions).toHaveLength(3);
  });

  it("rejects an unapproved decision", () => {
    const plan = parseCompositionPlan(planFixture());
    const decision = { ...approvedDecision(plan), decision: "rejected" };
    expect(() =>
      applyApprovedComposition(decision, plan, draft, safeDiff),
    ).toThrow(CompositionError);
  });

  it("rejects an altered plan checksum", () => {
    const plan = parseCompositionPlan(planFixture());
    const decision = {
      ...approvedDecision(plan),
      planChecksum:
        "sha256:9999999999999999999999999999999999999999999999999999999999999999",
    };
    expect(() =>
      applyApprovedComposition(decision, plan, draft, safeDiff),
    ).toThrow(CompositionError);
  });

  it("rejects a diff whose checksum does not match the decision", () => {
    const plan = parseCompositionPlan(planFixture());
    const tampered = {
      apiVersion: "factory.graph-diff/v1",
      operations: [{ op: "remove", path: "/flow/flows/0/transitions/0" }],
    };
    expect(() =>
      applyApprovedComposition(approvedDecision(plan), plan, draft, tampered),
    ).toThrow(CompositionError);
  });

  it("refuses a non-Draft base revision even with matching checksums", () => {
    const plan = parseCompositionPlan(planFixture());
    const published = { ...draft, status: "published" as const };
    expect(() =>
      applyApprovedComposition(
        approvedDecision(plan),
        plan,
        published,
        safeDiff,
      ),
    ).toThrow(CompositionError);
  });

  it("refuses a stale Draft whose graph hash drifted", () => {
    const plan = parseCompositionPlan(planFixture());
    const drifted = applyGraphDiffToDraft(draft, {
      apiVersion: "factory.graph-diff/v1",
      operations: [
        { op: "replace", path: "/metadata/name", value: "Renamed expense" },
      ],
    });
    expect(() =>
      applyApprovedComposition(approvedDecision(plan), plan, drifted, safeDiff),
    ).toThrow(CompositionError);
  });

  it("rejects unsafe operations outside the plan's declared Diff", () => {
    const plan = parseCompositionPlan(planFixture());
    const unsafe = {
      apiVersion: "factory.graph-diff/v1",
      operations: [
        { op: "replace", path: "/integration/assetLocks", value: [] },
      ],
    };
    expect(() =>
      applyApprovedComposition(approvedDecision(plan), plan, draft, unsafe),
    ).toThrow(CompositionError);
  });

  // The plan-level guard fires during parse, so the bad operation must ride
  // inside the plan's own proposedOperations (an apply-level check would be
  // masked by the decision checksum binding).
  it("rejects a plan whose proposedOperations rewrite the whole integration subtree", () => {
    expect(() =>
      parseCompositionPlan({
        ...planFixture(),
        proposedOperations: [
          {
            op: "replace",
            path: "/integration",
            value: {
              providers: [],
              capabilities: [],
              assetLocks: [
                {
                  key: "core.workflow",
                  version: "2.0.0",
                  packageRoot:
                    "packages/capabilities/assets/core.workflow/2.0.0",
                  manifestDigest:
                    "sha256:2222222222222222222222222222222222222222222222222222222222222222",
                  lifecycle: "golden",
                },
              ],
              compositionProfile: "expense-approval",
            },
          },
        ],
      }),
    ).toThrow(CompositionError);
  });

  it("rejects a plan whose proposedOperations remove the integration root", () => {
    expect(() =>
      parseCompositionPlan({
        ...planFixture(),
        proposedOperations: [{ op: "remove", path: "/integration" }],
      }),
    ).toThrow(CompositionError);
  });

  it("rejects an escaped ~1__proto__ add path after pointer decoding", () => {
    expect(() =>
      parseCompositionPlan({
        ...planFixture(),
        proposedOperations: [
          { op: "add", path: "/page/~1__proto__", value: { injected: true } },
        ],
      }),
    ).toThrow(CompositionError);
  });

  it("rejects case variants of prototype keys in operation paths", () => {
    for (const path of [
      "/page/Constructor",
      "/page/PROTOTYPE",
      "/page/~1__PROTO__",
      "/flow/Prototype",
    ]) {
      expect(() =>
        parseCompositionPlan({
          ...planFixture(),
          proposedOperations: [{ op: "add", path, value: { injected: true } }],
        }),
      ).toThrow(CompositionError);
    }
  });

  it("rejects prototype-key material in business text but keeps natural prose", () => {
    for (const payload of [
      "__proto__",
      "constructor",
      "prototype",
      "Constructor",
      "constructor ",
      " prototype",
    ]) {
      expect(() =>
        parseCompositionPlan({
          ...planFixture(),
          explanation: payload,
        }),
      ).toThrow(CompositionError);
    }
    expect(() =>
      parseCompositionPlan({
        ...planFixture(),
        explanation: "Reference __proto__ is never legitimate.",
      }),
    ).toThrow(CompositionError);
    expect(
      parseCompositionPlan({
        ...planFixture(),
        explanation: "The prototype journey was reviewed.",
      }).explanation,
    ).toBe("The prototype journey was reviewed.");
  });

  it("rejects www-prefixed domains while keeping bare placeholder domains", () => {
    for (const payload of [
      "See www.example.com for the ledger policy.",
      "See WWW.example.com for the ledger policy.",
      "Hosted at (www.example.com) behind a proxy.",
      "Mirror;www.x.com hosts the report.",
    ]) {
      expect(() =>
        parseCompositionPlan({
          ...planFixture(),
          explanation: payload,
        }),
      ).toThrow(CompositionError);
    }
    for (const payload of [
      "See example.com for the ledger policy.",
      "bwww.example.com hosts the report.",
    ]) {
      expect(
        parseCompositionPlan({
          ...planFixture(),
          explanation: payload,
        }).explanation,
      ).toBe(payload);
    }
  });

  it("rejects a Diff with an operation the plan never declared", () => {
    const plan = parseCompositionPlan(planFixture());
    const undeclared = {
      apiVersion: "factory.graph-diff/v1",
      operations: [
        ...safeDiff.operations,
        { op: "replace", path: "/metadata/name", value: "Renamed" },
      ],
    };
    expect(() =>
      applyApprovedComposition(approvedDecision(plan), plan, draft, undeclared),
    ).toThrow(CompositionError);
  });

  it("rejects an altered decidedAt in the persisted decision record", () => {
    expect(() =>
      parseCompositionDecision({
        ...approvedDecision(parseCompositionPlan(planFixture())),
        decidedAt: "not-a-date",
      }),
    ).toThrow(CompositionError);
  });

  it("rejects a plan whose operation value carries a URL or www host", () => {
    for (const value of [
      {
        from: "submitted",
        event: "reject",
        to: "rejected",
        callbackUrl: "https://evil.example.com/ingest",
      },
      {
        from: "submitted",
        event: "reject",
        to: "rejected",
        nested: { link: "https://evil.example.com" },
      },
      {
        from: "submitted",
        event: "reject",
        to: "rejected",
        site: "www.example.com",
      },
    ]) {
      expect(() =>
        parseCompositionPlan({
          ...planFixture(),
          proposedOperations: [
            { op: "add", path: "/flow/flows/0/transitions/-", value },
          ],
        }),
      ).toThrow(CompositionError);
    }
  });

  it("rejects a Diff whose operation value carries unsafe material when hashed", () => {
    expect(() =>
      hashCompositionDiff({
        apiVersion: "factory.graph-diff/v1",
        operations: [
          {
            op: "add",
            path: "/flow/flows/0/transitions/-",
            value: {
              from: "submitted",
              event: "reject",
              to: "rejected",
              ingest: "https://evil.example.com",
            },
          },
        ],
      }),
    ).toThrow(CompositionError);
  });

  it("keeps clean operation values through plan parse and Diff hash", () => {
    const plan = parseCompositionPlan(planFixture());
    expect(plan.proposedOperations[0].value).toEqual({
      from: "submitted",
      event: "reject",
      to: "rejected",
    });
    expect(hashCompositionDiff(safeDiff)).toMatch(/^sha256:[a-f0-9]{64}$/);
  });

  it("rejects unsafe material on a later line of a multi-line value leaf", () => {
    // The value scan must look past the first newline (RV-1): a URL or
    // prototype token on a later line is still material.
    for (const value of [
      "ok\ncallback https://evil.example.com",
      "first line\nsecond line\nwww.evil.example.com",
      "line one\n__proto__",
    ]) {
      expect(() =>
        parseCompositionPlan({
          ...planFixture(),
          proposedOperations: [
            { op: "add", path: "/flow/flows/0/transitions/-", value },
          ],
        }),
      ).toThrow(CompositionError);
    }
    // Clean multi-line prose stays allowed.
    expect(
      parseCompositionPlan({
        ...planFixture(),
        proposedOperations: [
          {
            op: "add",
            path: "/flow/flows/0/transitions/-",
            value: "first line\nsecond line",
          },
        ],
      }).proposedOperations[0].value,
    ).toBe("first line\nsecond line");
  });

  it("rejects unsafe material on a later line of multi-line business text", () => {
    expect(() =>
      parseCompositionPlan({
        ...planFixture(),
        explanation: "Reviewed the flow.\nSee https://evil.example.com/ingest.",
      }),
    ).toThrow(CompositionError);
  });

  it("rejects prototype-key and URL material as object keys inside a value", () => {
    // The scan must test object keys, not only string leaves (RV-2).
    // `__proto__` is built via JSON.parse: a literal would set the object's
    // prototype instead of creating an own enumerable key.
    const values = [
      JSON.parse(
        '{"from":"submitted","event":"reject","to":"rejected","__proto__":{}}',
      ),
      { from: "submitted", event: "reject", to: "rejected", constructor: {} },
      {
        from: "submitted",
        nested: { prototype: { injected: true } },
        to: "rejected",
      },
      { from: "submitted", "https://evil.example.com": "ingest", to: "x" },
    ];
    for (const value of values) {
      expect(() =>
        parseCompositionPlan({
          ...planFixture(),
          proposedOperations: [
            { op: "add", path: "/flow/flows/0/transitions/-", value },
          ],
        }),
      ).toThrow(CompositionError);
    }
  });

  it("never echoes the offending key material in a rejection message", () => {
    // The message may name the container, but never the material itself
    // (NEW-1): a `__proto__` key or a full URL key must not appear verbatim.
    function messageFor(value: unknown): string {
      try {
        parseCompositionPlan({
          ...planFixture(),
          proposedOperations: [
            { op: "add", path: "/flow/flows/0/transitions/-", value },
          ],
        });
      } catch (error) {
        return error instanceof Error ? error.message : String(error);
      }
      throw new Error("expected the plan to be rejected");
    }

    const message = messageFor(JSON.parse('{"__proto__":{"x":1}}'));
    expect(message).toMatch(/carries unsafe material/);
    expect(message).not.toContain("__proto__");

    const urlMessage = messageFor({ "https://evil.example.com": "ingest" });
    expect(urlMessage).toMatch(/carries unsafe material/);
    expect(urlMessage).not.toContain("https://evil.example.com");
  });
});

describe("Composition Diff path material and rejection non-echo", () => {
  it("rejects a URL embedded in an operation path without echoing it", () => {
    // QA-1: the value scan never covered path strings, so a URL inside a Diff
    // path persisted through the seam. The path is offending material: it must
    // fail closed with a fixed message that never echoes the path or URL.
    for (const path of [
      "/page/0/https://evil.example.com/ingest",
      "/https://evil.example.com/ingest",
    ]) {
      let message = "";
      try {
        parseCompositionPlan({
          ...planFixture(),
          proposedOperations: [
            { op: "replace", path, value: { title: "clean" } },
          ],
        });
      } catch (error) {
        message = error instanceof Error ? error.message : String(error);
      }
      expect(message).toMatch(/Composition Diff paths cannot carry/);
      expect(message).not.toContain("https://evil.example.com");
      expect(message).not.toContain(path);
    }
  });

  it("rejects a Windows drive root embedded in an operation path", () => {
    expect(() =>
      parseCompositionPlan({
        ...planFixture(),
        proposedOperations: [
          { op: "add", path: "/C:/windows/system32/x", value: "clean" },
        ],
      }),
    ).toThrow(CompositionError);
  });

  it("rejects URL material in a Diff path when hashed", () => {
    expect(() =>
      hashCompositionDiff({
        apiVersion: "factory.graph-diff/v1",
        operations: [
          {
            op: "replace",
            path: "/page/0/https://evil.example.com/ingest",
            value: { title: "clean" },
          },
        ],
      }),
    ).toThrow(CompositionError);
  });

  it("keeps clean Diff paths through plan parse and Diff hash", () => {
    // The path scan must never reject legitimate Graph pointers: they always
    // start with `/` and carry no scheme, drive root, or host material.
    for (const path of [
      "/page/0",
      "/domain/entities/0/fields/-",
      "/flow/flows/0/transitions/-",
      "/metadata/name",
      "/experience/theme/mode",
    ]) {
      const plan = {
        ...planFixture(),
        proposedOperations: [{ op: "replace", path, value: { ok: true } }],
      };
      expect(() => parseCompositionPlan(plan)).not.toThrow();
      expect(() =>
        hashCompositionDiff({
          apiVersion: "factory.graph-diff/v1",
          operations: plan.proposedOperations,
        }),
      ).not.toThrow();
    }
  });

  it("never echoes an unrecognized plan key in a rejection message", () => {
    // QA-2(a): zod strict's unknown-key message names each offending key
    // verbatim. The rejection must name the container only.
    let message = "";
    try {
      parseCompositionPlan({
        ...planFixture(),
        risks: [
          { key: "risk-1", level: "low", description: "clean", smuggled: "x" },
        ],
      });
    } catch (error) {
      message = error instanceof Error ? error.message : String(error);
    }
    expect(message).toMatch(/Composition record is invalid at 'risks\.0'/);
    expect(message).not.toContain("smuggled");

    // A `__proto__` own key (JSON.parse-built, so it is an own property, not
    // the object prototype) must likewise never appear in the message.
    message = "";
    try {
      parseCompositionPlan({
        ...planFixture(),
        risks: [
          JSON.parse(
            '{"key":"risk-1","level":"low","description":"clean","__proto__":{"x":1}}',
          ),
        ],
      });
    } catch (error) {
      message = error instanceof Error ? error.message : String(error);
    }
    expect(message).not.toContain("__proto__");
  });

  it("never echoes a received value in an enum rejection message", () => {
    // zod's invalid-enum message names the received value verbatim; that is
    // material and must be replaced by a fixed detail.
    let message = "";
    try {
      parseCompositionPlan({
        ...planFixture(),
        complexity: "https://evil.example.com",
      });
    } catch (error) {
      message = error instanceof Error ? error.message : String(error);
    }
    expect(message).toMatch(/Composition record is invalid at 'complexity'/);
    expect(message).not.toContain("https://evil.example.com");
  });

  it("reports an outside-root path without echoing the path", () => {
    // QA-2(b): the mutable-root rejection previously quoted the whole path,
    // which can carry the very material it rejects. The message names the
    // failure class only.
    let message = "";
    try {
      parseCompositionPlan({
        ...planFixture(),
        proposedOperations: [
          { op: "add", path: "/published/0", value: "clean" },
        ],
      });
    } catch (error) {
      message = error instanceof Error ? error.message : String(error);
    }
    expect(message).toBe(
      "Composition Diff path is outside the mutable Application Graph.",
    );
    expect(message).not.toContain("/published/0");
  });
});

describe("Composition Diff escaped path material (QA-4-1)", () => {
  // QA-4-1: `~1`-escaped material decodes to a URL after the raw string
  // scan, so `/experience/theme/tokens/https:~1~1evil.example.com` carries no
  // literal scheme yet its decoded segment is a URL. The decoded segments
  // must be scanned with the same path material pattern so escaped schemes,
  // drive roots, and hosts fail closed exactly like their unescaped forms.
  it("refuses an escaped URL path at plan parse without echoing it", () => {
    for (const path of [
      "/experience/theme/tokens/https:~1~1evil.example.com",
      "/experience/theme/tokens/HTTPS:~1~1evil.example.com",
    ]) {
      let message = "";
      try {
        parseCompositionPlan({
          ...planFixture(),
          proposedOperations: [{ op: "add", path, value: "clean" }],
        });
      } catch (error) {
        message = error instanceof Error ? error.message : String(error);
      }
      expect(message).toMatch(/Composition Diff paths cannot carry/);
      expect(message).not.toContain("evil.example.com");
      expect(message).not.toContain("https:");
      expect(message).not.toContain(path);
    }
  });

  it("refuses an escaped URL path at Diff hash", () => {
    expect(() =>
      hashCompositionDiff({
        apiVersion: "factory.graph-diff/v1",
        operations: [
          {
            op: "add",
            path: "/experience/theme/tokens/https:~1~1evil.example.com",
            value: "clean",
          },
        ],
      }),
    ).toThrow(CompositionError);
  });

  it("refuses an escaped Windows drive root in a path", () => {
    expect(() =>
      parseCompositionPlan({
        ...planFixture(),
        proposedOperations: [
          {
            op: "add",
            path: "/experience/theme/tokens/C:~1windows/x",
            value: "clean",
          },
        ],
      }),
    ).toThrow(CompositionError);
  });

  it("keeps ~1/~0-escaped literal segments through plan parse and Diff hash", () => {
    // QA-4-1-R1: the decode-then-scan must never over-reject — legitimate
    // `~1`/`~0` escapes (literal `/` and `~` in record keys) decode to clean
    // material and must parse and hash exactly like unescaped pointers.
    for (const path of [
      "/experience/theme/tokens/a~1b",
      "/experience/theme/tokens/a~0b~1c~0d",
    ]) {
      const plan = {
        ...planFixture(),
        proposedOperations: [{ op: "add", path, value: "clean" }],
      };
      expect(() => parseCompositionPlan(plan)).not.toThrow();
      expect(() =>
        hashCompositionDiff({
          apiVersion: "factory.graph-diff/v1",
          operations: plan.proposedOperations,
        }),
      ).not.toThrow();
    }
  });

  it("refuses an escaped-material diff at decision application", () => {
    // The Diff checksum is computed by hashCompositionDiff, which must refuse
    // the escaped path before any application, so the Draft never moves.
    const plan = planFixture();
    const escaped = {
      apiVersion: "factory.graph-diff/v1",
      operations: [
        {
          op: "add",
          path: "/experience/theme/tokens/https:~1~1evil.example.com",
          value: "clean",
        },
      ],
    };
    expect(() => hashCompositionDiff(escaped)).toThrow(CompositionError);
    expect(() =>
      applyApprovedComposition(
        {
          ...approvedDecision(plan),
          diffChecksum:
            "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        },
        plan,
        draft,
        escaped,
      ),
    ).toThrow(CompositionError);
    expect(draft.revision).toBe(1);
  });
});

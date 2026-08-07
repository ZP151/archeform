import { describe, expect, it } from "vitest";
import { hashApplicationGraph, parseApplicationGraph } from "@factory/graph";

import {
  validateIdempotencyJourney,
  validateRoleJourney,
} from "../src/verifier/role-journey.js";
import {
  resolveVerificationProfile,
  type VerificationProfile,
} from "../src/verifier/verification-profiles.js";
import { verificationStepKindSchema } from "@factory/graph";
import {
  acceptanceCompilation,
  acceptanceProfileKey,
} from "./fixtures/expense-approval.js";

const stepIdPattern = /^[a-z0-9-]{1,64}$/;
const allowedKinds = new Set([
  "migration",
  "health",
  "api",
  "role-journey",
  "authorization-denial",
  "idempotency",
]);

const profile: VerificationProfile =
  resolveVerificationProfile(acceptanceProfileKey);

describe("acceptance verification profile", () => {
  it("resolves the Expense Approval profile with a bounded ordered step plan", () => {
    expect(profile.profileKey).toBe(acceptanceProfileKey);
    expect(profile.stepPlan.length).toBeGreaterThanOrEqual(6);
    for (const entry of profile.stepPlan) {
      expect(stepIdPattern.test(entry.stepId)).toBe(true);
      expect(allowedKinds.has(entry.kind)).toBe(true);
      expect(verificationStepKindSchema.safeParse(entry.kind).success).toBe(
        true,
      );
    }
    // The plan is deterministic: the same lookup returns the same steps.
    expect(resolveVerificationProfile(acceptanceProfileKey).stepPlan).toEqual(
      profile.stepPlan,
    );
  });

  it("fails closed on any profile key that is not the acceptance profile", () => {
    expect(() => resolveVerificationProfile("unknown-profile")).toThrow();
  });

  it("declares fixture sessions for every journey in the profile", () => {
    const graph = acceptanceCompilation().graph;
    const roles = graph.policy.roles;
    for (const entry of profile.stepPlan) {
      if (entry.kind === "migration" || entry.kind === "health") continue;
      const journey = profile.journeys[entry.stepId];
      expect(journey).toBeDefined();
      expect(stepIdPattern.test(journey.journeyId)).toBe(true);
      expect(journey.sessionId).toBeDefined();
      // The session follows the compiler's fixture-session-<role> convention.
      const role = journey.sessionId.replace(/^fixture-session-/, "");
      expect(roles).toContain(role);
    }
  });

  it("resolves every journey action in the profile API registry", () => {
    for (const entry of profile.stepPlan) {
      const journey = profile.journeys[entry.stepId];
      if (journey === undefined) continue;
      if (entry.kind === "idempotency") {
        validateIdempotencyJourney(journey, profile.apiRegistry);
      } else {
        validateRoleJourney(journey, profile.apiRegistry);
      }
    }
  });

  it("orders the plan so the seeded record moves draft -> submitted -> approved", () => {
    const kinds = profile.stepPlan.map((entry) => entry.kind);
    const ids = profile.stepPlan.map((entry) => entry.stepId);
    const submitIndex = ids.indexOf("employee-submits-expense");
    const approveIndex = ids.indexOf("manager-approves-expense");
    const denyIndex = ids.indexOf("employee-denied-approval");
    expect(submitIndex).toBeGreaterThan(
      ids.indexOf("employee-creates-expense"),
    );
    expect(approveIndex).toBeGreaterThan(submitIndex);
    expect(denyIndex).toBeGreaterThan(approveIndex);
    expect(kinds[submitIndex]).toBe("idempotency");
    expect(kinds[approveIndex]).toBe("role-journey");
    expect(kinds[denyIndex]).toBe("authorization-denial");
  });
});

describe("acceptance fixture", () => {
  it("produces a deterministic immutable Published Graph", () => {
    const first = acceptanceCompilation();
    const second = acceptanceCompilation();
    expect(first.graph).toEqual(second.graph);
    expect(first.compositionLock).toEqual(second.compositionLock);
    // Mutating one materialization never leaks into the next.
    (first.graph.domain as { seedData?: unknown }).seedData = [];
    expect(second.graph.domain.seedData).toHaveLength(1);
  });

  it("parses as a valid application graph", () => {
    const { graph } = acceptanceCompilation();
    expect(parseApplicationGraph(graph).metadata.id).toBe(acceptanceProfileKey);
  });

  it("carries a composition lock bound to the graph checksum", () => {
    const { graph, compositionLock } = acceptanceCompilation();
    expect(compositionLock.applicationGraphChecksum).toBe(
      hashApplicationGraph(graph),
    );
    expect(
      compositionLock.packages.some(
        (selection) => selection.lock.key === "core.identity-policy",
      ),
    ).toBe(true);
  });

  it("seeds the deterministic expense fixture record in the flow initial state", () => {
    const { graph } = acceptanceCompilation();
    const seed = graph.domain.seedData?.find(
      (candidate) => candidate.id === "expense-fixture-01",
    );
    expect(seed).toBeDefined();
    expect(seed?.entity).toBe("expense");
    expect(seed?.values.status).toBe("draft");
    const initialState = graph.flow.flows.find(
      (flow) => flow.id === "expense-review",
    )?.initialState;
    expect(initialState).toBe("draft");
  });
});

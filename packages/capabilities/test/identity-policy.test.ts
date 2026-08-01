import { describe, expect, it } from "vitest";

import {
  decideAuthorization,
  type DeclaredPermissionV1,
  type PrincipalContextV1,
} from "../src/identity/policy.js";

const rules: readonly DeclaredPermissionV1[] = [
  { role: "manager", resource: "expense", action: "approve" },
  { role: "employee", resource: "expense", action: "create" },
  { role: "merchant", resource: "order", action: "fulfil" },
];

function fixture(
  roles: readonly string[],
  tenantId = "tenant-a",
): PrincipalContextV1 {
  return {
    principalId: "principal-1",
    sessionId: "session-1",
    tenantId,
    roles,
    expiresAt: "2026-08-02T00:00:00.000Z",
  };
}

describe("Factory identity policy", () => {
  it("allows only a declared role, resource, and action within the same tenant", () => {
    expect(
      decideAuthorization(
        {
          principal: fixture(["manager"]),
          resource: "expense",
          action: "approve",
          tenantId: "tenant-a",
          now: "2026-08-01T00:00:00.000Z",
        },
        rules,
      ),
    ).toEqual({ allowed: true });
  });

  it("denies missing, expired, and cross-tenant sessions before evaluating a role", () => {
    expect(
      decideAuthorization(
        {
          resource: "expense",
          action: "approve",
          now: "2026-08-01T00:00:00.000Z",
        },
        rules,
      ),
    ).toEqual({ allowed: false, reason: "missing-session" });
    expect(
      decideAuthorization(
        {
          principal: {
            ...fixture(["manager"]),
            expiresAt: "2026-07-31T23:59:59.999Z",
          },
          resource: "expense",
          action: "approve",
          now: "2026-08-01T00:00:00.000Z",
        },
        rules,
      ),
    ).toEqual({ allowed: false, reason: "expired-session" });
    expect(
      decideAuthorization(
        {
          principal: fixture(["merchant"], "tenant-a"),
          resource: "order",
          action: "fulfil",
          tenantId: "tenant-b",
          now: "2026-08-01T00:00:00.000Z",
        },
        rules,
      ),
    ).toEqual({ allowed: false, reason: "tenant-mismatch" });
  });

  it("denies an undeclared action and a role with no declared authorization", () => {
    expect(
      decideAuthorization(
        {
          principal: fixture(["merchant"]),
          resource: "order",
          action: "refund",
          now: "2026-08-01T00:00:00.000Z",
        },
        rules,
      ),
    ).toEqual({ allowed: false, reason: "undeclared-action" });
    expect(
      decideAuthorization(
        {
          principal: fixture(["employee"]),
          resource: "expense",
          action: "approve",
          now: "2026-08-01T00:00:00.000Z",
        },
        rules,
      ),
    ).toEqual({ allowed: false, reason: "deny" });
  });
});

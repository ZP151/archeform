import { describe, expect, it } from "vitest";

import type { DiscussSession } from "../../../../lib/golden-path/discuss-model";
import { POST } from "./route";

function standardSession(): DiscussSession {
  return {
    mode: "discuss",
    answers: [
      { key: "approval-threshold", answer: "1000", deferred: false },
      { key: "manager-role", answer: "manager", deferred: false },
      { key: "audit-trail", answer: "audit-required", deferred: false },
      { key: "multi-level-approval", answer: "no-escalation", deferred: false },
    ],
  };
}

function post(body: unknown): Promise<Response> {
  return POST(
    new Request("http://workbench.test/api/golden-path/plan", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

describe("Golden Path plan route", () => {
  it("returns bounded alternatives for the standard completed session", async () => {
    const response = await post({ session: standardSession() });
    expect(response.status).toBe(200);
    const result = (await response.json()) as {
      readonly ok: boolean;
      readonly alternatives?: readonly { readonly key: string }[];
    };
    expect(result.ok).toBe(true);
    expect(result.alternatives?.map((alternative) => alternative.key)).toEqual(
      expect.arrayContaining(["standard", "strict", "light"]),
    );
  });

  it("rejects a payload without the session envelope", async () => {
    const response = await post(standardSession());
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Invalid session." });
  });

  it("rejects a session with an unknown clarification key", async () => {
    const response = await post({
      session: {
        mode: "discuss",
        answers: [{ key: "not-a-key", answer: "x", deferred: false }],
      },
    });
    expect(response.status).toBe(400);
  });

  it("rejects an over-long answer", async () => {
    const response = await post({
      session: {
        mode: "discuss",
        answers: [
          {
            key: "approval-threshold",
            answer: "a".repeat(65),
            deferred: false,
          },
        ],
      },
    });
    expect(response.status).toBe(400);
  });

  it("rejects a non-JSON body", async () => {
    const response = await POST(
      new Request("http://workbench.test/api/golden-path/plan", {
        method: "POST",
        body: "not json",
      }),
    );
    expect(response.status).toBe(400);
  });

  it("fails closed with 409 for a session with unresolved required questions", async () => {
    const response = await post({
      session: {
        mode: "discuss",
        answers: [
          { key: "approval-threshold", answer: "1000", deferred: false },
        ],
      },
    });
    expect(response.status).toBe(409);
    const result = (await response.json()) as { readonly ok: boolean };
    expect(result.ok).toBe(false);
  });
});

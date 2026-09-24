import { createHash } from "node:crypto";
import type { ServiceWorkOrdersProfile } from "@factory/compiler";
import type { ChainJourneyStep, RegisteredApiAction } from "./role-journey.js";
import type { VerificationStepPlanEntry } from "./verification-lifecycle.js";
import type {
  VerificationJourney,
  VerificationProfile,
} from "./verification-profiles.js";

type Command =
  | "create"
  | "update"
  | "assign"
  | "reassign"
  | "start"
  | "resolve"
  | "reopen"
  | "cancel";
const values = {
  title: "Verifier repair",
  serviceLocation: "South plant room",
  priority: "medium",
  description: "Inspect the leaking circulation pump",
  dueDate: "2026-10-01",
};
const replacement = {
  title: "Verifier corrected repair",
  serviceLocation: "North plant room",
  priority: "high",
  description: null,
  dueDate: null,
};

/** Private fixtures only: admission is the compiler root's exact immutable selector.
 * Existing probes establish request/status/replay-ID behavior, not history contents.
 */
export function serviceWorkOrdersVerificationProfile(
  profile: ServiceWorkOrdersProfile,
): VerificationProfile {
  const base = `/api/${profile.orderEntity}`;
  const dispatcher = "fixture-session-dispatcher";
  const technicianA = "fixture-session-technician-a";
  const technicianB = "fixture-session-technician-b";
  const key = (id: string) =>
    "verify-" +
    createHash("sha256")
      .update(profile.graphHash + ":" + id)
      .digest("hex")
      .slice(0, 40);
  const action = (command: string) => "work-orders." + command;
  const commands: readonly Command[] = [
    "update",
    "assign",
    "reassign",
    "start",
    "resolve",
    "reopen",
    "cancel",
  ];
  const apiRegistry: RegisteredApiAction[] = [
    {
      action: action("create"),
      method: "POST",
      route: base,
      expectedStatus: 201,
    },
    ...commands.map((command): RegisteredApiAction => ({
      action: action(command),
      method: "POST",
      route: `${base}/{recordId}/events/${command}`,
      expectedStatus: 200,
    })),
    ...["detail", "history", "start", "resolve", "replay"].map(
      (name): RegisteredApiAction => ({
        action: action("former-" + name),
        method: name === "detail" || name === "history" ? "GET" : "POST",
        route:
          `${base}/{recordId}` +
          (name === "detail"
            ? ""
            : name === "history"
              ? "/history"
              : "/events/" + (name === "replay" ? "start" : name)),
        expectedStatus: 404,
      }),
    ),
  ];
  const stepPlan: VerificationStepPlanEntry[] = [
    { stepId: "migration", kind: "migration" },
    { stepId: "health", kind: "health" },
  ];
  const journeys: Record<string, VerificationJourney> = {};
  const session = (command: Command) =>
    command === "start" || command === "resolve" ? technicianA : dispatcher;
  const body = (command: Command, expectedVersion: number): string =>
    JSON.stringify(
      command === "create"
        ? { values }
        : {
            expectedVersion,
            ...(command === "update"
              ? {
                  reason: "Correct the saved service details",
                  values: replacement,
                }
              : {}),
            ...(command === "assign" || command === "reassign"
              ? {
                  assigneePrincipalId:
                    command === "assign"
                      ? "fixture-principal-technician-a"
                      : "fixture-principal-technician-b",
                }
              : {}),
            ...(command === "reassign"
              ? { reason: "Transfer work to the available technician" }
              : {}),
            ...(command === "resolve"
              ? {
                  resolutionNote:
                    "Replaced the worn seal and verified normal operation.",
                }
              : {}),
            ...(command === "reopen"
              ? { reason: "Leak recurred during the follow-up inspection" }
              : {}),
            ...(command === "cancel"
              ? { reason: "Cancel the duplicate service request" }
              : {}),
          },
    );
  const chain = (
    id: string,
    sequence: readonly Command[],
  ): ChainJourneyStep[] =>
    sequence.map((command, index) => ({
      action: action(command),
      sessionId: session(command),
      body: body(command, Math.max(0, index - 1)),
      idempotencyKeyOverride: key(id + "-step-" + index),
    }));
  const add = (
    name: string,
    command: Command,
    sequence: readonly Command[],
    sessionId = session(command),
    kind: "idempotency" | "authorization-denial" = "idempotency",
  ) => {
    const id = "work-orders-" + name;
    const expectedVersion = Math.max(0, sequence.length - 1);
    stepPlan.push({ stepId: id, kind });
    journeys[id] = {
      journeyId: id,
      action: action(command),
      sessionId,
      headers: [{ name: "x-factory-idempotency-key", value: key(id) }],
      body: body(command, expectedVersion),
      ...(sequence.length ? { chain: chain(id, sequence) } : {}),
      ...(kind === "idempotency"
        ? {
            replayExpectation: "stored-success" as const,
            idempotencyKey: key(id),
            expectedVersion,
          }
        : {}),
    };
  };
  // Each scenario creates its own record. Branches never reuse seed state, and
  // the longest prologue has six steps under the unchanged eight-step bound.
  add("create", "create", []);
  add("correct-open", "update", ["create"]);
  add("assign", "assign", ["create"]);
  add("start", "start", ["create", "assign"]);
  add("correct-in-progress", "update", ["create", "assign", "start"]);
  add("resolve", "resolve", ["create", "assign", "start"]);
  add("reopen", "reopen", ["create", "assign", "start", "resolve"]);
  add("resolve-again", "resolve", [
    "create",
    "assign",
    "start",
    "resolve",
    "reopen",
    "start",
  ]);
  add("reassign-open", "reassign", ["create", "assign"]);
  add("reassign-in-progress", "reassign", ["create", "assign", "start"]);
  add(
    "resolve-reassigned",
    "resolve",
    ["create", "assign", "start", "reassign"],
    technicianB,
  );
  add("cancel-open", "cancel", ["create"]);
  add("cancel-in-progress", "cancel", ["create", "assign", "start"]);
  add("cancel-after-reopen", "cancel", [
    "create",
    "assign",
    "start",
    "resolve",
    "reopen",
  ]);

  // Concealment uses a 404 role journey. The existing authorization probe is
  // intentionally fixed to 403 and remains reserved for role-level denials.
  for (const name of [
    "detail",
    "history",
    "start",
    "resolve",
    "replay",
  ] as const) {
    const id = "work-orders-former-" + name;
    const prologue = chain(id, ["create", "assign", "start", "reassign"]);
    const replay = name === "replay";
    stepPlan.push({ stepId: id, kind: "role-journey" });
    journeys[id] = {
      journeyId: id,
      action: action("former-" + name),
      sessionId: technicianA,
      headers: [
        {
          name: "x-factory-idempotency-key",
          value: replay ? prologue[2].idempotencyKeyOverride! : key(id),
        },
      ],
      chain: prologue,
      ...(name === "start" || name === "resolve" || replay
        ? {
            body: replay
              ? prologue[2].body
              : body(name as "start" | "resolve", 3),
          }
        : {}),
    };
  }
  add(
    "technician-denied-create",
    "create",
    [],
    technicianA,
    "authorization-denial",
  );
  add(
    "technician-denied-update",
    "update",
    ["create", "assign"],
    technicianA,
    "authorization-denial",
  );
  return {
    profileKey:
      "work-orders-" +
      createHash("sha256").update(profile.graphHash).digest("hex").slice(0, 32),
    stepPlan: Object.freeze(stepPlan),
    apiRegistry: Object.freeze(apiRegistry),
    journeys: Object.freeze(journeys),
  };
}

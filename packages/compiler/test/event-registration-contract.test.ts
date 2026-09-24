import { createRequire, syncBuiltinESMExports } from "node:module";
import {
  buildCompilationPlan,
  buildCompilationInput,
  generateApplicationBundle,
} from "../src/index.js";
import { describe, it, expect } from "vitest";
import { selectEventRegistrationProfile } from "../src/event-registration-contract.js";
import {
  eventRegistrationInput,
  eventRegistrationBlueprint,
} from "./fixtures/event-registration.js";
import { customerRequestsInput } from "./fixtures/customer-requests.js";
describe("Event Registration compiler contract", () => {
  it("returns a detached frozen profile from real physical composition and persisted JSON", () => {
    const input = JSON.parse(JSON.stringify(eventRegistrationInput()));
    const profile = selectEventRegistrationProfile(
      input.graph,
      input.compositionLock,
    )!;
    expect(profile.key).toBe("event-registration");
    expect(profile.version).toBe("1.0.0");
    for (const value of [
      profile,
      profile.roles,
      profile.pages,
      profile.references,
      profile.references.event,
    ])
      expect(Object.isFrozen(value)).toBe(true);
    input.graph.policy.roles[0] = "changed";
    expect(profile.roles.organizer).toBe("organizer");
  });
  it.each(["order", "lock", "binding", "seed", "unknown", "missing-lock"])(
    "rejects malformed %s before fallback",
    (change) => {
      const input = structuredClone(eventRegistrationInput());
      if (change === "order") input.graph.domain.entities.reverse();
      if (change === "lock") input.compositionLock.packages.pop();
      if (change === "binding")
        input.compositionLock.packages[0]!.bindings.entityKey = {
          graphSymbol: "graph.domain.registration",
        };
      if (change === "seed")
        input.graph.domain.seedData = [{ entity: "event", values: {} }];
      if (change === "unknown")
        Object.assign(input.graph.domain.entities[0]!, { unexpected: true });
      expect(() =>
        selectEventRegistrationProfile(
          input.graph,
          change === "missing-lock" ? undefined : input.compositionLock,
        ),
      ).toThrow(/Event Registration/);
    },
  );
  it.each([
    ["host", "guest"],
    ["attendee", "organizer"],
    ["a".repeat(128), "b".repeat(128)],
  ])(
    "binds role slots independently of labels %s %s",
    (organizer, attendee) => {
      const { blueprint: b } = eventRegistrationBlueprint();
      const rename = (r: string) => (r === "organizer" ? organizer : attendee);
      for (const actor of b.actors) actor.key = rename(actor.key);
      for (const flow of b.workflows)
        for (const transition of flow.transitions)
          transition.actorKey = rename(transition.actorKey);
      for (const journey of b.acceptanceJourneys)
        for (const step of journey.steps) step.actorKey = rename(step.actorKey);
      const input = eventRegistrationInput(b);
      expect(
        selectEventRegistrationProfile(input.graph, input.compositionLock)!
          .roles,
      ).toEqual({ organizer, attendee });
    },
  );
  it("does not classify older families by labels", () => {
    const input = customerRequestsInput();
    input.graph.metadata.name = "Event Registration";
    expect(
      selectEventRegistrationProfile(input.graph, input.compositionLock),
    ).toBeUndefined();
  });
});

it("keeps all public runtime generation boundaries closed", () => {
  const input = {
    ...eventRegistrationInput(),
    publishedRevisionId: "event-registration-published-fixture",
  };
  for (const boundary of [
    buildCompilationPlan,
    buildCompilationInput,
    generateApplicationBundle,
  ])
    expect(() => boundary(input)).toThrow(
      "Event Registration runtime is not implemented.",
    );
});

it.each([
  "accessor",
  "inherited",
  "cycle",
  "unknown-lock",
  "wrong-version",
  "wrong-role-binding",
  "reordered-lock",
  "accessor-lock",
])("rejects hostile %s without invoking accessors", (change) => {
  const input = structuredClone(eventRegistrationInput());
  let reads = 0;
  const getter = {
    enumerable: true,
    get() {
      reads++;
      return "forged";
    },
  };
  if (change === "accessor")
    Object.defineProperty(input.graph.domain.entities[0]!, "label", getter);
  if (change === "inherited")
    Object.setPrototypeOf(input.graph.domain.entities[0]!, { forged: true });
  if (change === "cycle") Object.assign(input.graph, { cycle: input.graph });
  if (change === "unknown-lock")
    Object.assign(input.compositionLock, { witness: true });
  if (change === "wrong-version")
    input.compositionLock.packages[0]!.lock.version = "1.0.0";
  if (change === "wrong-role-binding")
    input.compositionLock.packages.find(
      (p) => p.lock.key === "core.identity-policy",
    )!.bindings.authenticatedRole = { graphSymbol: "graph.policy.organizer" };
  if (change === "reordered-lock") input.compositionLock.packages.reverse();
  if (change === "accessor-lock")
    Object.defineProperty(
      input.compositionLock.packages[0]!.lock,
      "manifestDigest",
      getter,
    );
  expect(() =>
    selectEventRegistrationProfile(input.graph, input.compositionLock),
  ).toThrow(/Event Registration/);
  expect(reads).toBe(0);
});
it("freezes the entire real fixture and accepts renamed entity/workflow/page coordinates", () => {
  const input = eventRegistrationInput();
  expect(Object.isFrozen(input.graph.domain.entities[0]!.fields)).toBe(true);
  const { blueprint } = eventRegistrationBlueprint();
  const renamed = JSON.parse(
    JSON.stringify(blueprint)
      .replaceAll('"event"', '"community-gathering"')
      .replaceAll('"registration"', '"reserved-place"')
      .replaceAll('"manage-event"', '"manage-gathering"')
      .replaceAll('"events"', '"gatherings"'),
  );
  // Business field keys remain fixed even when the referenced entities are renamed.
  renamed.entities[1].fields[0].key = "event";
  renamed.entities[2].fields[0].key = "event";
  renamed.entities[3].fields[0].key = "registration";
  const renamedInput = eventRegistrationInput(renamed);
  expect(
    selectEventRegistrationProfile(
      renamedInput.graph,
      renamedInput.compositionLock,
    ),
  ).toMatchObject({
    eventEntity: "community-gathering",
    registrationEntity: "reserved-place",
    eventWorkflow: "manage-gathering",
    pages: { list: "gatherings" },
  });
});
it.each([
  "owner",
  "event-history",
  "registration-history",
  "check-in",
  "undo-check-in",
])(
  "fails closed for isolated %s markers at all public boundaries",
  (marker) => {
    const input = {
      ...structuredClone(customerRequestsInput()),
      publishedRevisionId: "event-registration-malformed",
    };
    // Remove the old family's distinctive fields and verbs so only the new marker drives admission.
    input.graph.domain.entities = input.graph.domain.entities.slice(2);
    input.graph.policy.permissions = [];
    input.graph.flow.flows = [];
    if (marker.includes("check-in"))
      input.graph.policy.permissions.push({
        role: "staff",
        resource: input.graph.domain.entities[0]!.key,
        actions: [marker],
      });
    else
      input.graph.domain.entities[0]!.fields.push({
        key:
          marker === "owner"
            ? "attendeePrincipalId"
            : marker === "event-history"
              ? "eventVersion"
              : "registrationVersion",
        type: "string",
        required: true,
      });
    for (const boundary of [
      buildCompilationPlan,
      buildCompilationInput,
      generateApplicationBundle,
    ])
      expect(() => boundary(input)).toThrow(/Event Registration/);
  },
);

it("verifies physical capability source bytes with intact declared manifests and locks", () => {
  const input = eventRegistrationInput();
  const filesystem = createRequire(import.meta.url)(
    "node:fs",
  ) as typeof import("node:fs");
  const original = filesystem.readFileSync;
  let reads = 0;
  filesystem.readFileSync = ((...args: Parameters<typeof original>) => {
    const bytes = original(...args);
    if (
      String(args[0])
        .replaceAll("\\", "/")
        .includes("/assets/core.crud/1.0.1/") &&
      String(args[0]).endsWith(".ts.tpl")
    ) {
      reads++;
      return typeof bytes === "string"
        ? bytes + "\n// changed physical source"
        : Buffer.concat([bytes, Buffer.from("\n// changed physical source")]);
    }
    return bytes;
  }) as typeof original;
  syncBuiltinESMExports();
  try {
    expect(() =>
      selectEventRegistrationProfile(input.graph, input.compositionLock),
    ).toThrow(/Event Registration/);
    expect(reads).toBeGreaterThan(0);
  } finally {
    filesystem.readFileSync = original;
    syncBuiltinESMExports();
  }
});

it("rejects a remaining event shape after every owner/history/attendance marker is removed", () => {
  const input = structuredClone(eventRegistrationInput());
  const event = input.graph.domain.entities[0]!;
  event.fields = event.fields.filter((f) => !["reservedSeats"].includes(f.key));
  for (const field of event.fields) delete field.numericDomain;
  input.graph.domain.entities = [event];
  input.graph.flow.flows = [];
  input.graph.policy.permissions = [];
  expect(() =>
    selectEventRegistrationProfile(input.graph, input.compositionLock),
  ).toThrow(/Event Registration/);
});

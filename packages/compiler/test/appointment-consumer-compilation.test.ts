import { describe, expect, it } from "vitest";
import { createCapabilityCompositionLock } from "@factory/capabilities";
import { hashApplicationGraph } from "@factory/graph";
import { generateApplicationBundle } from "../src/index.js";
import { appointmentDefinitionCompilationInput } from "./fixtures/definition-data-compatibility.js";
import { selectAppointmentConsumerProfile } from "../src/appointment-consumer-contract.js";
import { renderAppointmentConsumerFile } from "../src/appointment-consumer-read.js";
import { renderAppointmentPageRuntimeForTest } from "../src/appointment-compilation-admission.js";
import { selectAppointmentRuntimeProfile } from "../src/appointment-mutation-contract.js";

export function consumerInput() {
  const { graph, compositionLock } = appointmentDefinitionCompilationInput();
  graph.policy.permissions = graph.policy.permissions.flatMap((permission) =>
    permission.resource === "appointment" &&
    ["customer", "staff"].includes(permission.role)
      ? [
          permission,
          {
            role: permission.role,
            resource: "schedule",
            actions: ["read-availability"],
          },
        ]
      : [permission],
  );
  return {
    publishedRevisionId: "appointment-consumer-v2",
    graph,
    compositionLock: createCapabilityCompositionLock({
      graphChecksum: hashApplicationGraph(graph),
      selections: compositionLock.packages,
    }),
  };
}

describe("Appointment immutable consumer compilation", () => {
  it("fails closed when the Prisma import integration marker is missing", () => {
    const input = consumerInput();
    expect(() =>
      renderAppointmentConsumerFile(
        "api/src/prisma-record-store.ts",
        "  constructor(private readonly prisma: PrismaClient) {}",
        selectAppointmentConsumerProfile(input.graph, input.compositionLock),
      ),
    ).toThrow("integration marker");
  });
  it("emits the bounded read routes after a persisted JSON round trip", () => {
    const input = JSON.parse(JSON.stringify(consumerInput()));
    const bundle = generateApplicationBundle(input);
    const main = bundle.files.find(
      (file) => file.path === "api/src/main.ts",
    )!.content;
    expect(main).toContain("@Get('appointment-availability')");
    expect(main).toContain("@Get(':entity/:recordId/appointment-summary')");
    expect(main.indexOf("@Get('appointment-availability')")).toBeLessThan(
      main.indexOf("@Get(':entity')"),
    );
  });
  it("keeps arbitrary labels and titles out of the private profile witness", () => {
    const input = consumerInput();
    input.graph.metadata.name = "Unrelated display title";
    input.graph.domain.entities.forEach((e) => (e.label = "Changed label"));
    input.graph.page.pages.forEach((p) => (p.title = "Changed title"));
    input.compositionLock = createCapabilityCompositionLock({
      graphChecksum: hashApplicationGraph(input.graph),
      selections: input.compositionLock.packages,
    });
    expect(
      selectAppointmentConsumerProfile(input.graph, input.compositionLock)?.key,
    ).toBe("appointment-booking@2.0.0");
  });
  const changes: Record<string, (graph: any, lock: any) => void> = {
    "missing grant": (g) => g.policy.permissions.splice(1, 1),
    "broadened grant": (g) => g.policy.permissions[1].actions.push("read"),
    "extra grant": (g) =>
      g.policy.permissions.push({
        role: "administrator",
        resource: "schedule",
        actions: ["read-availability"],
      }),
    "reordered permissions": (g) => g.policy.permissions.reverse(),
    "changed identity permission": (g) =>
      g.policy.permissions[2].actions.push("update"),
    "wrong grant owner": (g) => (g.policy.permissions[1].resource = "service"),
    "wrong grant actor": (g) => (g.policy.permissions[1].role = "staff"),
    "altered numeric domain": (g) =>
      (g.domain.entities[0].fields[1].numericDomain.minimum.inclusive = true),
    "extra field": (g) =>
      g.domain.entities[0].fields.push({
        key: "private",
        type: "string",
        required: false,
      }),
    "reordered fields": (g) => g.domain.entities[1].fields.reverse(),
    "changed relation": (g) => (g.domain.relations[0].to = "appointment"),
    "workflow effect": (g) =>
      (g.flow.flows[0].transitions[0].effects = [
        { capability: "authorization.decision", operation: "decision" },
      ]),
    "changed transition": (g) =>
      (g.flow.flows[0].transitions[0].roles = ["administrator"]),
    "extra integration capability": (g) =>
      g.integration.capabilities.push({
        key: "audit.record",
        providerId: "factory",
        operation: "record",
      }),
    "missing page": (g) => g.page.pages.splice(2, 1),
    "extra block": (g) =>
      g.page.pages[0].blocks.push({
        id: "extra",
        type: "list",
        entity: "appointment",
      }),
    "rebound page": (g) => (g.page.pages[0].blocks[0].entity = "service"),
    "missing navigation": (g) => g.page.navigation.pop(),
    "changed default actor": (_g, l) =>
      (l.packages.find(
        (p: any) => p.lock.key === "core.identity-policy",
      ).bindings.defaultRole.graphSymbol = "graph.policy.staff"),
    "changed lock digest": (_g, l) =>
      (l.lockDigest = "sha256:" + "0".repeat(64)),
    "reordered lock packages": (_g, l) => l.packages.reverse(),
  };
  for (const key of [
    "core.crud",
    "core.workflow",
    "core.identity-policy",
    "core.policy-declarations",
    "core.audit",
    "core.notification",
    "scheduling.appointment",
  ])
    changes[`stale ${key} manifest`] = (_g, l) => {
      l.packages.find((p: any) => p.lock.key === key).lock.manifestDigest =
        "sha256:" + "0".repeat(64);
    };
  it.each(Object.entries(changes))(
    "fails closed at both real compiler seams: %s",
    (_name, mutate) => {
      const input = JSON.parse(JSON.stringify(consumerInput()));
      const runtime = selectAppointmentRuntimeProfile(
        input.graph,
        input.compositionLock,
      );
      mutate(input.graph, input.compositionLock);
      input.compositionLock.applicationGraphChecksum = hashApplicationGraph(
        input.graph,
      );
      if (!["changed lock digest", "reordered lock packages"].includes(_name))
        try {
          input.compositionLock = createCapabilityCompositionLock({
            graphChecksum: hashApplicationGraph(input.graph),
            selections: input.compositionLock.packages,
          });
        } catch {
          /* Invalid physical locks must also fail the real seams. */
        }
      expect(() => generateApplicationBundle(input)).toThrow();
      expect(() =>
        renderAppointmentPageRuntimeForTest(
          input.graph,
          undefined,
          true,
          "legacy",
          undefined,
          runtime,
          input.compositionLock,
        ),
      ).toThrow();
    },
  );
  it("proves every appointment owner-aware binding independently", () => {
    const base = consumerInput();
    const bindings = base.compositionLock.packages.find(
      (p) => p.lock.key === "scheduling.appointment",
    )!.bindings;
    expect(Object.keys(bindings)).toHaveLength(17);
    for (const key of Object.keys(bindings)) {
      const input = JSON.parse(JSON.stringify(base));
      const target = input.compositionLock.packages.find(
        (p: any) => p.lock.key === "scheduling.appointment",
      ).bindings[key];
      target.graphSymbol =
        "graph.domain." +
        (target.graphSymbol === "graph.domain.service"
          ? "schedule"
          : "service");
      try {
        input.compositionLock = createCapabilityCompositionLock({
          graphChecksum: hashApplicationGraph(input.graph),
          selections: input.compositionLock.packages,
        });
      } catch {
        /* Invalid binding grammars remain denied at the real seams. */
      }
      expect(() => generateApplicationBundle(input), key).toThrow();
      expect(
        () =>
          renderAppointmentPageRuntimeForTest(
            input.graph,
            undefined,
            true,
            "legacy",
            undefined,
            selectAppointmentRuntimeProfile(base.graph, base.compositionLock),
            input.compositionLock,
          ),
        key,
      ).toThrow();
    }
  });
});

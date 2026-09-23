import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { createCapabilityCompositionLock } from "@factory/capabilities";
import {
  hashApplicationGraph,
  resolveExperienceDesignSystem,
} from "@factory/graph";
import {
  generateApplicationBundle,
  type PublishedGraphInput,
} from "../src/index.js";
import { renderAppointmentPageRuntimeForTest } from "../src/appointment-compilation-admission.js";
import { selectAppointmentRuntimeProfile } from "../src/appointment-mutation-contract.js";
import { approvalLegacyFixtures } from "./fixtures/approval-legacy.js";
import { appointmentDefinitionCompilationInput } from "./fixtures/definition-data-compatibility.js";
import { legacyDatabaseIdentifierComparison } from "./fixtures/legacy-database-identifiers.js";
import type { GeneratedFile } from "../src/core/generated-files.js";

const hash = (value: string) =>
  createHash("sha256").update(value).digest("hex");
const historicalInput = () =>
  structuredClone(
    approvalLegacyFixtures.booking.input,
  ) as unknown as PublishedGraphInput;
const rebind = (input: PublishedGraphInput) => {
  input.compositionLock = createCapabilityCompositionLock({
    graphChecksum: hashApplicationGraph(input.graph),
    selections: input.compositionLock.packages,
  });
};
const page = (input: PublishedGraphInput) =>
  renderAppointmentPageRuntimeForTest(
    input.graph,
    undefined,
    true,
    "legacy",
    undefined,
    undefined,
    input.compositionLock,
  );
const seams = {
  bundle: (input: PublishedGraphInput) => generateApplicationBundle(input),
  page,
};
const field = (input: PublishedGraphInput, entity: string, key: string) =>
  input.graph.domain.entities
    .find((e) => e.key === entity)!
    .fields.find((f) => f.key === key)!;
const selection = (input: PublishedGraphInput, key: string) =>
  input.compositionLock.packages.find((p) => p.lock.key === key)!;
const syncSelections = (input: PublishedGraphInput) => {
  input.graph.integration.compositionSelections = structuredClone(
    input.compositionLock.packages,
  );
};
const secondReference = (input: PublishedGraphInput) => {
  input.graph.domain.entities
    .find((e) => e.key === "appointment")!
    .fields.push({
      key: "secondaryServiceKey",
      type: "string",
      required: true,
    });
  input.graph.domain.relations.push({
    from: "appointment",
    to: "service",
    kind: "many-to-one",
    field: "secondaryServiceKey",
  });
};

// Removing embedded selections changes only these input-derived digests.
// Counts and paths are closed: this cannot hide another generated-byte change.
const publishedDigestOccurrences: Readonly<
  Record<string, readonly [number, number]>
> = {
  "capability-lock.json": [1, 0],
  "composition-lock.json": [1, 1],
  "capability-template-lock.json": [1, 0],
  "tests/journeys.generated.md": [1, 0],
  "README.md": [1, 0],
};
function historicalPublishedComparison(
  files: readonly GeneratedFile[],
  input: PublishedGraphInput,
): GeneratedFile[] {
  const original = approvalLegacyFixtures.booking.input;
  expect(input.graph.integration.compositionSelections).toBeUndefined();
  expect(input.compositionLock.applicationGraphChecksum).toBe(
    hashApplicationGraph(input.graph),
  );
  expect(input.compositionLock).toEqual(
    createCapabilityCompositionLock({
      graphChecksum: hashApplicationGraph(input.graph),
      selections: input.compositionLock.packages,
    }),
  );
  const substitutions = [
    [
      input.compositionLock.applicationGraphChecksum,
      original.compositionLock.applicationGraphChecksum,
    ],
    [input.compositionLock.lockDigest, original.compositionLock.lockDigest],
  ] as const;
  for (const [current, historical] of substitutions)
    expect(current).not.toBe(historical);
  const before = JSON.stringify(files);
  const changed: string[] = [];
  const compared = files.map((file) => {
    const counts = publishedDigestOccurrences[file.path] ?? [0, 0];
    let content = file.content;
    for (const [index, [current, historical]] of substitutions.entries()) {
      expect(
        file.content.split(current).length - 1,
        `${file.path}: current digest ${index}`,
      ).toBe(counts[index]);
      expect(
        file.content.split(historical).length - 1,
        `${file.path}: historical digest ${index}`,
      ).toBe(0);
      if (counts[index]) content = content.replaceAll(current, historical);
    }
    if (content !== file.content) changed.push(file.path);
    return { ...file, content };
  });
  expect(changed).toEqual(Object.keys(publishedDigestOccurrences));
  expect(JSON.stringify(files)).toBe(before);
  return compared;
}
function expectHistoricalBytes(generated: readonly GeneratedFile[]) {
  const files = legacyDatabaseIdentifierComparison(generated, "booking");
  const manifest = files.map((file) => ({
    path: file.path,
    bytes: Buffer.byteLength(file.content),
    sha256: hash(file.content),
  }));
  expect(manifest).toEqual(approvalLegacyFixtures.booking.manifest);
  expect(hash(JSON.stringify(manifest))).toBe(
    approvalLegacyFixtures.booking.manifestHash,
  );
  expect(
    hash(
      files
        .map(
          (file) =>
            `${Buffer.byteLength(file.path)}:${file.path}${Buffer.byteLength(file.content)}:${file.content}`,
        )
        .join(""),
    ),
  ).toBe(approvalLegacyFixtures.booking.bundleHash);
}

describe("historical generic booking admission", () => {
  it("preserves valid current Appointment bytes across both real seams", () => {
    const original = appointmentDefinitionCompilationInput();
    const input: PublishedGraphInput = {
      publishedRevisionId: "current-appointment",
      graph: original.graph,
      compositionLock: original.compositionLock,
    };
    const profile = selectAppointmentRuntimeProfile(
      input.graph,
      input.compositionLock,
    );
    const before = JSON.stringify(input);
    const first = generateApplicationBundle(input);
    expect(JSON.stringify(input)).toBe(before);
    const second = generateApplicationBundle(input);
    expect(JSON.stringify(input)).toBe(before);
    expect(second).toEqual(first);
    for (let run = 0; run < 2; run++) {
      expect(
        renderAppointmentPageRuntimeForTest(
          input.graph,
          undefined,
          true,
          "legacy",
          undefined,
          profile,
          input.compositionLock,
        ),
      ).toBe(
        first.files.find((file) => file.path === "web/app/page-runtime.tsx")!
          .content,
      );
      expect(JSON.stringify(input)).toBe(before);
    }
  });
  it.each([false, true])(
    "preserves complete ordered bytes and immutable inputs twice (separate lock: %s)",
    (published) => {
      const input = historicalInput();
      if (published) {
        delete input.graph.integration.compositionSelections;
        rebind(input);
      }
      const before = JSON.stringify(input);
      const fixtureBefore = JSON.stringify(approvalLegacyFixtures.booking);
      let previous: ReturnType<typeof generateApplicationBundle> | undefined;
      for (let run = 0; run < 2; run++) {
        const bundle = generateApplicationBundle(input);
        expect(JSON.stringify(input)).toBe(before);
        expect(page(input)).toBe(
          bundle.files.find((f) => f.path === "web/app/page-runtime.tsx")!
            .content,
        );
        expect(JSON.stringify(input)).toBe(before);
        if (previous) expect(bundle).toEqual(previous);
        previous = bundle;
        const generatedBefore = JSON.stringify(bundle.files);
        expectHistoricalBytes(
          published
            ? historicalPublishedComparison(bundle.files, input)
            : bundle.files,
        );
        expect(JSON.stringify(bundle.files)).toBe(generatedBefore);
        expect(JSON.stringify(input)).toBe(before);
        expect(JSON.stringify(approvalLegacyFixtures.booking)).toBe(
          fixtureBefore,
        );
      }
    },
  );

  it.each([
    "missing digest",
    "duplicate digest",
    "unexpected path",
    "wrong digest",
  ])("rejects Published comparison %s", (kind) => {
    const input = historicalInput();
    delete input.graph.integration.compositionSelections;
    rebind(input);
    const files = generateApplicationBundle(input).files.map((file) => ({
      ...file,
    }));
    const digest = input.compositionLock.applicationGraphChecksum;
    const allowed = files.find((file) => file.path === "README.md")!;
    if (kind === "missing digest")
      allowed.content = allowed.content.replace(digest, "removed");
    if (kind === "duplicate digest") allowed.content += digest;
    if (kind === "unexpected path")
      files.find((file) => file.path === "package.json")!.content += digest;
    if (kind === "wrong digest")
      files.find((file) => file.path === "composition-lock.json")!.content =
        files
          .find((file) => file.path === "composition-lock.json")!
          .content.replace(
            input.compositionLock.lockDigest,
            `sha256:${"0".repeat(64)}`,
          );
    const before = JSON.stringify(files);
    expect(() => historicalPublishedComparison(files, input)).toThrow();
    expect(JSON.stringify(files)).toBe(before);
  });
  it.each(["README.md", "web/app/page-runtime.tsx"])(
    "keeps unrelated %s byte changes visible to the Published baseline",
    (path) => {
      const input = historicalInput();
      delete input.graph.integration.compositionSelections;
      rebind(input);
      const files = generateApplicationBundle(input).files.map((file) => ({
        ...file,
      }));
      files.find((file) => file.path === path)!.content +=
        "\nUnrelated byte drift\n";
      const before = JSON.stringify(files);
      const compared = historicalPublishedComparison(files, input);
      expect(compared.find((file) => file.path === path)!.content).toContain(
        "Unrelated byte drift",
      );
      expect(() => expectHistoricalBytes(compared)).toThrow();
      expect(JSON.stringify(files)).toBe(before);
    },
  );

  it.each(Object.entries(seams))(
    "admits paired references and studio edits at the %s seam",
    (_name, invoke) => {
      const input = historicalInput();
      secondReference(input);
      input.graph.metadata.name = "Edited booking";
      input.graph.page.pages[0]!.title = "Edited calendar";
      input.graph.page.navigation[0]!.label = "Edited calendar";
      input.graph.page.pages[0]!.blocks[0]!.props = {
        heading: "Edited headline",
      };
      const designSystem = structuredClone(
        resolveExperienceDesignSystem(input.graph.experience),
      );
      designSystem.tokens.colour.light.success = "#146c43";
      input.graph.experience = { ...input.graph.experience, designSystem };
      rebind(input);
      const before = JSON.stringify(input);
      expect(() => invoke(input)).not.toThrow();
      expect(JSON.stringify(input)).toBe(before);
    },
  );

  it.each(Object.entries(seams))(
    "admits owner-resolved renames and reordered keyed sets at the %s seam",
    (_name, invoke) => {
      const input = historicalInput();
      const identity = selection(input, "core.identity-policy");
      for (const [binding, newKey] of [
        ["principalEntity", "account"],
        ["sessionEntity", "login"],
      ] as const) {
        const oldKey = (
          identity.bindings[binding] as { graphSymbol: string }
        ).graphSymbol.slice("graph.domain.".length);
        input.graph.domain.entities.find(
          (entity) => entity.key === oldKey,
        )!.key = newKey;
        for (const relation of input.graph.domain.relations) {
          if (relation.from === oldKey) relation.from = newKey;
          if (relation.to === oldKey) relation.to = newKey;
        }
        for (const permission of input.graph.policy.permissions)
          if (permission.resource === oldKey) permission.resource = newKey;
        identity.bindings[binding] = { graphSymbol: `graph.domain.${newKey}` };
      }
      input.graph.flow.flows[0]!.id = "booking-process";
      selection(input, "core.workflow").bindings.flowKey = {
        graphSymbol: "graph.flow.booking-process",
      };
      input.graph.page.pages.find((page) => page.id === "service-list")!.id =
        "services";
      input.graph.page.navigation.find(
        (item) => item.pageId === "service-list",
      )!.pageId = "services";
      selection(input, "core.crud").bindings.routeKey = {
        graphSymbol: "graph.page.services",
      };
      input.graph.domain.entities.reverse();
      for (const entity of input.graph.domain.entities) {
        entity.label = "Edited label";
        entity.fields.reverse();
        entity.indexes.reverse();
      }
      input.graph.domain.relations.reverse();
      input.graph.policy.roles.reverse();
      input.graph.policy.permissions.reverse();
      for (const permission of input.graph.policy.permissions)
        permission.actions.reverse();
      input.graph.flow.flows[0]!.states.reverse();
      input.graph.flow.flows[0]!.events.reverse();
      input.graph.flow.flows[0]!.transitions.reverse();
      syncSelections(input);
      input.graph.integration.compositionSelections!.reverse();
      rebind(input);
      const before = JSON.stringify(input);
      expect(() => invoke(input)).not.toThrow();
      expect(JSON.stringify(input)).toBe(before);
    },
  );

  it.each(Object.entries(seams))(
    "admits omitted optional notes at the %s seam",
    (_name, invoke) => {
      const input = historicalInput();
      const appointment = input.graph.domain.entities.find(
        (entity) => entity.key === "appointment",
      )!;
      appointment.fields = appointment.fields.filter(
        (field) => field.key !== "notes",
      );
      delete input.graph.domain.seedData.find(
        (seed) => seed.entity === "appointment",
      )!.values.notes;
      rebind(input);
      expect(() => invoke(input)).not.toThrow();
    },
  );

  const invalidHistory: [string, (input: PublishedGraphInput) => void][] = [
    [
      "missing field",
      (input) => {
        input.graph.domain.entities
          .find((entity) => entity.key === "service")!
          .fields.pop();
        input.graph.domain.seedData = [];
      },
    ],
    [
      "duplicate field",
      (input) => {
        input.graph.domain.entities
          .find((entity) => entity.key === "service")!
          .fields.push(structuredClone(field(input, "service", "name")));
      },
    ],
    [
      "duplicate relation",
      (input) => {
        input.graph.domain.relations.push(
          structuredClone(input.graph.domain.relations[0]!),
        );
      },
    ],
    [
      "duplicate permission",
      (input) => {
        input.graph.policy.permissions.push(
          structuredClone(input.graph.policy.permissions[0]!),
        );
      },
    ],
    [
      "extra index",
      (input) => {
        input.graph.domain.entities
          .find((entity) => entity.key === "service")!
          .indexes.push({ fields: ["name"] });
      },
    ],
    [
      "extra transition property",
      (input) => {
        input.graph.flow.flows[0]!.transitions[0]!.effects = [];
      },
    ],
    [
      "extra binding property",
      (input) => {
        selection(input, "core.identity-policy").bindings.principalEntity = {
          ...(selection(input, "core.identity-policy").bindings
            .principalEntity as object),
          fieldKey: "subjectRef",
        };
        syncSelections(input);
      },
    ],
    [
      "calculation",
      (input) => {
        field(input, "service", "price").calculation = {
          apiVersion: "factory.quantity-unit-price-total/v1",
          quantityFieldKey: "durationMinutes",
          unitPriceFieldKey: "price",
        };
      },
    ],
    [
      "extra Appointment package",
      (input) => {
        input.compositionLock.packages.push(
          structuredClone(
            appointmentDefinitionCompilationInput().compositionLock.packages.find(
              (entry) => entry.lock.key === "scheduling.appointment",
            )!,
          ),
        );
        syncSelections(input);
      },
    ],
    [
      "embedded Appointment package",
      (input) => {
        input.graph.integration.compositionSelections!.push(
          structuredClone(
            appointmentDefinitionCompilationInput().compositionLock.packages.find(
              (entry) => entry.lock.key === "scheduling.appointment",
            )!,
          ),
        );
      },
    ],
    [
      "unpaired field",
      (input) => {
        secondReference(input);
        input.graph.domain.relations.pop();
      },
    ],
    [
      "unpaired relation",
      (input) => {
        secondReference(input);
        input.graph.domain.entities
          .find((e) => e.key === "appointment")!
          .fields.pop();
      },
    ],
    [
      "extra reference",
      (input) => {
        secondReference(input);
        field(input, "appointment", "secondaryServiceKey").key =
          "thirdServiceKey";
        input.graph.domain.relations.at(-1)!.field = "thirdServiceKey";
      },
    ],
    [
      "wrong reference owner",
      (input) => {
        input.graph.domain.relations[0]!.from = "schedule";
      },
    ],
    [
      "wrong field type",
      (input) => {
        field(input, "service", "durationMinutes").type = "decimal";
      },
    ],
    [
      "wrong requiredness",
      (input) => {
        field(input, "service", "name").required = false;
      },
    ],
    [
      "extra field property",
      (input) => {
        field(input, "service", "name").unique = true;
      },
    ],
    [
      "enum order",
      (input) => {
        field(input, "appointment", "status").values!.reverse();
      },
    ],
    [
      "ambiguous identity owner",
      (input) => {
        selection(input, "core.identity-policy").bindings.sessionEntity =
          selection(input, "core.identity-policy").bindings.principalEntity!;
        syncSelections(input);
      },
    ],
    [
      "extra entity",
      (input) => {
        input.graph.domain.entities.push({
          key: "extra",
          label: "Extra",
          fields: [{ key: "name", type: "string", required: true }],
          indexes: [],
        });
      },
    ],
    [
      "changed business policy",
      (input) => {
        input.graph.policy.permissions[0]!.actions.push("update");
      },
    ],
    [
      "changed identity policy",
      (input) => {
        input.graph.policy.permissions[1]!.actions.push("update");
      },
    ],
    [
      "changed flow",
      (input) => {
        input.graph.flow.flows[0]!.transitions[1]!.to = "requested";
      },
    ],
    [
      "numeric domain",
      (input) => {
        field(input, "service", "durationMinutes").numericDomain = {
          apiVersion: "factory.numeric-field-domain/v1",
          minimum: { value: 0, inclusive: false },
        };
      },
    ],
    [
      "missing lock",
      (input) => {
        input.compositionLock.packages.pop();
        syncSelections(input);
      },
    ],
    [
      "duplicate lock",
      (input) => {
        input.compositionLock.packages.push(
          structuredClone(input.compositionLock.packages[0]!),
        );
        syncSelections(input);
      },
    ],
    [
      "stale lock",
      (input) => {
        selection(input, "core.audit").lock.version = "1.0.1";
        syncSelections(input);
      },
    ],
    [
      "wrong package root",
      (input) => {
        selection(input, "core.audit").lock.packageRoot =
          "packages/capabilities/assets/core.audit/1.0.1";
        syncSelections(input);
      },
    ],
    [
      "wrong route owner",
      (input) => {
        selection(input, "core.crud").bindings.routeKey = {
          graphSymbol: "graph.page.schedule-list",
        };
        syncSelections(input);
      },
    ],
    [
      "embedded selection mismatch",
      (input) => {
        input.graph.integration.compositionSelections![0]!.bindings.actorRole =
          { graphSymbol: "graph.policy.staff" };
      },
    ],
  ];
  for (const [seam, invoke] of Object.entries(seams)) {
    it.each(invalidHistory)(
      `rejects historical %s at the ${seam} seam`,
      (_name, mutate) => {
        const input = historicalInput();
        mutate(input);
        // Schema/lock construction can reject malformed cases before dispatch.
        // If so, retain the supplied malformed input for the real seam as well.
        try {
          rebind(input);
        } catch {
          /* intentionally malformed input */
        }
        const before = JSON.stringify(input);
        expect(() => invoke(input)).toThrow();
        expect(JSON.stringify(input)).toBe(before);
      },
    );
    it.each([
      "checksum",
      "lock digest",
      "dependency metadata",
      "output metadata",
    ])(`rejects independent %s forgery at the ${seam} seam`, (kind) => {
      const input = historicalInput();
      if (kind === "checksum")
        input.compositionLock.applicationGraphChecksum = `sha256:${"0".repeat(64)}`;
      else if (kind === "lock digest")
        input.compositionLock.lockDigest = `sha256:${"0".repeat(64)}`;
      else if (kind === "dependency metadata")
        input.compositionLock.resolvedDependencyOrder = [];
      else input.compositionLock.resolvedContributionDigests = [];
      expect(() => invoke(input)).toThrow();
    });
    it.each([
      "lock only",
      "domains only",
      "lock and domains",
      "combined with old field",
      "combined with old flow",
      "embedded lock remains",
      "embedded lock removed",
      "both lock copies removed",
    ])(`rejects current downgrade %s at the ${seam} seam`, (kind) => {
      const original = appointmentDefinitionCompilationInput();
      const input: PublishedGraphInput = {
        publishedRevisionId: "current-downgrade",
        graph: structuredClone(original.graph),
        compositionLock: structuredClone(original.compositionLock),
      };
      if (
        kind === "embedded lock remains" ||
        kind === "embedded lock removed" ||
        kind === "both lock copies removed"
      )
        input.graph.integration.compositionSelections = structuredClone(
          input.compositionLock.packages,
        );
      if (kind === "embedded lock removed")
        input.graph.integration.compositionSelections =
          input.graph.integration.compositionSelections!.filter(
            (p) => p.lock.key !== "scheduling.appointment",
          );
      if (kind !== "domains only" && kind !== "embedded lock removed")
        input.compositionLock.packages = input.compositionLock.packages.filter(
          (p) => p.lock.key !== "scheduling.appointment",
        );
      if (kind !== "lock only")
        for (const entity of input.graph.domain.entities)
          for (const f of entity.fields) delete f.numericDomain;
      if (kind === "combined with old field")
        input.graph.domain.entities
          .find((e) => e.key === "appointment")!
          .fields.push({ key: "startsAt", type: "datetime", required: true });
      if (kind === "combined with old flow") {
        input.graph.flow.flows[0]!.states.push("rescheduled");
        input.graph.flow.flows[0]!.transitions[2]!.to = "rescheduled";
      }
      if (kind === "both lock copies removed") syncSelections(input);
      rebind(input);
      expect(() => invoke(input)).toThrow();
    });
  }
});

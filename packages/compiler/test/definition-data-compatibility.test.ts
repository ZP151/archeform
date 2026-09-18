import { existsSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { beforeAll, describe, expect, it } from "vitest";
import { createCapabilityCompositionLock } from "@factory/capabilities";
import { hashApplicationGraph } from "@factory/graph";
import { generateApplicationBundle, renderAppointmentPageRuntimeForTest } from "../src/index.js";
import {
  currentDefinitionDataCompatibility,
  currentDefinitionDataCompilationEvidence,
  appointmentDefinitionCompilationInput,
} from "./fixtures/definition-data-compatibility.js";
import type { GeneratedFile } from "../src/core/generated-files.js";
import {
  definitionDatabaseIdentifierComparison,
  IDENTIFIER_DATABASE_PATHS,
} from "./fixtures/legacy-database-identifiers.js";
import {
  appointmentMutationContract,
  appointmentPrismaMigration,
  appointmentPrismaSchema,
} from "../src/appointment-mutation-contract.js";

describe("Product definition data compatibility", () => {
  function appointmentField(graph: any, lock: any, bindingKey: "serviceDurationMinutesField" | "scheduleCapacityField") {
    const binding = lock.packages.find((entry: any) => entry.lock.key === "scheduling.appointment").bindings[bindingKey];
    const entity = graph.domain.entities.find((candidate: any) => candidate.key === binding.graphSymbol.replace("graph.domain.", ""));
    return entity.fields.find((field: any) => field.key === binding.fieldKey);
  }
  function compileAppointmentMutation(mutate: (graph: any, lock: any) => void, refreshChecksum = true) {
    const input = appointmentDefinitionCompilationInput();
    const graph = structuredClone(input.graph);
    const lock = structuredClone(input.compositionLock);
    mutate(graph, lock);
    const compositionLock = refreshChecksum
      ? createCapabilityCompositionLock({ graphChecksum: hashApplicationGraph(graph), selections: lock.packages })
      : lock;
    return () => generateApplicationBundle({ publishedRevisionId: "appointment-adversarial", graph, compositionLock } as never);
  }
  function renderAppointmentMutation(mutate: (graph: any, lock: any) => void) {
    const input = appointmentDefinitionCompilationInput();
    const graph = structuredClone(input.graph);
    const lock = structuredClone(input.compositionLock);
    mutate(graph, lock);
    const compositionLock = createCapabilityCompositionLock({ graphChecksum: hashApplicationGraph(graph), selections: lock.packages });
    return () => renderAppointmentPageRuntimeForTest(graph, compositionLock);
  }
  function addValidCalculation(graph: any, entityKey: string) {
    const entity = graph.domain.entities.find((candidate: any) => candidate.key === entityKey);
    const domain = { apiVersion: "factory.numeric-field-domain/v1", minimum: { value: 0, inclusive: false } };
    entity.fields.push(
      { key: "unreviewedQuantity", type: "integer", required: true, numericDomain: domain },
      { key: "unreviewedUnitPrice", type: "decimal", required: true, numericDomain: domain },
      { key: "unreviewedTotal", type: "decimal", required: true, calculation: { apiVersion: "factory.quantity-unit-price-total/v1", quantityFieldKey: "unreviewedQuantity", unitPriceFieldKey: "unreviewedUnitPrice" } },
    );
    const values = { unreviewedQuantity: 2, unreviewedUnitPrice: 10, unreviewedTotal: 20 };
    const seed = graph.domain.seedData.find((candidate: any) => candidate.entity === entityKey);
    if (seed) Object.assign(seed.values, values);
    else graph.domain.seedData.push({ entity: entityKey, id: "unreviewed-calculation", values: { subjectRef: "unreviewed-subject", status: "active", expiresAt: "2026-10-01T00:00:00Z", ...values } });
  }
  it("keeps the additive appointment runtime profile separate from protected definition bundles", () => {
    expect(appointmentMutationContract).toEqual({
      key: "appointment-mutation",
      version: "1.0.0",
      mutation: "factory.generated.appointment-command/v1",
      receipt: "factory.generated.appointment-receipt/v1",
      history: "factory.generated.appointment-history-entry/v1",
      ownership: "factory-authored",
      license: "UNLICENSED",
    });
    expect(appointmentPrismaSchema).toContain(
      "model Factory_AppointmentMutationReceipt",
    );
    expect(appointmentPrismaSchema).toContain(
      "@@unique([scope, idempotencyKey])",
    );
    expect(appointmentPrismaSchema).toContain(
      "model Factory_AppointmentHistoryEntry",
    );
    expect(appointmentPrismaMigration).toContain(
      'CREATE UNIQUE INDEX "Factory_AppointmentMutationReceipt_scope_idempotencyKey_key"',
    );
  });

  it("preserves all six delivered definitions and current Published bytes from 436484fc", () => {
    const baselineBytes = readFileSync(
      new URL("./fixtures/six-definition-baseline.json", import.meta.url),
      "utf8",
    );
    expect(createHash("sha256").update(baselineBytes).digest("hex")).toBe(
      "b88e5c9f21907b382d09b877b2208e90aab087b12bd2b365d7aa94cf48ec62e8",
    );
    const expected = JSON.parse(baselineBytes);
    expect(expected.base).toBe("436484fc71f63adf11e8f48938bc5983ac42ca41");
    expect(expected.comparison).toBe("current-generated-bytes");
    expect(expected.entries).toHaveLength(6);
    expect(
      currentDefinitionDataCompatibility(
        expected.entries.map(
          (entry: { definitionKey: string }) => entry.definitionKey,
        ),
        undefined,
        "current",
      ),
    ).toEqual(expected.entries);
  });

  it("compiles Appointment from one immutable input twice with identical Graph and byte evidence", () => {
    const definitionKeys = ["appointment-booking-v1"];
    const first = currentDefinitionDataCompilationEvidence(definitionKeys);
    const second = currentDefinitionDataCompilationEvidence(definitionKeys);
    expect(first).toEqual(second);
    expect(first[0]).toMatchObject({
      definitionKey: "appointment-booking-v1",
      planSha256: expect.stringMatching(/^[a-f0-9]{64}$/),
      graphSha256: expect.stringMatching(/^sha256:[a-f0-9]{64}$/),
      compositionLockGraphSha256: expect.stringMatching(/^sha256:[a-f0-9]{64}$/),
      bundleSha256: expect.stringMatching(/^[a-f0-9]{64}$/),
    });
    expect(first[0]!.graphSha256).toBe(first[0]!.compositionLockGraphSha256);
    expect(first[0]!.graphSha256).not.toBe(first[0]!.composedGraphSha256);
    expect(first[0]!.files).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: "api/src/capabilities/scheduling.appointment.ts",
          sha256: expect.stringMatching(/^[a-f0-9]{64}$/),
        }),
      ]),
    );
  });

  it.each([
    ["bound duration slot", (graph: any, lock: any) => { appointmentField(graph, lock, "serviceDurationMinutesField").required = false; }],
    ["unbound capacity slot", (_graph: any, lock: any) => { lock.packages.find((entry: any) => entry.lock.key === "scheduling.appointment").bindings.scheduleCapacityField.graphSymbol = "graph.domain.service"; }],
    ["injected business calculation", (graph: any) => addValidCalculation(graph, "service")],
    ["injected Factory session calculation", (graph: any) => addValidCalculation(graph, "data-baseline-appointment-booking-v1-session")],
    ["extra numeric domain", (graph: any) => { graph.domain.entities[0].fields.push({ key: "unreviewedNumeric", type: "integer", required: false, numericDomain: { apiVersion: "factory.numeric-field-domain/v1", minimum: { value: 0, inclusive: false } } }); }],
    ["altered numeric domain", (graph: any, lock: any) => { appointmentField(graph, lock, "serviceDurationMinutesField").numericDomain.maximum = { value: 60, inclusive: true }; }],
    ["missing numeric domain", (graph: any, lock: any) => { delete appointmentField(graph, lock, "scheduleCapacityField").numericDomain; }],
    ["altered numeric boundary", (graph: any, lock: any) => { appointmentField(graph, lock, "scheduleCapacityField").numericDomain.minimum.inclusive = true; }],
    ["service name type", (graph: any, lock: any) => { appointmentField(graph, lock, "serviceNameField").type = "text"; }],
    ["appointment customer requiredness", (graph: any, lock: any) => { const binding = lock.packages.find((entry: any) => entry.lock.key === "scheduling.appointment").bindings.appointmentCustomerNameField; graph.domain.entities.find((entity: any) => entity.key === binding.graphSymbol.replace("graph.domain.", "")).fields.find((field: any) => field.key === binding.fieldKey).required = false; }],
    ["schedule relation kind", (graph: any) => { graph.domain.relations.find((relation: any) => relation.from === "schedule" && relation.to === "service").kind = "one-to-one"; }],
    ["appointment workflow", (graph: any) => { graph.flow.flows[0].transitions[0].roles = ["customer"]; }],
    ["appointment policy", (graph: any) => { graph.policy.permissions.find((permission: any) => permission.role === "staff" && permission.resource === "appointment").actions = ["read", "cancel"]; }],
  ])("rejects Appointment %s before emitting a bundle", (_label, mutate) => {
    expect(() => compileAppointmentMutation(mutate)()).toThrow();
  });
  it("rejects a non-exact Appointment lock before emitting a bundle", () => {
    expect(() => compileAppointmentMutation((_graph, lock) => { lock.packages.find((entry: any) => entry.lock.key === "core.crud").lock.version = "9.9.9"; }, false)()).toThrow();
  });
  it.each([
    ["field type", (graph: any, lock: any) => { appointmentField(graph, lock, "serviceNameField").type = "text"; }],
    ["relation", (graph: any) => { graph.domain.relations.find((relation: any) => relation.from === "schedule" && relation.to === "service").kind = "one-to-one"; }],
    ["workflow", (graph: any) => { graph.flow.flows[0].transitions[0].roles = ["customer"]; }],
    ["policy", (graph: any) => { graph.policy.permissions.find((permission: any) => permission.role === "staff" && permission.resource === "appointment").actions = ["read", "cancel"]; }],
  ])("rejects Appointment %s at the page-runtime facade", (_label, mutate) => {
    expect(() => renderAppointmentMutation(mutate)()).toThrow();
  });

  it("preserves all seven pre-Appointment definitions from immutable b8d79696", () => {
    const baselineBytes = readFileSync(
      new URL("./fixtures/seven-definition-baseline.json", import.meta.url),
      "utf8",
    );
    expect(createHash("sha256").update(baselineBytes).digest("hex")).toBe(
      "104e9d2525ce55b2bfddf263096c5132b36b79f40bbfd344154c37c4e3139b16",
    );
    const expected = JSON.parse(baselineBytes);
    expect(expected.base).toBe("b8d796961b1ff68c7d5efa1a12fe353aa370eee8");
    expect(expected.entries).toHaveLength(7);
    expect(expected.entries.every((entry: { graphSha256: string; compositionLockGraphSha256: string }) => entry.graphSha256 === entry.compositionLockGraphSha256)).toBe(true);
    expect(
      currentDefinitionDataCompilationEvidence(
        expected.entries.map(
          (entry: { definitionKey: string }) => entry.definitionKey,
        ),
      ),
    ).toEqual(expected.entries);
  });

  it("retains a closed receipt for the isolated seven-definition baseline capture", () => {
    const script = new URL("./fixtures/capture-seven-definition-baseline.mjs", import.meta.url);
    const receipt = new URL("../../../docs/acceptance/evidence/appointment-booking/definition-composition/seven-definition-baseline-capture.json", import.meta.url);
    expect(existsSync(script)).toBe(true);
    expect(existsSync(receipt)).toBe(true);
    const parsed = JSON.parse(readFileSync(receipt, "utf8"));
    expect(Object.keys(parsed)).toEqual(["parentHead", "statusPorcelainV1", "nodeVersion", "pnpmVersion", "command", "captureScriptPath", "captureScriptSha256", "fixturePath", "fixtureSha256"]);
    expect(parsed.parentHead).toBe("b8d796961b1ff68c7d5efa1a12fe353aa370eee8");
    expect(parsed.statusPorcelainV1).toBe("");
    expect(parsed.nodeVersion).toBe(process.version);
    expect(parsed.pnpmVersion).toBe(execFileSync(process.platform === "win32" ? "pnpm.cmd" : "pnpm", ["--version"], { encoding: "utf8", shell: process.platform === "win32" }).trim());
    expect(parsed.command).toBe("node packages/compiler/test/fixtures/capture-seven-definition-baseline.mjs --parent b8d796961b1ff68c7d5efa1a12fe353aa370eee8 --fixture packages/compiler/test/fixtures/seven-definition-baseline.json --receipt docs/acceptance/evidence/appointment-booking/definition-composition/seven-definition-baseline-capture.json");
    expect(parsed.captureScriptSha256).toBe(`sha256:${createHash("sha256").update(readFileSync(script)).digest("hex")}`);
    expect(parsed.captureScriptPath).toBe("packages/compiler/test/fixtures/capture-seven-definition-baseline.mjs");
    expect(parsed.fixturePath).toBe("packages/compiler/test/fixtures/seven-definition-baseline.json");
    expect(parsed.fixtureSha256).toBe(`sha256:${createHash("sha256").update(readFileSync(new URL("./fixtures/seven-definition-baseline.json", import.meta.url))).digest("hex")}`);
  });

  it("preserves all five delivered definitions and complete Published bundles from bbb1e23c", () => {
    const baselineBytes = readFileSync(
      new URL("./fixtures/five-definition-baseline.json", import.meta.url),
      "utf8",
    );
    expect(createHash("sha256").update(baselineBytes).digest("hex")).toBe(
      "421447a597e6593045b1fe317ed0c83e6469f5540c6156620d05af2503670ae5",
    );
    const expected = JSON.parse(baselineBytes);
    expect(expected.base).toBe("bbb1e23c68f05e3ae213ceaf167737eb0fe86779");
    expect(expected.entries).toHaveLength(5);
    let changedFiles = 0;
    let semanticMaps = 0;
    const actual = currentDefinitionDataCompatibility(
      expected.entries.map(
        (entry: { definitionKey: string }) => entry.definitionKey,
      ),
      (key, current, historical) => {
        const databasePaths = new Set<string>(IDENTIFIER_DATABASE_PATHS);
        const changedPaths = current
          .filter((file, index) => file.content !== historical[index]!.content)
          .map((file) => file.path);
        expect(changedPaths).toEqual(IDENTIFIER_DATABASE_PATHS);
        expect(current.filter((file) => !databasePaths.has(file.path))).toEqual(
          historical.filter((file) => !databasePaths.has(file.path)),
        );
        const schema = current.find(
          (file) => file.path === IDENTIFIER_DATABASE_PATHS[0],
        )!.content;
        const maps = [...schema.matchAll(/\bmap:\s*"/g)];
        expect(maps).toHaveLength(key === "purchase-request-approval" ? 2 : 1);
        changedFiles += changedPaths.length;
        semanticMaps += maps.length;
      },
    );
    expect(actual).toEqual(expected.entries);
    expect(changedFiles).toBe(15);
    expect(semanticMaps).toBe(6);
  });

  it("preserves all four delivered definitions and complete Published bundles from f8cdfe81", () => {
    const expected = JSON.parse(
      readFileSync(
        new URL("./fixtures/definition-data-baseline.json", import.meta.url),
        "utf8",
      ),
    );
    expect(expected.base).toBe("f8cdfe812c6c5ab2710a641862aa8f026134ab15");
    const actual = currentDefinitionDataCompatibility();
    expect(actual).toHaveLength(4);
    expect(actual).toEqual(expected.entries);
  });
});

describe("strict protected baseline inverse comparison", () => {
  const current = new Map<string, readonly GeneratedFile[]>();
  const oldDigests = new Map<string, string>();
  const error = "Legacy database identifier comparison failed.";
  beforeAll(() => {
    const expected = JSON.parse(
      readFileSync(
        new URL("./fixtures/five-definition-baseline.json", import.meta.url),
        "utf8",
      ),
    );
    currentDefinitionDataCompatibility(
      expected.entries.map(
        (entry: { definitionKey: string }) => entry.definitionKey,
      ),
      (key, files) => current.set(key, files),
    );
    for (const entry of expected.entries)
      oldDigests.set(
        entry.definitionKey,
        entry.separatePublishedLockBundle.sha256,
      );
  });
  function changed(
    key: string,
    transform: (content: string, path: string) => string,
  ) {
    return current.get(key)!.map((file) => ({
      ...file,
      content: transform(file.content, file.path),
    }));
  }
  function checkReject(
    files: readonly GeneratedFile[],
    key = "expense-approval",
  ) {
    expect(() => definitionDatabaseIdentifierComparison(files, key)).toThrow(
      error,
    );
  }
  it.each([
    "missing",
    "duplicate",
    "seventh",
    "changed name",
    "unpaired",
    "schema copy mismatch",
    "schema role",
    "SQL role",
  ])("rejects a %s map", (mutation) => {
    const key = "expense-approval";
    const files = current.get(key)!;
    const schema = files.find(
      (file) => file.path === IDENTIFIER_DATABASE_PATHS[0],
    )!.content;
    const mapName = /map: "([^"]+)"/.exec(schema)![1]!;
    const mappedLine = schema
      .split("\n")
      .find((line) => line.includes(`map: "${mapName}"`))!;
    const bad = changed(key, (content, path) => {
      const isSchema =
        path === IDENTIFIER_DATABASE_PATHS[0] ||
        path === IDENTIFIER_DATABASE_PATHS[1];
      if (mutation === "changed name")
        return content.replaceAll(mapName, "changed_fk_0000000000000000");
      if (mutation === "unpaired" && path === IDENTIFIER_DATABASE_PATHS[2])
        return content.replace(mapName, "unpaired_fk_0000000000000000");
      if (
        mutation === "schema copy mismatch" &&
        path === IDENTIFIER_DATABASE_PATHS[1]
      )
        return content + "\n";
      if (mutation === "SQL role" && path === IDENTIFIER_DATABASE_PATHS[2])
        return content.replace(
          /ALTER TABLE "[^"]+"(?= ADD CONSTRAINT "[^"\n]+_fk_)/,
          'ALTER TABLE "Factory_AuditEvent"',
        );
      if (!isSchema) return content;
      if (mutation === "missing")
        return content.replace(`, map: "${mapName}"`, "");
      if (mutation === "duplicate")
        return content.replace(mappedLine, `${mappedLine}\n${mappedLine}`);
      if (mutation === "seventh")
        return content.replace(
          mappedLine,
          `${mappedLine}\n  @@index([subjectRef], map: "unexpected_ix_0000000000000000")`,
        );
      if (mutation === "schema role")
        return content
          .replace(mappedLine + "\n", "")
          .replace(/(model \w+ \{\n)/, `$1${mappedLine}\n`);
      return content;
    });
    checkReject(bad);
  });
  it("rejects a mapped Purchase index moved to another model", () => {
    const key = "purchase-request-approval";
    checkReject(
      changed(key, (content, path) => {
        if (!path.endsWith("schema.prisma")) return content;
        const line = content
          .split("\n")
          .find((line) => line.includes("@@index") && line.includes("map:"))!;
        return content
          .replace(line + "\n", "")
          .replace(/(model \w+ \{\n)/, `$1${line}\n`);
      }),
      key,
    );
  });
  it("rejects an unknown fixture instead of inferring a normalization rule", () => {
    checkReject(current.get("expense-approval")!, "unknown");
  });
  it.each(["non-database byte", "database whitespace"])(
    "leaves an unrelated %s visible to the original complete-bundle digest",
    (mutation) => {
      const key = "expense-approval";
      const untouchedPath = current
        .get(key)!
        .find(
          (file) => !new Set<string>(IDENTIFIER_DATABASE_PATHS).has(file.path),
        )!.path;
      const input = changed(key, (content, path) =>
        mutation === "non-database byte"
          ? path === untouchedPath
            ? content + "\n"
            : content
          : path.endsWith("schema.prisma")
            ? content + "\n"
            : content,
      );
      const comparison = definitionDatabaseIdentifierComparison(input, key);
      const digest = createHash("sha256")
        .update(
          JSON.stringify(
            comparison.map(({ path, content }) => [path, content]),
          ),
        )
        .digest("hex");
      expect(digest).not.toBe(oldDigests.get(key));
      if (mutation === "non-database byte")
        expect(
          comparison.find((file) => file.path === untouchedPath)!.content,
        ).toBe(input.find((file) => file.path === untouchedPath)!.content);
    },
  );
});

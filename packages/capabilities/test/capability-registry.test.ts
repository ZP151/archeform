import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

import {
  assertGoldenCapabilityAssetLocks,
  capabilityCatalog,
  capabilityAssets,
  capabilitiesForProfile,
  composeProfileDraft,
  getCapabilityAsset,
  getCapability,
  getProfileComposition,
  profileGraphs,
  type CapabilityAssetV1,
  type FactoryProfile,
} from "../src/index.js";
import {
  capabilityManifestDigest,
  verifyCapabilityAssetDigest,
  verifyCapabilityAssetPackage,
  loadCapabilityAssetTemplates,
} from "../src/node.js";
import { validateApplicationGraph } from "@factory/graph";

describe("capability catalog", () => {
  it("exposes independently composable core and commerce capabilities", () => {
    expect(capabilityCatalog.map((capability) => capability.key)).toEqual([
      "core.audit",
      "core.crud",
      "core.notification",
      "core.workflow",
      "commerce.catalog",
      "commerce.cart",
      "commerce.inventory",
      "commerce.order",
      "commerce.simulated-payment",
    ]);
  });

  it("resolves each catalog entry to an immutable Golden capability asset", () => {
    const asset = getCapabilityAsset("core.audit");

    expect(asset.manifest).toMatchObject({
      apiVersion: "factory.capability/v1",
      key: "core.audit",
      version: "1.0.0",
      lifecycle: "golden",
      packageRoot: "packages/capabilities/assets/core.audit/1.0.0",
    });
    expect(asset.manifest.manifestDigest).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(asset.manifest.outputSlots).toEqual(
      expect.arrayContaining(["api.runtime", "test.fixture"]),
    );
  });

  it("verifies every registered capability manifest against its declared digest", () => {
    expect(capabilityAssets).toHaveLength(9);
    for (const asset of capabilityAssets) {
      expect(verifyCapabilityAssetDigest(asset)).toBe(true);
    }
  });

  it("ships each Golden asset as a self-contained package with adapter and evidence", () => {
    const repositoryRoot = resolve(
      dirname(fileURLToPath(import.meta.url)),
      "../../..",
    );

    for (const asset of capabilityAssets) {
      expect(verifyCapabilityAssetPackage(asset, repositoryRoot)).toEqual([]);
    }
  });

  it("resolves exactly one digest-verified package-local API template for every Golden asset", () => {
    const repositoryRoot = resolve(
      dirname(fileURLToPath(import.meta.url)),
      "../../..",
    );

    for (const asset of capabilityAssets) {
      const templates = loadCapabilityAssetTemplates(asset, repositoryRoot);
      expect(templates).toHaveLength(1);
      expect(templates[0]).toMatchObject({
        assetKey: asset.manifest.key,
        outputSlot: "api.runtime",
        source: "templates/api/capability-module.ts.tpl",
        target: `api/src/capabilities/${asset.manifest.key}.ts`,
      });
      expect(templates[0]?.content).toContain("{{asset.key}}");
      expect(templates[0]?.digest).toMatch(/^sha256:[a-f0-9]{64}$/);
    }
  });

  it("rejects a changed core audit effect handler template", async () => {
    const repositoryRoot = await mkdtemp(
      join(tmpdir(), "factory-changed-handler-"),
    );
    const registered = getCapabilityAsset("core.audit").manifest;
    const packageRoot =
      "packages/capabilities/assets/test.changed-handler/1.0.0";
    const draftManifest = {
      ...registered,
      key: "test.changed-handler",
      packageRoot,
    };
    const manifest = {
      ...draftManifest,
      manifestDigest: capabilityManifestDigest(draftManifest),
    };
    const asset: CapabilityAssetV1 = { manifest };
    const physicalRoot = resolve(repositoryRoot, packageRoot);
    const sourceTemplate = readFileSync(
      resolve(
        dirname(fileURLToPath(import.meta.url)),
        "../assets/core.audit/1.0.0/templates/api/capability-module.ts.tpl",
      ),
      "utf8",
    );

    try {
      await mkdir(resolve(physicalRoot, "templates/api"), { recursive: true });
      await mkdir(resolve(physicalRoot, "fixtures"), { recursive: true });
      await mkdir(resolve(physicalRoot, "tests"), { recursive: true });
      await writeFile(
        resolve(physicalRoot, "component.json"),
        JSON.stringify(manifest, null, 2),
      );
      await writeFile(
        resolve(physicalRoot, "adapter.json"),
        JSON.stringify(
          {
            apiVersion: "factory.adapter/v1",
            kind: "declarative",
            outputSlots: manifest.outputSlots,
            templates: manifest.templates,
          },
          null,
          2,
        ),
      );
      await writeFile(resolve(physicalRoot, "fixtures/default.json"), "{}");
      await writeFile(resolve(physicalRoot, "tests/contract.json"), "{}");
      await writeFile(
        resolve(physicalRoot, "templates/api/capability-module.ts.tpl"),
        sourceTemplate.replace(
          "effectHandler: async",
          "effectHandler: async /* changed */",
        ),
      );

      expect(verifyCapabilityAssetPackage(asset, repositoryRoot)).toEqual(
        expect.arrayContaining([
          expect.stringContaining(
            "template: Capability template 'api-capability-module' digest does not match.",
          ),
        ]),
      );
    } finally {
      await rm(repositoryRoot, { recursive: true, force: true });
    }
  });

  it("rejects a package template that targets outside its declared output slot", async () => {
    const repositoryRoot = await mkdtemp(
      join(tmpdir(), "factory-unsafe-template-"),
    );
    const packageRoot = "packages/capabilities/assets/test.unsafe/1.0.0";
    const template = {
      id: "unsafe-target",
      source: "templates/api/module.ts.tpl",
      target: "../outside.ts",
      outputSlot: "api.runtime" as const,
      digest:
        "sha256:8ced82a4c3db325ab13c454b081a3f81add5e8bb3f341d51474e04d69e42a06b",
    };
    const draftManifest = {
      ...getCapabilityAsset("core.audit").manifest,
      key: "test.unsafe",
      packageRoot,
      templates: [template],
      manifestDigest: "sha256:placeholder",
    };
    const manifest = {
      ...draftManifest,
      manifestDigest: capabilityManifestDigest(draftManifest),
    };
    const asset: CapabilityAssetV1 = { manifest };
    const physicalRoot = resolve(repositoryRoot, packageRoot);

    try {
      await mkdir(resolve(physicalRoot, "fixtures"), { recursive: true });
      await mkdir(resolve(physicalRoot, "tests"), { recursive: true });
      await writeFile(
        resolve(physicalRoot, "component.json"),
        JSON.stringify(manifest, null, 2),
      );
      await writeFile(
        resolve(physicalRoot, "adapter.json"),
        JSON.stringify(
          {
            apiVersion: "factory.adapter/v1",
            kind: "declarative",
            outputSlots: manifest.outputSlots,
            templates: manifest.templates,
          },
          null,
          2,
        ),
      );
      await writeFile(resolve(physicalRoot, "fixtures/default.json"), "{}");
      await writeFile(resolve(physicalRoot, "tests/contract.json"), "{}");

      expect(verifyCapabilityAssetPackage(asset, repositoryRoot)).toEqual(
        expect.arrayContaining([expect.stringContaining("unsafe target path")]),
      );
      expect(() => loadCapabilityAssetTemplates(asset, repositoryRoot)).toThrow(
        "unsafe target path",
      );
    } finally {
      await rm(repositoryRoot, { recursive: true, force: true });
    }
  });

  it("keeps each physical package manifest aligned with its registry contract", () => {
    const repositoryRoot = resolve(
      dirname(fileURLToPath(import.meta.url)),
      "../../..",
    );

    for (const asset of capabilityAssets) {
      const component = JSON.parse(
        readFileSync(
          resolve(repositoryRoot, asset.manifest.packageRoot, "component.json"),
          "utf8",
        ),
      ) as Record<string, unknown>;
      expect(component).toEqual(asset.manifest);

      const adapter = JSON.parse(
        readFileSync(
          resolve(repositoryRoot, asset.manifest.packageRoot, "adapter.json"),
          "utf8",
        ),
      ) as Record<string, unknown>;
      expect(adapter).not.toHaveProperty("source");
      expect(adapter.outputSlots).toEqual(asset.manifest.outputSlots);
    }
  });

  it("rejects a lock that does not exactly match a registered Golden asset", () => {
    expect(() =>
      assertGoldenCapabilityAssetLocks(
        [
          {
            key: "core.audit",
            version: "1.0.0",
            packageRoot: "packages/capabilities/assets/core.audit/1.0.0",
            manifestDigest:
              "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
            lifecycle: "golden",
          },
        ],
        { profile: "expense-approval", capabilityKeys: ["audit.record"] },
      ),
    ).toThrow("does not match a registered Golden asset");
  });

  it("returns a complete, deterministic capability set for each initial profile", () => {
    expect(
      capabilitiesForProfile("expense-approval").map(({ key }) => key),
    ).toEqual([
      "core.audit",
      "core.crud",
      "core.notification",
      "core.workflow",
    ]);
    expect(
      capabilitiesForProfile("restaurant-ordering").map(({ key }) => key),
    ).toContain("commerce.simulated-payment");
    expect(
      capabilitiesForProfile("simple-ecommerce").map(({ key }) => key),
    ).toContain("commerce.inventory");
  });

  it("rejects unknown capability keys", () => {
    expect(() => getCapability("commerce.unknown")).toThrow(
      "Unknown Factory capability: commerce.unknown",
    );
  });

  it("composes an audit-free Expense Graph without dangling effects or audit policy", () => {
    const composition = composeProfileDraft({
      profile: "expense-approval",
      optionalCapabilities: ["core.notification"],
    });

    expect(composition.optionalCapabilities).toEqual(["core.notification"]);
    expect(composition.graph.integration.capabilities).not.toContainEqual(
      expect.objectContaining({ key: "audit.record" }),
    );
    expect(
      composition.graph.flow.flows.flatMap((flow) => flow.transitions),
    ).not.toContainEqual(
      expect.objectContaining({
        effects: expect.arrayContaining([
          expect.objectContaining({ capability: "audit.record" }),
        ]),
      }),
    );
    expect(composition.graph.policy.permissions).not.toContainEqual(
      expect.objectContaining({ actions: expect.arrayContaining(["audit"]) }),
    );
    expect(validateApplicationGraph(composition.graph)).toEqual([]);
  });

  it("composes a notification-free Restaurant Graph without its terminal notification effect", () => {
    const composition = composeProfileDraft({
      profile: "restaurant-ordering",
      optionalCapabilities: [],
    });

    expect(composition.optionalCapabilities).toEqual([]);
    expect(composition.graph.integration.capabilities).not.toContainEqual(
      expect.objectContaining({ key: "notification.send" }),
    );
    expect(
      composition.graph.flow.flows.flatMap((flow) => flow.transitions),
    ).not.toContainEqual(
      expect.objectContaining({
        effects: expect.arrayContaining([
          expect.objectContaining({ capability: "notification.send" }),
        ]),
      }),
    );
    expect(validateApplicationGraph(composition.graph)).toEqual([]);
  });

  it("composes a notification-free Expense Graph without notification effects", () => {
    const composition = composeProfileDraft({
      profile: "expense-approval",
      optionalCapabilities: ["core.audit"],
    });

    expect(composition.graph.integration.capabilities).not.toContainEqual(
      expect.objectContaining({ key: "notification.send" }),
    );
    expect(
      composition.graph.flow.flows.flatMap((flow) => flow.transitions),
    ).not.toContainEqual(
      expect.objectContaining({
        effects: expect.arrayContaining([
          expect.objectContaining({ capability: "notification.send" }),
        ]),
      }),
    );
    expect(validateApplicationGraph(composition.graph)).toEqual([]);
  });

  it("composes an audit-free Ecommerce Graph without audit effects or permissions", () => {
    const composition = composeProfileDraft({
      profile: "simple-ecommerce",
      optionalCapabilities: [],
    });

    expect(composition.graph.integration.capabilities).not.toContainEqual(
      expect.objectContaining({ key: "audit.record" }),
    );
    expect(composition.graph.policy.permissions).not.toContainEqual(
      expect.objectContaining({ actions: expect.arrayContaining(["audit"]) }),
    );
    expect(validateApplicationGraph(composition.graph)).toEqual([]);
  });

  it("rejects duplicate optional capability selections", () => {
    expect(() =>
      composeProfileDraft({
        profile: "expense-approval",
        optionalCapabilities: ["core.audit", "core.audit"],
      }),
    ).toThrow("Optional capability selections must be unique.");
  });

  it("reports the profile and enabled effects in the composition summary", () => {
    const composition = composeProfileDraft({
      profile: "restaurant-ordering",
    });

    expect(composition.profile).toBe("restaurant-ordering");
    expect(composition.enabledEffects).toEqual(
      expect.arrayContaining(["audit.record", "notification.send"]),
    );
  });

  it("locks the selected Golden asset versions directly into composed Graphs", () => {
    const graph = composeProfileDraft({
      profile: "expense-approval",
      optionalCapabilities: ["core.audit"],
    }).graph;

    expect(graph.integration.assetLocks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: "core.audit", lifecycle: "golden" }),
        expect.objectContaining({ key: "core.crud", lifecycle: "golden" }),
        expect.objectContaining({ key: "core.workflow", lifecycle: "golden" }),
      ]),
    );
    expect(graph.integration.assetLocks).not.toContainEqual(
      expect.objectContaining({ key: "core.notification" }),
    );
    expect(graph.integration.compositionProfile).toBe("expense-approval");
  });

  it("rejects a Golden asset outside the declared profile or without its declared effects", () => {
    const cartLock = {
      key: "commerce.cart",
      version: "1.0.0",
      packageRoot: "packages/capabilities/assets/commerce.cart/1.0.0",
      manifestDigest:
        "sha256:f3f0ba58748cd7a8464950b56b68f77fa9826f7c9c7839813e4d2126e048d2cb",
      lifecycle: "golden" as const,
    };

    expect(() =>
      assertGoldenCapabilityAssetLocks([cartLock], {
        profile: "expense-approval",
        capabilityKeys: ["cart.add"],
      }),
    ).toThrow("does not support profile");

    expect(() =>
      assertGoldenCapabilityAssetLocks([cartLock], {
        profile: "restaurant-ordering",
        capabilityKeys: ["unlocked.operation"],
      }),
    ).toThrow("is not provided by a locked Golden asset");
  });

  it("marks catalog-supported audit and notification capabilities as locked recipe requirements", () => {
    expect(
      getProfileComposition("restaurant-ordering").requiredCapabilities.map(
        ({ key }) => key,
      ),
    ).toContain("core.audit");
    expect(
      getProfileComposition("simple-ecommerce").requiredCapabilities.map(
        ({ key }) => key,
      ),
    ).toContain("core.notification");
  });

  it("rejects optional capability selections that are not declared by the profile recipe", () => {
    expect(() =>
      composeProfileDraft({
        profile: "expense-approval",
        optionalCapabilities: ["commerce.cart"],
      }),
    ).toThrow(
      "Optional capability 'commerce.cart' is not supported by profile 'expense-approval'.",
    );
    expect(() =>
      getProfileComposition("not-a-profile" as FactoryProfile),
    ).toThrow("Unknown Factory profile 'not-a-profile'.");
  });

  it("ships independently valid Graph starters for the three acceptance profiles", () => {
    expect(profileGraphs.map(({ profile }) => profile)).toEqual([
      "expense-approval",
      "restaurant-ordering",
      "simple-ecommerce",
    ]);
    for (const profile of profileGraphs) {
      expect(validateApplicationGraph(profile.graph)).toEqual([]);
    }
  });

  it("ships deterministic catalog seed scenarios for Restaurant and Ecommerce", () => {
    const restaurant = profileGraphs.find(
      ({ profile }) => profile === "restaurant-ordering",
    )!.graph;
    const ecommerce = profileGraphs.find(
      ({ profile }) => profile === "simple-ecommerce",
    )!.graph;

    expect(restaurant.domain.seedData).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ entity: "menu-item" }),
      ]),
    );
    expect(ecommerce.domain.seedData).toEqual(
      expect.arrayContaining([expect.objectContaining({ entity: "product" })]),
    );
  });

  it("declares cart and inventory operations for each commerce profile", () => {
    for (const profile of [
      "restaurant-ordering",
      "simple-ecommerce",
    ] as const) {
      const graph = profileGraphs.find(
        (entry) => entry.profile === profile,
      )!.graph;
      expect(
        graph.integration.capabilities.map((capability) => capability.key),
      ).toEqual(
        expect.arrayContaining([
          "cart.add",
          "inventory.decrement",
          "payment.simulate",
        ]),
      );
    }
    const restaurant = profileGraphs.find(
      ({ profile }) => profile === "restaurant-ordering",
    )!.graph;
    expect(
      restaurant.domain.entities.find((entity) => entity.key === "menu-item")!
        .fields,
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: "stock", type: "integer" }),
      ]),
    );
  });

  it("grants the Restaurant manager read-only audit access to generated capability evidence", () => {
    const restaurant = profileGraphs.find(
      ({ profile }) => profile === "restaurant-ordering",
    )!.graph;
    expect(restaurant.policy.permissions).toContainEqual({
      role: "manager",
      resource: "order",
      actions: ["read", "audit"],
    });
  });
});

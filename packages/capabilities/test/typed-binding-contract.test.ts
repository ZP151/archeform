import { describe, expect, it } from "vitest";

import {
  lockCapabilityAsset,
  type CapabilityAssetManifestV1,
  type CapabilityAssetV1,
} from "../src/assets/index.js";
import {
  resolveCapabilityCompositionForAssets,
  type CapabilityBindingValueV1,
  validateCapabilityBindingSchema,
} from "../src/composition.js";

const digest = (character: string): string => `sha256:${character.repeat(64)}`;

function strictManifest(
  inputSchema: readonly Record<string, unknown>[],
  parameters: readonly Record<string, unknown>[],
): CapabilityAssetManifestV1 {
  return {
    apiVersion: "factory.capability/v1",
    bindingContract: "factory.capability-binding/v1",
    key: "core.typed-binding-test",
    version: "1.0.0",
    category: "core",
    name: "Typed binding test",
    description: "Exercises the strict capability binding contract.",
    packageRoot: "packages/capabilities/assets/core.typed-binding-test/1.0.0",
    manifestDigest: digest("a"),
    lifecycle: "golden",
    profiles: ["simple-ecommerce"],
    effects: [],
    inputSchema,
    outputSlots: [],
    templates: [],
    parameters,
    graphContributions: [],
    executableContributions: [],
    requires: [],
    provides: [],
    verification: {
      fixture: "fixtures/default.json",
      contractTest: "tests/contract.json",
      status: "verified",
    },
  } as unknown as CapabilityAssetManifestV1;
}

function resolveStrictManifest(
  manifest: CapabilityAssetManifestV1,
  bindings: Readonly<Record<string, CapabilityBindingValueV1>> = {},
) {
  const asset: CapabilityAssetV1 = { manifest };
  return resolveCapabilityCompositionForAssets(
    {
      selections: [{ lock: lockCapabilityAsset(asset), bindings }],
    },
    [asset],
  );
}

const requiredEntity = {
  key: "catalogEntity",
  type: "domain.entity",
  required: true,
} as const;
const requiredField = {
  key: "stockField",
  type: "domain.field",
  required: true,
  ownerBinding: "catalogEntity",
  fieldTypes: ["integer"],
} as const;
const entityParameter = {
  key: "catalogEntity",
  type: "graph-symbol",
  required: true,
} as const;
const fieldParameter = {
  key: "stockField",
  type: "graph-symbol",
  required: true,
} as const;
const validBindings = {
  catalogEntity: { graphSymbol: "graph.domain.product" },
  stockField: {
    graphSymbol: "graph.domain.product",
    fieldKey: "stock",
  },
} as unknown as Readonly<Record<string, CapabilityBindingValueV1>>;

describe("typed capability binding contract", () => {
  it("exposes deeply runtime-immutable compiled binding schemas", () => {
    const schemas = validateCapabilityBindingSchema(
      strictManifest(
        [requiredEntity, requiredField],
        [entityParameter, fieldParameter],
      ),
    );
    const fieldSchema = schemas.get("stockField")!;

    expect(() =>
      (schemas as Map<string, unknown>).set("unexpected", requiredEntity),
    ).toThrow();
    expect(() => {
      (fieldSchema as unknown as { ownerBinding: string }).ownerBinding =
        "unexpected";
    }).toThrow();
    expect(() =>
      (fieldSchema as unknown as { fieldTypes: string[] }).fieldTypes.push(
        "string",
      ),
    ).toThrow();
    expect(fieldSchema).toEqual(requiredField);
  });

  it("rejects an unsupported binding contract version", () => {
    const manifest = {
      ...strictManifest([requiredEntity], [entityParameter]),
      bindingContract: "factory.capability-binding/v2",
    } as unknown as CapabilityAssetManifestV1;

    expect(() =>
      resolveStrictManifest(manifest, {
        catalogEntity: { graphSymbol: "graph.domain.product" },
      }),
    ).toThrow("binding contract");
  });

  it("accepts an owner-aware domain field declaration and field binding", () => {
    const composition = resolveStrictManifest(
      strictManifest(
        [requiredEntity, requiredField],
        [entityParameter, fieldParameter],
      ),
      validBindings,
    );

    expect(composition.packages[0]?.bindings).toEqual(validBindings);
  });

  it("rejects an accessor-backed fieldTypes element without invoking it", () => {
    let fieldTypeReads = 0;
    const fieldTypes: unknown[] = [];
    Object.defineProperty(fieldTypes, "0", {
      enumerable: true,
      get: () => {
        fieldTypeReads += 1;
        return "integer";
      },
    });
    fieldTypes.length = 1;
    const manifest = strictManifest(
      [
        requiredEntity,
        {
          ...requiredField,
          fieldTypes: fieldTypes as readonly "integer"[],
        },
      ],
      [entityParameter, fieldParameter],
    );

    expect(() => resolveStrictManifest(manifest, validBindings)).toThrow();
    expect(fieldTypeReads).toBe(0);
  });

  it.each([
    {
      label: "ownerBinding",
      field: {
        key: "stockField",
        type: "domain.field",
        required: true,
        fieldTypes: ["integer"],
      },
      message: "ownerBinding",
    },
    {
      label: "fieldTypes",
      field: {
        key: "stockField",
        type: "domain.field",
        required: true,
        ownerBinding: "catalogEntity",
      },
      message: "fieldTypes",
    },
    {
      label: "non-empty fieldTypes",
      field: {
        key: "stockField",
        type: "domain.field",
        required: true,
        ownerBinding: "catalogEntity",
        fieldTypes: [],
      },
      message: "fieldTypes",
    },
  ])("rejects a domain field without $label", ({ field, message }) => {
    const manifest = strictManifest(
      [requiredEntity, field],
      [entityParameter, fieldParameter],
    );

    expect(() => resolveStrictManifest(manifest, validBindings)).toThrow(
      message,
    );
  });

  it("rejects an unknown owner binding", () => {
    const manifest = strictManifest(
      [{ ...requiredField, ownerBinding: "missingEntity" }, requiredEntity],
      [fieldParameter, entityParameter],
    );

    expect(() => resolveStrictManifest(manifest, validBindings)).toThrow(
      "unknown ownerBinding",
    );
  });

  it.each([
    {
      label: "a non-entity owner",
      owner: { ...requiredEntity, type: "page.page" },
    },
    {
      label: "an optional owner",
      owner: { ...requiredEntity, required: false },
    },
  ])("rejects $label for a domain field", ({ owner }) => {
    const manifest = strictManifest(
      [owner, requiredField],
      [{ ...entityParameter, required: owner.required }, fieldParameter],
    );

    expect(() => resolveStrictManifest(manifest, validBindings)).toThrow(
      "required domain.entity",
    );
  });

  it("rejects duplicate strict input schema keys", () => {
    const manifest = strictManifest(
      [requiredEntity, requiredEntity],
      [entityParameter],
    );

    expect(() => resolveStrictManifest(manifest)).toThrow(
      "duplicate input schema",
    );
  });

  it.each([
    {
      label: "a parameter missing from inputSchema",
      inputs: [requiredEntity],
      parameters: [entityParameter, fieldParameter],
      message: "identical keys",
    },
    {
      label: "an inputSchema key missing from parameters",
      inputs: [requiredEntity, requiredField],
      parameters: [entityParameter],
      message: "identical keys",
    },
    {
      label: "different required flags",
      inputs: [requiredEntity],
      parameters: [{ ...entityParameter, required: false }],
      message: "required flag",
    },
  ])(
    "rejects strict manifests with $label",
    ({ inputs, parameters, message }) => {
      const manifest = strictManifest(inputs, parameters);

      expect(() => resolveStrictManifest(manifest)).toThrow(message);
    },
  );

  it.each(["ownerBinding", "fieldTypes", "fieldRequired", "fieldUnique"])(
    "rejects %s on a non-field input",
    (constraint) => {
      const manifest = strictManifest(
        [
          {
            ...requiredEntity,
            [constraint]:
              constraint === "fieldTypes" ? ["integer"] : "catalogEntity",
          },
        ],
        [entityParameter],
      );

      expect(() => resolveStrictManifest(manifest)).toThrow(
        "only valid for domain.field",
      );
    },
  );

  it.each(["fieldUniqe", "unexpectedConstraint"])(
    "rejects unknown domain.field input key %s",
    (unknownKey) => {
      const manifest = strictManifest(
        [requiredEntity, { ...requiredField, [unknownKey]: true }],
        [entityParameter, fieldParameter],
      );

      expect(() => resolveStrictManifest(manifest, validBindings)).toThrow(
        "unknown key",
      );
    },
  );

  it("rejects an unknown own key on a non-field input", () => {
    const manifest = strictManifest(
      [{ ...requiredEntity, unexpectedConstraint: true }],
      [entityParameter],
    );

    expect(() =>
      resolveStrictManifest(manifest, {
        catalogEntity: { graphSymbol: "graph.domain.product" },
      }),
    ).toThrow("unknown key");
  });

  it("rejects an empty-string unknown own key on a field input", () => {
    const manifest = strictManifest(
      [requiredEntity, { ...requiredField, "": true }],
      [entityParameter, fieldParameter],
    );

    expect(() => resolveStrictManifest(manifest, validBindings)).toThrow(
      "unknown key",
    );
  });

  it("rejects an unsupported strict input type", () => {
    const manifest = strictManifest(
      [{ ...requiredEntity, type: "domain.entities" }],
      [entityParameter],
    );

    expect(() => resolveStrictManifest(manifest)).toThrow("binding input type");
  });

  it("rejects a non-boolean strict required flag", () => {
    const manifest = strictManifest(
      [{ ...requiredEntity, required: "yes" }],
      [{ ...entityParameter, required: "yes" }],
    );

    expect(() =>
      resolveStrictManifest(manifest, {
        catalogEntity: { graphSymbol: "graph.domain.product" },
      }),
    ).toThrow("required must be a boolean");
  });

  it("rejects an unsupported domain field scalar type", () => {
    const manifest = strictManifest(
      [requiredEntity, { ...requiredField, fieldTypes: ["money"] }],
      [entityParameter, fieldParameter],
    );

    expect(() => resolveStrictManifest(manifest, validBindings)).toThrow(
      "fieldTypes",
    );
  });

  it("rejects repeated domain field scalar types", () => {
    const manifest = strictManifest(
      [
        requiredEntity,
        { ...requiredField, fieldTypes: ["integer", "integer"] },
      ],
      [entityParameter, fieldParameter],
    );

    expect(() => resolveStrictManifest(manifest, validBindings)).toThrow(
      "duplicate fieldTypes",
    );
  });

  it("rejects a domain field binding without fieldKey", () => {
    const manifest = strictManifest(
      [requiredEntity, requiredField],
      [entityParameter, fieldParameter],
    );
    const bindings = {
      catalogEntity: { graphSymbol: "graph.domain.product" },
      stockField: { graphSymbol: "graph.domain.product" },
    };

    expect(() => resolveStrictManifest(manifest, bindings)).toThrow("fieldKey");
  });

  it("rejects fieldKey on every non-field binding", () => {
    const manifest = strictManifest([requiredEntity], [entityParameter]);
    const bindings = {
      catalogEntity: {
        graphSymbol: "graph.domain.product",
        fieldKey: "stock",
      },
    } as unknown as Readonly<Record<string, CapabilityBindingValueV1>>;

    expect(() => resolveStrictManifest(manifest, bindings)).toThrow("fieldKey");
  });

  it("rejects a domain field binding that inherits its field key", () => {
    const manifest = strictManifest(
      [requiredEntity, requiredField],
      [entityParameter, fieldParameter],
    );
    const inheritedFieldBinding = Object.assign(
      Object.create({ fieldKey: "stock" }),
      { graphSymbol: "graph.domain.product", unexpected: true },
    ) as CapabilityBindingValueV1;

    expect(() =>
      resolveStrictManifest(manifest, {
        catalogEntity: { graphSymbol: "graph.domain.product" },
        stockField: inheritedFieldBinding,
      }),
    ).toThrow();
  });

  it("rejects a domain field binding that exposes values through accessors", () => {
    const manifest = strictManifest(
      [requiredEntity, requiredField],
      [entityParameter, fieldParameter],
    );
    const accessorBinding = Object.defineProperties(
      {},
      {
        graphSymbol: {
          enumerable: true,
          get: () => "graph.domain.product",
        },
        fieldKey: {
          enumerable: true,
          get: () => "stock",
        },
      },
    ) as CapabilityBindingValueV1;

    expect(() =>
      resolveStrictManifest(manifest, {
        catalogEntity: { graphSymbol: "graph.domain.product" },
        stockField: accessorBinding,
      }),
    ).toThrow();
  });

  it("rejects a domain field schema that inherits its constraints", () => {
    const inheritedFieldSchema = Object.assign(
      Object.create({
        ownerBinding: "catalogEntity",
        fieldTypes: ["integer"],
      }),
      { key: "stockField", type: "domain.field", required: true },
    );
    const manifest = strictManifest(
      [requiredEntity, inheritedFieldSchema],
      [entityParameter, fieldParameter],
    );

    expect(() => resolveStrictManifest(manifest, validBindings)).toThrow();
  });

  it("rejects a domain field schema supplied by Object.prototype pollution", () => {
    Object.defineProperties(Object.prototype, {
      ownerBinding: {
        configurable: true,
        value: "catalogEntity",
      },
      fieldTypes: {
        configurable: true,
        value: ["integer"],
      },
    });
    try {
      const manifest = strictManifest(
        [
          requiredEntity,
          { key: "stockField", type: "domain.field", required: true },
        ],
        [entityParameter, fieldParameter],
      );

      expect(() => resolveStrictManifest(manifest, validBindings)).toThrow();
    } finally {
      delete (Object.prototype as Record<string, unknown>).ownerBinding;
      delete (Object.prototype as Record<string, unknown>).fieldTypes;
    }
  });

  it("rejects a strict parameter that inherits its declaration", () => {
    const inheritedParameter = Object.create({
      key: "catalogEntity",
      type: "graph-symbol",
      required: true,
    });
    const manifest = strictManifest(
      [requiredEntity, requiredField],
      [inheritedParameter, fieldParameter],
    );

    expect(() => resolveStrictManifest(manifest, validBindings)).toThrow();
  });

  it("rejects a strict parameter that exposes its declaration through accessors", () => {
    const accessorParameter = Object.defineProperties(
      {},
      {
        key: { enumerable: true, get: () => "catalogEntity" },
        type: { enumerable: true, get: () => "graph-symbol" },
        required: { enumerable: true, get: () => true },
      },
    );
    const manifest = strictManifest(
      [requiredEntity, requiredField],
      [accessorParameter, fieldParameter],
    );

    expect(() => resolveStrictManifest(manifest, validBindings)).toThrow();
  });
});
